use crate::models::{AssetHoldingSummary, Transaction, TxType};
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

pub fn insert_transaction(
    conn: &Connection,
    asset_id: &str,
    tx_type: &TxType,
    quantity: f64,
    price_usd: f64,
    ts: i64,
    notes: Option<&str>,
) -> anyhow::Result<Transaction> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();
    conn.execute(
        "INSERT INTO transactions (id, asset_id, tx_type, quantity, price_usd, ts, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, asset_id, tx_type.as_str(), quantity, price_usd, ts, notes, now],
    )?;
    Ok(Transaction {
        id,
        asset_id: asset_id.to_string(),
        tx_type: tx_type.clone(),
        quantity,
        price_usd,
        ts,
        notes: notes.map(|s| s.to_string()),
        created_at: now,
        deleted_at: None,
        locked_at: None,
    })
}

pub fn list_transactions_by_asset(
    conn: &Connection,
    asset_id: &str,
) -> anyhow::Result<Vec<Transaction>> {
    let mut stmt = conn.prepare(
        "SELECT id, asset_id, tx_type, quantity, price_usd, ts, notes, created_at, deleted_at, locked_at FROM transactions WHERE asset_id = ?1 AND deleted_at IS NULL ORDER BY ts DESC",
    )?;
    let rows = stmt.query_map(params![asset_id], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            asset_id: row.get(1)?,
            tx_type: TxType::from_str(&row.get::<_, String>(2)?).unwrap_or(TxType::Buy),
            quantity: row.get(3)?,
            price_usd: row.get(4)?,
            ts: row.get(5)?,
            notes: row.get(6)?,
            created_at: row.get(7)?,
            deleted_at: row.get(8)?,
            locked_at: row.get(9)?,
        })
    })?;
    let mut transactions = Vec::new();
    for row in rows {
        transactions.push(row?);
    }
    Ok(transactions)
}

pub fn soft_delete_transaction(conn: &Connection, id: &str) -> anyhow::Result<()> {
    let now = Utc::now().timestamp();
    let updated = conn.execute(
        "UPDATE transactions SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if updated == 0 {
        anyhow::bail!("Transaction not found");
    }
    Ok(())
}

pub fn update_transaction(
    conn: &Connection,
    id: &str,
    tx_type: &TxType,
    quantity: f64,
    price_usd: f64,
    ts: i64,
    notes: Option<&str>,
) -> anyhow::Result<()> {
    let updated = conn.execute(
        "UPDATE transactions SET tx_type = ?1, quantity = ?2, price_usd = ?3, ts = ?4, notes = ?5 WHERE id = ?6 AND deleted_at IS NULL",
        params![tx_type.as_str(), quantity, price_usd, ts, notes, id],
    )?;
    if updated == 0 {
        anyhow::bail!("Transaction not found");
    }
    Ok(())
}

pub fn soft_delete_transactions_by_asset(conn: &Connection, asset_id: &str) -> anyhow::Result<u64> {
    let now = Utc::now().timestamp();
    let count = conn.execute(
        "UPDATE transactions SET deleted_at = ?1 WHERE asset_id = ?2 AND deleted_at IS NULL",
        params![now, asset_id],
    )?;
    Ok(count as u64)
}

pub fn lock_transaction(conn: &Connection, id: &str) -> anyhow::Result<()> {
    let now = Utc::now().timestamp();
    let updated = conn.execute(
        "UPDATE transactions SET locked_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if updated == 0 {
        anyhow::bail!("Transaction not found");
    }
    Ok(())
}

pub fn unlock_transaction(conn: &Connection, id: &str) -> anyhow::Result<()> {
    let updated = conn.execute(
        "UPDATE transactions SET locked_at = NULL WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    )?;
    if updated == 0 {
        anyhow::bail!("Transaction not found");
    }
    Ok(())
}

pub fn get_holding_summary(
    conn: &Connection,
    asset_id: &str,
) -> anyhow::Result<AssetHoldingSummary> {
    let total_bought: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE asset_id = ?1 AND tx_type = 'buy' AND deleted_at IS NULL",
            params![asset_id],
            |row| row.get(0),
        )?;
    let total_sold: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE asset_id = ?1 AND tx_type = 'sell' AND deleted_at IS NULL",
            params![asset_id],
            |row| row.get(0),
        )?;
    let total_cost_basis: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(quantity * price_usd), 0) FROM transactions WHERE asset_id = ?1 AND tx_type = 'buy' AND deleted_at IS NULL",
            params![asset_id],
            |row| row.get(0),
        )?;
    let total_sold_value: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(quantity * price_usd), 0) FROM transactions WHERE asset_id = ?1 AND tx_type = 'sell' AND deleted_at IS NULL",
            params![asset_id],
            |row| row.get(0),
        )?;

    let net_quantity = total_bought - total_sold;
    let avg_cost_per_unit = if total_bought > 0.0 {
        total_cost_basis / total_bought
    } else {
        0.0
    };

    Ok(AssetHoldingSummary {
        total_bought,
        total_sold,
        total_sold_value,
        net_quantity,
        total_cost_basis,
        avg_cost_per_unit,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_db;
    use crate::db::queries::assets;
    use crate::models::AssetType;

    fn setup_test_asset(conn: &Connection) -> String {
        let asset = assets::insert_asset(conn, "BTC", "Bitcoin", &AssetType::Crypto, "USD").unwrap();
        asset.id
    }

    #[test]
    fn test_insert_and_list_transactions() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        let tx = insert_transaction(&conn, &asset_id, &TxType::Buy, 0.5, 50000.0, 1700000000, Some("First buy")).unwrap();
        assert_eq!(tx.quantity, 0.5);
        assert_eq!(tx.price_usd, 50000.0);

        let txs = list_transactions_by_asset(&conn, &asset_id).unwrap();
        assert_eq!(txs.len(), 1);
        assert_eq!(txs[0].notes, Some("First buy".to_string()));
    }

    #[test]
    fn test_soft_delete_transaction() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        let tx = insert_transaction(&conn, &asset_id, &TxType::Buy, 1.0, 40000.0, 1700000000, None).unwrap();
        soft_delete_transaction(&conn, &tx.id).unwrap();

        let txs = list_transactions_by_asset(&conn, &asset_id).unwrap();
        assert_eq!(txs.len(), 0);
    }

    #[test]
    fn test_soft_delete_nonexistent() {
        let conn = test_db();
        let result = soft_delete_transaction(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_holding_summary() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        insert_transaction(&conn, &asset_id, &TxType::Buy, 2.0, 50000.0, 1700000000, None).unwrap();
        insert_transaction(&conn, &asset_id, &TxType::Buy, 1.0, 60000.0, 1700100000, None).unwrap();
        insert_transaction(&conn, &asset_id, &TxType::Sell, 0.5, 55000.0, 1700200000, None).unwrap();

        let summary = get_holding_summary(&conn, &asset_id).unwrap();
        assert_eq!(summary.total_bought, 3.0);
        assert_eq!(summary.total_sold, 0.5);
        assert_eq!(summary.net_quantity, 2.5);
        // cost basis: 2*50000 + 1*60000 = 160000
        assert_eq!(summary.total_cost_basis, 160000.0);
        // total_sold_value: 0.5*55000 = 27500
        assert_eq!(summary.total_sold_value, 27500.0);
        // avg cost: 160000 / 3 = 53333.33...
        assert!((summary.avg_cost_per_unit - 53333.333333).abs() < 0.01);
    }

    #[test]
    fn test_holding_summary_empty() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        let summary = get_holding_summary(&conn, &asset_id).unwrap();
        assert_eq!(summary.total_bought, 0.0);
        assert_eq!(summary.total_sold, 0.0);
        assert_eq!(summary.net_quantity, 0.0);
        assert_eq!(summary.avg_cost_per_unit, 0.0);
    }

    #[test]
    fn test_update_transaction() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        let tx = insert_transaction(&conn, &asset_id, &TxType::Buy, 1.0, 40000.0, 1700000000, Some("original")).unwrap();
        update_transaction(&conn, &tx.id, &TxType::Sell, 2.0, 45000.0, 1700100000, Some("edited")).unwrap();

        let txs = list_transactions_by_asset(&conn, &asset_id).unwrap();
        assert_eq!(txs.len(), 1);
        assert_eq!(txs[0].tx_type, TxType::Sell);
        assert_eq!(txs[0].quantity, 2.0);
        assert_eq!(txs[0].price_usd, 45000.0);
        assert_eq!(txs[0].ts, 1700100000);
        assert_eq!(txs[0].notes, Some("edited".to_string()));
    }

    #[test]
    fn test_update_nonexistent_transaction() {
        let conn = test_db();
        let result = update_transaction(&conn, "nonexistent-id", &TxType::Buy, 1.0, 50000.0, 1700000000, None);
        assert!(result.is_err());
    }

    #[test]
    fn test_soft_delete_transactions_by_asset() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        insert_transaction(&conn, &asset_id, &TxType::Buy, 1.0, 40000.0, 1700000000, None).unwrap();
        insert_transaction(&conn, &asset_id, &TxType::Buy, 0.5, 45000.0, 1700100000, None).unwrap();

        let count = soft_delete_transactions_by_asset(&conn, &asset_id).unwrap();
        assert_eq!(count, 2);

        let txs = list_transactions_by_asset(&conn, &asset_id).unwrap();
        assert_eq!(txs.len(), 0);

        // Calling again should return 0 (already deleted)
        let count2 = soft_delete_transactions_by_asset(&conn, &asset_id).unwrap();
        assert_eq!(count2, 0);
    }

    #[test]
    fn test_transactions_ordered_by_ts_desc() {
        let conn = test_db();
        let asset_id = setup_test_asset(&conn);

        insert_transaction(&conn, &asset_id, &TxType::Buy, 1.0, 40000.0, 1700000000, None).unwrap();
        insert_transaction(&conn, &asset_id, &TxType::Buy, 1.0, 50000.0, 1700100000, None).unwrap();

        let txs = list_transactions_by_asset(&conn, &asset_id).unwrap();
        assert!(txs[0].ts > txs[1].ts);
    }
}
