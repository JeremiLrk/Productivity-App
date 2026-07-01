import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export type SpotifyPlayback = {
  connected: boolean;
  is_playing: boolean;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  album_art_url?: string | null;
  progress_ms?: number | null;
  duration_ms?: number | null;
};

const DISCONNECTED: SpotifyPlayback = {
  connected: false,
  is_playing: false,
  title: null,
  artist: null,
  album: null,
  album_art_url: null,
  progress_ms: null,
  duration_ms: null,
};

const LOCAL_PROGRESS_TICK_MS = 250;
const SPOTIFY_POLL_MS = 5000;
const CONTROL_REFRESH_DELAY_MS = 500;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useSpotify() {
  const [playback, setPlayback] = useState<SpotifyPlayback>(DISCONNECTED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await invoke<SpotifyPlayback>("spotify_current_playback");
      setPlayback(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!playback.connected) return;
    const id = window.setInterval(() => void refresh(), SPOTIFY_POLL_MS);
    return () => window.clearInterval(id);
  }, [playback.connected, refresh]);

  useEffect(() => {
    if (!playback.connected || !playback.is_playing || !playback.duration_ms) return;

    const id = window.setInterval(() => {
      setPlayback((current) => {
        if (!current.connected || !current.is_playing || !current.duration_ms) return current;

        const progress = current.progress_ms ?? 0;
        const nextProgress = Math.min(current.duration_ms, progress + LOCAL_PROGRESS_TICK_MS);
        if (nextProgress === progress) return current;

        return {
          ...current,
          progress_ms: nextProgress,
        };
      });
    }, LOCAL_PROGRESS_TICK_MS);

    return () => window.clearInterval(id);
  }, [playback.connected, playback.duration_ms, playback.is_playing]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke("spotify_login");
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const disconnect = useCallback(async () => {
    await invoke("spotify_disconnect");
    setPlayback(DISCONNECTED);
    setError(null);
  }, []);

  const runControl = useCallback(
    async (command: "spotify_next" | "spotify_previous" | "spotify_pause" | "spotify_resume") => {
      setError(null);
      try {
        await invoke(command);

        if (command === "spotify_pause") {
          setPlayback((current) => ({ ...current, is_playing: false }));
        }
        if (command === "spotify_resume") {
          setPlayback((current) => ({ ...current, is_playing: true }));
        }

        await refresh();
        await wait(CONTROL_REFRESH_DELAY_MS);
        await refresh();
      } catch (err) {
        setError(String(err));
      }
    },
    [refresh]
  );

  return {
    playback,
    loading,
    error,
    connect,
    disconnect,
    refresh,
    next: () => runControl("spotify_next"),
    previous: () => runControl("spotify_previous"),
    pause: () => runControl("spotify_pause"),
    resume: () => runControl("spotify_resume"),
  };
}
