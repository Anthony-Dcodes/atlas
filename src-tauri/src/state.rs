use rusqlite::Connection;
use std::collections::HashMap;
use std::collections::VecDeque;
use std::path::PathBuf;
use std::sync::Mutex;
use tokio::time::Instant;

pub struct AppState {
    pub db: Mutex<Option<Connection>>,
    pub db_path: PathBuf,
    pub rate_limits: Mutex<HashMap<String, VecDeque<Instant>>>,
}

impl AppState {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db: Mutex::new(None),
            db_path,
            rate_limits: Mutex::new(HashMap::new()),
        }
    }

    pub fn with_db<F, T>(&self, f: F) -> anyhow::Result<T>
    where
        F: FnOnce(&Connection) -> anyhow::Result<T>,
    {
        let guard = self.db.lock().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        let conn = guard.as_ref().ok_or_else(|| anyhow::anyhow!("Database not unlocked"))?;
        f(conn)
    }

    pub fn check_rate_limit(&self, provider: &str) -> anyhow::Result<()> {
        let max_requests = match provider {
            "twelve_data" => 8,
            "coingecko" => 30,
            "alpha_vantage" => 25,
            _ => 10,
        };
        let window = match provider {
            "alpha_vantage" => std::time::Duration::from_secs(86400),
            _ => std::time::Duration::from_secs(60),
        };

        let mut limits = self.rate_limits.lock().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        let queue = limits.entry(provider.to_string()).or_default();

        let now = Instant::now();
        while queue.front().is_some_and(|t| now.duration_since(*t) > window) {
            queue.pop_front();
        }

        if queue.len() >= max_requests {
            anyhow::bail!("Rate limit exceeded for {}. Please wait before making more requests.", provider);
        }

        queue.push_back(now);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_allows_within_limit() {
        let state = AppState::new(PathBuf::from("/tmp/test.db"));
        for _ in 0..8 {
            state.check_rate_limit("twelve_data").unwrap();
        }
    }

    #[test]
    fn test_rate_limit_blocks_over_limit() {
        let state = AppState::new(PathBuf::from("/tmp/test.db"));
        for _ in 0..8 {
            state.check_rate_limit("twelve_data").unwrap();
        }
        let result = state.check_rate_limit("twelve_data");
        assert!(result.is_err());
    }

    #[test]
    fn test_rate_limits_independent_per_provider() {
        let state = AppState::new(PathBuf::from("/tmp/test.db"));
        for _ in 0..8 {
            state.check_rate_limit("twelve_data").unwrap();
        }
        // Different provider should still work
        state.check_rate_limit("coingecko").unwrap();
    }
}
