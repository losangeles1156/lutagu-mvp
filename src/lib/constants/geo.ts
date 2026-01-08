/**
 * Geographic constants for the Tokyo Metropolitan area
 */

// Tokyo Metropolitan Government Building as the logical center of Tokyo
export const TOKYO_CENTER = {
    lat: 35.6895,
    lon: 139.6917
};

// Ueno Station as the fallback/default node location
export const UENO_CENTER = {
    lat: 35.7138,
    lon: 139.7773
};

// Valid operation radius in kilometers (100km from Tokyo Center)
export const TOKYO_RADIUS_THRESHOLD_KM = 100;
