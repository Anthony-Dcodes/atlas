use crate::models::{OHLCVRow, PriceCacheMeta};
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
                row.open,
                row.high,
                row.low,
                row.close,
                row.volume,
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
        (None, Some(_)) => {
            "SELECT id, asset_id, ts, open, high, low, close, volume FROM historical_prices WHERE asset_id = ?1 AND ts <= ?2 ORDER BY ts ASC"
        }
        (None, None) => {
            "SELECT id, asset_id, ts, open, high, low, close, volume FROM historical_prices WHERE asset_id = ?1 ORDER BY ts ASC"
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let rows = match (from_ts, to_ts) {
        (Some(f), Some(t)) => stmt.query_map(params![asset_id, f, t], row_to_ohlcv)?,
        (Some(f), None) => stmt.query_map(params![asset_id, f], row_to_ohlcv)?,
        (None, Some(t)) => stmt.query_map(params![asset_id, t], row_to_ohlcv)?,
        (None, None) => stmt.query_map(params![asset_id], row_to_ohlcv)?,
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

pub fn get_max_ts(conn: &Connection, asset_id: &str) -> anyhow::Result<Option<i64>> {
    let mut stmt =
        conn.prepare("SELECT MAX(ts) FROM historical_prices WHERE asset_id = ?1")?;
    let ts: Option<i64> = stmt.query_row(params![asset_id], |row| row.get(0))?;
    Ok(ts)
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

pub fn list_all_cache_meta(conn: &Connection) -> anyhow::Result<Vec<PriceCacheMeta>> {
    let mut stmt =
        conn.prepare("SELECT asset_id, provider, last_fetched FROM price_cache_meta")?;
    let rows = stmt.query_map([], |row| {
        Ok(PriceCacheMeta {
            asset_id: row.get(0)?,
            provider: row.get(1)?,
            last_fetched: row.get(2)?,
        })
    })?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
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

fn row_to_ohlcv(row: &rusqlite::Row) -> rusqlite::Result<OHLCVRow> {
    Ok(OHLCVRow {
        id: row.get(0)?,
        asset_id: row.get(1)?,
        ts: row.get(2)?,
        open: row.get(3)?,
        high: row.get(4)?,
        low: row.get(5)?,
        close: row.get(6)?,
        volume: row.get(7)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_db;
    use crate::db::queries::assets;
    use crate::models::AssetType;

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
                open: Some(150.0),
                high: Some(155.0),
                low: Some(148.0),
                close: 153.0,
                volume: Some(1000000.0),
            },
            OHLCVRow {
                id: None,
                asset_id: asset_id.clone(),
                ts: 1700086400,
                open: Some(153.0),
                high: Some(157.0),
                low: Some(152.0),
                close: 156.0,
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
            close: 150.0,
            volume: None,
        };
        upsert_prices(&conn, &[row]).unwrap();

        let row2 = OHLCVRow {
            id: None,
            asset_id: asset_id.clone(),
            ts: 1700000000,
            open: None,
            high: None,
            low: None,
            close: 160.0,
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
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700000000, open: None, high: None, low: None, close: 100.0, volume: None },
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700086400, open: None, high: None, low: None, close: 110.0, volume: None },
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

        update_cache_meta(&conn, &asset_id, "coingecko", 1700001000).unwrap();
        let meta = get_cache_meta(&conn, &asset_id).unwrap().unwrap();
        assert_eq!(meta.provider, "coingecko");
    }

    #[test]
    fn test_get_max_ts() {
        let conn = test_db();
        let asset_id = setup_asset(&conn);

        // No prices yet
        assert!(get_max_ts(&conn, &asset_id).unwrap().is_none());

        let rows = vec![
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700000000, open: None, high: None, low: None, close: 100.0, volume: None },
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700172800, open: None, high: None, low: None, close: 120.0, volume: None },
            OHLCVRow { id: None, asset_id: asset_id.clone(), ts: 1700086400, open: None, high: None, low: None, close: 110.0, volume: None },
        ];
        upsert_prices(&conn, &rows).unwrap();

        let max = get_max_ts(&conn, &asset_id).unwrap().unwrap();
        assert_eq!(max, 1700172800);
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
            close: 100.0,
            volume: None,
        }).collect();
        upsert_prices(&conn, &rows).unwrap();

        let filtered = get_prices(&conn, &asset_id, Some(1700086400), Some(1700259200)).unwrap();
        assert_eq!(filtered.len(), 3);
    }
}
