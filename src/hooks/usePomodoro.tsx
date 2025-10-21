import { useEffect, useMemo, useRef, useState, useCallback } from "react";

export type Phase = "focus" | "break";

export type Settings = {
  focusMin: number;
  breakMin: number;
};

const DEFAULTS: Settings = { focusMin: 25, breakMin: 1 };

export function usePomodoro(initial? : Partial<Settings>) {
    //Settings
    const [settings, setSettings] = useState<Settings>({ ...DEFAULTS, ...initial });
    //States
    const [phase, setPhase] = useState<Phase>('focus');
    const [running, setRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(settings.focusMin * 60);
    //Keep interval id so we can clear it later
    const intervalRef = useRef<number | null>(null);

    //total seconds for current phase
    const totalThisPhase = useMemo(() => {
        return phase === 'focus' ? settings.focusMin * 60 : settings.breakMin * 60;
    }, [phase, settings.focusMin, settings.breakMin]);

    //ticking
    useEffect(() => {
      if (!running) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
    
      // plain 1 sec tick
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            const nextPhase = phase === "focus" ? "break" : "focus";
            setPhase(nextPhase);
            const nextSeconds =
              (nextPhase === "focus" ? settings.focusMin : settings.breakMin) * 60;
            return nextSeconds;
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
    }, [running, phase, settings.focusMin, settings.breakMin]);
    

    //start the timer
    // 1) wrap actions
    const start = useCallback(() => {
      if (secondsLeft <= 0) {
        setSecondsLeft((phase === "focus" ? settings.focusMin : settings.breakMin) * 60);
      }
      setRunning(true);
    }, [phase, secondsLeft, settings.focusMin, settings.breakMin]);

    const pause = useCallback(() => setRunning(false), []);

    const reset = useCallback(() => {
      setRunning(false);
      setSecondsLeft(phase === "focus" ? settings.focusMin * 60 : settings.breakMin * 60);
    }, [phase, settings.focusMin, settings.breakMin]);

    const skip = useCallback(() => {
      const nextPhase = phase === "focus" ? "break" : "focus";
      setPhase(nextPhase);
      setSecondsLeft((nextPhase === "focus" ? settings.focusMin : settings.breakMin) * 60);
      setRunning(true);
    }, [phase, settings.focusMin, settings.breakMin]);

    // 2) paused settings sync
    useEffect(() => {
      if (!running) {
        setSecondsLeft((phase === "focus" ? settings.focusMin : settings.breakMin) * 60);
      }
    }, [settings.focusMin, settings.breakMin, phase, running]);

    const progress =
      totalThisPhase === 0
      ? 0
      : ((totalThisPhase - secondsLeft) / totalThisPhase) * 100;

    // 3) return the API
    return {
      settings, setSettings,
      phase, running, secondsLeft, totalThisPhase,
      progress,
      start, pause, reset, skip,
    };
}