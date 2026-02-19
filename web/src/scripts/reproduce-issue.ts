
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });



import { calculateRoute } from "../actions/route/calculateRoute";
import { db } from "../db/client";
import { vehicleModels } from "../db/schema";
import { eq } from "drizzle-orm";

async function reproduce() {
    console.log("🐞 Starting Reproduction: Charger Clustering...");

    // 1. Fetch Ioniq 5 (or similar)
    const vehicles = await db.select().from(vehicleModels).where(eq(vehicleModels.make, 'Hyundai')).limit(1);
    const vehicle = vehicles.length > 0 ? vehicles[0] : (await db.select().from(vehicleModels).limit(1))[0];

    console.log(`🚗 Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.usableCapacityKwh} kWh)`);

    // 2. Trip: Chennai -> "Kerala" (Using coords for Palakkad/Kochi to approx "Kerala" center or result)
    // User screenshot start: "Chennai", End: "Kerala".
    const input = {
        start: { lat: 13.0827, lng: 80.2707 }, // Chennai
        end: { lat: 10.8505, lng: 76.2711 },   // Kerala (approx Palakkad/Trichur region)
        vehicleId: vehicle.id,
        currentSoC: 50
    };

    console.log(`📍 Trip: Chennai -> Kerala (~500+ km) | Start SoC: 50%`);

    const res = await calculateRoute(input);

    if (res.success && res.data) {
        console.log(`✅ Result Success. Final SoC: ${res.data.finalSoC.toFixed(1)}%`);
        const stops = res.data.injectedStops || [];
        console.log(`🔌 Stops Injected: ${stops.length}`);
        stops.forEach((s: any, i: number) => {
            console.log(`   ${i + 1}. ${s.name} [${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}]`);
        });

        if (stops.length > 2) {
            console.error("❌ CLUSTERING DETECTED! Too many stops for this distance.");
        } else {
            console.log("✅ No clustering detected (1-2 stops is reasonable).");
        }
    } else {
        console.error("❌ Route Failed:", res.error);
    }
}

reproduce().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
