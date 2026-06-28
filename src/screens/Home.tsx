import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFocusStats } from "@/hooks/useFocusStats";
import { Target } from "lucide-react";

function clampGoal(minutes: number) {
  if (!Number.isFinite(minutes)) return 120;
  return Math.min(1440, Math.max(1, Math.floor(minutes)));
}

export default function Home() {
  const { today, loading, saving, setDailyGoal, refresh } = useFocusStats();
  const [goalInput, setGoalInput] = useState("120");

  useEffect(() => {
    if (today) setGoalInput(String(today.goalMinutes));
  }, [today]);

  const progress = useMemo(() => {
    if (!today) return 0;
    return Math.min(100, Math.round((today.minutesCompleted / today.goalMinutes) * 100));
  }, [today]);

  const remaining = today ? Math.max(0, today.goalMinutes - today.minutesCompleted) : 0;
  const hitGoal = today ? today.minutesCompleted >= today.goalMinutes : false;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = clampGoal(Number(goalInput));
    setGoalInput(String(next));
    await setDailyGoal(next);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">Set your daily focus goal and watch completed Pomodoro sessions fill it.</p>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5" />
              Daily Focus Goal
            </CardTitle>
            <CardDescription>Completed focus sessions count toward today.</CardDescription>
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
      </div>
    </div>
  );
}
