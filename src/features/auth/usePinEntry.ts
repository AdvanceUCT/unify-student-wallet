import { useCallback, useEffect, useRef, useState } from "react";

type UsePinEntryOptions = {
  maxLength: number;
  minLength: number;
  onComplete?: (pin: string) => void;
};

export function usePinEntry({ maxLength, minLength, onComplete }: UsePinEntryOptions) {
  const [pin, setPin] = useState("");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const canSubmit = pin.length >= minLength && pin.length <= maxLength;

  const append = useCallback(
    (digit: string) => {
      setPin((prev) => (prev.length < maxLength ? prev + digit : prev));
    },
    [maxLength],
  );

  const backspace = useCallback(() => setPin((prev) => prev.slice(0, -1)), []);

  const clear = useCallback(() => setPin(""), []);

  const submit = useCallback(() => {
    if (canSubmit) {
      onCompleteRef.current?.(pin);
    }
  }, [canSubmit, pin]);

  useEffect(() => {
    if (pin.length === maxLength) {
      onCompleteRef.current?.(pin);
    }
  }, [pin, maxLength]);

  return { append, backspace, canSubmit, clear, isComplete: pin.length === maxLength, pin, submit };
}
