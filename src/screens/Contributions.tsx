import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFocusDaysSince, type DailyFocus } from "@/lib/focusStats";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type GraphDay = {
  date: Date;
  key: string;
  record?: DailyFocus;
  inRange: boolean;
};

type MonthMarker = {
  key: string;
  label: string;
  weekIndex: number;
};

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCellClass(day: GraphDay) {
  if (!day.inRange) return "border-transparent bg-transparent";
  if (!day.record || day.record.minutesCompleted === 0) return "border-border bg-secondary";
  if (day.record.minutesCompleted >= day.record.goalMinutes) return "border-emerald-600 bg-emerald-500";
  return "border-emerald-300 bg-emerald-200";
}

function getStatus(record?: DailyFocus) {
  if (!record || record.minutesCompleted === 0) return "No focus recorded";
  if (record.minutesCompleted >= record.goalMinutes) return "Goal hit";
  return "Partial progress";
}

function hitGoal(record?: DailyFocus) {
  return !!record && record.minutesCompleted >= record.goalMinutes;
}

function calculateCurrentStreak(recordByDate: Map<string, DailyFocus>, today: Date) {
  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const date = addDays(today, -offset);
    if (!hitGoal(recordByDate.get(toLocalDateString(date)))) break;
    streak += 1;
  }
  return streak;
}

function calculateLongestStreak(days: GraphDay[]) {
  let longest = 0;
  let current = 0;

  days.forEach((day) => {
    if (day.inRange && hitGoal(day.record)) {
      current += 1;
      longest = Math.max(longest, current);
      return;
    }

    current = 0;
  });

  return longest;
}

export default function Contributions() {
  const [records, setRecords] = useState<DailyFocus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const firstRangeDay = useMemo(() => addDays(today, -364), [today]);
  const graphStart = useMemo(() => addDays(firstRangeDay, -firstRangeDay.getDay()), [firstRangeDay]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getFocusDaysSince(toLocalDateString(firstRangeDay));
      setRecords(data);
      setLoading(false);
    }

    void load();
  }, [firstRangeDay]);

  const recordByDate = useMemo(() => {
    return new Map(records.map((record) => [record.date, record]));
  }, [records]);

  const weeks = useMemo(() => {
    const daysBetween = Math.floor((today.getTime() - graphStart.getTime()) / DAY_MS) + 1;
    const totalCells = Math.ceil(daysBetween / 7) * 7;
    const days: GraphDay[] = Array.from({ length: totalCells }, (_, index) => {
      const date = addDays(graphStart, index);
      const key = toLocalDateString(date);
      return {
        date,
        key,
        record: recordByDate.get(key),
        inRange: date >= firstRangeDay && date <= today,
      };
    });

    const result: GraphDay[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      result.push(days.slice(index, index + 7));
    }
    return result;
  }, [firstRangeDay, graphStart, recordByDate, today]);

  const monthMarkers = useMemo<MonthMarker[]>(() => {
    const seen = new Set<string>();

    return weeks.flatMap((week, weekIndex) => {
      const monthStart = week.find((day) => day.inRange && day.date.getDate() <= 7);
      if (!monthStart) return [];

      const key = `${monthStart.date.getFullYear()}-${monthStart.date.getMonth()}`;
      if (seen.has(key)) return [];
      seen.add(key);

      return [{ key, label: MONTH_LABELS[monthStart.date.getMonth()], weekIndex }];
    });
  }, [weeks]);

  const selectedDay = useMemo(() => {
    if (!selectedKey) return undefined;
    return weeks.flat().find((day) => day.key === selectedKey);
  }, [selectedKey, weeks]);

  const graphDays = useMemo(() => weeks.flat(), [weeks]);
  const totalMinutes = records.reduce((sum, record) => sum + record.minutesCompleted, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const goalsHit = records.filter((record) => record.minutesCompleted >= record.goalMinutes).length;
  const currentStreak = calculateCurrentStreak(recordByDate, today);
  const longestStreak = calculateLongestStreak(graphDays);
  const bestDay = records.reduce<DailyFocus | undefined>((best, record) => {
    if (!best || record.minutesCompleted > best.minutesCompleted) return record;
    return best;
  }, undefined);
  const weeklyAverage = Math.round(totalMinutes / 52);
  const graphColumns = `repeat(${weeks.length}, minmax(5px, 1fr))`;

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden p-4">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3">
        <div className="min-h-11 shrink-0 space-y-1 pl-12 xl:pl-0">
          <h1 className="text-2xl font-semibold tracking-tight">Contribution Graph</h1>
          <p className="text-sm text-muted-foreground">A 12-month view of the days you reached your focus-minute goal.</p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Total focus</CardDescription>
              <CardTitle className="text-xl">{totalHours}h</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Current streak</CardDescription>
              <CardTitle className="text-xl">{currentStreak}d</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Longest streak</CardDescription>
              <CardTitle className="text-xl">{longestStreak}d</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Best day</CardDescription>
              <CardTitle className="text-xl">{bestDay ? `${bestDay.minutesCompleted}m` : "0m"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Weekly avg</CardDescription>
              <CardTitle className="text-xl">{weeklyAverage}m</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="flex min-h-[24rem] flex-1 flex-col rounded-lg shadow-sm">
          <CardHeader className="shrink-0 p-4 pb-2">
            <CardTitle className="text-lg">Daily Goal History</CardTitle>
            <CardDescription>{goalsHit} goal days. Each day is judged against the goal saved for that date.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading graph...</div>
            ) : (
              <>
                <div className="min-h-0 shrink-0">
                  <div className="grid gap-x-2" style={{ gridTemplateColumns: "2rem minmax(0, 1fr)" }}>
                    <div />
                    <div className="relative mb-2 h-4">
                      <div className="grid h-full" style={{ gridTemplateColumns: graphColumns }}>
                        {monthMarkers.map((marker) => (
                          <div
                            key={marker.key}
                            className="whitespace-nowrap text-[10px] leading-4 text-muted-foreground"
                            style={{ gridColumn: `${marker.weekIndex + 1} / span 4` }}
                          >
                            {marker.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-none text-muted-foreground">
                      {WEEKDAY_LABELS.map((label, index) => (
                        <div key={label} className="flex h-3 items-center">
                          {index % 2 === 1 ? label : ""}
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-[3px]" style={{ gridTemplateColumns: graphColumns }}>
                      {weeks.map((week) => (
                        <div key={week[0].key} className="grid grid-rows-7 gap-[3px]">
                          {week.map((day) => {
                            const label = `${formatLongDate(day.date)}: ${day.record?.minutesCompleted ?? 0}/${day.record?.goalMinutes ?? "-"} min - ${getStatus(day.record)}`;
                            return (
                              <button
                                key={day.key}
                                type="button"
                                title={day.inRange ? label : ""}
                                aria-label={day.inRange ? label : undefined}
                                disabled={!day.inRange}
                                onClick={() => setSelectedKey(day.key)}
                                className={`aspect-square w-full rounded-[3px] border transition-colors ${getCellClass(day)} ${selectedKey === day.key ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : ""} ${day.inRange ? "hover:border-ring" : "cursor-default"}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground">
                    <span>Less</span>
                    <span className="h-3 w-3 rounded-[3px] border border-border bg-secondary" />
                    <span className="h-3 w-3 rounded-[3px] border border-emerald-300 bg-emerald-200" />
                    <span className="h-3 w-3 rounded-[3px] border border-emerald-600 bg-emerald-500" />
                    <span>Goal hit</span>
                  </div>
                </div>

                <div className="min-h-20 shrink-0 rounded-lg border bg-secondary/40 p-3">
                  {selectedDay && selectedDay.inRange ? (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{formatLongDate(selectedDay.date)}</div>
                      <div className="text-xs text-muted-foreground">{getStatus(selectedDay.record)}</div>
                      <div className="pt-2 text-sm">
                        {(selectedDay.record?.minutesCompleted ?? 0)} of {(selectedDay.record?.goalMinutes ?? 0)} focus minutes completed.
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Select a day to inspect its saved goal and focus minutes.</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
