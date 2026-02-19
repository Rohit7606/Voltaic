
import { config } from 'dotenv';
config({ path: '.env.local' });
import { calculateRoute } from '../actions/route/calculateRoute';

async function test() {
    console.log("🚀 Testing Ioniq 5 Route...");

    const input = {
        start: { lat: 13.0827, lng: 80.2707 }, // Chennai
        end: { lat: 11.0168, lng: 76.9558 },   // Coimbatore
        // Use a vehicle likely to exist or fetch first
        vehicleId: 'e2a87071-3f5f-4a0b-967f-946761661645',
        currentSoC: 40 // Start with 40% to GUARANTEE panic (Trip is ~500km)
    };

    // Auto-fetch first vehicle
    const { db } = await import("../db/client");
    const { vehicleModels } = await import("../db/schema");
    const v = await db.select().from(vehicleModels).limit(1);
    if (v.length > 0) input.vehicleId = v[0].id;

    console.log(`🚗 Testing Trip: Chennai -> Coimbatore (~500km)`);
    console.log(`🚗 Vehicle: ${v[0]?.make} ${v[0]?.model}`);

    const res = await calculateRoute(input);

    if (res.success) {
        console.log("✅ Route Success!");
        console.log(`Final SoC: ${res.data.finalSoC.toFixed(1)}%`);
        console.log(`Distance: ${res.data.distanceKm.toFixed(1)} km`);

        if (res.data.injectedStops && res.data.injectedStops.length > 0) {
            console.log("🔌 Injected Stops (Active):");
            res.data.injectedStops.forEach((s: any) => console.log(`   - ${s.name} (${s.maxPowerKw}kW)`));
        } else {
            console.log("⚠️ No Charging Stops Injected (Did panic trigger?)");
        }
    } else {
        console.error("❌ Route Failed:", res.error);
    }
}

test()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
