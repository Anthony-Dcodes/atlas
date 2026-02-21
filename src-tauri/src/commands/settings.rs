use crate::db::queries;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn save_api_key(provider: String, key: String, state: State<'_, AppState>) -> Result<(), String> {
    let setting_key = format!("{}_api_key", provider);
    state
        .with_db(|conn| queries::settings::set_setting(conn, &setting_key, &key))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn has_api_key(provider: String, state: State<'_, AppState>) -> Result<bool, String> {
    let setting_key = format!("{}_api_key", provider);
    state
        .with_db(|conn| {
            let val = queries::settings::get_setting(conn, &setting_key)?;
            Ok(val.is_some_and(|v| !v.is_empty()))
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_api_key(provider: String, state: State<'_, AppState>) -> Result<(), String> {
    let setting_key = format!("{}_api_key", provider);
    state
        .with_db(|conn| queries::settings::set_setting(conn, &setting_key, ""))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    state
        .with_db(|conn| queries::settings::get_setting(conn, &key))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_setting(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .with_db(|conn| queries::settings::set_setting(conn, &key, &value))
        .map_err(|e| e.to_string())
}
