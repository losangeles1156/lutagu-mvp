//! Station Name Resolver with Fuzzy Matching
//!
//! This module provides fuzzy matching for station names in multiple languages.
//! It supports:
//! - Exact match on ODPT IDs
//! - Exact match on localized names (ja, en, zh)
//! - Prefix matching for partial input
//! - Levenshtein distance matching for typo tolerance

use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};

/// Station entry from the dictionary
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StationEntry {
    pub id: String,
    pub names: StationNames,
    pub aliases: Vec<String>,
    #[serde(default)]
    pub reading: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StationNames {
    pub ja: String,
    pub en: String,
    pub zh: String,
}

#[derive(Debug, Clone, Deserialize)]
struct StationDictionary {
    meta: DictionaryMeta,
    stations: Vec<StationEntry>,
}

#[derive(Debug, Clone, Deserialize)]
struct DictionaryMeta {
    count: usize,
    generated_at: String,
    version: String,
}

/// Resolved station information
#[derive(Debug, Clone, Serialize)]
pub struct ResolvedStation {
    pub query: String,
    pub matched_id: String,
    pub confidence: f64,
    pub match_type: String,
}

/// Station name resolver with fuzzy matching capabilities
pub struct StationResolver {
    stations: Vec<StationEntry>,
    // Index for fast exact lookups
    id_index: HashMap<String, usize>,
    name_index: HashMap<String, Vec<usize>>,
}

impl StationResolver {
    /// Load resolver from a JSON dictionary file
    pub fn from_file(path: &Path) -> anyhow::Result<Self> {
        let content = fs::read_to_string(path)?;
        let dict: StationDictionary = serde_json::from_str(&content)?;

        let mut resolver = Self {
            stations: dict.stations,
            id_index: HashMap::new(),
            name_index: HashMap::new(),
        };

        resolver.build_indices();
        Ok(resolver)
    }

    /// Create resolver from station entries directly
    pub fn new(stations: Vec<StationEntry>) -> Self {
        let mut resolver = Self {
            stations,
            id_index: HashMap::new(),
            name_index: HashMap::new(),
        };
        resolver.build_indices();
        resolver
    }

    fn build_indices(&mut self) {
        for (idx, station) in self.stations.iter().enumerate() {
            // Index by ID
            self.id_index.insert(station.id.to_lowercase(), idx);

            // Index by names
            for name in [&station.names.ja, &station.names.en, &station.names.zh] {
                if !name.is_empty() {
                    let key = name.to_lowercase();
                    self.name_index.entry(key).or_default().push(idx);
                }
            }

            // Index by aliases
            for alias in &station.aliases {
                let key = alias.to_lowercase();
                self.name_index.entry(key).or_default().push(idx);
            }
        }
    }

    /// Resolve a query string to station IDs
    /// Returns up to `max_results` matching station IDs
    pub fn resolve(&self, query: &str, max_results: usize) -> Vec<ResolvedStation> {
        let query_lower = query.to_lowercase().trim().to_string();
        let query_normalized = normalize_for_matching(&query_lower);

        let mut results: Vec<ResolvedStation> = Vec::new();

        // 1. Exact match on ID
        if let Some(&idx) = self.id_index.get(&query_lower) {
            results.push(ResolvedStation {
                query: query.to_string(),
                matched_id: self.stations[idx].id.clone(),
                confidence: 1.0,
                match_type: "exact_id".to_string(),
            });
            return results;
        }

        // 2. Exact match on names/aliases
        if let Some(indices) = self.name_index.get(&query_normalized) {
            for &idx in indices.iter().take(max_results) {
                results.push(ResolvedStation {
                    query: query.to_string(),
                    matched_id: self.stations[idx].id.clone(),
                    confidence: 0.95,
                    match_type: "exact_name".to_string(),
                });
            }
            if !results.is_empty() {
                return results;
            }
        }

        // 3. Prefix match
        let prefix_matches = self.prefix_match(&query_normalized, max_results);
        if !prefix_matches.is_empty() {
            return prefix_matches
                .into_iter()
                .map(|(idx, _)| ResolvedStation {
                    query: query.to_string(),
                    matched_id: self.stations[idx].id.clone(),
                    confidence: 0.8,
                    match_type: "prefix".to_string(),
                })
                .collect();
        }

        // 4. Fuzzy match (Levenshtein distance)
        let fuzzy_matches = self.fuzzy_match(&query_normalized, 2, max_results);
        for (idx, distance) in fuzzy_matches {
            let confidence = 1.0 - (distance as f64 / query_normalized.len().max(1) as f64);
            results.push(ResolvedStation {
                query: query.to_string(),
                matched_id: self.stations[idx].id.clone(),
                confidence: confidence.max(0.5),
                match_type: format!("fuzzy_d{}", distance),
            });
        }

        results
    }

    /// Find stations where any name starts with the query
    fn prefix_match(&self, query: &str, max_results: usize) -> Vec<(usize, String)> {
        let mut matches: Vec<(usize, String)> = Vec::new();

        for (name, indices) in &self.name_index {
            if name.starts_with(query) {
                for &idx in indices {
                    if matches.len() >= max_results {
                        return matches;
                    }
                    matches.push((idx, name.clone()));
                }
            }
        }

        matches
    }

    /// Find stations with Levenshtein distance <= max_distance
    fn fuzzy_match(
        &self,
        query: &str,
        max_distance: usize,
        max_results: usize,
    ) -> Vec<(usize, usize)> {
        let mut matches: Vec<(usize, usize)> = Vec::new();

        for (name, indices) in &self.name_index {
            let distance = levenshtein_distance(query, name);
            if distance <= max_distance {
                for &idx in indices {
                    if matches.len() >= max_results * 2 {
                        break;
                    }
                    matches.push((idx, distance));
                }
            }
        }

        // Sort by distance (best matches first)
        matches.sort_by_key(|&(_, d)| d);
        matches.truncate(max_results);
        matches
    }

    /// Get localized name for a station ID
    pub fn get_localized_name(&self, station_id: &str, locale: &str) -> Option<String> {
        let id_lower = station_id.to_lowercase();
        if let Some(&idx) = self.id_index.get(&id_lower) {
            let names = &self.stations[idx].names;
            return Some(match locale {
                "ja" => names.ja.clone(),
                "en" => names.en.clone(),
                "zh" | "zh-TW" | "zh-CN" => names.zh.clone(),
                _ => names.en.clone(), // Default to English
            });
        }

        // Fallback: extract from ID
        extract_name_from_id(station_id)
    }

    /// Localize an entire path
    pub fn localize_path(&self, path: &[String], locale: &str) -> Vec<String> {
        path.iter()
            .map(|id| {
                self.get_localized_name(id, locale)
                    .unwrap_or_else(|| id.clone())
            })
            .collect()
    }
}

/// Normalize text for matching (remove common suffixes, lowercase, etc.)
fn normalize_for_matching(text: &str) -> String {
    let mut result = text.to_lowercase();

    // Remove common station suffixes
    let suffixes = ["駅", "station", "sta.", "sta", "站", "驛"];
    for suffix in suffixes {
        if result.ends_with(suffix) {
            result = result[..result.len() - suffix.len()].trim().to_string();
        }
    }

    // Remove macrons
    result = result
        .replace('ō', "o")
        .replace('ū', "u")
        .replace('ā', "a")
        .replace('ī', "i")
        .replace('ē', "e");

    result.trim().to_string()
}

/// Extract a readable name from an ODPT station ID
fn extract_name_from_id(station_id: &str) -> Option<String> {
    // Pattern: odpt.Station:Operator.Line.StationName
    let parts: Vec<&str> = station_id.split('.').collect();
    if parts.len() >= 4 {
        // Split CamelCase
        let name = parts.last()?;
        let spaced = name.chars().fold(String::new(), |mut acc, c| {
            if c.is_uppercase() && !acc.is_empty() {
                acc.push(' ');
            }
            acc.push(c);
            acc
        });
        Some(spaced)
    } else {
        None
    }
}

/// Calculate Levenshtein distance between two strings
fn levenshtein_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();

    let len_a = a.len();
    let len_b = b.len();

    if len_a == 0 {
        return len_b;
    }
    if len_b == 0 {
        return len_a;
    }

    let mut prev_row: Vec<usize> = (0..=len_b).collect();
    let mut curr_row: Vec<usize> = vec![0; len_b + 1];

    for i in 1..=len_a {
        curr_row[0] = i;
        for j in 1..=len_b {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            curr_row[j] = (prev_row[j] + 1)
                .min(curr_row[j - 1] + 1)
                .min(prev_row[j - 1] + cost);
        }
        std::mem::swap(&mut prev_row, &mut curr_row);
    }

    prev_row[len_b]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_resolver() -> StationResolver {
        let stations = vec![
            StationEntry {
                id: "odpt.Station:JR-East.Yamanote.Tokyo".to_string(),
                names: StationNames {
                    ja: "東京".to_string(),
                    en: "Tokyo".to_string(),
                    zh: "東京".to_string(),
                },
                aliases: vec!["東京駅".to_string(), "Tokyo Station".to_string()],
                reading: "とうきょう".to_string(),
            },
            StationEntry {
                id: "odpt.Station:JR-East.Yamanote.Shinjuku".to_string(),
                names: StationNames {
                    ja: "新宿".to_string(),
                    en: "Shinjuku".to_string(),
                    zh: "新宿".to_string(),
                },
                aliases: vec!["新宿駅".to_string(), "Shinjuku Station".to_string()],
                reading: "しんじゅく".to_string(),
            },
        ];
        StationResolver::new(stations)
    }

    #[test]
    fn test_exact_match() {
        let resolver = make_test_resolver();
        let results = resolver.resolve("東京", 5);
        assert!(!results.is_empty());
        assert_eq!(results[0].matched_id, "odpt.Station:JR-East.Yamanote.Tokyo");
    }

    #[test]
    fn test_fuzzy_match() {
        let resolver = make_test_resolver();
        let results = resolver.resolve("shinjku", 5); // Typo
        assert!(!results.is_empty());
        assert_eq!(
            results[0].matched_id,
            "odpt.Station:JR-East.Yamanote.Shinjuku"
        );
    }

    #[test]
    fn test_levenshtein() {
        assert_eq!(levenshtein_distance("kitten", "sitting"), 3);
        assert_eq!(levenshtein_distance("tokyo", "tokio"), 1);
        assert_eq!(levenshtein_distance("shinjuku", "shinjku"), 1);
    }
}
