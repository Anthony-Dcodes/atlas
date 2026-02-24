use crate::db::queries;
use crate::models::{AssetHoldingSummary, Transaction, TxType};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn add_transaction(
    asset_id: String,
    tx_type: String,
    quantity: f64,
    price_usd: f64,
    ts: i64,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<Transaction, String> {
    let tx_type = TxType::from_str(&tx_type).map_err(|e| e.to_string())?;
    state
        .with_db(|conn| {
            queries::transactions::insert_transaction(
                conn,
                &asset_id,
                &tx_type,
                quantity,
                price_usd,
                ts,
                notes.as_deref(),
            )
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_transactions(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Transaction>, String> {
    state
        .with_db(|conn| queries::transactions::list_transactions_by_asset(conn, &asset_id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_transaction(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .with_db(|conn| queries::transactions::soft_delete_transaction(conn, &id))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_holding_summary(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<AssetHoldingSummary, String> {
    state
        .with_db(|conn| queries::transactions::get_holding_summary(conn, &asset_id))
        .map_err(|e| e.to_string())
}
