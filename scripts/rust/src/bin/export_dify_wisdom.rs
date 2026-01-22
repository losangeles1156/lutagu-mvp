//! Export Station Wisdom to Dify RAG format
//! Rust replacement for scripts/export_dify_wisdom.py
//!
//! UPDATED: Now parses 'src/data/knowledge_base.json' instead of the deprecated 'stationWisdom.ts'.
//! This aligns with the new data source (KnowledgeBase 3.0).

use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;

const INPUT_FILE: &str = "src/data/knowledge_base.json";
const OUTPUT_DIR: &str = "dify_import";
const OUTPUT_FILE: &str = "dify_import/station_wisdom_rag.txt";

#[derive(Debug, Deserialize)]
struct KnowledgeItem {
    #[serde(default)]
    id: String,
    #[serde(default)]
    entityName: String,
    #[serde(default)]
    entityIds: Vec<String>,
    #[serde(default)]
    section: String,
    #[serde(default)]
    content: String,
    #[serde(rename = "type", default)]
    item_type: String, // info, tip, warning
    #[serde(default)]
    priority: i32,
}

#[derive(Default)]
struct StationData {
    name: String,
    warnings: Vec<KnowledgeItem>,
    tips: Vec<KnowledgeItem>,
    infos: Vec<KnowledgeItem>,
}

fn main() -> Result<()> {
    // Ensure output directory exists
    fs::create_dir_all(OUTPUT_DIR).context("Failed to create output directory")?;

    // Read input file
    let content = fs::read_to_string(INPUT_FILE)
        .with_context(|| format!("Failed to read input file: {}", INPUT_FILE))?;

    // Parse JSON
    let items: Vec<KnowledgeItem> = serde_json::from_str(&content)
        .context("Failed to parse knowledge_base.json")?;

    // Group by Station ID
    // Note: One item can belong to multiple station IDs. We will duplicate the context for each station ID
    // so that the RAG model can retrieve it by specific station ID.
    let mut station_map: HashMap<String, StationData> = HashMap::new();

    for item in items {
        for station_id in &item.entityIds {
            let entry = station_map.entry(station_id.clone()).or_insert(StationData {
                name: item.entityName.clone(),
                warnings: vec![],
                tips: vec![],
                infos: vec![],
            });

            // If name is empty in struct, ensure it's set
            if entry.name.is_empty() && !item.entityName.is_empty() {
                entry.name = item.entityName.clone();
            }

            match item.item_type.as_str() {
                "warning" => entry.warnings.push(item_clone(&item)),
                "tip" => entry.tips.push(item_clone(&item)),
                _ => entry.infos.push(item_clone(&item)),
            }
        }
    }

    let mut output = String::new();
    let count = station_map.len();

    // Sort by Station ID for deterministic output
    let mut sorted_keys: Vec<_> = station_map.keys().cloned().collect();
    sorted_keys.sort();

    for station_id in sorted_keys {
        if let Some(data) = station_map.get(&station_id) {
            output.push_str(&format!("### Station Context: {} ({})\n", station_id, data.name));
            
            // 1. Warnings (Transfer Pain, Traps) - High Priority
            if !data.warnings.is_empty() {
                output.push_str("\n**Traps (Warnings & Pitfalls):**\n");
                for item in sort_by_priority(&data.warnings) {
                    output.push_str(&format!("- [Warning] {}: {}\n", item.section, item.content.replace("\n", " ")));
                }
            }

            // 2. Tips (Hacks, Routes)
            if !data.tips.is_empty() {
                output.push_str("\n**Hacks (Tips & Shortcuts):**\n");
                for item in sort_by_priority(&data.tips) {
                    output.push_str(&format!("- [Tip] {}: {}\n", item.section, item.content.replace("\n", " ")));
                }
            }

            // 3. General Info (Basic Info, Exits)
            if !data.infos.is_empty() {
                output.push_str("\n**General Info:**\n");
                for item in sort_by_priority(&data.infos) {
                    output.push_str(&format!("- [Info] {}: {}\n", item.section, item.content.replace("\n", " ")));
                }
            }

            output.push_str("\n---\n\n");
        }
    }

    // Write output
    fs::write(OUTPUT_FILE, &output)
        .with_context(|| format!("Failed to write output file: {}", OUTPUT_FILE))?;

    println!("Successfully processed {} stations.", count);
    println!("Output written to: {}", OUTPUT_FILE);

    Ok(())
}

fn item_clone(item: &KnowledgeItem) -> KnowledgeItem {
    KnowledgeItem {
        id: item.id.clone(),
        entityName: item.entityName.clone(),
        entityIds: item.entityIds.clone(),
        section: item.section.clone(),
        content: item.content.clone(),
        item_type: item.item_type.clone(),
        priority: item.priority,
    }
}

fn sort_by_priority(items: &[KnowledgeItem]) -> Vec<&KnowledgeItem> {
    let mut sorted: Vec<&KnowledgeItem> = items.iter().collect();
    // Sort descending by priority (higher first)
    sorted.sort_by(|a, b| b.priority.cmp(&a.priority));
    sorted
}
