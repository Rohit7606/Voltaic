
import { calculateRoute } from "../actions/route/calculateRoute";
import { db } from "../db/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const TRICHY = { lat: 10.7905, lng: 78.7047 };

async function verify() {
    console.log("🚀 Verifying Fix for Chennai -> Trichy");

    // 1. Get a vehicle (Nexon or Ioniq)
    const vehicle = await db.query.vehicleModels.findFirst();
    if (!vehicle) throw new Error("No vehicle found");

    console.log(`🚗 Using Vehicle: ${vehicle.model} (ID: ${vehicle.id})`);

    const result = await calculateRoute({
        start: CHENNAI,
        end: TRICHY,
        vehicleId: vehicle.id,
        currentSoC: 90 // Start with 90%
    });

    if (!result.success || !result.data) {
        console.error("❌ Route Calculation Failed (Full Error):", JSON.stringify(result.error, null, 2));
        return;
    }

    const stops = result.data.injectedStops;
    const output = `
🏁 Result: ${stops.length} Stops
${stops.map((s: any, i: number) => `   ${i + 1}. ${s.name} (Dist: ${(s.distance / 1000).toFixed(1)}km)`).join('\n')}
    `;
    console.log(output);
    const fs = require('fs');
    fs.writeFileSync('result.txt', output);

    if (stops.length > 3) {
        console.error("❌ FAIL: Still getting too many stops (>3). Loop might be active.");
    } else if (stops.length === 0) {
        console.warn("⚠️ WARNING: 0 stops? Check if range is too high or route too short.");
    } else {
        console.log("✅ SUCCESS: Logic seems fixed (Reasonable stop count).");
    }
}

verify().catch(err => {
    console.error(err);
    const fs = require('fs');
    fs.writeFileSync('result.txt', `ERROR: ${err.message}\nSTACK: ${err.stack}\nZOD: ${JSON.stringify((err as any).issues, null, 2)}`);
});
