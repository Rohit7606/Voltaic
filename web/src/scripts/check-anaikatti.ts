
import { db } from "../db/client";
import { chargingStations } from "../db/schema";
import { ilike } from "drizzle-orm";

async function main() {
    console.log("🔍 Checking Anaikatti Station...");
    const results = await db.select().from(chargingStations).where(ilike(chargingStations.name, "%Anaikatti%"));

    if (results.length === 0) {
        console.log("❌ Not found.");
    } else {
        results.forEach(s => {
            console.log(`✅ FOUND: ${s.name}`);
            console.log(`   ID: ${s.id}`);
            console.log(`   Coords: ${s.latitude}, ${s.longitude}`); // Check if these are numbers or strings
            console.log(`   Type: typeof lat=${typeof s.latitude}, typeof lng=${typeof s.longitude}`);
        });
    }
}

main().catch(console.error).finally(() => process.exit());
