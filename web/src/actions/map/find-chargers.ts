'use server';

import { db } from "@/db/client";
import { chargingStations } from "@/db/schema";
import { sql, desc, and, gte } from "drizzle-orm";

interface FindChargersParams {
    lat: number;
    lng: number;
    radiusKm?: number;
    minPowerKw?: number;
    limit?: number;
}

export async function findChargersNear({
    lat,
    lng,
    radiusKm = 50,
    minPowerKw = 0,
    limit = 10
}: FindChargersParams) {
    try {
        // Haversine Formula in SQL
        // 6371 = Earth's radius in km
        const distanceExpr = sql`
            (6371 * acos(
                cos(radians(${lat})) * cos(radians(${chargingStations.latitude})) *
                cos(radians(${chargingStations.longitude}) - radians(${lng})) +
                sin(radians(${lat})) * sin(radians(${chargingStations.latitude}))
            ))
        `;

        const chargers = await db
            .select({
                id: chargingStations.id,
                name: chargingStations.name,
                latitude: chargingStations.latitude,
                longitude: chargingStations.longitude,
                maxPowerKw: chargingStations.maxPowerKw,
                connectorTypes: chargingStations.connectorTypes,
                distance: distanceExpr,
            })
            .from(chargingStations)
            .where(
                and(
                    sql`${distanceExpr} < ${radiusKm}`,
                    gte(chargingStations.maxPowerKw, minPowerKw)
                )
            )
            .orderBy(distanceExpr) // Closest first
            .limit(limit);

        return { success: true, data: chargers };

    } catch (error) {
        console.error("Failed to find chargers:", error);
        return { success: false, error: "Failed to query chargers" };
    }
}
