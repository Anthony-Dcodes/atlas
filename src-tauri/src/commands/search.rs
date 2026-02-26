use crate::models::SymbolSearchResult;
use crate::providers::coingecko::CoinGeckoProvider;
use crate::providers::twelve_data::TwelveDataProvider;
use crate::providers::MarketDataProvider;
use crate::state::AppState;
use crate::db::queries;
use tauri::State;

#[tauri::command]
pub async fn search_symbols(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SymbolSearchResult>, String> {
    let query = query.trim().to_string();
    if query.is_empty() {
        return Ok(vec![]);
    }

    // Try to get TwelveData API key (optional — search endpoint doesn't require it,
    // but we create the provider with it for consistency)
    let api_key = state
        .with_db(|conn| queries::settings::get_setting(conn, "twelve_data_api_key"))
        .ok()
        .flatten()
        .unwrap_or_default();

    let td_provider = TwelveDataProvider::new(api_key);
    let cg_provider = CoinGeckoProvider::new();

    // Search both providers in parallel
    let (td_results, cg_results) = tokio::join!(
        td_provider.search_symbols(&query),
        cg_provider.search_symbols(&query),
    );

    let mut results: Vec<SymbolSearchResult> = Vec::new();

    if let Ok(mut td) = td_results {
        results.append(&mut td);
    }
    if let Ok(mut cg) = cg_results {
        results.append(&mut cg);
    }

    Ok(results)
}
