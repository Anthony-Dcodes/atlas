use crate::db::queries;
use crate::models::SymbolSearchResult;
use crate::providers::binance::BinanceProvider;
use crate::providers::coingecko::CoinGeckoProvider;
use crate::providers::twelve_data::TwelveDataProvider;
use crate::providers::MarketDataProvider;
use crate::state::AppState;
use std::collections::HashSet;
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

    // TwelveData key (optional — search doesn't require auth but we create provider consistently)
    let td_key = state
        .with_db(|conn| queries::settings::get_setting(conn, "twelve_data_api_key"))
        .ok()
        .flatten()
        .unwrap_or_default();

    // CoinGecko key (optional)
    let cg_key = state
        .with_db(|conn| queries::settings::get_setting(conn, "coingecko_api_key"))
        .ok()
        .flatten()
        .filter(|k| !k.is_empty());

    let td_provider = TwelveDataProvider::new(td_key);
    let cg_provider = CoinGeckoProvider::new_with_key(cg_key);
    let bn_provider = BinanceProvider::new();

    // Search all three providers in parallel
    let (td_results, bn_results, cg_results) = tokio::join!(
        td_provider.search_symbols(&query),
        bn_provider.search_symbols(&query),
        cg_provider.search_symbols(&query),
    );

    // Merge: TwelveData (stocks/ETFs) → Binance (crypto primary) → CoinGecko (rare alts fallback)
    // Deduplicate by symbol — keeps first occurrence, so Binance crypto beats CoinGecko duplicates
    let mut seen: HashSet<String> = HashSet::new();
    let mut results: Vec<SymbolSearchResult> = Vec::new();

    for r in [td_results, bn_results, cg_results]
        .into_iter()
        .filter_map(|r| r.ok())
        .flatten()
    {
        if seen.insert(r.symbol.clone()) {
            results.push(r);
        }
    }

    Ok(results)
}
