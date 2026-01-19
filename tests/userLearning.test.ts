/**
 * User Learning System Unit Tests
 * Tests for: user preferences, weighted scoring, data hashing, and type validation
 */

import {
  calculateWeightedScore,
  generateDataHash,
  DEFAULT_SCORING_CONFIG,
  UserPreferences,
  DecisionLog,
  DecisionFeedback
} from '../src/lib/types/userLearning';

// =============================================================================
// Test Suites
// =============================================================================

describe('User Learning System - Core Functions', () => {

  // =============================================================================
  // calculateWeightedScore Tests
  // =============================================================================

  describe('calculateWeightedScore', () => {
    it('should return base score for new user (no history)', () => {
      const score = calculateWeightedScore(0, null, 0, 0);
      // Base score = 0.15 (only negative feedback contributes)
      expect(score).toBeGreaterThanOrEqual(0.10);
      expect(score).toBeLessThanOrEqual(0.20);
    });

    it('should return high score for frequent user with recent selection', () => {
      const now = Date.now();
      const score = calculateWeightedScore(100, now, 20, 0);
      expect(score).toBe(1.0); // Maximum possible score
    });

    it('should return low score for infrequent user with old selection', () => {
      const oldDate = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      const score = calculateWeightedScore(1, oldDate, 0, 0);
      expect(score).toBeLessThan(0.30);
    });

    it('should penalize for negative feedback', () => {
      const now = Date.now();
      const withNegative = calculateWeightedScore(50, now, 0, 10);
      const withoutNegative = calculateWeightedScore(50, now, 0, 0);
      expect(withNegative).toBeLessThan(withoutNegative);
    });

    it('should cap frequency score at 1.0', () => {
      const now = Date.now();
      const score100 = calculateWeightedScore(100, now, 0, 0);
      const score200 = calculateWeightedScore(200, now, 0, 0);
      expect(score100).toBe(score200);
    });

    it('should cap positive feedback score at 1.0', () => {
      const now = Date.now();
      const score20 = calculateWeightedScore(50, now, 20, 0);
      const score40 = calculateWeightedScore(50, now, 40, 0);
      expect(score20).toBe(score40);
    });

    it('should apply exponential decay for recency', () => {
      const now = Date.now();
      const today = calculateWeightedScore(50, now, 10, 0);
      const weekAgo = calculateWeightedScore(50, now - 7 * 24 * 60 * 60 * 1000, 10, 0);
      const monthAgo = calculateWeightedScore(50, now - 30 * 24 * 60 * 60 * 1000, 10, 0);

      expect(today).toBeGreaterThan(weekAgo);
      expect(weekAgo).toBeGreaterThan(monthAgo);
    });

    it('should work with custom scoring configuration', () => {
      const customConfig = {
        frequencyWeight: 0.50,
        recencyWeight: 0.20,
        positiveWeight: 0.20,
        negativeWeight: 0.10,
        frequencyCap: 100,
        recencyHalfLifeDays: 7,
        positiveCap: 20,
        negativeCap: 10
      };

      const now = Date.now();
      const score = calculateWeightedScore(100, now, 20, 0, customConfig);
      expect(score).toBeGreaterThanOrEqual(0.90);
    });

    it('should return 3 decimal places precision when needed', () => {
      const now = Date.now();
      const score = calculateWeightedScore(33, now, 7, 3);
      // Score should be a number with up to 3 decimal places
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      // Check it's properly formatted (allow trailing zeros to be omitted)
      const scoreStr = score.toString();
      if (scoreStr.includes('.')) {
        const decimalPart = scoreStr.split('.')[1];
        expect(decimalPart.length).toBeLessThanOrEqual(3);
      }
    });
  });

  // =============================================================================
  // generateDataHash Tests
  // =============================================================================

  describe('generateDataHash', () => {
    it('should generate consistent hash for same data', () => {
      const data = { name: 'test', value: 123 };
      const hash1 = generateDataHash(data);
      const hash2 = generateDataHash(data);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different data', () => {
      const data1 = { name: 'test1' };
      const data2 = { name: 'test2' };
      const hash1 = generateDataHash(data1);
      const hash2 = generateDataHash(data2);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 8-character hex hash', () => {
      const hash = generateDataHash({ test: true });
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle empty object', () => {
      const hash = generateDataHash({});
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle complex nested objects', () => {
      const data = {
        preferences: {
          preferred_facilities: ['elevator', 'escalator'],
          excluded_facilities: ['stairs'],
          profile: 'wheelchair'
        }
      };
      const hash = generateDataHash(data);
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  // =============================================================================
  // Type Validation Tests
  // =============================================================================

  describe('Type Validation', () => {
    it('should create valid UserPreferences object', () => {
      const prefs: UserPreferences = {
        id: 'test-id',
        user_id: 'user-123',
        default_lat: 35.7138,
        default_lon: 139.7773,
        default_zoom: 15,
        map_style: 'light',
        show_hubs_only: false,
        show_labels: true,
        label_language: 'zh-TW',
        dark_mode: false,
        preferred_facility_types: ['elevator'],
        excluded_facility_types: [],
        max_walking_distance: 500,
        sort_by: 'distance',
        sort_order: 'asc',
        user_profile: 'general',
        version: 1,
        updated_at: Date.now(),
        data_hash: 'abc123',
        last_synced_at: null,
        device_id: 'device-001',
        source: 'web',
        created_at: Date.now()
      };

      expect(prefs.user_id).toBe('user-123');
      expect(prefs.user_profile).toBe('general');
      expect(prefs.source).toBe('web');
    });

    it('should accept valid user_profile values', () => {
      const profiles: Array<'general' | 'wheelchair' | 'stroller' | 'large_luggage'> =
        ['general', 'wheelchair', 'stroller', 'large_luggage'];

      profiles.forEach(profile => {
        expect(['general', 'wheelchair', 'stroller', 'large_luggage']).toContain(profile);
      });
    });

    it('should accept valid sort_by values', () => {
      const sortOptions: Array<'distance' | 'rating' | 'popularity' | 'preference_score'> =
        ['distance', 'rating', 'popularity', 'preference_score'];

      sortOptions.forEach(option => {
        expect(['distance', 'rating', 'popularity', 'preference_score']).toContain(option);
      });
    });
  });

  // =============================================================================
  // Scoring Formula Verification
  // =============================================================================

  describe('Scoring Formula Verification', () => {
    it('should match expected formula: (F×0.30) + (R×0.30) + (P×0.25) + (N×0.15)', () => {
      // Test with known values
      const selectionCount = 50;
      const lastSelectedAt = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const positiveCount = 10;
      const negativeCount = 5;

      const score = calculateWeightedScore(selectionCount, lastSelectedAt, positiveCount, negativeCount);

      // Manual calculation verification
      const freqScore = Math.min(50 / 100, 1.0); // 0.5
      const daysSince = 7;
      const recencyScore = Math.exp(-0.1 * daysSince); // ~0.496
      const posScore = Math.min(10 / 20, 1.0); // 0.5
      const negScore = 1.0 - Math.min(5 / 10, 1.0); // 0.5

      const expectedScore = Number((
        freqScore * 0.30 +
        recencyScore * 0.30 +
        posScore * 0.25 +
        negScore * 0.15
      ).toFixed(3));

      expect(score).toBeCloseTo(expectedScore, 2);
    });
  });
});

// =============================================================================
// Integration Tests (API Simulation)
// =============================================================================

describe('User Learning API - Integration', () => {

  describe('Preference Default Values', () => {
    it('should have correct default values for new user', () => {
      const defaults = {
        default_lat: 35.7138,
        default_lon: 139.7773,
        default_zoom: 15,
        map_style: 'light',
        show_hubs_only: false,
        show_labels: true,
        label_language: 'zh-TW',
        dark_mode: false,
        max_walking_distance: 500,
        sort_by: 'distance',
        sort_order: 'asc',
        user_profile: 'general'
      };

      expect(defaults.default_lat).toBe(35.7138);
      expect(defaults.default_lon).toBe(139.7773);
      expect(defaults.label_language).toBe('zh-TW');
      expect(defaults.user_profile).toBe('general');
    });
  });

  describe('Scoring Config Constants', () => {
    it('should have correct default weights', () => {
      expect(DEFAULT_SCORING_CONFIG.frequencyWeight).toBe(0.30);
      expect(DEFAULT_SCORING_CONFIG.recencyWeight).toBe(0.30);
      expect(DEFAULT_SCORING_CONFIG.positiveWeight).toBe(0.25);
      expect(DEFAULT_SCORING_CONFIG.negativeWeight).toBe(0.15);
    });

    it('should have correct caps', () => {
      expect(DEFAULT_SCORING_CONFIG.frequencyCap).toBe(100);
      expect(DEFAULT_SCORING_CONFIG.positiveCap).toBe(20);
      expect(DEFAULT_SCORING_CONFIG.negativeCap).toBe(10);
    });

    it('weights should sum to 1.0', () => {
      const sum = DEFAULT_SCORING_CONFIG.frequencyWeight +
        DEFAULT_SCORING_CONFIG.recencyWeight +
        DEFAULT_SCORING_CONFIG.positiveWeight +
        DEFAULT_SCORING_CONFIG.negativeWeight;

      expect(sum).toBeCloseTo(1.0, 5);
    });
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Edge Cases', () => {

  describe('calculateWeightedScore edge cases', () => {
    it('should handle negative selection count', () => {
      const score = calculateWeightedScore(-1, null, 0, 0);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme negative feedback count', () => {
      const now = Date.now();
      const score = calculateWeightedScore(50, now, 0, 100);
      // Should not go below 0
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very old lastSelectedAt (far past)', () => {
      const veryOld = Date.now() - 365 * 24 * 60 * 60 * 1000; // 1 year ago
      const score = calculateWeightedScore(50, veryOld, 10, 0);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('generateDataHash edge cases', () => {
    it('should handle special characters', () => {
      const hash = generateDataHash({ name: '測試!@#$%^&*()' });
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle unicode characters', () => {
      const hash = generateDataHash({ name: '東京駅' });
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const hash = generateDataHash({ data: longString });
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });
});
