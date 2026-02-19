import { db } from "../src/db/client";
import { chargingStations } from "../src/db/schema";

async function main() {
    console.log("Seeding demo chargers for Chennai -> Pondicherry route...");

    const start = { lat: 13.0827, lng: 80.2707 }; // Chennai
    const end = { lat: 11.9139, lng: 79.8145 };   // Pondicherry

    const chargers = [
        {
            name: "Zeon Charging Station - Chengalpattu",
            operator: "Zeon Charging",
            lat: 12.6931,
            lng: 79.9922, // Near highway
            address: "Chengalpattu Bypass",
        },
        {
            name: "Tata Power EZ Charge - Tindivanam",
            operator: "Tata Power",
            lat: 12.2415,
            lng: 79.6644,
            address: "Tindivanam NH32",
        },
        {
            name: "Relux Electric - Melmaruvathur",
            operator: "Relux",
            lat: 12.4339,
            lng: 79.8322,
            address: "Melmaruvathur Temple Parking",
        },
        {
            name: "Shell Recharge - ECR",
            operator: "Shell",
            lat: 12.5540,
            lng: 80.1450,
            address: "East Coast Road",
        },
        {
            name: "Mahabalipuram Fast Charger",
            operator: "Statiq",
            lat: 12.6208,
            lng: 80.1945,
            address: "Mahabalipuram Entrance",
        },
        {
            name: "Ather Grid - Pondy Border",
            operator: "Ather",
            lat: 11.9667,
            lng: 79.8000,
            address: "Auroville Junction",
        }
    ];

    for (const c of chargers) {
        await db.insert(chargingStations).values({
            name: c.name,
            latitude: c.lat,
            longitude: c.lng,
            operator: c.operator,
            address: c.address,
            connectorTypes: ["CCS2", "Type 2"],
            maxPowerKw: 60,
            isOperational: true,
            source: "demo-seed",
            city: "Tamil Nadu",
            state: "TN"
        });
        console.log(`Added: ${c.name}`);
    }

    console.log("Done!");
    process.exit(0);
}

main().catch(console.error);
