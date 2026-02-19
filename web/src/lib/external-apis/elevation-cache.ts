import { db } from "@/db/client";
import { elevationCacheTable } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

interface CacheKey {
    lat: number;
    lng: number;
}

class ElevationCache {
    // In-memory L1 cache to avoid DB hits for repeated points in same session
    private memCache = new Map<string, number>();

    private getKey(lat: number, lng: number): string {
        return `${lat.toFixed(4)},${lng.toFixed(4)}`;
    }

    /**
     * Bulk fetch elevations from DB
     */
    public async getMany(locations: { lat: number, lng: number }[]): Promise<Map<number, number>> {
        const results = new Map<number, number>();
        const missingIndices: number[] = [];

        // 1. First Pass: Check MemCache
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        locations.forEach((loc, idx) => {
            const key = this.getKey(loc.lat, loc.lng);
            if (this.memCache.has(key)) {
                results.set(idx, this.memCache.get(key)!);
            } else {
                missingIndices.push(idx);
                // Track bounds for bulk fetch
                minLat = Math.min(minLat, loc.lat);
                maxLat = Math.max(maxLat, loc.lat);
                minLng = Math.min(minLng, loc.lng);
                maxLng = Math.max(maxLng, loc.lng);
            }
        });

        if (missingIndices.length === 0) return results;

        // 2. Fetch from DB using Bounding Box (Robust against float precision)
        try {
            // Add slight buffer (0.1 degree ~ 11km) to catch nearby grid points
            const BUFFER = 0.1;

            console.log(`🔍 [CacheSpy] Querying Bounds: Lat ${minLat.toFixed(2)}-${maxLat.toFixed(2)}, Lng ${minLng.toFixed(2)}-${maxLng.toFixed(2)}`);

            const dbResults = await db
                .select()
                .from(elevationCacheTable)
                .where(and(
                    sql`${elevationCacheTable.latitude} >= ${minLat - BUFFER}`,
                    sql`${elevationCacheTable.latitude} <= ${maxLat + BUFFER}`,
                    sql`${elevationCacheTable.longitude} >= ${minLng - BUFFER}`,
                    sql`${elevationCacheTable.longitude} <= ${maxLng + BUFFER}`
                ));

            console.log(`📦 [CacheSpy] DB returned ${dbResults.length} points for this region.`);

            // Populate MemCache with EVERYTHING found in the area
            for (const row of dbResults) {
                const key = this.getKey(row.latitude, row.longitude);
                this.memCache.set(key, row.elevation);
            }

            // 3. Second Pass: Re-check MemCache (Exact + Grid Snap)
            const GRID_RES = 0.05;
            const snap = (val: number) => (Math.round(val / GRID_RES) * GRID_RES);

            missingIndices.forEach(idx => {
                const loc = locations[idx];
                const key = this.getKey(loc.lat, loc.lng);

                // Try Exact
                if (this.memCache.has(key)) {
                    results.set(idx, this.memCache.get(key)!);
                    return;
                }

                // Try Snapped (Fuzzy Match)
                const snappedKey = this.getKey(snap(loc.lat), snap(loc.lng));
                if (this.memCache.has(snappedKey)) {
                    results.set(idx, this.memCache.get(snappedKey)!);
                }
            });

        } catch (e) {
            console.error("DB Cache Read Error:", e);
        }

        return results;
    }

    /**
     * Save to DB (Fire and Forget / Async)
     */
    public async setMany(items: { lat: number, lng: number, elevation: number }[]) {
        try {
            const newItems = items.filter(item => {
                const key = this.getKey(item.lat, item.lng);
                if (this.memCache.has(key)) return false; // Already cached
                this.memCache.set(key, item.elevation);
                return true;
            });

            if (newItems.length === 0) return;

            // map to DB schema
            const rows = newItems.map(item => ({
                latitude: parseFloat(item.lat.toFixed(4)),
                longitude: parseFloat(item.lng.toFixed(4)),
                elevation: item.elevation
            }));

            // Insert with conflict ignore (if exists, skip)
            await db.insert(elevationCacheTable)
                .values(rows)
                .onConflictDoNothing()
                .execute();

            // console.log(`💾 DB Cache Saved: ${rows.length} new points`);
        } catch (e) {
            console.error("DB Cache Write Error:", e);
        }
    }
}

// Singleton
export const elevationCache = new ElevationCache();
