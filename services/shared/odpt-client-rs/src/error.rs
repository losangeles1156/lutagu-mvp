use thiserror::Error;

#[derive(Error, Debug)]
pub enum OdptError {
    #[error("HTTP Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("API returned error status: {status} - {body}")]
    ApiError {
        status: reqwest::StatusCode,
        body: String,
    },

    #[error("Failed to parse response: {0}")]
    ParseError(#[from] serde_json::Error),

    #[error("Environment variable missing: {0}")]
    ConfigError(String),

    #[error("Cache error: {0}")]
    CacheError(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, OdptError>;
