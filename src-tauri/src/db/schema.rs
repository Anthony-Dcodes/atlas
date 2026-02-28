use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS assets (
            id          TEXT PRIMARY KEY,
            symbol      TEXT NOT NULL,
            name        TEXT NOT NULL,
            asset_type  TEXT NOT NULL CHECK(asset_type IN ('stock','crypto','commodity')),
            currency    TEXT NOT NULL DEFAULT 'USD',
            added_at    INTEGER NOT NULL,
            deleted_at  INTEGER,
            UNIQUE(symbol) ON CONFLICT ABORT
        );

        CREATE TABLE IF NOT EXISTS historical_prices (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
            ts          INTEGER NOT NULL,
            open        REAL,
            high        REAL,
            low         REAL,
            close       REAL NOT NULL,
            volume      REAL,
            UNIQUE(asset_id, ts)
        );

        CREATE TABLE IF NOT EXISTS price_cache_meta (
            asset_id      TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
            provider      TEXT NOT NULL,
            last_fetched  INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key           TEXT PRIMARY KEY,
            value         TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id          TEXT PRIMARY KEY,
            asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
            tx_type     TEXT NOT NULL CHECK(tx_type IN ('buy','sell')),
            quantity    REAL NOT NULL,
            price_usd   REAL NOT NULL,
            ts          INTEGER NOT NULL,
            notes       TEXT,
            created_at  INTEGER NOT NULL,
            deleted_at  INTEGER,
            locked_at   INTEGER
        );
        ",
    )?;

    // Idempotent column migration: add locked_at to existing databases
    let has_locked: bool = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('transactions') WHERE name='locked_at'",
        [],
        |row| row.get::<_, i64>(0),
    ).unwrap_or(0) > 0;
    if !has_locked {
        conn.execute("ALTER TABLE transactions ADD COLUMN locked_at INTEGER", [])?;
    }

    // Idempotent table migration: add 'snapshot' to tx_type CHECK constraint
    let table_sql: String = conn.query_row(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'",
        [],
        |row| row.get(0),
    ).unwrap_or_default();
    if !table_sql.contains("'snapshot'") {
        conn.execute_batch("
            PRAGMA foreign_keys = OFF;
            CREATE TABLE transactions_v2 (
                id          TEXT PRIMARY KEY,
                asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                tx_type     TEXT NOT NULL CHECK(tx_type IN ('buy','sell','snapshot')),
                quantity    REAL NOT NULL,
                price_usd   REAL NOT NULL DEFAULT 0,
                ts          INTEGER NOT NULL,
                notes       TEXT,
                created_at  INTEGER NOT NULL,
                deleted_at  INTEGER,
                locked_at   INTEGER
            );
            INSERT INTO transactions_v2 SELECT * FROM transactions;
            DROP TABLE transactions;
            ALTER TABLE transactions_v2 RENAME TO transactions;
            PRAGMA foreign_keys = ON;
        ")?;
    }

    Ok(())
}
