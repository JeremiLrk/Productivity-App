import { usePomodoro } from "@/hooks/usePomodoro";
import { ProgressRing } from "@/components/ProgressRing";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ProgressDots } from "@/components/ProgressDots";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

export default function Pomodoro() {
  const {
    phase,
    secondsLeft,
    running,
    start,
    pause,
    skip,
    reset,
    progress,
    settings,
    setFocusMin,
    setShortBreakMin,
    setLongBreakMin,
    setCyclesBeforeLongBreak,
    cyclesCompleted,
  } = usePomodoro();

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  const phaseLabel = phase === "focus" ? "Focus" : phase === "short" ? "Short Break" : "Long Break";

  const N = Math.max(1, settings.cyclesBeforeLongBreak);
  const completedInCycle = cyclesCompleted % N;

  // rules per phase
  const filled = phase === "long" ? N : completedInCycle;
  const activeIndex = phase === "focus" ? completedInCycle : undefined;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-black gap-5 p-6">
      <div className="text-xl font-semibold tracking-wide">{phaseLabel}</div>

      <ProgressRing value={progress} size={220} strokeWidth={10}>
        <div className="text-6xl font-mono">{minutes}:{seconds}</div>
      </ProgressRing>

      {/* Session dots */}
      <div className="flex flex-col items-center gap-2">
        <ProgressDots count={N} filled={filled} activeIndex={activeIndex} size={12} />
        <div className="text-xs text-black/70">
          {filled}/{N} focus sessions to long break
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        {!running ? (
          <Button
            variant="default"
            size="lg"
            className="gap-2 px-6 py-2 text-base font-medium rounded-full shadow-md transition-all hover:scale-[1.03] active:scale-95"
            onClick={start}
          >
            <Play className="w-4 h-4" />
            Start
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="gap-2 px-6 py-2 text-base font-medium rounded-full shadow-md transition-all hover:scale-[1.03] active:scale-95"
            onClick={pause}
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
        )}

        <Button
          variant="outline"
          size="lg"
          className="gap-2 px-6 py-2 text-base font-medium rounded-full shadow-md transition-all hover:scale-[1.03] active:scale-95"
          onClick={skip}
        >
          <SkipForward className="w-4 h-4" />
          Skip
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="gap-2 px-6 py-2 text-base font-medium rounded-full shadow-md transition-all hover:scale-[1.03] active:scale-95"
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <SettingsDialog
        settings={settings}
        setFocusMin={setFocusMin}
        setShortBreakMin={setShortBreakMin}
        setLongBreakMin={setLongBreakMin}
        setCyclesBeforeLongBreak={setCyclesBeforeLongBreak}
        disabled={running}
      />
    </div>
  );
}
