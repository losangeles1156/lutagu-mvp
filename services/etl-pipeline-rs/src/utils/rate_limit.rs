use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::time::sleep;

#[derive(Clone)]
pub struct RateLimiter {
    semaphore: Arc<Semaphore>,
    delay: Duration,
}

impl RateLimiter {
    pub fn new(max_concurrent: usize, delay: Duration) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            delay,
        }
    }

    pub async fn wait(&self) {
        let _permit = self.semaphore.acquire().await.unwrap();
        sleep(self.delay).await;
        // Permit is dropped here, allowing next task
    }
}
