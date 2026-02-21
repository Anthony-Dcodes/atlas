mod commands;
mod db;
mod domain;
mod models;
mod providers;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // TODO: Add Stronghold plugin for secure API key storage in Phase 2
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");
            let db_path = app_data_dir.join("atlas.db");
            app.manage(AppState::new(db_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::check_first_run,
            commands::auth::setup_db,
            commands::auth::unlock_db,
            commands::assets::add_asset,
            commands::assets::remove_asset,
            commands::assets::list_assets,
            commands::prices::fetch_prices,
            commands::prices::refresh_asset,
            commands::settings::save_api_key,
            commands::settings::has_api_key,
            commands::settings::remove_api_key,
            commands::settings::get_setting,
            commands::settings::save_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
