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
        ",
    )?;
    Ok(())
}
