export const mapboxGeocodingClient = {
    async forwardGeocode(query: string) {
        if (!query) return null;

        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Geocoding failed");

            const data = await res.json();
            if (!data.features || data.features.length === 0) return null;

            const [lng, lat] = data.features[0].center;
            return { lat, lng, placeName: data.features[0].place_name };
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
    }
};
