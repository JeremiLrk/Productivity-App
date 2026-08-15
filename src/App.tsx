import { useCallback, useState } from "react";
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
import { Pause } from "lucide-react";

type View = "home" | "pomodoro" | "todo" | "contrib" | "settings";

type MiniTimerProps = {
  timer: PomodoroController;
  onOpenPomodoro: () => void;
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

function MiniTimer({ timer, onOpenPomodoro }: MiniTimerProps) {
  if (!timer.running) return null;

  return (
    <div className="fixed right-4 top-4 z-[55] flex items-center gap-3 rounded-lg border bg-background/95 px-3 py-2 text-foreground shadow-lg backdrop-blur">
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

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="fixed left-3 top-3 z-[60]">
        <Hamburger active={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
      </div>

      {view !== "pomodoro" && <MiniTimer timer={timer} onOpenPomodoro={() => setView("pomodoro")} />}

      <main className="grid h-full w-full place-items-center overflow-hidden">
        {view === "home" && <Home timer={timer} onOpenPomodoro={() => setView("pomodoro")} />}
        {view === "pomodoro" && <Pomodoro timer={timer} />}
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
