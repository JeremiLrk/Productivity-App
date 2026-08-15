# Productivity App with consistency tracking and Spotify integration

This app is a desktop productivity app built with Tauri, React, TypeScript, Tailwind CSS, and SQLite.

It combines a Pomodoro timer, daily focus goals, a contribution-style focus graph, tasks, and Spotify playback controls in one small desktop app.

## Features

- Pomodoro timer with focus, short break, and long break phases
- Daily focus-minute goal tracking
- Contribution graph for the last 12 months of focus progress
- Task list backed by local SQLite storage
- Spotify connection with current track display and playback controls
- Floating mini timer when switching between tabs

## Requirements

- Node.js
- npm
- Rust and Cargo
- Tauri CLI

On this machine, the development tooling is installed on the larger `D:` drive under:

```text
D:\Dev\Productivity-App-Tooling
```

## Development

From the project folder:

```powershell
cd D:\Dev\Productivity-App-Tooling\projects\Productivity-App
npm install
npm run tauri dev
```

For a frontend production build:

```powershell
npm run build
```

For a desktop app build:

```powershell
npm run tauri build
```

## Spotify Setup

Spotify integration uses the Spotify Web API with PKCE login.

In the Spotify Developer Dashboard, create an app and add this Redirect URI:

```text
http://127.0.0.1:8888/callback
```

The app currently uses this locally for authentication and playback controls. You need an active Spotify session/device for controls like play, pause, next, and previous to work.

## Notes

- Focus progress counts real focus minutes while the Pomodoro focus phase is running.
- Break time does not count toward daily focus progress.
- Data is stored locally with SQLite.
- Spotify login is stored locally in the app data folder, so reconnecting is usually not needed after restarting the app.
