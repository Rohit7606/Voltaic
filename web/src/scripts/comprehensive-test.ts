
import { calculateRoute } from "../actions/route/calculateRoute";
import { db } from "../db/client";
import { vehicleModels } from "../db/schema";
import { ilike } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const LOCATIONS = {
    CHENNAI: { lat: 13.0827, lng: 80.2707 },
    COCHIN: { lat: 9.9312, lng: 76.2673 },
    BANGALORE: { lat: 12.9716, lng: 77.5946 },
    GOA: { lat: 15.2993, lng: 74.1240 },
    TRICHY: { lat: 10.7905, lng: 78.7047 },
    COIMBATORE: { lat: 11.0168, lng: 76.9558 },
};

async function getVehicle(namePart: string) {
    const vs = await db.select().from(vehicleModels).where(ilike(vehicleModels.model, `%${namePart}%`));
    if (vs.length === 0) throw new Error(`Vehicle containing '${namePart}' not found`);
    return vs[0];
}

const fs = require('fs');
const logBuffer: string[] = [];
function log(msg: string) {
    console.log(msg);
    logBuffer.push(msg);
}

// Override console.log/error for the test run to capture it
// (Simplified: just use custom logger in runTest)

async function runTest(testName: string, start: any, end: any, vehicleName: string, startSoC: number) {
    log(`\n---------------------------------------------------------`);
    log(`🧪 TEST: ${testName}`);

    try {
        const vehicle = await getVehicle(vehicleName);
        log(`🚗 Vehicle: ${vehicle.model} (Range: ~${vehicle.usableCapacityKwh * 4}km +)`);

        console.time("Calculation");
        const result = await calculateRoute({
            start,
            end,
            vehicleId: vehicle.id,
            currentSoC: startSoC
        });
        console.timeEnd("Calculation");

        if (!result.success || !result.data) {
            log(`❌ FAILED: ${result.error}`);
            return;
        }

        const stops = result.data.injectedStops || [];
        log(`🏁 Stops Required: ${stops.length}`);

        stops.forEach((s: any, i: number) => {
            log(`   ${i + 1}. ${s.name} (Dist: ${(s.distance / 1000).toFixed(1)}km)`);
        });

        // Validation Logic
        if (stops.length > 5) log("⚠️ WARNING: High stop count. Potential Loop?");
        if (stops.length === 0 && (vehicle.usableCapacityKwh * 4) < (result.data.distanceKm * 0.8)) {
            log("❌ FAILED: 0 stops for a long trip? Impossible.");
        } else {
            log("✅ Simulation Plausible.");
        }

    } catch (e: any) {
        log(`❌ CRASH: ${e.message}`);
    }
}

async function main() {
    log("🚀 STARTING COMPREHENSIVE ROUTE TESTS");

    // Scenario 1: Chennai -> Cochin (Medium Range)
    await runTest("Chennai -> Cochin", LOCATIONS.CHENNAI, LOCATIONS.COCHIN, "Nexon", 90);

    // Scenario 2: Bangalore -> Goa (Long Range)
    await runTest("Bangalore -> Goa", LOCATIONS.BANGALORE, LOCATIONS.GOA, "Ioniq", 90);

    // Scenario 3: Chennai -> Trichy (Short Range check)
    await runTest("Chennai -> Trichy (Low Battery Start)", LOCATIONS.CHENNAI, LOCATIONS.TRICHY, "Nexon", 30);

    // Scenario 4: USER BUG REPRO -> Chennai to Kanyakumari (BYD Seal @ 50%)
    const KANYAKUMARI = { lat: 8.0883, lng: 77.5385 };
    await runTest("Chennai -> Kanyakumari (BYD Seal 50%)", LOCATIONS.CHENNAI, KANYAKUMARI, "Seal", 50);

    fs.writeFileSync('final_report.txt', logBuffer.join('\n'));
}

main().catch(console.error);
