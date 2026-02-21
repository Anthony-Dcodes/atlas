use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn check_first_run(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(!state.db_path.exists())
}

#[tauri::command]
pub fn setup_db(passphrase: String, state: State<'_, AppState>) -> Result<(), String> {
    if passphrase.len() < 8 {
        return Err("Passphrase must be at least 8 characters".to_string());
    }

    let conn = crate::db::create_db(&state.db_path, &passphrase).map_err(|e| e.to_string())?;

    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    *db = Some(conn);
    Ok(())
}

#[tauri::command]
pub fn unlock_db(passphrase: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = crate::db::unlock_db(&state.db_path, &passphrase).map_err(|e| {
        if e.to_string().contains("not a database") {
            "Incorrect passphrase".to_string()
        } else {
            e.to_string()
        }
    })?;

    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    *db = Some(conn);
    Ok(())
}
