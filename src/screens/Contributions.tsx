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
  if (!day.inRange) return "bg-transparent border-transparent";
  if (!day.record || day.record.minutesCompleted === 0) return "bg-zinc-100 border-zinc-200";
  if (day.record.minutesCompleted >= day.record.goalMinutes) return "bg-emerald-500 border-emerald-600";
  return "bg-emerald-200 border-emerald-300";
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

  const selectedDay = useMemo(() => {
    if (!selectedKey) return undefined;
    return weeks.flat().find((day) => day.key === selectedKey);
  }, [selectedKey, weeks]);

  const totalMinutes = records.reduce((sum, record) => sum + record.minutesCompleted, 0);
  const goalsHit = records.filter((record) => record.minutesCompleted >= record.goalMinutes).length;
  const monthMarkers = weeks.map((week, index) => {
    const firstOfMonth = week.find((day) => day.date.getDate() <= 7 && day.inRange);
    return {
      key: week[0].key,
      label: firstOfMonth && (index === 0 || firstOfMonth.date.getDate() <= 7)
        ? MONTH_LABELS[firstOfMonth.date.getMonth()]
        : "",
    };
  });

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
      <div className="flex h-full w-full max-w-6xl flex-col gap-4 overflow-hidden">
        <div className="shrink-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contribution Graph</h1>
          <p className="text-sm text-muted-foreground">A 12-month view of the days you reached your focus-minute goal.</p>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-4">
              <CardDescription>Total focus</CardDescription>
              <CardTitle className="text-xl">{totalMinutes} min</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-4">
              <CardDescription>Goals hit</CardDescription>
              <CardTitle className="text-xl">{goalsHit} days</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="p-4">
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
                <div
                  className="grid min-h-0 flex-1 gap-x-[0.35rem] gap-y-1"
                  style={{ gridTemplateColumns: "1.8rem minmax(0, 1fr)" }}
                >
                  <div />
                  <div
                    className="grid gap-[0.18rem] text-[0.56rem] leading-none text-muted-foreground"
                    style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                  >
                    {monthMarkers.map((marker) => (
                      <div key={marker.key} className="truncate">
                        {marker.label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-rows-7 gap-[0.18rem] text-[0.55rem] leading-none text-muted-foreground">
                    {WEEKDAY_LABELS.map((label, index) => (
                      <div key={label} className="flex items-center">
                        {index % 2 === 1 ? label.slice(0, 1) : ""}
                      </div>
                    ))}
                  </div>

                  <div
                    className="grid gap-[0.18rem]"
                    style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                  >
                    {weeks.map((week) => (
                      <div key={week[0].key} className="grid grid-rows-7 gap-[0.18rem]">
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
                              className={`aspect-square w-full rounded-[2px] border transition-transform ${getCellClass(day)} ${selectedKey === day.key ? "ring-1 ring-black ring-offset-1" : ""} ${day.inRange ? "hover:scale-110" : "cursor-default"}`}
                            />
                          );
                        })}
                      </div>
                    ))}
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
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">{formatLongDate(selectedDay.date)}</CardTitle>
              <CardDescription>{getStatus(selectedDay.record)}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm">
              {(selectedDay.record?.minutesCompleted ?? 0)} of {(selectedDay.record?.goalMinutes ?? 0)} focus minutes completed.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
