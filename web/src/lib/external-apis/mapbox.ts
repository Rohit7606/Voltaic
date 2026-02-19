interface DirectionsParams {
    coordinates: [number, number][]; // [lng, lat]
    profile: 'driving' | 'walking' | 'cycling';
    geometries: 'geojson' | 'polyline';
}

interface MapboxRoute {
    geometry: {
        coordinates: [number, number][]; // [lng, lat]
    };
    distance: number; // meters
    duration: number; // seconds
    legs?: {
        distance: number;
        duration: number;
        summary: string;
    }[];
}

export const mapboxClient = {
    getDirections: async (params: DirectionsParams): Promise<{ routes: MapboxRoute[] }> => {
        const { coordinates, profile, geometries } = params;

        // Mapbox Directions API expects coordinates as "lng,lat;lng,lat"
        const coordinatesString = coordinates.map(c => c.join(',')).join(';');

        const baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
        const profileId = profile === 'driving' ? 'driving' : profile; // Mapbox uses 'driving', 'walking', 'cycling'

        const url = `${baseUrl}/${profileId}/${coordinatesString}?geometries=${geometries}&overview=full&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Mapbox API error: ${response.statusText}`);
        }

        return await response.json();
    }
};
