use reqwest::{Client, ClientBuilder};
use std::time::Duration;

#[derive(Clone)]
pub struct HttpClient {
    client: Client,
}

impl HttpClient {
    pub fn new(timeout: Duration) -> Self {
        let client = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(10)
            .build()
            .unwrap();

        Self { client }
    }

    pub fn post(&self, url: &str) -> reqwest::RequestBuilder {
        self.client.post(url)
    }

    pub fn get(&self, url: &str) -> reqwest::RequestBuilder {
        self.client.get(url)
    }
}
