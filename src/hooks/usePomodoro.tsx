import { useEffect, useMemo, useRef, useState, useCallback } from "react";

export type Phase = "focus" | "short" | "long";

export type Settings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number; // how many focus sessions before a long break
};

const DEFAULTS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
};

export function usePomodoro(initial?: Partial<Settings>) {
  // Settings
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS, ...initial });

  // State
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0); // focus blocks completed since last long break
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMin * 60);

  // Interval ref
  const intervalRef = useRef<number | null>(null);

  // Helpers
  const secondsForPhase = useCallback(
    (p: Phase) => {
      if (p === "focus") return settings.focusMin * 60;
      if (p === "short") return settings.shortBreakMin * 60;
      return settings.longBreakMin * 60;
    },
    [settings.focusMin, settings.shortBreakMin, settings.longBreakMin]
  );

  const totalThisPhase = useMemo(() => secondsForPhase(phase), [phase, secondsForPhase]);

  const computeNextPhaseFromFocus = useCallback((): Phase => {
    const comingUp = cyclesCompleted + 1; // we’re finishing a focus
    return comingUp % Math.max(1, settings.cyclesBeforeLongBreak) === 0 ? "long" : "short";
  }, [cyclesCompleted, settings.cyclesBeforeLongBreak]);

  // Ticking
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Decide next phase
          let nextPhase: Phase;
          if (phase === "focus") {
            nextPhase = computeNextPhaseFromFocus();
          } else {
            nextPhase = "focus";
          }

          // Update counters when finishing a focus
          if (phase === "focus") {
            setCyclesCompleted((c) => c + 1);
          }

          setPhase(nextPhase);
          return secondsForPhase(nextPhase);
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, phase, computeNextPhaseFromFocus, secondsForPhase]);

  // Controls
  const start = useCallback(() => {
    if (secondsLeft <= 0) {
      setSecondsLeft(totalThisPhase);
    }
    setRunning(true);
  }, [secondsLeft, totalThisPhase]);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase("focus");
    setCyclesCompleted(0);
    setSecondsLeft(secondsForPhase("focus"));
  }, [secondsForPhase]);

  const skip = useCallback(() => {
    // emulate “time’s up” transition
    let next: Phase;
    if (phase === "focus") {
      next = computeNextPhaseFromFocus();
      setCyclesCompleted((c) => c + 1);
    } else {
      next = "focus";
    }
    setPhase(next);
    setSecondsLeft(secondsForPhase(next));
    setRunning(true);
  }, [phase, computeNextPhaseFromFocus, secondsForPhase]);

  // Settings: convenient per-field setters (so your SettingsPanel can plug right in)
  const setFocusMin = useCallback(
    (n: number) => setSettings((s) => ({ ...s, focusMin: Math.max(0, n) })),
    []
  );
  const setShortBreakMin = useCallback(
    (n: number) => setSettings((s) => ({ ...s, shortBreakMin: Math.max(0, n) })),
    []
  );
  const setLongBreakMin = useCallback(
    (n: number) => setSettings((s) => ({ ...s, longBreakMin: Math.max(0, n) })),
    []
  );
  const setCyclesBeforeLongBreak = useCallback(
    (n: number) => setSettings((s) => ({ ...s, cyclesBeforeLongBreak: Math.max(1, n) })),
    []
  );

  // Keep seconds in sync when NOT running (changing settings shouldn’t yank a live timer)
  useEffect(() => {
    if (!running) {
      setSecondsLeft(secondsForPhase(phase));
    }
  }, [running, phase, secondsForPhase]);

  // Progress
  const progress = totalThisPhase === 0 ? 0 : ((totalThisPhase - secondsLeft) / totalThisPhase) * 100;

  return {
    // state
    phase,
    running,
    secondsLeft,
    totalThisPhase,
    cyclesCompleted,
    progress,

    // settings
    settings,
    setSettings,
    setFocusMin,
    setShortBreakMin,
    setLongBreakMin,
    setCyclesBeforeLongBreak,

    // controls
    start,
    pause,
    reset,
    skip,
  };
}
