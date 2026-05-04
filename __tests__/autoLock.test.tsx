import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";
import { Text, View } from "react-native";

import { AutoLockProvider, useAutoLock } from "@/src/features/wallet/AutoLockProvider";
import { BACKGROUND_LOCK_MS, INACTIVITY_LOCK_MS } from "@/src/features/wallet/lockConfig";

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockLockWallet: jest.Mock;
let mockLockStatus: "locked" | "unlocked";

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => ({
    lockWallet: mockLockWallet,
    session: { lockStatus: mockLockStatus },
  }),
}));

// Capture AppState handlers so tests can fire them manually.
type AppStateHandler = (state: string) => void;
let appStateHandlers: AppStateHandler[];

function simulateAppState(state: string) {
  appStateHandlers.forEach((h) => h(state));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderProvider() {
  return render(
    <AutoLockProvider>
      <View />
    </AutoLockProvider>,
  );
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockLockWallet = jest.fn().mockResolvedValue(undefined);
  mockLockStatus = "unlocked";
  appStateHandlers = [];

  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, handler) => {
    appStateHandlers.push(handler as AppStateHandler);
    return { remove: jest.fn() };
  });

  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ─── Config constants ─────────────────────────────────────────────────────────

describe("lock config", () => {
  it("inactivity timeout is 2 minutes", () => {
    expect(INACTIVITY_LOCK_MS).toBe(2 * 60 * 1000);
  });

  it("background timeout is 30 seconds", () => {
    expect(BACKGROUND_LOCK_MS).toBe(30 * 1000);
  });

  it("background timeout is shorter than inactivity timeout", () => {
    expect(BACKGROUND_LOCK_MS).toBeLessThan(INACTIVITY_LOCK_MS);
  });
});

// ─── Inactivity timer ─────────────────────────────────────────────────────────

describe("inactivity auto-lock", () => {
  it("calls lockWallet after INACTIVITY_LOCK_MS with no interaction", async () => {
    renderProvider();

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_LOCK_MS);
    });

    expect(mockLockWallet).toHaveBeenCalledTimes(1);
  });

  it("does not lock before the timeout elapses", async () => {
    renderProvider();

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_LOCK_MS - 1);
    });

    expect(mockLockWallet).not.toHaveBeenCalled();
  });

  it("does not start the timer when the session is already locked", async () => {
    mockLockStatus = "locked";
    renderProvider();

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_LOCK_MS);
    });

    expect(mockLockWallet).not.toHaveBeenCalled();
  });
});

// ─── Background lockout ───────────────────────────────────────────────────────

describe("background auto-lock", () => {
  it("locks when the app returns from background after BACKGROUND_LOCK_MS", async () => {
    renderProvider();

    await act(async () => {
      simulateAppState("background");
      jest.advanceTimersByTime(BACKGROUND_LOCK_MS);
      simulateAppState("active");
    });

    expect(mockLockWallet).toHaveBeenCalledTimes(1);
  });

  it("does not lock when the app returns before BACKGROUND_LOCK_MS", async () => {
    renderProvider();

    await act(async () => {
      simulateAppState("background");
      jest.advanceTimersByTime(BACKGROUND_LOCK_MS - 1);
      simulateAppState("active");
    });

    expect(mockLockWallet).not.toHaveBeenCalled();
  });

  it("does not lock when the session is already locked on return", async () => {
    mockLockStatus = "locked";
    renderProvider();

    await act(async () => {
      simulateAppState("background");
      jest.advanceTimersByTime(BACKGROUND_LOCK_MS + 1000);
      simulateAppState("active");
    });

    expect(mockLockWallet).not.toHaveBeenCalled();
  });

  it("treats 'inactive' AppState the same as 'background'", async () => {
    renderProvider();

    await act(async () => {
      simulateAppState("inactive");
      jest.advanceTimersByTime(BACKGROUND_LOCK_MS);
      simulateAppState("active");
    });

    expect(mockLockWallet).toHaveBeenCalledTimes(1);
  });
});

// ─── Suspension ───────────────────────────────────────────────────────────────

describe("auto-lock suspension", () => {
  function SuspendingChild({ id }: { id: string }) {
    const { resumeAutoLock, suspendAutoLock } = useAutoLock();

    // Suspend on mount, resume on unmount — mirrors real screen usage.
    const { useEffect } = require("react");
    useEffect(() => {
      suspendAutoLock(id);
      return () => resumeAutoLock(id);
    }, [id, resumeAutoLock, suspendAutoLock]);

    return <Text>{id}</Text>;
  }

  it("does not lock while a suspension is held", async () => {
    render(
      <AutoLockProvider>
        <SuspendingChild id="video" />
      </AutoLockProvider>,
    );

    // Flush the SuspendingChild effect (suspendAutoLock state update clears the timer)
    await act(async () => {});

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_LOCK_MS * 2);
    });

    expect(mockLockWallet).not.toHaveBeenCalled();
  });

  it("resumes locking after all suspension keys are released", async () => {
    const { unmount } = render(
      <AutoLockProvider>
        <SuspendingChild id="video" />
      </AutoLockProvider>,
    );

    // Unmount the child → resumeAutoLock("video") is called → timer restarts.
    await act(async () => {
      unmount();
    });

    // Re-render without the suspending child to simulate returning to normal.
    render(<AutoLockProvider><View /></AutoLockProvider>);

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_LOCK_MS);
    });

    expect(mockLockWallet).toHaveBeenCalled();
  });

  it("requires all suspension keys to be released before locking resumes", async () => {
    function DoubleHolder() {
      const { resumeAutoLock, suspendAutoLock } = useAutoLock();
      const { useEffect } = require("react");

      useEffect(() => {
        // Two independent activities both hold a suspension.
        suspendAutoLock("key-a");
        suspendAutoLock("key-b");
        return () => {
          resumeAutoLock("key-a");
          resumeAutoLock("key-b");
        };
      }, [resumeAutoLock, suspendAutoLock]);

      return null;
    }

    render(
      <AutoLockProvider>
        <DoubleHolder />
      </AutoLockProvider>,
    );

    await act(async () => {
      jest.advanceTimersByTime(INACTIVITY_LOCK_MS * 2);
    });

    expect(mockLockWallet).not.toHaveBeenCalled();
  });
});
