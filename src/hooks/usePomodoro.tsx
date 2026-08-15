import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  DEFAULT_POMODORO_SETTINGS,
  getPomodoroSettings,
  setPomodoroSettings,
  type PomodoroSettings,
} from "@/lib/appSettings";

export type Phase = "focus" | "short" | "long";

export type Settings = PomodoroSettings;

type UsePomodoroOptions = {
  onFocusMinute?: (minutes: number) => void | Promise<void>;
};

export type PomodoroController = ReturnType<typeof usePomodoro>;

export function usePomodoro(initial?: Partial<Settings>, options?: UsePomodoroOptions) {
  // Settings
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_POMODORO_SETTINGS, ...initial });

  // State
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0); // focus blocks completed since last long break
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMin * 60);

  // Interval ref
  const intervalRef = useRef<number | null>(null);
  const focusedSecondsRef = useRef(0);
  const onFocusMinuteRef = useRef<UsePomodoroOptions["onFocusMinute"]>(options?.onFocusMinute);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void getPomodoroSettings().then((storedSettings) => {
      if (cancelled) return;
      settingsLoadedRef.current = true;
      setSettings({ ...storedSettings, ...initial });
    });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    void setPomodoroSettings(settings);
  }, [settings]);

  useEffect(() => {
    onFocusMinuteRef.current = options?.onFocusMinute;
  }, [options?.onFocusMinute]);

  const recordFocusMinute = useCallback((minutes: number) => {
    void onFocusMinuteRef.current?.(minutes);
  }, []);

  const clearFocusedSeconds = useCallback(() => {
    focusedSecondsRef.current = 0;
  }, []);

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
    const comingUp = cyclesCompleted + 1; // finishing a focus
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
        if (phase === "focus") {
          focusedSecondsRef.current += 1;
          if (focusedSecondsRef.current >= 60) {
            const minutesToAdd = Math.floor(focusedSecondsRef.current / 60);
            focusedSecondsRef.current %= 60;
            recordFocusMinute(minutesToAdd);
          }
        }

        if (s <= 1) {
          let nextPhase: Phase;
          if (phase === "focus") {
            nextPhase = computeNextPhaseFromFocus();
          } else {
            nextPhase = "focus";
          }

          if (phase === "focus") {
            setCyclesCompleted((c) => c + 1);
            clearFocusedSeconds();
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
  }, [running, phase, computeNextPhaseFromFocus, secondsForPhase, recordFocusMinute, clearFocusedSeconds]);

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
    clearFocusedSeconds();
    setSecondsLeft(secondsForPhase("focus"));
  }, [secondsForPhase, clearFocusedSeconds]);

  const skip = useCallback(() => {
    let next: Phase;
    if (phase === "focus") {
      next = computeNextPhaseFromFocus();
      setCyclesCompleted((c) => c + 1);
      clearFocusedSeconds();
    } else {
      next = "focus";
    }
    setPhase(next);
    setSecondsLeft(secondsForPhase(next));
    setRunning(true);
  }, [phase, computeNextPhaseFromFocus, secondsForPhase, clearFocusedSeconds]);

  // Settings: convenient per-field setters
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

  const previousSettingsRef = useRef(settings);

  // Keep seconds in sync when settings change while idle. Pausing should preserve remaining time.
  useEffect(() => {
    const previousSettings = previousSettingsRef.current;
    const settingsChanged =
      previousSettings.focusMin !== settings.focusMin ||
      previousSettings.shortBreakMin !== settings.shortBreakMin ||
      previousSettings.longBreakMin !== settings.longBreakMin;

    previousSettingsRef.current = settings;

    if (!running && settingsChanged) {
      clearFocusedSeconds();
      setSecondsLeft(secondsForPhase(phase));
    }
  }, [phase, running, secondsForPhase, settings, clearFocusedSeconds]);

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
