
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/client';
import { chargingStations } from '../db/schema';
import { and, gte, lte, count } from 'drizzle-orm';

async function checkCoverage() {
    // Region: Ambur / Vellore Highway stretch
    // Lat: 12.5 to 13.0
    // Lng: 78.5 to 79.2

    const minLat = 12.5;
    const maxLat = 13.0;
    const minLng = 78.5;
    const maxLng = 79.2;

    const result = await db
        .select({ count: count() })
        .from(chargingStations)
        .where(
            and(
                gte(chargingStations.latitude, minLat),
                lte(chargingStations.latitude, maxLat),
                gte(chargingStations.longitude, minLng),
                lte(chargingStations.longitude, maxLng)
            )
        );

    console.log(`Chargers found in Ambur/Vellore region: ${result[0].count}`);

    // Check Chennai for comparison
    const chennaiResult = await db.select({ count: count() })
        .from(chargingStations)
        .where(
            and(
                gte(chargingStations.latitude, 12.9),
                lte(chargingStations.latitude, 13.2),
                gte(chargingStations.longitude, 80.1),
                lte(chargingStations.longitude, 80.3)
            )
        );
    console.log(`Chargers found in Chennai (Core): ${chennaiResult[0].count}`);
}

checkCoverage()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
