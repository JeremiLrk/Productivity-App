import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFocusStats } from "@/hooks/useFocusStats";
import { useSpotify } from "@/hooks/useSpotify";
import { LogOut, Music, Pause, Play, RefreshCw, SkipBack, SkipForward, Target } from "lucide-react";

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

export default function Home() {
  const { today, loading, saving, setDailyGoal, refresh } = useFocusStats();
  const spotify = useSpotify();
  const [goalInput, setGoalInput] = useState("120");

  useEffect(() => {
    if (today) setGoalInput(String(today.goalMinutes));
  }, [today]);

  const progress = useMemo(() => {
    if (!today) return 0;
    return Math.min(100, Math.round((today.minutesCompleted / today.goalMinutes) * 100));
  }, [today]);

  const spotifyProgress = useMemo(() => {
    if (!spotify.playback.duration_ms) return 0;
    return Math.min(100, ((spotify.playback.progress_ms ?? 0) / spotify.playback.duration_ms) * 100);
  }, [spotify.playback.duration_ms, spotify.playback.progress_ms]);

  const remaining = today ? Math.max(0, today.goalMinutes - today.minutesCompleted) : 0;
  const hitGoal = today ? today.minutesCompleted >= today.goalMinutes : false;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = clampGoal(Number(goalInput));
    setGoalInput(String(next));
    await setDailyGoal(next);
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-6">
      <div className="w-full max-w-3xl space-y-5">
        <div className="space-y-2 pl-12 xl:pl-0">
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">Set your daily focus goal and keep your work soundtrack nearby.</p>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5" />
              Daily Focus Goal
            </CardTitle>
            <CardDescription>Focus minutes count while the Pomodoro is running.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading || !today ? (
              <div className="text-sm text-muted-foreground">Loading focus stats...</div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="mt-1 text-2xl font-semibold">{today.minutesCompleted} min</div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">Goal</div>
                    <div className="mt-1 text-2xl font-semibold">{today.goalMinutes} min</div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">Remaining</div>
                    <div className="mt-1 text-2xl font-semibold">{remaining} min</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{hitGoal ? "Goal hit" : "In progress"}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
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

            <Button type="button" variant="ghost" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Music className="h-5 w-5" />
              Spotify
            </CardTitle>
            <CardDescription>Connect Spotify to see and control what is playing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!spotify.playback.connected ? (
              <Button type="button" onClick={() => void spotify.connect()} disabled={spotify.loading}>
                {spotify.loading ? "Connecting..." : "Connect Spotify"}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[88px_1fr]">
                  <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-md border bg-secondary">
                    {spotify.playback.album_art_url ? (
                      <img
                        src={spotify.playback.album_art_url}
                        alt="Album cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Music className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold">
                        {spotify.playback.title ?? "Nothing playing"}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {spotify.playback.artist ?? "Open Spotify and start a track"}
                      </div>
                      {spotify.playback.album && (
                        <div className="truncate text-xs text-muted-foreground">{spotify.playback.album}</div>
                      )}
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
              </div>
            )}

            {spotify.error && <div className="text-sm text-destructive">{spotify.error}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
