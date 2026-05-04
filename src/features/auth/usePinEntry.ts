import { useCallback, useEffect, useRef, useState } from "react";

type UsePinEntryOptions = {
  length: number;
  onComplete?: (pin: string) => void;
};

export function usePinEntry({ length, onComplete }: UsePinEntryOptions) {
  const [pin, setPin] = useState("");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const append = useCallback(
    (digit: string) => {
      setPin((prev) => (prev.length < length ? prev + digit : prev));
    },
    [length],
  );

  const backspace = useCallback(() => setPin((prev) => prev.slice(0, -1)), []);

  const clear = useCallback(() => setPin(""), []);

  useEffect(() => {
    if (pin.length === length) {
      onCompleteRef.current?.(pin);
    }
  }, [pin, length]);

  return { append, backspace, clear, isComplete: pin.length === length, pin };
}
