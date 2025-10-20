import { usePomodoro } from "../hooks/usePomodoro";
import { ProgressRing

 } from "../components/ProgressRing";
export default function Pomodoro() {
  const { secondsLeft, running, start, pause, skip, progress } = usePomodoro();

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black">
      {/* Timer */}
      <ProgressRing value={progress} size={220} strokeWidth={10}>
        <div className="text-6xl font-mono">{minutes}:{seconds}</div>
      </ProgressRing>

      {/* Buttons */}
      <div className="flex gap-4 mt-6">
        {!running ? (
          <button
            onClick={start}
            className="text-black border border-black px-4 py-2 rounded hover:bg-gray-100 hover:text-black transition"
          >
            Start
          </button>
        ) : (
          <button
            onClick={pause}
            className="text-black border border-black px-4 py-2 rounded hover:bg-gray-100 hover:text-black transition"
          >
            Pause
          </button>
        )}
        <button
          onClick={skip}
          className="text-black border border-black px-4 py-2 rounded hover:bg-gray-100 hover:text-black transition"
          >
          Skip
        </button>
      </div>
    </div>
  );
}
