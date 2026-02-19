export interface Point {
    lat: number;
    lng: number;
}

export interface Segment {
    coords: [number, number][]; // [lng, lat]
    distance: number; // meters
}

function toRad(value: number): number {
    return (value * Math.PI) / 180;
}

// Haversine distance in meters
export function getDistance(p1: Point, p2: Point): number {
    const R = 6371e3; // Earth radius in meters
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lng - p1.lng);
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Simple implementation to split route into approximate segments
export function segmentPolyline(coordinates: [number, number][], segmentLengthMeters: number): Segment[] {
    const segments: Segment[] = [];
    let currentSegment: [number, number][] = [coordinates[0]];
    let currentDistance = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const p1 = { lat: coordinates[i][1], lng: coordinates[i][0] };
        const p2 = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
        const dist = getDistance(p1, p2);

        // If adding this point exceeds segment length substantially, we might cut it here.
        // For MVP, we just accumulate.
        // A better approach is to interpolate, but for now we just group existing points.

        currentDistance += dist;
        currentSegment.push(coordinates[i + 1]);

        if (currentDistance >= segmentLengthMeters) {
            segments.push({
                coords: currentSegment,
                distance: currentDistance
            });
            // Start new segment from the last point
            currentSegment = [coordinates[i + 1]];
            currentDistance = 0;
        }
    }

    // Push remaining
    if (currentSegment.length > 1) {
        segments.push({
            coords: currentSegment,
            distance: currentDistance
        });
    }

    return segments;
}

export function calculateRouteComplexity(geometry: any): number {
    // Simple heuristic: Sinuosity (actual distance / straight line distance)
    // Input geometry is GeoJSON LineString
    const coords = geometry.coordinates;
    if (!coords || coords.length < 2) return 0;

    const start = { lat: coords[0][1], lng: coords[0][0] };
    const end = { lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] };

    const straightDist = getDistance(start, end);

    let actualDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        actualDist += getDistance(
            { lat: coords[i][1], lng: coords[i][0] },
            { lat: coords[i + 1][1], lng: coords[i + 1][0] }
        );
    }

    if (straightDist === 0) return 0;
    const sinuosity = actualDist / straightDist;

    // Normalize: 1.0 = straight, >1.5 = curvy
    // Map 1.0->1.0 to 0, 1.5 to 1.0 (clamped)
    return Math.min(1, Math.max(0, (sinuosity - 1.0) * 2));
}
