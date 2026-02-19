import { db } from "../src/db/client";
import { vehicleModels, chargingStations } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Seeding database...");

    // Vehicles
    await db.insert(vehicleModels).values([
        {
            name: "Tata Nexon EV Max",
            make: "Tata Motors",
            model: "Nexon EV Max",
            year: 2024,
            batteryCapacityKwh: 40.5,
            usableCapacityKwh: 38.0,
            dragCoefficient: 0.32,
            frontalAreaM2: 2.38,
            massKg: 1500,
            rollingResistance: 0.012,
            motorEfficiency: 0.90,
        },
        {
            name: "MG ZS EV",
            make: "MG Motor",
            model: "ZS EV",
            year: 2024,
            batteryCapacityKwh: 50.3,
            usableCapacityKwh: 48.0,
            dragCoefficient: 0.29,
            frontalAreaM2: 2.4,
            massKg: 1620,
            rollingResistance: 0.011,
            motorEfficiency: 0.92,
        }
    ]).onConflictDoNothing();

    // Chargers (Sample)
    await db.insert(chargingStations).values([
        {
            name: "Bolt.Earth - Lonavala",
            latitude: 18.755,
            longitude: 73.409,
            operator: "Bolt.Earth",
            connectorTypes: ["CCS2"],
            maxPowerKw: 30.0,
            source: "seed",
            pricePerKwh: 18
        },
        {
            name: "Tata Power - Khopoli",
            latitude: 18.788,
            longitude: 73.344,
            operator: "Tata Power",
            connectorTypes: ["CCS2", "Type 2"],
            maxPowerKw: 50.0,
            source: "seed",
            pricePerKwh: 21
        }
    ]).onConflictDoNothing();

    console.log("Seeding complete!");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
