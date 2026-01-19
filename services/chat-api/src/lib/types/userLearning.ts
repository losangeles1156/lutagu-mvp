// =============================================================================
// User Preferences & Learning System Type Definitions
// =============================================================================

// 1. User Preferences
export interface UserPreferences {
  id: string;
  user_id: string;

  // Map View Preferences
  default_lat: number;
  default_lon: number;
  default_zoom: number;
  map_style: string;

  // Display Settings
  show_hubs_only: boolean;
  show_labels: boolean;
  label_language: string;
  dark_mode: boolean;

  // Filter Preferences
  preferred_facility_types: string[];
  excluded_facility_types: string[];
  max_walking_distance: number;

  // Sort Preferences
  sort_by: 'distance' | 'rating' | 'popularity' | 'preference_score';
  sort_order: 'asc' | 'desc';

  // User Profile
  user_profile: 'general' | 'wheelchair' | 'stroller' | 'large_luggage';

  // Version Control
  version: number;
  updated_at: number;
  data_hash: string;

  // Sync Metadata
  last_synced_at: number | null;
  device_id: string;
  source: 'web' | 'ios' | 'android';

  created_at: number;
}

// 2. Decision Log
export interface DecisionLog {
  id: string;
  user_id: string;

  // Query Conditions
  query_geo_bounds: GeoBounds;
  query_center: { lat: number; lon: number } | null;
  query_radius_meters: number | null;
  query_facility_types: string[];
  query_time_context: string | null;

  // Result Set
  result_node_ids: string[];
  result_count: number;

  // Decision Details
  selected_node_ids: string[];
  decision_duration_ms: number | null;
  scroll_depth: number | null;
  filter_changes: FilterChange[];

  // Context
  map_zoom: number | null;
  weather_condition: string | null;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  day_of_week: string | null;

  // Version Control
  version: number;
  created_at: number;
}

// 3. Decision Feedback
export interface DecisionFeedback {
  id: string;
  decision_id: string;
  user_id: string;

  feedback_type: 'positive' | 'negative' | 'bookmark' | 'report_issue';
  feedback_score: number | null;  // 1-5 rating
  feedback_text: string | null;
  reported_issues: string[];

  time_since_decision_hours: number | null;

  version: number;
  created_at: number;
  updated_at: number;
}

// 4. Facility Preference Weights
export interface FacilityPreferenceWeight {
  id: string;
  user_id: string;
  facility_type: string;

  // Score Components
  frequency_score: number;       // 0-1
  recency_score: number;         // 0-1
  positive_feedback_score: number; // 0-1
  negative_feedback_score: number; // 0-1

  // Combined Score
  combined_score: number;        // 0-1
  selection_count: number;
  last_selected_at: number | null;

  version: number;
  updated_at: number;
}

// 5. Preference Snapshot
export interface UserPreferenceSnapshot {
  id: string;
  user_id: string;
  preference_id: string;

  snapshot_data: UserPreferences;
  snapshot_hash: string;

  snapshot_reason: 'scheduled' | 'manual' | 'testing' | 'reset';
  is_active: boolean;
  ab_test_group: string | null;

  version: number;
  created_at: number;
}

// Supporting Types
export interface GeoBounds {
  swLat: number;
  swLon: number;
  neLat: number;
  neLon: number;
}

export interface FilterChange {
  filter_type: string;
  old_value: any;
  new_value: any;
  timestamp: number;
}

// API Request/Response Types
export interface PreferencesUpdateRequest {
  preferences: Partial<UserPreferences>;
  source?: 'web' | 'ios' | 'android';
  device_id?: string;
}

export interface PreferencesResponse {
  success: boolean;
  preferences: UserPreferences | null;
  version: number;
  error?: string;
}

export interface DecisionRecordRequest {
  user_id: string;
  query_geo_bounds: GeoBounds;
  query_center: { lat: number; lon: number } | null;
  query_radius_meters: number;
  query_facility_types: string[];
  result_node_ids: string[];
  selected_node_ids: string[];
  decision_duration_ms: number;
  scroll_depth?: number;
  filter_changes?: FilterChange[];
  map_zoom?: number;
  weather_condition?: string;
  time_of_day?: string;
  day_of_week?: string;
}

export interface DecisionRecordResponse {
  success: boolean;
  decision_id: string | null;
  error?: string;
}

export interface LearningResultsResponse {
  success: boolean;
  user_id: string;
  facility_weights: FacilityPreferenceWeight[];
  recent_decisions: DecisionLog[];
  total_decisions: number;
  average_decision_time_ms: number | null;
}

// Version Control Headers
export interface VersionHeaders {
  'X-Data-Version': string;
  'X-If-Match': string;    // ETag for conditional requests
  'X-Last-Modified': string;
}

// Scoring Configuration
export interface ScoringConfig {
  frequencyWeight: number;      // Default: 0.30
  recencyWeight: number;        // Default: 0.30
  positiveWeight: number;       // Default: 0.25
  negativeWeight: number;       // Default: 0.15
  frequencyCap: number;         // Default: 100 selections
  recencyHalfLifeDays: number;  // Default: 7 days
  positiveCap: number;          // Default: 20 positive feedbacks
  negativeCap: number;          // Default: 10 negative feedbacks
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  frequencyWeight: 0.30,
  recencyWeight: 0.30,
  positiveWeight: 0.25,
  negativeWeight: 0.15,
  frequencyCap: 100,
  recencyHalfLifeDays: 7,
  positiveCap: 20,
  negativeCap: 10
};

// Utility Functions
export function calculateWeightedScore(
  selectionCount: number,
  lastSelectedAt: number | null,
  positiveCount: number,
  negativeCount: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  // Frequency score
  const freqScore = Math.min(selectionCount / config.frequencyCap, 1.0);

  // Recency score (exponential decay)
  const daysSince = lastSelectedAt
    ? (Date.now() - lastSelectedAt) / (1000 * 60 * 60 * 24)
    : 999;
  const recencyScore = Math.exp(-0.1 * daysSince);  // decay factor

  // Positive feedback score
  const posScore = Math.min(positiveCount / config.positiveCap, 1.0);

  // Negative feedback score (inverse)
  const negScore = 1.0 - Math.min(negativeCount / config.negativeCap, 1.0);

  // Combined score
  return Number((
    freqScore * config.frequencyWeight +
    recencyScore * config.recencyWeight +
    posScore * config.positiveWeight +
    negScore * config.negativeWeight
  ).toFixed(3));
}

export function generateDataHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
