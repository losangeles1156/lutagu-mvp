/**
 * L1 景點模組導出
 */

export { 
    CATEGORY_MAPPINGS, 
    getCategoryFromOSMTags, 
    getCategoryById, 
    getAllCategories, 
    getCategoryName,
    compareCategoriesByWeight,
    type CategoryMapping 
} from './categoryMapping';

export {
    parseWKTPoint,
    createWKTPoint,
    toGeoJSONPoint,
    parseGeoJSONPoint,
    parseCoordinates,
    toCoordinatesArray,
    isValidCoordinate,
    isNearTokyo,
    calculateDistance,
    pointToLineSegmentDistance,
    type PointType,
    type GeoJSONPointType
} from './coordinateUtils';

export { getApprovedL1PlacesContext, type SimplePlaceContext } from './queries';
