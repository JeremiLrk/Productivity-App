import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import "./app.css";
import Hamburger from "./components/Burger";
import Sidebar from "./components/Sidebar";
import Home from "./screens/Home";
import Contributions from "./screens/Contributions";
import Pomodoro from "./screens/Pomodoro";
import Todo from "./screens/Todo";
import Settings from "./screens/Settings";
import { Button } from "./components/ui/button";
import { usePomodoro, type PomodoroController } from "./hooks/usePomodoro";
import { useThemePreference } from "./hooks/useThemePreference";
import { addFocusMinutesForToday } from "./lib/focusStats";
import { ExternalLink, Pause } from "lucide-react";

type View = "home" | "pomodoro" | "todo" | "contrib" | "settings";

type MiniTimerProps = {
  timer: PomodoroController;
  onOpenPomodoro: () => void;
  onOpenPopout: () => void;
};

function formatTime(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function phaseLabel(phase: PomodoroController["phase"]) {
  if (phase === "focus") return "Focus";
  if (phase === "short") return "Short Break";
  return "Long Break";
}

function MiniTimer({ timer, onOpenPomodoro, onOpenPopout }: MiniTimerProps) {
  if (!timer.running) return null;

  return (
    <div className="group fixed right-4 top-4 z-[55] flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-foreground shadow-lg backdrop-blur">
      <button type="button" onClick={onOpenPomodoro} className="text-left">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {phaseLabel(timer.phase)}
        </div>
        <div className="font-mono text-xl font-semibold leading-none">{formatTime(timer.secondsLeft)}</div>
      </button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Pause timer"
        onClick={timer.pause}
      >
        <Pause className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Open timer pop-out"
        onClick={onOpenPopout}
        className="h-8 w-8 opacity-60 transition-opacity group-hover:opacity-100"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const { theme, setTheme } = useThemePreference();

  const handleFocusMinute = useCallback(async (minutes: number) => {
    await addFocusMinutesForToday(minutes);
  }, []);

  const timer = usePomodoro(undefined, { onFocusMinute: handleFocusMinute });
  const publishTimerSnapshot = useCallback(() => {
    const snapshot = {
      phase: timer.phase,
      running: timer.running,
      secondsLeft: timer.secondsLeft,
      totalThisPhase: timer.totalThisPhase,
      progress: timer.progress,
    };

    window.localStorage.setItem("lock-in-timer-snapshot", JSON.stringify(snapshot));
    void emitTo("timer-popout", "timer-snapshot", snapshot);
  }, [timer.phase, timer.running, timer.secondsLeft, timer.totalThisPhase, timer.progress]);

  const openTimerPopout = useCallback(() => {
    void invoke("open_timer_popout").then(() => {
      window.setTimeout(publishTimerSnapshot, 100);
    });
  }, [publishTimerSnapshot]);

  useEffect(() => {
    publishTimerSnapshot();
  }, [publishTimerSnapshot]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="fixed left-3 top-3 z-[60]">
        <Hamburger active={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
      </div>

      {view !== "pomodoro" && (
        <MiniTimer
          timer={timer}
          onOpenPomodoro={() => setView("pomodoro")}
          onOpenPopout={openTimerPopout}
        />
      )}

      <main className="grid h-full w-full place-items-center overflow-hidden">
        {view === "home" && <Home timer={timer} onOpenPomodoro={() => setView("pomodoro")} />}
        {view === "pomodoro" && <Pomodoro timer={timer} onOpenPopout={openTimerPopout} />}
        {view === "todo" && <Todo />}
        {view === "contrib" && <Contributions />}
        {view === "settings" && <Settings timer={timer} theme={theme} setTheme={setTheme} />}
      </main>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(v) => {
          setView(v);
          setMenuOpen(false);
        }}
      />
    </div>
  );
}
