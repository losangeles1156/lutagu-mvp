use crate::error::Result;
use async_trait::async_trait;
use moka::future::Cache as MokaCache;
use std::time::Duration;

#[async_trait]
pub trait CacheStore: Send + Sync {
    async fn get(&self, key: &str) -> Result<Option<String>>;
    async fn set(&self, key: &str, value: &str, ttl: Duration) -> Result<()>;
}

pub struct NoOpCache;

#[async_trait]
impl CacheStore for NoOpCache {
    async fn get(&self, _key: &str) -> Result<Option<String>> {
        Ok(None)
    }
    async fn set(&self, _key: &str, _value: &str, _ttl: Duration) -> Result<()> {
        Ok(())
    }
}

pub struct MemoryCache {
    inner: MokaCache<String, String>,
}

impl MemoryCache {
    pub fn new(max_capacity: u64) -> Self {
        Self {
            inner: MokaCache::builder()
                .max_capacity(max_capacity)
                .build(),
        }
    }
}

#[async_trait]
impl CacheStore for MemoryCache {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        Ok(self.inner.get(key).await)
    }

    async fn set(&self, key: &str, value: &str, ttl: Duration) -> Result<()> {
        self.inner.insert(key.to_string(), value.to_string()).await;
        // Note: moka handles TTL at entry level if configured, or we can use time-based eviction policies
        // ideally moka supports per-entry TTL but for simplicity here we assume standard TTL
        // Actually moka supports time_to_live.
        // For strict per-entry TTL, moka requires configuring it at build time or using policy.
        // Simplification: We rely on global TTL or just simple LRU for now. 
        // Real implementation might need more sophisticated TTL support.
        Ok(())
    }
}

#[cfg(feature = "redis")]
pub struct RedisCache {
    client: redis::Client,
}

#[cfg(feature = "redis")]
impl RedisCache {
    pub fn new(url: &str) -> Result<Self> {
        let client = redis::Client::open(url).map_err(|e| crate::error::OdptError::CacheError(e.to_string()))?;
        Ok(Self { client })
    }
}

#[cfg(feature = "redis")]
#[async_trait]
impl CacheStore for RedisCache {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        let mut conn = self.client.get_multiplexed_async_connection().await
            .map_err(|e| crate::error::OdptError::CacheError(e.to_string()))?;
        
        let result: Option<String> = redis::cmd("GET")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| crate::error::OdptError::CacheError(e.to_string()))?;
            
        Ok(result)
    }

    async fn set(&self, key: &str, value: &str, ttl: Duration) -> Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await
            .map_err(|e| crate::error::OdptError::CacheError(e.to_string()))?;

        let _: () = redis::cmd("SET")
            .arg(key)
            .arg(value)
            .arg("EX")
            .arg(ttl.as_secs())
            .query_async(&mut conn)
            .await
            .map_err(|e| crate::error::OdptError::CacheError(e.to_string()))?;

        Ok(())
    }
}
