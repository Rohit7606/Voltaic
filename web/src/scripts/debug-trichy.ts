
import { config } from "dotenv";
config({ path: ".env.local" });

import { calculateRoute } from "../actions/route/calculateRoute";
import { chargingStations } from "../db/schema";

// Chennai -> Trichy Coords
const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const COCHIN = { lat: 9.9312, lng: 76.2673 }; // Cochin, Kerala

async function main() {
    console.log("🚀 Debugging Route: Chennai -> Cochin");

    const result = await calculateRoute({
        start: CHENNAI,
        end: COCHIN,
        vehicleId: "6aadefe9-5dd0-4d35-84bf-747493b01eca", // Ioniq 5 RWD
        currentSoC: 50 // 50% Start
    });

    if (result.success && result.data) {
        console.log(`✅ Route Calculated!`);
        console.log(`   Distance: ${(result.data.distance / 1000).toFixed(1)} km`);
        console.log(`   Stops: ${result.data.injectedStops?.length || 0}`);

        result.data.injectedStops?.forEach((s: any, i: number) => {
            console.log(`   Stop ${i + 1}: ${s.name} (${s.latitude}, ${s.longitude})`);
        });
    } else {
        console.error("❌ Route Calculation Failed:", result.error);
    }
}

main().catch(console.error);
