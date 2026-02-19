'use server';

import { db } from "@/db/client";
import { chargingStations } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";

export interface ChargerBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export interface ChargerFilter {
    fastCharging?: boolean; // > 50kW
    network?: string;
}

export async function getChargersInBounds(bounds: ChargerBounds, filter?: ChargerFilter) {
    try {
        const conditions = [
            gte(chargingStations.latitude, bounds.minLat),
            lte(chargingStations.latitude, bounds.maxLat),
            gte(chargingStations.longitude, bounds.minLng),
            lte(chargingStations.longitude, bounds.maxLng),
            eq(chargingStations.isOperational, true)
        ];

        if (filter?.fastCharging) {
            conditions.push(gte(chargingStations.maxPowerKw, 50));
        }

        if (filter?.network) {
            conditions.push(eq(chargingStations.operator, filter.network));
        }

        const chargers = await db.select()
            .from(chargingStations)
            .where(and(...conditions))
            .limit(500); // Increased to 500 to cover wider areas

        return { success: true, data: chargers };
    } catch (error) {
        console.error("Failed to fetch chargers:", error);
        return { success: false, error: "Failed to load chargers" };
    }
}
