export function viewportStepForZoom(zoom: number): number {
    if (zoom >= 15) return 0.005;
    if (zoom >= 13) return 0.01;
    if (zoom >= 11) return 0.05;
    return 0.1;
}
