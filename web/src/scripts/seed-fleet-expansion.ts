
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/client';
import { vehicleModels } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

async function seedFleetExpansion() {
    console.log('🚙 Expanding the Garage with more Indian EVs...');

    // 1. Fix "Tata Motors" -> "Tata"
    console.log('🔧 Standardizing Brand Names...');
    const tataMotorsCars = await db.select().from(vehicleModels).where(eq(vehicleModels.make, "Tata Motors"));
    for (const car of tataMotorsCars) {
        await db.update(vehicleModels)
            .set({ make: "Tata" })
            .where(eq(vehicleModels.id, car.id));
    }

    const newFleet = [
        // TATA
        {
            name: "Tata Curvv.ev 55",
            make: "Tata",
            model: "Curvv.ev Empowered+ 55",
            year: 2024,
            batteryCapacityKwh: 55.0,
            usableCapacityKwh: 52.0,
            dragCoefficient: 0.29, // Coupe SUV
            frontalAreaM2: 2.4,
            massKg: 1600,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/139599/curvv-ev-exterior-right-front-three-quarter-3.jpeg"
        },
        {
            name: "Tata Punch.ev LR",
            make: "Tata",
            model: "Punch.ev Long Range",
            year: 2024,
            batteryCapacityKwh: 35.0,
            usableCapacityKwh: 33.5,
            dragCoefficient: 0.34, // Boxy
            frontalAreaM2: 2.2,
            massKg: 1300,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/168865/punch-ev-exterior-right-front-three-quarter-3.jpeg"
        },
        // MG
        {
            name: "MG Windsor EV",
            make: "MG",
            model: "Windsor EV Essence",
            year: 2024,
            batteryCapacityKwh: 38.0,
            usableCapacityKwh: 37.0,
            dragCoefficient: 0.367, // Not very aero
            frontalAreaM2: 2.5,
            massKg: 1700,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/189743/windsor-ev-exterior-right-front-three-quarter-4.jpeg"
        },
        {
            name: "MG Comet EV",
            make: "MG",
            model: "Comet EV",
            year: 2023,
            batteryCapacityKwh: 17.3,
            usableCapacityKwh: 16.5,
            dragCoefficient: 0.38, // Box on wheels
            frontalAreaM2: 1.9,
            massKg: 900,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/144723/comet-ev-exterior-right-front-three-quarter-4.jpeg"
        },
        // MAHINDRA
        {
            name: "Mahindra XUV400 EL",
            make: "Mahindra",
            model: "XUV400 EL Pro",
            year: 2024,
            batteryCapacityKwh: 39.4,
            usableCapacityKwh: 37.5,
            dragCoefficient: 0.33,
            frontalAreaM2: 2.45,
            massKg: 1650,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/136221/xuv400-exterior-right-front-three-quarter-5.jpeg"
        },
        // BYD
        {
            name: "BYD Seal Performance",
            make: "BYD",
            model: "Seal AWD",
            year: 2024,
            batteryCapacityKwh: 82.5,
            usableCapacityKwh: 80.0,
            dragCoefficient: 0.219, // Extremely aero
            frontalAreaM2: 2.3,
            massKg: 2150,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/141029/seal-exterior-right-front-three-quarter-5.jpeg"
        },
        // LUXURY
        {
            name: "BMW i4 eDrive40",
            make: "BMW",
            model: "i4",
            year: 2023,
            batteryCapacityKwh: 83.9,
            usableCapacityKwh: 80.7,
            dragCoefficient: 0.24,
            frontalAreaM2: 2.35,
            massKg: 2050,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/121045/i4-exterior-right-front-three-quarter-6.jpeg"
        }
    ];

    let added = 0;
    for (const v of newFleet) {
        // Check duplication by model name
        const existing = await db.select().from(vehicleModels).where(eq(vehicleModels.model, v.model));
        if (existing.length === 0) {
            await db.insert(vehicleModels).values({
                id: uuidv4(),
                ...v,
                rollingResistance: 0.015,
                motorEfficiency: 0.90,
                thermalCoefficientHeat: 0.015,
                thermalCoefficientCold: 0.010,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`+ Added ${v.name}`);
            added++;
        } else {
            console.log(`- Skipped ${v.name} (Already exists)`);
        }
    }

    console.log(`✅ Fleet Expansion Complete. Added ${added} new models.`);
}

seedFleetExpansion()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
