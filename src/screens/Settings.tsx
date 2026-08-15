import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Download, LogOut, Music, Palette, RotateCcw, Save, Timer, Trash2, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useFocusStats } from "@/hooks/useFocusStats";
import { useSpotify } from "@/hooks/useSpotify";
import type { PomodoroController } from "@/hooks/usePomodoro";
import type { AppTheme } from "@/lib/appSettings";
import { DEFAULT_POMODORO_SETTINGS, getPomodoroSettings, getThemePreference } from "@/lib/appSettings";
import { exportAppData, importAppData, resetLocalData } from "@/lib/backup";

type SettingsProps = {
  timer: PomodoroController;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => Promise<void>;
};

function clampGoal(minutes: number) {
  if (!Number.isFinite(minutes)) return 120;
  return Math.min(1440, Math.max(1, Math.floor(minutes)));
}

function downloadTextFile(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Settings({ timer, theme, setTheme }: SettingsProps) {
  const { today, loading, saving, setDailyGoal, refresh } = useFocusStats();
  const spotify = useSpotify();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [goalInput, setGoalInput] = useState("120");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (today) setGoalInput(String(today.goalMinutes));
  }, [today]);

  async function saveDailyGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextGoal = clampGoal(Number(goalInput));
    setGoalInput(String(nextGoal));
    await setDailyGoal(nextGoal);
    setMessage("Daily goal saved.");
  }

  async function handleThemeChange(nextTheme: AppTheme) {
    await setTheme(nextTheme);
    setMessage("Theme updated.");
  }

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const backup = await exportAppData();
      downloadTextFile(`lock-in-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
      setMessage("Backup exported.");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      await importAppData(await file.text());
      timer.setSettings(await getPomodoroSettings());
      await setTheme(await getThemePreference());
      await refresh();
      setMessage("Backup imported.");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Reset tasks, focus history, goals, settings, and Spotify login?")) return;

    setBusy(true);
    setMessage(null);
    try {
      await resetLocalData();
      await invoke("spotify_disconnect");
      timer.reset();
      timer.setSettings(DEFAULT_POMODORO_SETTINGS);
      await setTheme("system");
      await refresh();
      setMessage("Local data reset.");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full w-full overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
        <div className="space-y-1 pl-12 xl:pl-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your focus defaults, integrations, theme, and local data.</p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Save className="h-5 w-5" />
                  Daily Focus Goal
                </CardTitle>
                <CardDescription>Used by Home and the contribution graph.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveDailyGoal} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="settingsDailyGoal">Daily goal minutes</Label>
                    <Input
                      id="settingsDailyGoal"
                      type="number"
                      min={1}
                      max={1440}
                      value={goalInput}
                      onChange={(event) => setGoalInput(event.target.value)}
                      onBlur={() => setGoalInput(String(clampGoal(Number(goalInput))))}
                      disabled={loading || saving}
                      inputMode="numeric"
                      onWheel={(event) => event.currentTarget.blur()}
                    />
                  </div>
                  <Button type="submit" disabled={loading || saving}>
                    Save Goal
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Timer className="h-5 w-5" />
                  Pomodoro Durations
                </CardTitle>
                <CardDescription>Changes apply immediately when the timer is idle.</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsPanel
                  settings={timer.settings}
                  setFocusMin={timer.setFocusMin}
                  setShortBreakMin={timer.setShortBreakMin}
                  setLongBreakMin={timer.setLongBreakMin}
                  setCyclesBeforeLongBreak={timer.setCyclesBeforeLongBreak}
                  disabled={timer.running}
                />
              </CardContent>
            </Card>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="h-5 w-5" />
                  Spotify
                </CardTitle>
                <CardDescription>Connect or clear the saved Spotify login.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {!spotify.playback.connected ? (
                  <Button type="button" onClick={() => void spotify.connect()} disabled={spotify.loading}>
                    {spotify.loading ? "Connecting..." : "Connect Spotify"}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => void spotify.disconnect()}>
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </Button>
                )}
                {spotify.error && <div className="w-full text-sm text-destructive">{spotify.error}</div>}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
                <CardDescription>Choose the app color mode.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {(["system", "light", "dark"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={theme === option ? "default" : "outline"}
                    onClick={() => void handleThemeChange(option)}
                    className="capitalize"
                  >
                    {option}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="h-5 w-5" />
                  Data
                </CardTitle>
                <CardDescription>Export, import, or reset local app data.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={busy}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button type="button" variant="destructive" onClick={() => void handleReset()} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                  Reset Data
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => void handleImport(event)}
                />
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RotateCcw className="h-5 w-5" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {message ?? "Settings save automatically unless a button says otherwise."}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
