import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import { SettingsPanel } from "@/components/SettingsPanel";

type Settings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
};

type Props = {
  open?: boolean;
  settings: Settings;
  setFocusMin: (n: number) => void;
  setShortBreakMin: (n: number) => void;
  setLongBreakMin: (n: number) => void;
  setCyclesBeforeLongBreak: (n: number) => void;
  disabled?: boolean;
};

export function SettingsDialog({
  settings,
  setFocusMin,
  setShortBreakMin,
  setLongBreakMin,
  setCyclesBeforeLongBreak,
  disabled,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Open settings"
          className="fixed bottom-4 left-4 h-12 w-12 rounded-full shadow-sm"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <SettingsPanel
          settings={settings}
          setFocusMin={setFocusMin}
          setShortBreakMin={setShortBreakMin}
          setLongBreakMin={setLongBreakMin}
          setCyclesBeforeLongBreak={setCyclesBeforeLongBreak}
          disabled={disabled}
        />
      </DialogContent>
    </Dialog>
  );
}
