import { useCallback, useEffect, useRef, useState } from "react";

import {
  extractOobInvitation,
  initiateHandshake,
  pollHandshakePhase,
  type HandshakePhase,
} from "./connectionHandshake";

export type { EstablishedConnection, HandshakePhase } from "./connectionHandshake";

const POLL_INTERVAL_MS = 1_000;
const HANDSHAKE_TIMEOUT_MS = 30_000;

const TERMINAL_PHASES = new Set<HandshakePhase>(["completed", "abandoned", "failed"]);

export type ConnectionHandshakeHook = {
  beginHandshake: (rawUrl: string) => void;
  error: string | null;
  issuerLabel: string | null;
  phase: HandshakePhase;
  reset: () => void;
};

export function useConnectionHandshake(): ConnectionHandshakeHook {
  const [phase, setPhase] = useState<HandshakePhase>("idle");
  const [issuerLabel, setIssuerLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingConnectionId, setPollingConnectionId] = useState<string | null>(null);

  const deadlineRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effect-driven polling: re-schedules itself after each phase update until a terminal phase is reached.
  useEffect(() => {
    if (!pollingConnectionId || phase === "idle" || TERMINAL_PHASES.has(phase)) {
      return;
    }

    if (Date.now() >= deadlineRef.current) {
      setPhase("failed");
      setError("Connection timed out. The university agent did not respond in time.");
      return;
    }

    const timerId = setTimeout(async () => {
      if (!isMountedRef.current) return;

      const nextPhase = await pollHandshakePhase(pollingConnectionId);

      if (!isMountedRef.current) return;

      if (nextPhase === "abandoned") {
        setError("The university agent rejected the connection request.");
      }

      setPhase(nextPhase);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timerId);
  }, [phase, pollingConnectionId]);

  const beginHandshake = useCallback((rawUrl: string) => {
    setError(null);
    setPollingConnectionId(null);

    const invitationUrl = extractOobInvitation(rawUrl);

    if (!invitationUrl) {
      setPhase("failed");
      setError("The QR code does not contain a valid DIDComm invitation.");
      return;
    }

    setPhase("invited");

    void (async () => {
      try {
        const { connectionId, issuerLabel: label } = await initiateHandshake(invitationUrl);

        if (!isMountedRef.current) return;

        setIssuerLabel(label);
        deadlineRef.current = Date.now() + HANDSHAKE_TIMEOUT_MS;
        setPollingConnectionId(connectionId);
        setPhase("requesting");
      } catch (err) {
        if (!isMountedRef.current) return;

        setPhase("failed");
        setError(err instanceof Error ? err.message : "Failed to connect to the university agent.");
      }
    })();
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setIssuerLabel(null);
    setPollingConnectionId(null);
  }, []);

  return { beginHandshake, error, issuerLabel, phase, reset };
}
