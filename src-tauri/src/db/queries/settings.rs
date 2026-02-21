use rusqlite::{params, Connection};

pub fn get_setting(conn: &Connection, key: &str) -> anyhow::Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get(0))?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_db;

    #[test]
    fn test_get_set_setting() {
        let conn = test_db();
        assert!(get_setting(&conn, "theme").unwrap().is_none());

        set_setting(&conn, "theme", "dark").unwrap();
        assert_eq!(get_setting(&conn, "theme").unwrap().unwrap(), "dark");

        set_setting(&conn, "theme", "light").unwrap();
        assert_eq!(get_setting(&conn, "theme").unwrap().unwrap(), "light");
    }
}
