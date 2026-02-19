"use server";

import { mapboxGeocodingClient } from "@/lib/external-apis/geocoding";

export async function geocodeLocation(query: string) {
    try {
        const result = await mapboxGeocodingClient.forwardGeocode(query);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: "Failed to geocode location" };
    }
}
