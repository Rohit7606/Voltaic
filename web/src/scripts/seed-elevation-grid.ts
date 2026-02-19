import { db } from "../db/client";
import { elevationCacheTable } from "../db/schema";
import { openElevationClient } from "../lib/external-apis/elevation";
import { sql } from "drizzle-orm";

// South India Bounding Box
// Lat: 8.0 (Cape Comorin) to 16.0 (Northern Karnataka/Andhra border)
// Lng: 74.0 (Mangalore) to 81.0 (Chennai/Vijayawada)

const LAT_MIN = 8.0;
const LAT_MAX = 14.0; // Focus on TN/Kerala/South Karnataka first
const LNG_MIN = 76.0;
const LNG_MAX = 80.5;

const RESOLUTION = 0.05; // ~5.5km grid spacing

async function seedElevationGrid() {
    console.log("🚀 Starting South India Elevation Grid Seeder...");
    console.log(`Boundaries: Lat ${LAT_MIN}-${LAT_MAX}, Lng ${LNG_MIN}-${LNG_MAX}`);
    console.log(`Resolution: ${RESOLUTION} degrees (~5.5km)`);

    const points: { lat: number; lng: number }[] = [];

    for (let lat = LAT_MIN; lat <= LAT_MAX; lat += RESOLUTION) {
        for (let lng = LNG_MIN; lng <= LNG_MAX; lng += RESOLUTION) {
            points.push({ lat, lng });
        }
    }

    console.log(`📍 Generated ${points.length} grid points.`);

    // 1. Filter out existing points (Resume Capability)
    const existing = await db.select({ lat: elevationCacheTable.latitude, lng: elevationCacheTable.longitude }).from(elevationCacheTable);
    const existingSet = new Set(existing.map(e => `${e.lat.toFixed(4)},${e.lng.toFixed(4)}`));

    console.log(`🔍 Found ${existing.length} existing points in DB.`);

    const toProcess = points.filter(p => !existingSet.has(`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`));
    console.log(`📉 Filtered down to ${toProcess.length} new points to fetch.`);

    // Batch process
    const BATCH_SIZE = 50;
    let processed = 0;

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
        const batch = toProcess.slice(i, i + BATCH_SIZE);

        try {
            // We use the client which now writes to DB Cache automatically
            // But we need to force it to actually fetch if missing.
            // valid cache check is internal to the client.
            await openElevationClient.getElevations(batch);

            processed += batch.length;
            process.stdout.write(`\r✅ Processed: ${processed}/${points.length} (${((processed / points.length) * 100).toFixed(1)}%)`);

            // Artificial delay to be nice to the API
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`\n❌ Error batch ${i}:`, error);
        }
    }

    console.log("\n✨ Elevation Grid Seeding Complete!");
}

seedElevationGrid()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
