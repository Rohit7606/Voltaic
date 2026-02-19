
import { calculateRoute } from "../actions/route/calculateRoute";
import { db } from "../db/client";
import { vehicleModels } from "../db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const MADURAI = { lat: 9.9252, lng: 78.1198 };
const KANYAKUMARI = { lat: 8.0883, lng: 77.5385 };

async function debugCharge() {
    console.log("🚀 Debugging Charging Logic: Chennai -> Madurai -> Kanyakumari");

    // Fetch BYD Seal
    const vehicles = await db.select().from(vehicleModels);
    const byd = vehicles.find(v => v.model.includes("Seal"));

    if (!byd) { console.error("BYD Seal not found"); return; }
    console.log(`🚗 Using ${byd.model}`);

    // Force route with waypoint
    const result = await calculateRoute({
        start: CHENNAI,
        end: KANYAKUMARI,
        waypoints: [MADURAI], // Force a stop at Madurai
        vehicleId: byd.id,
        currentSoC: 50 // Start with 50%
    });

    if (!result.success || !result.data) {
        console.error("❌ Route calculation failed:", result.error);
        return;
    }

    const data = result.data;
    console.log(`✅ Route Calculated: ${data.distanceKm.toFixed(1)}km`);
    console.log(`🏁 Final SoC: ${data.finalSoC.toFixed(1)}%`);
    console.log(`🛑 Injected Stops: ${data.injectedStops?.length || 0}`);

    // Scan segment data to find if charging happened
    // We look for negative energy consumption (Charging events)
    const chargeEvents = data.segmentData.filter((s: any) => s.energy < 0);
    console.log(`⚡ Charge Events Detected: ${chargeEvents.length}`);
    chargeEvents.forEach((c: any, i: number) => {
        console.log(`   Charge ${i + 1}: Added ${(-c.energy).toFixed(2)} kWh`);
    });

    if (chargeEvents.length === 0) {
        console.error("🚨 CRITICAL: No charging occurred despite waypoint at Madurai!");
    } else {
        console.log("✅ Charging logic operational.");
    }
}

debugCharge().catch(console.error);
