use crate::models::{OHLCVRow, PriceCacheMeta};
use rust_decimal::Decimal;
use rusqlite::{params, Connection};

pub fn upsert_prices(conn: &Connection, rows: &[OHLCVRow]) -> anyhow::Result<()> {
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO historical_prices (asset_id, ts, open, high, low, close, volume)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(asset_id, ts) DO UPDATE SET
                open = excluded.open,
                high = excluded.high,
                low = excluded.low,
                close = excluded.close,
                volume = excluded.volume",
        )?;
        for row in rows {
            stmt.execute(params![
                row.asset_id,
                row.ts,
                row.open.map(decimal_to_f64),
                row.high.map(decimal_to_f64),
                row.low.map(decimal_to_f64),
                decimal_to_f64(row.close),
                row.volume.map(decimal_to_f64),
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn get_prices(
    conn: &Connection,
    asset_id: &str,
    from_ts: Option<i64>,
    to_ts: Option<i64>,
) -> anyhow::Result<Vec<OHLCVRow>> {
    let sql = match (from_ts, to_ts) {
        (Some(_), Some(_)) => {
            "SELECT id, asset_id, ts, open, high, low, close, volume FROM historical_prices WHERE asset_id = ?1 AND ts >= ?2 AND ts <= ?3 ORDER BY ts ASC"
        }
        (Some(_), None) => {
            "SELECT id, asset_id, ts, open, high, low, close, volume FROM historical_prices WHERE asset_id = ?1 AND ts >= ?2 ORDER BY ts ASC"
        }
        _ => {
            "SELECT id, asset_id, ts, open, high, low, close, volume FROM historical_prices WHERE asset_id = ?1 ORDER BY ts ASC"
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let rows = match (from_ts, to_ts) {
        (Some(f), Some(t)) => stmt.query_map(params![asset_id, f, t], row_to_ohlcv)?,
        (Some(f), None) => stmt.query_map(params![asset_id, f], row_to_ohlcv)?,
        _ => stmt.query_map(params![asset_id], row_to_ohlcv)?,
    };

    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn get_latest_price(conn: &Connection, asset_id: &str) -> anyhow::Result<Option<OHLCVRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, asset_id, ts, open, high, low, close, volume FROM historical_prices WHERE asset_id = ?1 ORDER BY ts DESC LIMIT 1",
    )?;
    let mut rows = stmt.query_map(params![asset_id], row_to_ohlcv)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_cache_meta(conn: &Connection, asset_id: &str) -> anyhow::Result<Option<PriceCacheMeta>> {
    let mut stmt = conn.prepare(
        "SELECT asset_id, provider, last_fetched FROM price_cache_meta WHERE asset_id = ?1",
    )?;
    let mut rows = stmt.query_map(params![asset_id], |row| {
        Ok(PriceCacheMeta {
            asset_id: row.get(0)?,
            provider: row.get(1)?,
            last_fetched: row.get(2)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn update_cache_meta(
    conn: &Connection,
    asset_id: &str,
    provider: &str,
    last_fetched: i64,
) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO price_cache_meta (asset_id, provider, last_fetched) VALUES (?1, ?2, ?3)
         ON CONFLICT(asset_id) DO UPDATE SET provider = excluded.provider, last_fetched = excluded.last_fetched",
        params![asset_id, provider, last_fetched],
    )?;
    Ok(())
}

fn decimal_to_f64(d: Decimal) -> f64 {
    use rust_decimal::prelude::ToPrimitive;
    d.to_f64().unwrap_or(0.0)
}

fn f64_to_decimal(f: f64) -> Decimal {
    use rust_decimal::prelude::FromPrimitive;
    Decimal::from_f64(f).unwrap_or(Decimal::ZERO)
}

fn row_to_ohlcv(row: &rusqlite::Row) -> rusqlite::Result<OHLCVRow> {
    Ok(OHLCVRow {
        id: row.get(0)?,
        asset_id: row.get(1)?,
        ts: row.get(2)?,
        open: row.get::<_, Option<f64>>(3)?.map(f64_to_decimal),
        high: row.get::<_, Option<f64>>(4)?.map(f64_to_decimal),
        low: row.get::<_, Option<f64>>(5)?.map(f64_to_decimal),
        close: f64_to_decimal(row.get(6)?),
        volume: row.get::<_, Option<f64>>(7)?.map(f64_to_decimal),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_db;
    use crate::db::queries::assets;
    use crate::models::AssetType;
    use std::str::FromStr;

    fn setup_asset(conn: &rusqlite::Connection) -> String {
        let asset = assets::insert_asset(conn, "AAPL", "Apple", &AssetType::Stock, "USD").unwrap();
        asset.id
    }

    #[test]
    fn test_upsert_and_get_prices() {
        let conn = test_db();
        let asset_id = setup_asset(&conn);

        let rows = vec![
            OHLCVRow {
                id: None,
                asset_id: asset_id.clone(),
                ts: 1700000000,
                open: Some(Decimal::from_str("150.00").unwrap()),
                high: Some(Decimal::from_str("155.00").unwrap()),
                low: Some(Decimal::from_str("148.00").unwrap()),
                close: Decimal::from_str("153.00").unwrap(),
                volume: Some(Decimal::from_str("1000000").unwrap()),
            },
            OHLCVRow {
                id: None,
                asset_id: asset_id.clone(),
                ts: 1700086400,
                open: Some(Decimal::from_str("153.00").unwrap()),
                high: Some(Decimal::from_str("157.00").unwrap()),
                low: Some(Decimal::from_str("152.00").unwrap()),
                close: Decimal::from_str("156.00").unwrap(),
                volume: None,
            },
        ];

        upsert_prices(&conn, &rows).unwrap();
        let prices = get_prices(&conn, &asset_id, None, None).unwrap();
        assert_eq!(prices.len(), 2);
        assert_eq!(prices[0].ts, 1700000000);
        assert_eq!(prices[1].ts, 1700086400);
    }

    #[test]
    fn test_upsert_updates_existing() {
        let conn = test_db();
        let asset_id = setup_asset(&conn);

        let row = OHLCVRow {
            id: None,
            asset_id: asset_id.clone(),
            ts: 1700000000,
            open: None,
            high: None,
            low: None,
            close: Decimal::from_str("150.00").unwrap(),
            volume: None,
        };
        upsert_prices(&conn, &[row]).unwrap();

        // Update same timestamp
        let row2 = OHLCVRow {
            id: None,
            asset_id: asset_id.clone(),
            ts: 1700000000,
            open: None,
            high: None,
            low: None,
            close: Decimal::from_str("160.00").unwrap(),
            volume: None,
        };
        upsert_prices(&conn, &[row2]).unwrap();

        let prices = get_prices(&conn, &asset_id, None, None).unwrap();
        assert_eq!(prices.len(), 1);
    }

    #[test]
    fn test_get_latest_price() {
        let conn = test_db();
        let asset_id = setup_asset(&conn);

        let rows = vec![
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700000000, open: None, high: None, low: None, close: Decimal::from_str("100.00").unwrap(), volume: None },
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700086400, open: None, high: None, low: None, close: Decimal::from_str("110.00").unwrap(), volume: None },
        ];
        upsert_prices(&conn, &rows).unwrap();

        let latest = get_latest_price(&conn, &asset_id).unwrap().unwrap();
        assert_eq!(latest.ts, 1700086400);
    }

    #[test]
    fn test_cache_meta() {
        let conn = test_db();
        let asset_id = setup_asset(&conn);

        assert!(get_cache_meta(&conn, &asset_id).unwrap().is_none());

        update_cache_meta(&conn, &asset_id, "twelve_data", 1700000000).unwrap();
        let meta = get_cache_meta(&conn, &asset_id).unwrap().unwrap();
        assert_eq!(meta.provider, "twelve_data");
        assert_eq!(meta.last_fetched, 1700000000);

        // Update
        update_cache_meta(&conn, &asset_id, "coingecko", 1700001000).unwrap();
        let meta = get_cache_meta(&conn, &asset_id).unwrap().unwrap();
        assert_eq!(meta.provider, "coingecko");
    }

    #[test]
    fn test_get_prices_with_range() {
        let conn = test_db();
        let asset_id = setup_asset(&conn);

        let rows: Vec<OHLCVRow> = (0..5).map(|i| OHLCVRow {
            id: None,
            asset_id: asset_id.clone(),
            ts: 1700000000 + i * 86400,
            open: None, high: None, low: None,
            close: Decimal::from_str("100.00").unwrap(),
            volume: None,
        }).collect();
        upsert_prices(&conn, &rows).unwrap();

        let filtered = get_prices(&conn, &asset_id, Some(1700086400), Some(1700259200)).unwrap();
        assert_eq!(filtered.len(), 3);
    }
}
