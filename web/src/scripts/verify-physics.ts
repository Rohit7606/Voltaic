
import { PhysicsEngine } from "../lib/physics/engine";
import { db } from "../db/client";
import { vehicleModels } from "../db/schema";
import { eq } from "drizzle-orm";

async function verifyPhysics() {
    console.log("🔬 Verifying Physics Engine...");

    // 1. Fetch Two Distinct Vehicles
    const vehicles = await db.select().from(vehicleModels).limit(5); // Get a few
    if (vehicles.length < 2) {
        console.error("Not enough vehicles to compare.");
        return;
    }

    const v1 = vehicles[0]; // e.g. MG ZS EV
    const v2 = vehicles[1]; // e.g. Tata Nexon or BYD

    console.log(`\n🚗 Vehicle Comparison (1km at 80km/h):`);

    // Test 1: Flat Ground
    const engine1 = new PhysicsEngine(v1);
    const engine2 = new PhysicsEngine(v2);

    const flatParams = { distance: 1000, grade: 0, speed: 80, temperature: 25 };
    const e1_flat = engine1.calculateSegmentEnergy(flatParams);
    const e2_flat = engine2.calculateSegmentEnergy(flatParams);

    console.log(`   ${v1.make} ${v1.model} (Mass: ${v1.massKg}kg): ${e1_flat.toFixed(4)} kWh`);
    console.log(`   ${v2.make} ${v2.model} (Mass: ${v2.massKg}kg): ${e2_flat.toFixed(4)} kWh`);

    // Test 2: Hilly Region (5% Grade - Steep Hill)
    console.log(`\n⛰️  Hill Climb Test (1km at 5% Grade):`);
    const hillParams = { distance: 1000, grade: 0.05, speed: 80, temperature: 25 };

    const e1_hill = engine1.calculateSegmentEnergy(hillParams);
    const e2_hill = engine2.calculateSegmentEnergy(hillParams);

    // Calculate Impact
    const impact1 = ((e1_hill - e1_flat) / e1_flat) * 100;
    const impact2 = ((e2_hill - e2_flat) / e2_flat) * 100;

    console.log(`   ${v1.make} ${v1.model}: ${e1_hill.toFixed(4)} kWh (+${impact1.toFixed(0)}% energy needed)`);
    console.log(`   ${v2.make} ${v2.model}: ${e2_hill.toFixed(4)} kWh (+${impact2.toFixed(0)}% energy needed)`);

    // Conclusion
    if (e1_hill > e1_flat && e2_hill > e2_flat) {
        console.log("\n✅ Physics Engine correctly accounts for Gravity/Grade.");
    } else {
        console.error("\n❌ Physics Engine failed to account for hills.");
    }

    if (e1_flat !== e2_flat) {
        console.log("✅ Logic allows different consumption for different models.");
    } else {
        console.error("❌ Logic treated different cars identically.");
    }
}

verifyPhysics();
