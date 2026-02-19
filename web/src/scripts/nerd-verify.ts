
import "dotenv/config";
import { db } from "@/db/client";
import { vehicleModels } from "@/db/schema";
import { mapboxClient } from "@/lib/external-apis/mapbox";
import { openElevationClient } from "@/lib/external-apis/elevation";
import { PhysicsEngine } from "@/lib/physics/engine";
import { segmentPolyline } from "@/lib/utils/geometry";
import { eq } from "drizzle-orm";

async function runNerdVerification() {
    console.log("🤓 THE NERD: Initiating Physics Stress Test (Chennai -> Ooty)");

    // 1. Fetch Reference Vehicle (Tata Nexon EV or similar)
    const vehicles = await db.select().from(vehicleModels).limit(1);
    const vehicle = vehicles[0];

    if (!vehicle) {
        console.error("❌ No vehicles found in DB. Seed data first.");
        process.exit(1);
    }

    console.log(`🚗 Test Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.usableCapacityKwh} kWh)`);
    console.log(`   - Mass: ${vehicle.massKg} kg`);
    console.log(`   - Cd: ${vehicle.dragCoefficient}`);
    console.log(`   - Area: ${vehicle.frontalAreaM2} m²`);

    // 2. Define Route (Chennai -> Ooty)
    // Chennai: 13.0827, 80.2707
    // Ooty: 11.4102, 76.6950
    // Waypoint: Kalahatti (To force the steep ghat road? Or let Mapbox decide?)
    // Ooty via Kalahatti is steeper. Let's start with standard routing.
    const start = [80.2707, 13.0827];
    const end = [76.6950, 11.4102];

    console.log("🗺️  Fetching Route from Mapbox...");
    const routeResponse = await mapboxClient.getDirections({
        coordinates: [start as [number, number], end as [number, number]],
        profile: "driving",
        geometries: "geojson",
    });

    if (!routeResponse.routes || routeResponse.routes.length === 0) {
        console.error("❌ Mapbox route failed.");
        process.exit(1);
    }

    const route = routeResponse.routes[0];
    const geometry = route.geometry as any;
    console.log(`✅ Route Found: ${(route.distance / 1000).toFixed(1)} km, ${(route.duration / 60).toFixed(0)} mins`);

    // 3. Segmentize
    console.log("✂️  Segmenting Route (1km chunks)...");
    const segments = segmentPolyline(geometry.coordinates, 1000);
    console.log(`   - Generated ${segments.length} segments`);

    // 4. Fetch Elevation
    console.log("🏔️  Fetching Real Elevation Data (OpenElevation)...");
    const points = segments.map(seg => ({ lat: seg.coords[0][1], lng: seg.coords[0][0] }));

    // Batching logic (OpenElevation restricts payload size sometimes)
    // We'll trust the client or chunks it if needed.
    let elevations: number[] = [];
    try {
        // Chunking manually just in case
        const chunkSize = 100;
        for (let i = 0; i < points.length; i += chunkSize) {
            const chunk = points.slice(i, i + chunkSize);
            const chunkElevations = await openElevationClient.getElevations(chunk);
            elevations.push(...chunkElevations);
            process.stdout.write(".");
        }
        console.log("\n✅ Elevation Data Acquired");
    } catch (e) {
        console.error("❌ Elevation fetch failed:", e);
        process.exit(1);
    }

    // 5. Run Physics Simulation
    console.log("🔋 Running Physics Simulation...");
    const engine = new PhysicsEngine(vehicle);
    let totalEnergyKwh = 0;
    let maxGrade = -Infinity;
    let minGrade = Infinity;
    let totalElevationGain = 0;

    const telemetry: any[] = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const el1 = elevations[i] || 0;
        const el2 = elevations[Math.min(i + 1, elevations.length - 1)] || el1;
        const elevationChange = el2 - el1;

        if (elevationChange > 0) totalElevationGain += elevationChange;

        const grade = elevationChange / seg.distance;
        if (grade > maxGrade) maxGrade = grade;
        if (grade < minGrade) minGrade = grade;

        const energyKwh = engine.calculateSegmentEnergy({
            distance: seg.distance,
            grade: grade,
            speed: 60, // Average speed for better realism on ghats
            temperature: 25,
        });

        totalEnergyKwh += energyKwh;

        // Log interesting segments (Steep climbs)
        if (Math.abs(grade) > 0.05) { // 5% grade
            // Only log a few to avoid spam
            if (telemetry.length < 50) {
                telemetry.push({
                    km: (i * 1).toFixed(1),
                    elev: el1.toFixed(0),
                    grade: (grade * 100).toFixed(1) + "%",
                    energy: energyKwh.toFixed(3) + " kWh",
                    type: grade > 0 ? "CLIMB 🔼" : "DESCEND 🔽"
                });
            }
        }
    }

    console.log("\n📊 --- RESULTS ---");
    console.log(`Total Energy Consumed: ${totalEnergyKwh.toFixed(2)} kWh`);
    console.log(`Battery Usage: ${((totalEnergyKwh / vehicle.usableCapacityKwh) * 100).toFixed(1)}%`);
    console.log(`Elevation Gain: ${totalElevationGain.toFixed(0)}m`);
    console.log(`Max Grade: ${(maxGrade * 100).toFixed(1)}%`);
    console.log(`Min Grade: ${(minGrade * 100).toFixed(1)}%`);
    console.log(`Efficiency: ${(totalEnergyKwh / (route.distance / 1000)).toFixed(3)} kWh/km`); // Wh/km = this * 1000

    console.log("\n⚠️  Critical Segments (Grade > 5%):");
    console.table(telemetry);

    if (totalEnergyKwh > vehicle.usableCapacityKwh) {
        console.log("\n🚨 RESULT: CHARGING REQUIRED! Journey impossible on single charge.");
    } else {
        console.log("\n✅ RESULT: Makeable on single charge (barely).");
    }

    process.exit(0);
}

runNerdVerification();
