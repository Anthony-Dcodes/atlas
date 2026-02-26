use crate::db::queries;
use crate::models::{AssetType, DateRange, OHLCVRow};
use crate::providers::coingecko::CoinGeckoProvider;
use crate::providers::twelve_data::TwelveDataProvider;
use crate::providers::MarketDataProvider;
use crate::state::AppState;
use chrono::Utc;
use tauri::State;

const CACHE_STALENESS_SECS: i64 = 3600; // 1 hour

#[tauri::command]
pub async fn fetch_prices(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<OHLCVRow>, String> {
    // Get asset info
    let asset = state
        .with_db(|conn| {
            queries::assets::get_asset(conn, &asset_id)?
                .ok_or_else(|| anyhow::anyhow!("Asset not found"))
        })
        .map_err(|e| e.to_string())?;

    // Check cache staleness
    let now = Utc::now().timestamp();
    let is_stale = state
        .with_db(|conn| {
            let meta = queries::prices::get_cache_meta(conn, &asset_id)?;
            Ok(meta.is_none_or(|m| now - m.last_fetched > CACHE_STALENESS_SECS))
        })
        .map_err(|e| e.to_string())?;

    if is_stale {
        // Incremental fetch: start from the day after the last stored price,
        // or fall back to 1 year ago if no data exists yet.
        let max_ts = state
            .with_db(|conn| queries::prices::get_max_ts(conn, &asset_id))
            .map_err(|e| e.to_string())?;

        let range = DateRange {
            from: match max_ts {
                Some(ts) => ts + 86400, // day after last stored price
                None => now - (365 * 86400), // first fetch: 1 year
            },
            to: now,
        };

        let provider_name;
        let result = match asset.asset_type {
            AssetType::Crypto => {
                let provider = CoinGeckoProvider::new();
                provider_name = provider.name().to_string();
                state
                    .check_rate_limit(&provider_name)
                    .map_err(|e| e.to_string())?;
                provider.fetch_ohlcv(&asset.symbol, &range).await
            }
            _ => {
                // Need API key for Twelve Data
                let api_key = state
                    .with_db(|conn| queries::settings::get_setting(conn, "twelve_data_api_key"))
                    .map_err(|e| e.to_string())?
                    .filter(|k| !k.is_empty())
                    .ok_or_else(|| {
                        "Twelve Data API key not configured. Add it in Settings.".to_string()
                    })?;
                let provider = TwelveDataProvider::new(api_key);
                provider_name = provider.name().to_string();
                state
                    .check_rate_limit(&provider_name)
                    .map_err(|e| e.to_string())?;
                provider.fetch_ohlcv(&asset.symbol, &range).await
            }
        };

        match result {
            Ok(mut rows) => {
                // Set asset_id on all rows
                for row in &mut rows {
                    row.asset_id = asset_id.clone();
                }
                // Save to DB
                state
                    .with_db(|conn| {
                        queries::prices::upsert_prices(conn, &rows)?;
                        queries::prices::update_cache_meta(conn, &asset_id, &provider_name, now)?;
                        Ok(())
                    })
                    .map_err(|e| e.to_string())?;
            }
            Err(e) => {
                // If fetch fails, try to return cached data
                let cached = state
                    .with_db(|conn| queries::prices::get_prices(conn, &asset_id, None, None))
                    .map_err(|e| e.to_string())?;
                if cached.is_empty() {
                    return Err(format!("Failed to fetch prices: {}", e));
                }
                return Ok(cached);
            }
        }
    }

    // Return from DB
    state
        .with_db(|conn| queries::prices::get_prices(conn, &asset_id, None, None))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn refresh_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<OHLCVRow>, String> {
    // Clear cache meta and price history to force full re-download
    state
        .with_db(|conn| {
            conn.execute(
                "DELETE FROM price_cache_meta WHERE asset_id = ?1",
                rusqlite::params![asset_id],
            )?;
            conn.execute(
                "DELETE FROM historical_prices WHERE asset_id = ?1",
                rusqlite::params![asset_id],
            )?;
            Ok(())
        })
        .map_err(|e| e.to_string())?;

    fetch_prices(asset_id, state).await
}
