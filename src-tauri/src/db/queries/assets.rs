use crate::models::{Asset, AssetType};
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

pub fn insert_asset(
    conn: &Connection,
    symbol: &str,
    name: &str,
    asset_type: &AssetType,
    currency: &str,
) -> anyhow::Result<Asset> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();
    conn.execute(
        "INSERT INTO assets (id, symbol, name, asset_type, currency, added_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, symbol.to_uppercase(), name, asset_type.as_str(), currency, now],
    )?;
    Ok(Asset {
        id,
        symbol: symbol.to_uppercase(),
        name: name.to_string(),
        asset_type: asset_type.clone(),
        currency: currency.to_string(),
        added_at: now,
        deleted_at: None,
    })
}

pub fn list_assets(conn: &Connection) -> anyhow::Result<Vec<Asset>> {
    let mut stmt = conn.prepare(
        "SELECT id, symbol, name, asset_type, currency, added_at, deleted_at FROM assets WHERE deleted_at IS NULL ORDER BY added_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Asset {
            id: row.get(0)?,
            symbol: row.get(1)?,
            name: row.get(2)?,
            asset_type: AssetType::from_str(&row.get::<_, String>(3)?).unwrap_or(AssetType::Stock),
            currency: row.get(4)?,
            added_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    })?;
    let mut assets = Vec::new();
    for row in rows {
        assets.push(row?);
    }
    Ok(assets)
}

pub fn get_asset(conn: &Connection, id: &str) -> anyhow::Result<Option<Asset>> {
    let mut stmt = conn.prepare(
        "SELECT id, symbol, name, asset_type, currency, added_at, deleted_at FROM assets WHERE id = ?1 AND deleted_at IS NULL",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(Asset {
            id: row.get(0)?,
            symbol: row.get(1)?,
            name: row.get(2)?,
            asset_type: AssetType::from_str(&row.get::<_, String>(3)?).unwrap_or(AssetType::Stock),
            currency: row.get(4)?,
            added_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_asset_by_symbol(conn: &Connection, symbol: &str) -> anyhow::Result<Option<Asset>> {
    let mut stmt = conn.prepare(
        "SELECT id, symbol, name, asset_type, currency, added_at, deleted_at FROM assets WHERE symbol = ?1 AND deleted_at IS NULL",
    )?;
    let mut rows = stmt.query_map(params![symbol.to_uppercase()], |row| {
        Ok(Asset {
            id: row.get(0)?,
            symbol: row.get(1)?,
            name: row.get(2)?,
            asset_type: AssetType::from_str(&row.get::<_, String>(3)?).unwrap_or(AssetType::Stock),
            currency: row.get(4)?,
            added_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_asset_by_symbol_including_deleted(
    conn: &Connection,
    symbol: &str,
) -> anyhow::Result<Option<Asset>> {
    let mut stmt = conn.prepare(
        "SELECT id, symbol, name, asset_type, currency, added_at, deleted_at FROM assets WHERE symbol = ?1",
    )?;
    let mut rows = stmt.query_map(params![symbol.to_uppercase()], |row| {
        Ok(Asset {
            id: row.get(0)?,
            symbol: row.get(1)?,
            name: row.get(2)?,
            asset_type: AssetType::from_str(&row.get::<_, String>(3)?).unwrap_or(AssetType::Stock),
            currency: row.get(4)?,
            added_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn restore_asset(
    conn: &Connection,
    id: &str,
    name: &str,
    asset_type: &AssetType,
) -> anyhow::Result<Asset> {
    let now = Utc::now().timestamp();
    conn.execute(
        "UPDATE assets SET deleted_at = NULL, name = ?1, asset_type = ?2, added_at = ?3 WHERE id = ?4",
        params![name, asset_type.as_str(), now, id],
    )?;
    get_asset(conn, id)?
        .ok_or_else(|| anyhow::anyhow!("Failed to restore asset"))
}

pub fn soft_delete_asset(conn: &Connection, id: &str) -> anyhow::Result<()> {
    let now = Utc::now().timestamp();
    let updated = conn.execute(
        "UPDATE assets SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if updated == 0 {
        anyhow::bail!("Asset not found");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_db;

    #[test]
    fn test_insert_and_list_assets() {
        let conn = test_db();
        let asset = insert_asset(&conn, "AAPL", "Apple Inc.", &AssetType::Stock, "USD").unwrap();
        assert_eq!(asset.symbol, "AAPL");
        assert_eq!(asset.name, "Apple Inc.");

        let assets = list_assets(&conn).unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].symbol, "AAPL");
    }

    #[test]
    fn test_symbol_uppercased() {
        let conn = test_db();
        let asset = insert_asset(&conn, "aapl", "Apple", &AssetType::Stock, "USD").unwrap();
        assert_eq!(asset.symbol, "AAPL");
    }

    #[test]
    fn test_duplicate_symbol_fails() {
        let conn = test_db();
        insert_asset(&conn, "AAPL", "Apple", &AssetType::Stock, "USD").unwrap();
        let result = insert_asset(&conn, "AAPL", "Apple 2", &AssetType::Stock, "USD");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_asset_by_id() {
        let conn = test_db();
        let asset = insert_asset(&conn, "BTC", "Bitcoin", &AssetType::Crypto, "USD").unwrap();
        let found = get_asset(&conn, &asset.id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().symbol, "BTC");
    }

    #[test]
    fn test_get_asset_by_symbol() {
        let conn = test_db();
        insert_asset(&conn, "ETH", "Ethereum", &AssetType::Crypto, "USD").unwrap();
        let found = get_asset_by_symbol(&conn, "eth").unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().symbol, "ETH");
    }

    #[test]
    fn test_soft_delete() {
        let conn = test_db();
        let asset = insert_asset(&conn, "TSLA", "Tesla", &AssetType::Stock, "USD").unwrap();

        soft_delete_asset(&conn, &asset.id).unwrap();

        // Should not appear in list
        let assets = list_assets(&conn).unwrap();
        assert_eq!(assets.len(), 0);

        // Should not be found by ID
        let found = get_asset(&conn, &asset.id).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_restore_soft_deleted_asset() {
        let conn = test_db();
        let asset = insert_asset(&conn, "TSLA", "Tesla", &AssetType::Stock, "USD").unwrap();
        soft_delete_asset(&conn, &asset.id).unwrap();

        // Should not appear in active queries
        assert!(get_asset_by_symbol(&conn, "TSLA").unwrap().is_none());

        // Should appear when including deleted
        let deleted = get_asset_by_symbol_including_deleted(&conn, "TSLA").unwrap();
        assert!(deleted.is_some());
        assert!(deleted.unwrap().deleted_at.is_some());

        // Restore it
        let restored = restore_asset(&conn, &asset.id, "Tesla Inc.", &AssetType::Stock).unwrap();
        assert!(restored.deleted_at.is_none());
        assert_eq!(restored.name, "Tesla Inc.");

        // Should now appear in active queries
        let found = get_asset_by_symbol(&conn, "TSLA").unwrap();
        assert!(found.is_some());

        let assets = list_assets(&conn).unwrap();
        assert_eq!(assets.len(), 1);
    }

    #[test]
    fn test_soft_delete_nonexistent() {
        let conn = test_db();
        let result = soft_delete_asset(&conn, "nonexistent-id");
        assert!(result.is_err());
    }
}
