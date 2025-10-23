import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import * as React from "react";

type Settings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
};

type Props = {
  settings: Settings;
  setFocusMin: (n: number) => void;
  setShortBreakMin: (n: number) => void;
  setLongBreakMin: (n: number) => void;
  setCyclesBeforeLongBreak: (n: number) => void;
  disabled?: boolean;
};

export function SettingsPanel({
  settings,
  setFocusMin,
  setShortBreakMin,
  setLongBreakMin,
  setCyclesBeforeLongBreak,
  disabled,
}: Props) {
  const inputCls = "h-9";

  // keep local string state so the user can delete/type freely
  const [focusStr, setFocusStr] = React.useState(String(settings.focusMin));
  const [shortStr, setShortStr] = React.useState(String(settings.shortBreakMin));
  const [longStr, setLongStr] = React.useState(String(settings.longBreakMin));
  const [cyclesStr, setCyclesStr] = React.useState(String(settings.cyclesBeforeLongBreak));

  // sync local state if parent settings change
  React.useEffect(() => setFocusStr(String(settings.focusMin)), [settings.focusMin]);
  React.useEffect(() => setShortStr(String(settings.shortBreakMin)), [settings.shortBreakMin]);
  React.useEffect(() => setLongStr(String(settings.longBreakMin)), [settings.longBreakMin]);
  React.useEffect(() => setCyclesStr(String(settings.cyclesBeforeLongBreak)), [settings.cyclesBeforeLongBreak]);

  // clamp helper so values always stay inside min/max
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  // commit onBlur: parse, clamp, call setter, normalize display
  const commit = (
    raw: string,
    min: number,
    max: number,
    setter: (n: number) => void,
    resetLocal: (v: string) => void,
    fallback: number
  ) => {
    if (raw.trim() === "") {
      resetLocal(String(fallback)); // revert to old if left empty
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      resetLocal(String(fallback)); // revert if invalid
      return;
    }
    const next = clamp(Math.floor(parsed), min, max);
    setter(next); // push to parent
    resetLocal(String(next)); // update local (remove leading zeros)
  };

  return (
    <div className="space-y-4">
      {/* Focus length */}
      <div className="space-y-1.5">
        <Label htmlFor="focusMin">Focus (minutes)</Label>
        <Input
          id="focusMin"
          type="number"
          min={1}
          max={180}
          value={focusStr}
          onChange={(e) => setFocusStr(e.target.value)} // update local only
          onBlur={() => commit(focusStr, 1, 180, setFocusMin, setFocusStr, settings.focusMin)}
          className={inputCls}
          disabled={disabled}
          inputMode="numeric"
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} // prevent scroll-change
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Short break */}
        <div className="space-y-1.5">
          <Label htmlFor="shortBreakMin">Short break (minutes)</Label>
          <Input
            id="shortBreakMin"
            type="number"
            min={1}
            max={60}
            value={shortStr}
            onChange={(e) => setShortStr(e.target.value)}
            onBlur={() => commit(shortStr, 1, 60, setShortBreakMin, setShortStr, settings.shortBreakMin)}
            className={inputCls}
            disabled={disabled}
            inputMode="numeric"
            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
          />
        </div>

        {/* Long break */}
        <div className="space-y-1.5">
          <Label htmlFor="longBreakMin">Long break (minutes)</Label>
          <Input
            id="longBreakMin"
            type="number"
            min={1}
            max={90}
            value={longStr}
            onChange={(e) => setLongStr(e.target.value)}
            onBlur={() => commit(longStr, 1, 90, setLongBreakMin, setLongStr, settings.longBreakMin)}
            className={inputCls}
            disabled={disabled}
            inputMode="numeric"
            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
          />
        </div>
      </div>

      <Separator />

      {/* Cycles before long break */}
      <div className="space-y-1.5">
        <Label htmlFor="cyclesBeforeLongBreak">Focus sessions before long break</Label>
        <Input
          id="cyclesBeforeLongBreak"
          type="number"
          min={1}
          max={12}
          value={cyclesStr}
          onChange={(e) => setCyclesStr(e.target.value)}
          onBlur={() =>
            commit(
              cyclesStr,
              1,
              12,
              setCyclesBeforeLongBreak,
              setCyclesStr,
              settings.cyclesBeforeLongBreak
            )
          }
          className={inputCls}
          disabled={disabled}
          inputMode="numeric"
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
      </div>
    </div>
  );
}
