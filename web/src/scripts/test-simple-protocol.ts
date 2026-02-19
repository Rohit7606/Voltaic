
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

import { calculateRoute } from "../actions/route/calculateRoute";
import { db } from "../db/client";
import { vehicleModels } from "../db/schema";
import { eq } from "drizzle-orm";

async function runTest() {
    console.log("🚀 Starting Simple Protocol Test...");

    // 1. Get a vehicle
    const vehicles = await db.select().from(vehicleModels).limit(1);
    if (!vehicles.length) {
        console.error("❌ No vehicles found in DB");
        return;
    }
    const vehicle = vehicles[0];
    console.log(`🚗 Using Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.usableCapacityKwh} kWh)`);

    // 2. Define a LONG trip that will trigger panic
    // Example: SF to LA (approx 600km)
    // Coords: SF (37.7749, -122.4194), LA (34.0522, -118.2437)
    const longTrip = {
        start: { lat: 37.7749, lng: -122.4194 },
        end: { lat: 34.0522, lng: -118.2437 },
        vehicleId: vehicle.id,
        currentSoC: 90 // Start with 90%
    };

    console.log("\n🧪 Test Case 1: Long Trip (Should trigger Panic & Auto-Rescue)");
    const result = await calculateRoute(longTrip);

    if (result.success && result.data) {
        console.log("✅ Route Calculated Successfully");
        console.log(`   Distance: ${result.data.distanceKm.toFixed(1)} km`);
        console.log(`   Final SoC: ${result.data.finalSoC.toFixed(1)}%`);
        console.log(`   Energy Consumed: ${result.data.energyConsumedKwh.toFixed(1)} kWh`);

        if (result.data.injectedStops && result.data.injectedStops.length > 0) {
            console.log(`   ✅ Injected ${result.data.injectedStops.length} Chargers:`);
            result.data.injectedStops.forEach((stop: any, idx: number) => {
                console.log(`      ${idx + 1}. ${stop.name} (${stop.maxPowerKw}kW)`);
            });
        } else {
            console.warn("   ⚠️ No chargers injected! (Did panic trigger?)");
            // Check logs for panic trigger
        }
    } else {
        console.error("❌ Route Calculation Failed:", result.error);
    }

    // 3. Define a SHORT trip (Should NOT trigger panic)
    // SF to San Jose (~80km)
    const shortTrip = {
        start: { lat: 37.7749, lng: -122.4194 },
        end: { lat: 37.3382, lng: -121.8863 },
        vehicleId: vehicle.id,
        currentSoC: 50 // Start with 50%
    };

    console.log("\n🧪 Test Case 2: Short Trip (No Panic Expected)");
    const resultShort = await calculateRoute(shortTrip);

    if (resultShort.success && resultShort.data) {
        console.log("✅ Route Calculated Successfully");
        console.log(`   Distance: ${resultShort.data.distanceKm.toFixed(1)} km`);

        if (resultShort.data.injectedStops && resultShort.data.injectedStops.length > 0) {
            console.error("   ❌ Chargers injected unexpectedly!");
        } else {
            console.log("   ✅ No chargers injected (Expected).");
        }
    } else {
        console.error("❌ Route Calculation Failed:", resultShort.error);
    }
}

runTest();
