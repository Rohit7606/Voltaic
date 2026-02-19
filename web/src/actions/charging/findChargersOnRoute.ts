'use server';

import { db } from "@/db/client";
import { chargingStations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDistance } from "@/lib/utils/geometry";

export async function findChargersOnRoute(params: {
    routeGeometry: any; // GeoJSON LineString
    corridorWidthKm: number;
}) {
    try {
        const { routeGeometry, corridorWidthKm } = params;

        // Route geometry is GeoJSON LineString
        const coords = routeGeometry.coordinates as [number, number][]; // [lng, lat]

        if (!coords.length) return { success: true, data: [] };

        // 1. Calculate Bounding Box of Route for initial DB filter
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        coords.forEach(([lng, lat]) => {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        });

        // Expand bbox by corridor width (approx 1 degree ~ 111km)
        const latBuffer = (corridorWidthKm / 111);
        const latRad = minLat * Math.PI / 180;
        const lngBuffer = (corridorWidthKm / (111 * Math.cos(latRad)));

        // Fetch all operational chargers (MVP: dataset small enough)
        // In production, use range queries on lat/lng if available
        const chargers = await db
            .select()
            .from(chargingStations)
            .where(eq(chargingStations.isOperational, true));

        // 2. Filter in memory
        const filteredChargers = chargers.filter(charger => {
            const cLat = charger.latitude;
            const cLng = charger.longitude;

            if (cLat < minLat - latBuffer || cLat > maxLat + latBuffer ||
                cLng < minLng - lngBuffer || cLng > maxLng + lngBuffer) {
                return false;
            }

            const chargerPoint = { lat: cLat, lng: cLng };

            // Distance to polyline vertices
            for (const [rLng, rLat] of coords) {
                const routePoint = { lat: rLat, lng: rLng };
                const d = getDistance(chargerPoint, routePoint);
                if (d <= corridorWidthKm * 1000) return true;
            }
            return false;
        });

        return {
            success: true,
            data: filteredChargers,
        };

    } catch (e) {
        console.error("Find chargers error:", e);
        return { success: false, error: e instanceof Error ? e.message : "DB Error" };
    }
}
