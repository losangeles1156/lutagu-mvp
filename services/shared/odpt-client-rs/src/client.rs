use crate::cache::{CacheStore, MemoryCache, NoOpCache};
use crate::error::{OdptError, Result};
use crate::models::{OdptStation, OdptTrain, OdptTrainInformation};
use governor::{Quota, RateLimiter};
use nonzero_ext::nonzero;
use reqwest::{Client, StatusCode};
use serde::de::DeserializeOwned;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, info, warn};

const BASE_URL: &str = "https://api.odpt.org/api/v4";
const CHALLENGE_URL: &str = "https://api-challenge.odpt.org/api/v4";

#[derive(Clone)]
pub struct OdptClient {
    client: Client,
    api_key: String,
    base_url: String,
    cache: Arc<dyn CacheStore>,
    rate_limiter: Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>>,
}

impl OdptClient {
    pub fn new(api_key: String, use_challenge_api: bool) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .pool_max_idle_per_host(10)
            .build()?;

        let base_url = if use_challenge_api {
            CHALLENGE_URL.to_string()
        } else {
            BASE_URL.to_string()
        };

        // Default rate limit: 10 requests per second
        let rate_limiter = Arc::new(RateLimiter::direct(Quota::per_second(nonzero!(10u32))));

        // Default to NoOp cache, user should set explicitly if needed
        let cache = Arc::new(NoOpCache);

        Ok(Self {
            client,
            api_key,
            base_url,
            cache,
            rate_limiter,
        })
    }

    pub fn with_memory_cache(mut self, capacity: u64) -> Self {
        self.cache = Arc::new(MemoryCache::new(capacity));
        self
    }

    /// For testing purposes to point to a mock server
    pub fn with_base_url(mut self, url: String) -> Self {
        self.base_url = url;
        self
    }

    #[cfg(feature = "redis")]
    pub fn with_redis_cache(mut self, redis_url: &str) -> Result<Self> {
        use crate::cache::RedisCache;
        self.cache = Arc::new(RedisCache::new(redis_url)?);
        Ok(self)
    }

    pub async fn fetch<T: DeserializeOwned>(&self, endpoint: &str, params: &[(&str, &str)]) -> Result<Vec<T>> {
        // Construct Cache Key
        let mut sorted_params = params.to_vec();
        sorted_params.sort_by(|a, b| a.0.cmp(b.0));
        let params_key = sorted_params.iter().map(|(k, v)| format!("{}={}", k, v)).collect::<Vec<_>>().join("&");
        let cache_key = format!("odpt:{}:{}", endpoint, params_key);

        // Check Cache
        if let Some(cached_data) = self.cache.get(&cache_key).await? {
            debug!("Cache hit for {}", cache_key);
            return serde_json::from_str(&cached_data).map_err(OdptError::from);
        }

        // Rate Limit
        self.rate_limiter.until_ready().await;

        let url = format!("{}/{}", self.base_url, endpoint);
        
        // Add API key to params
        let mut final_params = params.to_vec();
        final_params.push(("acl:consumerKey", &self.api_key));

        let response = self.client.get(&url)
            .query(&final_params)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(OdptError::ApiError { status, body });
        }

        let text = response.text().await?;
        
        // Parse
        let data: Vec<T> = serde_json::from_str(&text)?;

        // Cache (Default TTL 1 minute for now, customizable later)
        if !data.is_empty() {
            self.cache.set(&cache_key, &text, Duration::from_secs(60)).await?;
        }

        Ok(data)
    }

    pub async fn get_stations(&self, operator: Option<&str>, railway: Option<&str>) -> Result<Vec<OdptStation>> {
        let mut params = Vec::new();
        if let Some(op) = operator {
            params.push(("odpt:operator", op));
        }
        if let Some(rw) = railway {
            params.push(("odpt:railway", rw));
        }
        self.fetch("odpt:Station", &params).await
    }

    pub async fn get_trains(&self, operator: Option<&str>, railway: Option<&str>) -> Result<Vec<OdptTrain>> {
        let mut params = Vec::new();
        if let Some(op) = operator {
            params.push(("odpt:operator", op));
        }
        if let Some(rw) = railway {
            params.push(("odpt:railway", rw));
        }
        self.fetch("odpt:Train", &params).await
    }

    pub async fn get_train_information(&self, operator: Option<&str>, railway: Option<&str>) -> Result<Vec<OdptTrainInformation>> {
        let mut params = Vec::new();
        if let Some(op) = operator {
            params.push(("odpt:operator", op));
        }
        if let Some(rw) = railway {
            params.push(("odpt:railway", rw));
        }
        self.fetch("odpt:TrainInformation", &params).await
    }
}
