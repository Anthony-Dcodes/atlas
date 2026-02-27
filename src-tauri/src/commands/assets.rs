use crate::db::queries;
use crate::models::{Asset, AssetType};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn add_asset(
    symbol: String,
    name: String,
    asset_type: String,
    state: State<'_, AppState>,
) -> Result<Asset, String> {
    let asset_type = AssetType::from_str(&asset_type).map_err(|e| e.to_string())?;

    state
        .with_db(|conn| {
            // Check for active duplicate
            if let Some(_existing) = queries::assets::get_asset_by_symbol(conn, &symbol)? {
                anyhow::bail!("Asset with symbol {} already exists", symbol.to_uppercase());
            }
            // Check for soft-deleted asset with same symbol — restore it
            if let Some(deleted) =
                queries::assets::get_asset_by_symbol_including_deleted(conn, &symbol)?
            {
                if deleted.deleted_at.is_some() {
                    return queries::assets::restore_asset(
                        conn,
                        &deleted.id,
                        &name,
                        &asset_type,
                    );
                }
            }
            queries::assets::insert_asset(conn, &symbol, &name, &asset_type, "USD")
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_asset(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .with_db(|conn| {
            queries::assets::soft_delete_asset(conn, &id)?;
            queries::transactions::soft_delete_transactions_by_asset(conn, &id)?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_assets(state: State<'_, AppState>) -> Result<Vec<Asset>, String> {
    state
        .with_db(queries::assets::list_assets)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_all_assets(state: State<'_, AppState>) -> Result<Vec<Asset>, String> {
    state
        .with_db(queries::assets::list_all_assets)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn purge_asset(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .with_db(|conn| queries::assets::hard_delete_asset(conn, &id))
        .map_err(|e| e.to_string())
}
