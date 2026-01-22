//! Parse Lighthouse Report Summary
//! Rust replacement for parse_lighthouse.py

use anyhow::{Context, Result};
use serde_json::Value;
use std::fs;

const DEFAULT_REPORT_PATH: &str = "./lighthouse-report.json";

fn main() -> Result<()> {
    let content = fs::read_to_string(DEFAULT_REPORT_PATH)
        .with_context(|| format!("Failed to read report: {}", DEFAULT_REPORT_PATH))?;

    let data: Value = serde_json::from_str(&content)
        .context("Failed to parse JSON")?;

    let categories = &data["categories"];
    let audits = &data["audits"];

    println!("--- Lighthouse Report Summary ---");

    // Performance Score
    let perf_score = categories["performance"]["score"]
        .as_f64()
        .unwrap_or(0.0) * 100.0;
    println!("Performance Score: {:.0}", perf_score);

    // FCP
    let fcp = audits["first-contentful-paint"]["displayValue"]
        .as_str()
        .unwrap_or("N/A");
    println!("First Contentful Paint (FCP): {}", fcp);

    // LCP
    let lcp = audits["largest-contentful-paint"]["displayValue"]
        .as_str()
        .unwrap_or("N/A");
    println!("Largest Contentful Paint (LCP): {}", lcp);

    // TBT
    let tbt = audits["total-blocking-time"]["displayValue"]
        .as_str()
        .unwrap_or("N/A");
    println!("Total Blocking Time (TBT): {}", tbt);

    // CLS
    let cls = audits["cumulative-layout-shift"]["displayValue"]
        .as_str()
        .unwrap_or("N/A");
    println!("Cumulative Layout Shift (CLS): {}", cls);

    // Speed Index
    let si = audits["speed-index"]["displayValue"]
        .as_str()
        .unwrap_or("N/A");
    println!("Speed Index: {}", si);

    // INP (may not exist)
    let inp = audits["interaction-to-next-paint"]["displayValue"]
        .as_str()
        .unwrap_or("N/A");
    println!("Interaction to Next Paint (INP): {}", inp);

    Ok(())
}
