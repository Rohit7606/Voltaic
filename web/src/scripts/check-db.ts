import { db } from "../db/client";
import { chargingStations, vehicleModels } from "../db/schema";
import { sql, like } from "drizzle-orm";

async function check() {
    console.log("🔍 Finding Ioniq 5...");
    const vehicles = await db.select().from(vehicleModels).where(like(vehicleModels.model, '%Ioniq%'));
    if (vehicles.length > 0) {
        console.log(`✅ FOUND: ${vehicles[0].id}`);
        console.log(`   Model: ${vehicles[0].model}`);
    } else {
        console.log("❌ Nexon not found in DB");
    }
}
check();
