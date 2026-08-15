import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  LogOut,
  Music,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Target,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFocusStats } from "@/hooks/useFocusStats";
import { useSpotify } from "@/hooks/useSpotify";
import { useTasks } from "@/hooks/useTasks";
import type { PomodoroController } from "@/hooks/usePomodoro";
import { getFocusDaysSince, type DailyFocus } from "@/lib/focusStats";

const DAY_MS = 24 * 60 * 60 * 1000;

type HomeProps = {
  timer: PomodoroController;
  onOpenPomodoro: () => void;
};

function clampGoal(minutes: number) {
  if (!Number.isFinite(minutes)) return 120;
  return Math.min(1440, Math.max(1, Math.floor(minutes)));
}

function formatMs(ms?: number | null) {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatTimer(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function hitGoal(record?: DailyFocus) {
  return !!record && record.minutesCompleted >= record.goalMinutes;
}

function getCurrentStreak(records: DailyFocus[]) {
  const recordByDate = new Map(records.map((record) => [record.date, record]));
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const key = localDateString(dateDaysAgo(offset));
    if (!hitGoal(recordByDate.get(key))) break;
    streak += 1;
  }

  return streak;
}

function phaseLabel(phase: PomodoroController["phase"]) {
  if (phase === "focus") return "Focus";
  if (phase === "short") return "Short Break";
  return "Long Break";
}

export default function Home({ timer, onOpenPomodoro }: HomeProps) {
  const { today, loading, saving, setDailyGoal } = useFocusStats();
  const { tasks, loading: tasksLoading } = useTasks();
  const spotify = useSpotify();
  const [goalInput, setGoalInput] = useState("120");
  const [focusRecords, setFocusRecords] = useState<DailyFocus[]>([]);

  useEffect(() => {
    if (today) setGoalInput(String(today.goalMinutes));
  }, [today]);

  useEffect(() => {
    void getFocusDaysSince(localDateString(dateDaysAgo(364))).then(setFocusRecords);
  }, [today]);

  const progress = useMemo(() => {
    if (!today) return 0;
    return Math.min(100, Math.round((today.minutesCompleted / today.goalMinutes) * 100));
  }, [today]);

  const spotifyProgress = useMemo(() => {
    if (!spotify.playback.duration_ms) return 0;
    return Math.min(100, ((spotify.playback.progress_ms ?? 0) / spotify.playback.duration_ms) * 100);
  }, [spotify.playback.duration_ms, spotify.playback.progress_ms]);

  const weeklyMinutes = useMemo(() => {
    const since = dateDaysAgo(6).getTime();
    return focusRecords
      .filter((record) => new Date(`${record.date}T00:00:00`).getTime() >= since)
      .reduce((sum, record) => sum + record.minutesCompleted, 0);
  }, [focusRecords]);

  const currentStreak = useMemo(() => getCurrentStreak(focusRecords), [focusRecords]);
  const remaining = today ? Math.max(0, today.goalMinutes - today.minutesCompleted) : 0;
  const nextTask = tasks.find((task) => !task.done && task.status === "in_progress") ?? tasks.find((task) => !task.done);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = clampGoal(Number(goalInput));
    setGoalInput(String(next));
    await setDailyGoal(next);
  }

  return (
    <div className="h-full w-full overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
        <div className="shrink-0 space-y-1 pl-12 xl:pl-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Today</h1>
          <p className="text-sm text-muted-foreground">Your focus command center for the day.</p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[1.35fr_1fr]">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Focus Progress
                </CardTitle>
                <CardDescription>Focus minutes count while Pomodoro focus is running.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading || !today ? (
                  <div className="text-sm text-muted-foreground">Loading focus stats...</div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Completed</div>
                        <div className="mt-1 text-2xl font-semibold">{today.minutesCompleted}</div>
                        <div className="text-xs text-muted-foreground">minutes</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Remaining</div>
                        <div className="mt-1 text-2xl font-semibold">{remaining}</div>
                        <div className="text-xs text-muted-foreground">minutes</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Streak</div>
                        <div className="mt-1 text-2xl font-semibold">{currentStreak}</div>
                        <div className="text-xs text-muted-foreground">days</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">This week</div>
                        <div className="mt-1 text-2xl font-semibold">{Math.round(weeklyMinutes / 60)}</div>
                        <div className="text-xs text-muted-foreground">hours</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{today.minutesCompleted >= today.goalMinutes ? "Goal hit" : "In progress"}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-1.5">
                        <Label htmlFor="dailyGoal">Daily goal minutes</Label>
                        <Input
                          id="dailyGoal"
                          type="number"
                          min={1}
                          max={1440}
                          value={goalInput}
                          onChange={(event) => setGoalInput(event.target.value)}
                          onBlur={() => setGoalInput(String(clampGoal(Number(goalInput))))}
                          inputMode="numeric"
                          onWheel={(event) => event.currentTarget.blur()}
                        />
                      </div>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving" : "Save Goal"}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Timer className="h-5 w-5" />
                    Timer
                  </CardTitle>
                  <CardDescription>{timer.running ? "Running now" : "Ready when you are"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">{phaseLabel(timer.phase)}</div>
                      <div className="font-mono text-4xl font-semibold">{formatTimer(timer.secondsLeft)}</div>
                    </div>
                    <Button type="button" onClick={onOpenPomodoro}>
                      Open
                    </Button>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${timer.progress}%` }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ListTodo className="h-5 w-5" />
                    Next Task
                  </CardTitle>
                  <CardDescription>{tasksLoading ? "Loading tasks" : `${tasks.filter((task) => !task.done).length} open tasks`}</CardDescription>
                </CardHeader>
                <CardContent>
                  {nextTask ? (
                    <div className="space-y-2">
                      <div className="max-h-14 overflow-hidden text-lg font-semibold">{nextTask.title}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-md border px-2 py-1 capitalize">{nextTask.priority}</span>
                        <span className="rounded-md border px-2 py-1 capitalize">{nextTask.status.replace("_", " ")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      No open task queued.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="h-5 w-5" />
                  Spotify
                </CardTitle>
                <CardDescription>Current soundtrack and quick controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!spotify.playback.connected ? (
                  <Button type="button" onClick={() => void spotify.connect()} disabled={spotify.loading}>
                    {spotify.loading ? "Connecting..." : "Connect Spotify"}
                  </Button>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-[76px_1fr]">
                      <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-md border bg-secondary">
                        {spotify.playback.album_art_url ? (
                          <img src={spotify.playback.album_art_url} alt="Album cover" className="h-full w-full object-cover" />
                        ) : (
                          <Music className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold">{spotify.playback.title ?? "Nothing playing"}</div>
                          <div className="truncate text-sm text-muted-foreground">
                            {spotify.playback.artist ?? "Open Spotify and start a track"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatMs(spotify.playback.progress_ms)}</span>
                            <span>{formatMs(spotify.playback.duration_ms)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${spotifyProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="icon" aria-label="Previous track" onClick={() => void spotify.previous()}>
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      {spotify.playback.is_playing ? (
                        <Button type="button" variant="outline" size="icon" aria-label="Pause Spotify" onClick={() => void spotify.pause()}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="icon" aria-label="Resume Spotify" onClick={() => void spotify.resume()}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="icon" aria-label="Next track" onClick={() => void spotify.next()}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Refresh Spotify" onClick={() => void spotify.refresh()}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" className="ml-auto" onClick={() => void spotify.disconnect()}>
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </Button>
                    </div>
                  </>
                )}

                {spotify.error && <div className="text-sm text-destructive">{spotify.error}</div>}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" />
                  Weekly Summary
                </CardTitle>
                <CardDescription>Last 7 local calendar days.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="mt-1 text-xl font-semibold">{weeklyMinutes} min</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Average</div>
                  <div className="mt-1 text-xl font-semibold">{Math.round(weeklyMinutes / 7)} min</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Goal days</div>
                  <div className="mt-1 text-xl font-semibold">
                    {focusRecords.filter((record) => new Date(`${record.date}T00:00:00`).getTime() >= Date.now() - 6 * DAY_MS && hitGoal(record)).length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" />
                  Focus Rhythm
                </CardTitle>
                <CardDescription>Small signal, useful direction.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {currentStreak > 0
                  ? `You are on a ${currentStreak}-day streak. Keep today protected.`
                  : "Hit today's focus goal to start a new streak."}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
