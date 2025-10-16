use tauri::Manager;

// Mark the function as a Tauri command:
#[tauri::command]
fn focus_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        // SQLite plugin
        .plugin(tauri_plugin_sql::Builder::default().build())
        // Register commands (names must match the fn above)
        .invoke_handler(tauri::generate_handler![focus_main])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
