//! Debug LCP (Largest Contentful Paint) from Lighthouse JSON
//! Rust replacement for debug_lcp.py

use anyhow::{Context, Result};
use serde_json::Value;
use std::env;
use std::fs;

fn main() -> Result<()> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: debug_lcp <lighthouse-report.json>");
        std::process::exit(1);
    }

    let file_path = &args[1];
    let content = fs::read_to_string(file_path)
        .with_context(|| format!("Failed to read file: {}", file_path))?;

    let data: Value = serde_json::from_str(&content)
        .context("Failed to parse JSON")?;

    // Extract FCP
    let fcp_numeric = data["audits"]["first-contentful-paint"]["numericValue"]
        .as_f64()
        .unwrap_or(0.0);
    println!("FCP Numeric: {:.2}", fcp_numeric);

    // Extract LCP
    let lcp_numeric = data["audits"]["largest-contentful-paint"]["numericValue"]
        .as_f64()
        .unwrap_or(0.0);
    println!("LCP Numeric: {:.2}", lcp_numeric);

    // Extract LCP Element Details
    if let Some(lcp_element_audit) = data["audits"].get("largest-contentful-paint-element") {
        if let Some(items) = lcp_element_audit["details"]["items"].as_array() {
            println!("LCP Element Details:");
            println!("{}", serde_json::to_string_pretty(items)?);
        } else {
            println!("LCP Element audit found but no items.");
        }
    } else {
        println!("largest-contentful-paint-element audit not found");
    }

    Ok(())
}
