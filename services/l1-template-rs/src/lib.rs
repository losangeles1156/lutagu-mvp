use wasm_bindgen::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use lazy_static::lazy_static;

#[derive(Serialize, Deserialize)]
pub struct TemplateResponse {
    pub template_id: String,
    pub match_type: String, // "text" | "action"
    pub content_key: String, // localization key or raw content
    pub params: Option<HashMap<String, String>>,
}

struct Template {
    id: &'static str,
    patterns: Vec<Regex>,
    response_type: &'static str,
    content_key: &'static str,
}

lazy_static! {
    static ref TEMPLATES: Vec<Template> = vec![
        // Greeting
        Template {
            id: "greeting",
            patterns: vec![
                Regex::new(r"(?i)^(你好|您好|hello|hi|hey|安安|哈囉)").unwrap(),
                Regex::new(r"(?i)^(早上好|午安|晚安|早安)").unwrap(),
                Regex::new(r"(?i)^(こんにちは|こんばんは|おはよう|はじめまして|もしもし)").unwrap(),
            ],
            response_type: "text",
            content_key: "greeting_response",
        },
        // Fare Query
        Template {
            id: "fare-query-basic",
            patterns: vec![
                Regex::new(r"(?i)(?:多少錢|票價|車資|運賃|fare).*(?:到|至|まで|to)\s*([^?\s]+)").unwrap(),
                Regex::new(r"(?i)([^?\s]+)(?:的)?(?:票價|車資|運賃|fare)").unwrap(),
            ],
            response_type: "action",
            content_key: "fare_calculating",
        },
        // Live Status
        Template {
            id: "live-status-help",
            patterns: vec![
                Regex::new(r"(?i)(?:延誤|誤點|停駛|停運|運行|運轉|運行狀態|狀態|異常|停電)").unwrap(),
                Regex::new(r"(?i)(?:遅延|運休|運行状況|運転見合わせ)").unwrap(),
                Regex::new(r"(?i)(?:delay|delayed|disruption|suspend|suspended|status|power outage)").unwrap(),
            ],
            response_type: "text",
            content_key: "status_help",
        }
    ];
}

#[wasm_bindgen]
pub struct L1Matcher;

#[wasm_bindgen]
impl L1Matcher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> L1Matcher {
        L1Matcher
    }

    pub fn match_intent(&self, text: &str) -> JsValue {
        let trimmed = text.trim();

        for template in TEMPLATES.iter() {
            for pattern in &template.patterns {
                if let Some(caps) = pattern.captures(trimmed) {
                    let mut params = HashMap::new();
                    // Capture group 1 is usually the target (e.g. fare destination)
                    if let Some(target) = caps.get(1) {
                        params.insert("target".to_string(), target.as_str().to_string());
                    }

                    let response = TemplateResponse {
                        template_id: template.id.to_string(),
                        match_type: template.response_type.to_string(),
                        content_key: template.content_key.to_string(),
                        params: Some(params),
                    };

                    return serde_wasm_bindgen::to_value(&response).unwrap();
                }
            }
        }

        JsValue::NULL
    }
}
