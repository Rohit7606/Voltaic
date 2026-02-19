import { elevationCache } from "./elevation-cache";

interface Location {
    lat: number;
    lng: number;
}

export const openElevationClient = {
    getElevations: async (locations: Location[]): Promise<number[]> => {
        // 1. Check Cache First (Async DB)
        const resultsMap = new Map<number, number>(); // index -> elevation
        const missingIndices: number[] = [];
        const missingLocations: Location[] = [];

        // Batch lookup
        const cachedMap = await elevationCache.getMany(locations);

        locations.forEach((loc, index) => {
            // Fix: Cache now returns Map<index, elevation> so we lookup by index
            const val = cachedMap.get(index);

            if (val !== undefined) {
                resultsMap.set(index, val);
            } else {
                missingIndices.push(index);
                missingLocations.push(loc);
            }
        });

        // 3. Smart Interpolation (The "Gliding" Fallback)
        // If we have gaps, try to fill them mathematically before calling the API.
        const FILLED_BY_INTERPOLATION: number[] = [];
        const indicesToFetchNow: number[] = [];
        const locsToFetchNow: Location[] = [];

        // We can only interpolate if we have data boundaries. 
        // Simple linear interpolation between known cache hits.

        let lastKnownIdx = -1;
        let lastKnownVal = 0;

        // Forward pass to identify runnable gaps
        for (let i = 0; i < locations.length; i++) {
            if (resultsMap.has(i)) {
                lastKnownIdx = i;
                lastKnownVal = resultsMap.get(i)!;
            } else {
                // It's a gap. Can we interpolate?
                // Look ahead for next known value
                let nextKnownIdx = -1;
                let nextKnownVal = 0;

                // Scan ahead up to 300 points (approx 30km) - Aggressive bridging for rural areas
                for (let j = i + 1; j < Math.min(i + 300, locations.length); j++) {
                    if (resultsMap.has(j)) {
                        nextKnownIdx = j;
                        nextKnownVal = resultsMap.get(j)!;
                        break;
                    }
                }

                if (lastKnownIdx !== -1 && nextKnownIdx !== -1) {
                    // We have a bridge! Interpolate.
                    const totalSteps = nextKnownIdx - lastKnownIdx;
                    const currentStep = i - lastKnownIdx;
                    const val = lastKnownVal + ((nextKnownVal - lastKnownVal) * (currentStep / totalSteps));

                    resultsMap.set(i, val); // Fill it!
                    FILLED_BY_INTERPOLATION.push(i);
                } else {
                    // Gap too wide or edge case -> Must Fetch
                    indicesToFetchNow.push(i);
                    locsToFetchNow.push(locations[i]);
                }
            }
        }

        if (FILLED_BY_INTERPOLATION.length > 0) {
            console.log(`📉 Smart Interpolation: Filled ${FILLED_BY_INTERPOLATION.length} points without API.`);
        }

        if (locsToFetchNow.length === 0) {
            // All filled by Cache + Math!
            if (FILLED_BY_INTERPOLATION.length > 0) console.log(`⚡ Zero-API Run Achieved!`);
            return locations.map((_, i) => resultsMap.get(i) || 0);
        }

        console.log(`🌐 Fetching ${locsToFetchNow.length} truly missing points (Gaps too wide)...`);

        // Switch to Open-Meteo due to instability of OpenElevation
        const baseUrl = 'https://api.open-meteo.com/v1/elevation';

        const BATCH_SIZE = 50;
        const batches = [];

        for (let i = 0; i < locsToFetchNow.length; i += BATCH_SIZE) {
            batches.push(locsToFetchNow.slice(i, i + BATCH_SIZE));
        }

        const apiResults: number[] = [];
        let hasHitRateLimit = false;

        // Helper for exponential backoff
        const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
            if (hasHitRateLimit) return null; // Fail fast

            for (let i = 0; i < retries; i++) {
                try {
                    // Mandatory gentle pacing even for retries
                    if (i > 0) await new Promise(r => setTimeout(r, 1000 * (i + 1)));

                    const response = await fetch(url);
                    if (response.status === 429) {
                        console.warn(`Rate limit hit. Retrying in ${(i + 1) * 2}s...`);
                        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                        continue;
                    }
                    if (!response.ok) throw new Error(response.statusText);
                    return await response.json();
                } catch (e) {
                    if (i === retries - 1) throw e;
                }
            }
        };

        for (const batch of batches) {
            // STOP if we already hit rate limits to let the user proceed
            if (hasHitRateLimit) {
                apiResults.push(...new Array(batch.length).fill(0));
                continue;
            }

            const lats = batch.map(l => l.lat.toFixed(4)).join(',');
            const lngs = batch.map(l => l.lng.toFixed(4)).join(',');

            try {
                // Mandatory Global Rate Limit: 250ms delay between batches
                await new Promise(r => setTimeout(r, 250));

                const data = await fetchWithRetry(`${baseUrl}?latitude=${lats}&longitude=${lngs}`);

                if (data && data.elevation) {
                    data.elevation.forEach((ele: number) => {
                        apiResults.push(ele);
                    });
                } else {
                    console.warn("Elevation API returned no data (or Rate Limit triggered), utilizing fallback.");
                    // Assume rate limit if data is missing despite 200 OK (some APIs do this)
                    // But explicitly check if fetchWithRetry returned null
                    if (data === null) {
                        hasHitRateLimit = true;
                    }
                    apiResults.push(...new Array(batch.length).fill(0));
                }
            } catch (error) {
                console.error("Elevation API failed. Switching to Fail-Fast Mode (0s).", error);
                hasHitRateLimit = true; // Stop hammering the API
                apiResults.push(...new Array(batch.length).fill(0));
            }
        }

        // 3. Hydrate Cache & Reconstruct Results
        const newCacheItems: { lat: number, lng: number, elevation: number }[] = [];

        missingIndices.forEach((originalIndex, i) => {
            const val = apiResults[i] || 0;
            const loc = locations[originalIndex];
            resultsMap.set(originalIndex, val);
            newCacheItems.push({ lat: loc.lat, lng: loc.lng, elevation: val });
        });

        // Async write to DB (don't block return)
        elevationCache.setMany(newCacheItems).catch(console.error);

        // 4. Return in original order
        return locations.map((_, i) => resultsMap.get(i) || 0);
    }
};
