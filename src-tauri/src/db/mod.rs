pub mod queries;
pub mod schema;

use argon2::Argon2;
use rusqlite::Connection;
use std::path::Path;

const SALT: &[u8] = b"atlas-sqlcipher-v1";

pub fn derive_key(passphrase: &str) -> anyhow::Result<String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(passphrase.as_bytes(), SALT, &mut key)
        .map_err(|e| anyhow::anyhow!("Key derivation failed: {}", e))?;
    Ok(hex::encode(key))
}

pub fn open_db(path: &Path, passphrase: &str) -> anyhow::Result<Connection> {
    let hex_key = derive_key(passphrase)?;
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "key", format!("x'{}'", hex_key))?;
    // Verify the key works by running a simple query
    conn.execute_batch("SELECT count(*) FROM sqlite_master;")?;
    Ok(conn)
}

pub fn create_db(path: &Path, passphrase: &str) -> anyhow::Result<Connection> {
    if path.exists() {
        anyhow::bail!("Database already exists");
    }
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = open_db(path, passphrase)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    schema::run_migrations(&conn)?;
    Ok(conn)
}

pub fn unlock_db(path: &Path, passphrase: &str) -> anyhow::Result<Connection> {
    if !path.exists() {
        anyhow::bail!("Database not found");
    }
    let conn = open_db(path, passphrase)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(conn)
}

/// Create an in-memory encrypted DB for testing
#[cfg(test)]
pub fn test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.pragma_update(None, "key", "x'0000000000000000000000000000000000000000000000000000000000000000'").unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    schema::run_migrations(&conn).unwrap();
    conn
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_derive_key_deterministic() {
        let key1 = derive_key("test_passphrase").unwrap();
        let key2 = derive_key("test_passphrase").unwrap();
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 64); // 32 bytes = 64 hex chars
    }

    #[test]
    fn test_derive_key_different_passphrases() {
        let key1 = derive_key("passphrase1").unwrap();
        let key2 = derive_key("passphrase2").unwrap();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_create_and_unlock_db() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let passphrase = "testpassphrase";

        // Create DB
        let conn = create_db(&db_path, passphrase).unwrap();
        drop(conn);

        // Unlock with correct passphrase
        let conn = unlock_db(&db_path, passphrase).unwrap();
        drop(conn);

        // Wrong passphrase should fail
        let result = unlock_db(&db_path, "wrong");
        assert!(result.is_err());
    }

    #[test]
    fn test_create_db_already_exists() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let _conn = create_db(&db_path, "pass").unwrap();
        drop(_conn);

        let result = create_db(&db_path, "pass");
        assert!(result.is_err());
    }

    #[test]
    fn test_unlock_db_not_found() {
        let result = unlock_db(&PathBuf::from("/nonexistent/path.db"), "pass");
        assert!(result.is_err());
    }

    #[test]
    fn test_schema_creation() {
        let conn = test_db();
        // Verify tables exist
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('assets', 'historical_prices', 'price_cache_meta', 'settings')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 4);
    }
}
