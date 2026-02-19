
import { config } from 'dotenv';
import path from 'path';

// Mock External APIs BEFORE imports
import { mapboxClient } from "../lib/external-apis/mapbox";
import { openElevationClient } from "../lib/external-apis/elevation";
import { openWeatherClient } from "../lib/external-apis/weather";
// We will mock these methods

// Mock Data
const MOCK_ROUTE = {
    routes: [{
        geometry: {
            coordinates: Array.from({ length: 150 }, (_, i) => [-122.4 + (i * 0.05), 37.7 - (i * 0.02)]) // ~800km line
        },
        legs: [{ distance: 800000, duration: 20000 }], // 800km
        distance: 800000,
        duration: 20000
    }]
};

// Overwrite methods
mapboxClient.getDirections = async () => MOCK_ROUTE as any;
openElevationClient.getElevations = async (points) => new Array(points.length).fill(10); // Flat
openWeatherClient.getCurrentWeather = async () => ({ main: { temp: 25 } }) as any;

// Mock Charger Search
// We need to mock the dynamic import or the module itself.
// Since 'calculateRoute' uses dynamic import, it's harder to mock 'find-chargers' directly via this script 
// without a proper test runner like Jest/Vitest.
// However, we can patch the 'findChargersNear' if we can access it. 
// But we cannot easily patch a dynamic import from outside in a simple script.

// ALTERNATIVE: Use the existing logic but knowing that 'findChargersNear' will hit the DB.
// DB is fine. The external APIs are the issue.
// So mocking Mapbox/Elevation/Weather is enough.

import { calculateRoute } from "../actions/route/calculateRoute";
import { db } from "../db/client";
import { vehicleModels } from "../db/schema";
import { eq } from "drizzle-orm";

async function runTest() {
    console.log("🚀 Starting MOCKED Simple Protocol Test...");

    // 1. Get a vehicle
    const vehicles = await db.select().from(vehicleModels).limit(1);
    if (!vehicles.length) {
        console.error("❌ No vehicles found in DB");
        return;
    }
    const vehicle = vehicles[0];
    console.log(`🚗 Using Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.usableCapacityKwh} kWh)`);

    // 2. Define a trip
    const trip = {
        start: { lat: 37.7, lng: -122.4 },
        end: { lat: 34.0, lng: -118.2 },
        vehicleId: vehicle.id,
        currentSoC: 50 // Start with 50% to ensure panic
    };

    console.log("\n🧪 Test Case 1: Long Trip (Mocked)");
    const result = await calculateRoute(trip);

    if (result.success && result.data) {
        console.log("✅ Route Calculated Successfully");
        console.log(`   Distance: ${result.data.distanceKm.toFixed(1)} km`);
        console.log(`   Final SoC: ${result.data.finalSoC.toFixed(1)}%`);

        if (result.data.injectedStops && result.data.injectedStops.length > 0) {
            console.log(`   ✅ Injected ${result.data.injectedStops.length} Chargers:`);
            result.data.injectedStops.forEach((stop: any, idx: number) => {
                console.log(`      ${idx + 1}. ${stop.name} (${stop.maxPowerKw}kW)`);
            });
        } else {
            console.warn("   ⚠️ No chargers injected! (Did panic trigger?)");
        }
    } else {
        console.error("❌ Route Calculation Failed:", result.error);
    }
}

runTest();
