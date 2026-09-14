mod spotify;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn focus_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_timer_popout(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("timer-popout") {
        let _ = win.show();
        let _ = win.unminimize();
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "timer-popout",
        WebviewUrl::App("timer-popout.html".into()),
    )
    .title("LOCK IN Timer")
    .inner_size(260.0, 150.0)
    .min_inner_size(220.0, 130.0)
    .resizable(true)
    .always_on_top(true)
    .build()
    .map_err(|e| format!("Could not open timer pop-out: {e}"))?;

    Ok(())
}

#[tauri::command]
fn close_timer_popout(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("timer-popout") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let token_path = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Could not resolve app data directory: {e}"))?
                .join("spotify_tokens.json");

            app.manage(spotify::SpotifyState::new(token_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            focus_main,
            open_timer_popout,
            close_timer_popout,
            spotify::spotify_login,
            spotify::spotify_disconnect,
            spotify::spotify_current_playback,
            spotify::spotify_next,
            spotify::spotify_previous,
            spotify::spotify_pause,
            spotify::spotify_resume
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
