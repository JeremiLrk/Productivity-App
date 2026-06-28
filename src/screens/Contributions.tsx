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
  if (!day.record || day.record.minutesCompleted === 0) return "border-zinc-200 bg-zinc-100";
  if (day.record.minutesCompleted >= day.record.goalMinutes) return "border-emerald-600 bg-emerald-500";
  return "border-emerald-300 bg-emerald-200";
}

function getStatus(record?: DailyFocus) {
  if (!record || record.minutesCompleted === 0) return "No focus recorded";
  if (record.minutesCompleted >= record.goalMinutes) return "Goal hit";
  return "Partial progress";
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

  const totalMinutes = records.reduce((sum, record) => sum + record.minutesCompleted, 0);
  const goalsHit = records.filter((record) => record.minutesCompleted >= record.goalMinutes).length;
  const graphColumns = `repeat(${weeks.length}, minmax(6px, 1fr))`;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
      <div className="flex h-full w-full max-w-5xl flex-col gap-3 overflow-hidden">
        <div className="min-h-11 shrink-0 space-y-1 pl-12 xl:pl-0">
          <h1 className="text-2xl font-semibold tracking-tight">Contribution Graph</h1>
          <p className="text-sm text-muted-foreground">A 12-month view of the days you reached your focus-minute goal.</p>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Total focus</CardDescription>
              <CardTitle className="text-xl">{totalMinutes} min</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Goals hit</CardDescription>
              <CardTitle className="text-xl">{goalsHit} days</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-3">
              <CardDescription>Range</CardDescription>
              <CardTitle className="text-xl">12 months</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col rounded-lg shadow-sm">
          <CardHeader className="shrink-0 p-4 pb-2">
            <CardTitle className="text-lg">Daily Goal History</CardTitle>
            <CardDescription>Each day is judged against the goal saved for that date.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-4 pt-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading graph...</div>
            ) : (
              <>
                <div className="min-h-0 flex-1">
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
                                className={`aspect-square w-full rounded-[3px] border transition-transform ${getCellClass(day)} ${selectedKey === day.key ? "ring-2 ring-black ring-offset-1" : ""} ${day.inRange ? "hover:scale-110" : "cursor-default"}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground">
                  <span>Less</span>
                  <span className="h-3 w-3 rounded-[3px] border border-zinc-200 bg-zinc-100" />
                  <span className="h-3 w-3 rounded-[3px] border border-emerald-300 bg-emerald-200" />
                  <span className="h-3 w-3 rounded-[3px] border border-emerald-600 bg-emerald-500" />
                  <span>Goal hit</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {selectedDay && selectedDay.inRange && (
          <Card className="shrink-0 rounded-lg shadow-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-base">{formatLongDate(selectedDay.date)}</CardTitle>
              <CardDescription>{getStatus(selectedDay.record)}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm">
              {(selectedDay.record?.minutesCompleted ?? 0)} of {(selectedDay.record?.goalMinutes ?? 0)} focus minutes completed.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
