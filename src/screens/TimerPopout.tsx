import { useEffect, useState, type MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getThemePreference, type AppTheme } from "@/lib/appSettings";

type Phase = "focus" | "short" | "long";

type TimerSnapshot = {
  phase: Phase;
  running: boolean;
  secondsLeft: number;
  totalThisPhase: number;
  progress: number;
};

const DEFAULT_SNAPSHOT: TimerSnapshot = {
  phase: "focus",
  running: false,
  secondsLeft: 0,
  totalThisPhase: 0,
  progress: 0,
};

type ResolvedTheme = "light" | "dark";

const PALETTE = {
  light: {
    background: "#ffffff",
    foreground: "#111111",
    track: "#eceff3",
    progress: "#111111",
    handle: "rgba(17, 17, 17, 0.08)",
    handleBorder: "rgba(17, 17, 17, 0.12)",
    handleText: "#111111",
    grip: "rgba(17, 17, 17, 0.42)",
  },
  dark: {
    background: "#101010",
    foreground: "#fafafa",
    track: "#27272a",
    progress: "#fafafa",
    handle: "rgba(250, 250, 250, 0.1)",
    handleBorder: "rgba(250, 250, 250, 0.14)",
    handleText: "#fafafa",
    grip: "rgba(250, 250, 250, 0.54)",
  },
};

function getStoredSnapshot() {
  const raw = window.localStorage.getItem("lock-in-timer-snapshot");
  if (!raw) return DEFAULT_SNAPSHOT;

  try {
    return JSON.parse(raw) as TimerSnapshot;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function formatTime(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function resolveTheme(theme: AppTheme): ResolvedTheme {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function TimerPopout() {
  const [timer, setTimer] = useState<TimerSnapshot>(getStoredSnapshot);
  const [theme, setTheme] = useState<ResolvedTheme>("light");
  const [controlsVisible, setControlsVisible] = useState(false);
  const colors = PALETTE[theme];

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void listen<TimerSnapshot>("timer-snapshot", (event) => {
      setTimer(event.payload);
      window.localStorage.setItem("lock-in-timer-snapshot", JSON.stringify(event.payload));
    }).then((unlisten) => {
      cleanup = unlisten;
    });

    return () => cleanup?.();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    let currentPreference: AppTheme = "system";

    function applyPreference(nextPreference: AppTheme) {
      currentPreference = nextPreference;
      setTheme(resolveTheme(nextPreference));
    }

    const handleSystemChange = () => {
      if (currentPreference === "system") setTheme(resolveTheme("system"));
    };

    void getThemePreference().then(applyPreference).catch(() => applyPreference("system"));
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, []);

  useEffect(() => {
    if (!timer.running || timer.secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setTimer((current) => {
        if (!current.running || current.secondsLeft <= 0) return current;
        return {
          ...current,
          secondsLeft: Math.max(0, current.secondsLeft - 1),
          progress:
            current.totalThisPhase > 0
              ? ((current.totalThisPhase - Math.max(0, current.secondsLeft - 1)) / current.totalThisPhase) * 100
              : current.progress,
        };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [timer.running, timer.secondsLeft]);

  function closeWindow() {
    void invoke("close_timer_popout").catch(() => window.close());
  }

  function startDrag(event: MouseEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    void getCurrentWindow().startDragging().catch(() => undefined);
  }

  return (
    <div
      onMouseDown={startDrag}
      style={{
        alignItems: "center",
        background: colors.background,
        boxSizing: "border-box",
        color: colors.foreground,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        height: "100vh",
        justifyContent: "center",
        overflow: "hidden",
        padding: "18px",
        position: "relative",
        width: "100vw",
      }}
    >
      <div
        onMouseEnter={() => setControlsVisible(true)}
        onMouseLeave={() => setControlsVisible(false)}
        onMouseDown={startDrag}
        style={{
          alignItems: "center",
          boxSizing: "border-box",
          display: "flex",
          height: "34px",
          justifyContent: "center",
          left: 0,
          opacity: controlsVisible ? 1 : 0,
          padding: "6px 8px",
          position: "absolute",
          right: 0,
          top: 0,
          transition: "opacity 140ms ease",
          zIndex: 2,
        }}
      >
        <div
          onMouseDown={startDrag}
          style={{
            alignItems: "center",
            background: colors.handle,
            border: `1px solid ${colors.handleBorder}`,
            borderRadius: "999px",
            boxSizing: "border-box",
            display: "flex",
            height: "22px",
            justifyContent: "space-between",
            padding: "0 4px",
            width: "100%",
          }}
        >
          <div
            aria-hidden="true"
            onMouseDown={startDrag}
            style={{
              alignItems: "center",
              display: "flex",
              flex: 1,
              gap: "3px",
              height: "100%",
              justifyContent: "center",
            }}
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                style={{
                  background: colors.grip,
                  borderRadius: "999px",
                  display: "block",
                  height: "3px",
                  width: "18px",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Close timer pop-out"
            onClick={(event) => {
              event.stopPropagation();
              closeWindow();
            }}
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              alignItems: "center",
              background: "transparent",
              border: 0,
              borderRadius: "999px",
              color: colors.handleText,
              cursor: "pointer",
              display: "flex",
              fontSize: "13px",
              fontWeight: 700,
              height: "18px",
              justifyContent: "center",
              lineHeight: 1,
              padding: 0,
              width: "18px",
            }}
          >
            x
          </button>
        </div>
      </div>

      <div
        onMouseDown={startDrag}
        style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "18px", width: "100%" }}
      >
        <div
          onMouseDown={startDrag}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
            fontSize: "56px",
            fontWeight: 700,
            letterSpacing: "0",
            lineHeight: 1,
            textAlign: "center",
            userSelect: "none",
          }}
        >
          {formatTime(timer.secondsLeft)}
        </div>

        <div
          style={{
            background: colors.track,
            borderRadius: "999px",
            boxShadow: theme === "dark" ? "inset 0 0 0 1px rgba(255, 255, 255, 0.04)" : "inset 0 0 0 1px rgba(17, 17, 17, 0.04)",
            height: "8px",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            style={{
              background: colors.progress,
              borderRadius: "999px",
              height: "100%",
              transition: "width 200ms ease",
              width: `${timer.progress}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
