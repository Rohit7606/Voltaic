
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/client';
import { vehicleModels } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

async function seedVehicles() {
    console.log('🚗 Seeding Indian EV Fleet...');

    const vehicles = [
        {
            name: "Tata Nexon.ev Long Range",
            make: "Tata",
            model: "Nexon.ev LR",
            year: 2024,
            batteryCapacityKwh: 40.5,
            usableCapacityKwh: 39.0, // Conservative
            dragCoefficient: 0.32, // Boxy SUV
            frontalAreaM2: 2.35,
            massKg: 1450,
            rollingResistance: 0.015,
            motorEfficiency: 0.88,
            imageUrl: "https://cars.tatamotors.com/content/dam/tata-motors-pvl/images/nexon/ev/features/desktop/360/color-1.png"
        },
        {
            name: "MG ZS EV",
            make: "MG",
            model: "ZS EV Excite",
            year: 2023,
            batteryCapacityKwh: 50.3,
            usableCapacityKwh: 49.0,
            dragCoefficient: 0.29,
            frontalAreaM2: 2.4,
            massKg: 1610,
            rollingResistance: 0.012,
            motorEfficiency: 0.90,
            imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/110515/mg-zs-ev-exterior-right-front-three-quarter-3.jpeg"
        },
        {
            name: "BYD Atto 3",
            make: "BYD",
            model: "Atto 3 Extended",
            year: 2024,
            batteryCapacityKwh: 60.5,
            usableCapacityKwh: 60.0, // Blade Battery efficient
            dragCoefficient: 0.29,
            frontalAreaM2: 2.5,
            massKg: 1750,
            rollingResistance: 0.011, // High efficiency tires
            motorEfficiency: 0.92,
            imageUrl: "https://www.byd.com/content/dam/byd-site/en-be/product/atto3/specs/design-detail-3.jpg"
        },
        {
            name: "Tata Tiago.ev",
            make: "Tata",
            model: "Tiago.ev LR",
            year: 2023,
            batteryCapacityKwh: 24.0,
            usableCapacityKwh: 22.5,
            dragCoefficient: 0.34,
            frontalAreaM2: 2.15,
            massKg: 1150,
            rollingResistance: 0.015,
            motorEfficiency: 0.85,
            imageUrl: "https://cars.tatamotors.com/content/dam/tata-motors-pvl/images/tiago/ev/features/desktop/color/tropical-mist.png"
        },
        {
            name: "Hyundai Ioniq 5",
            make: "Hyundai",
            model: "Ioniq 5 RWD",
            year: 2024,
            batteryCapacityKwh: 72.6,
            usableCapacityKwh: 70.0,
            dragCoefficient: 0.288,
            frontalAreaM2: 2.55,
            massKg: 1950,
            rollingResistance: 0.010,
            motorEfficiency: 0.94,
            imageUrl: "https://s7g10.scene7.com/is/image/hyundaiautoever/IONIQ5_Exterieur_Digital_Teal_Green_Pearl-1"
        }
    ];

    for (const v of vehicles) {
        await db.insert(vehicleModels).values({
            id: uuidv4(),
            ...v,
            thermalCoefficientHeat: 0.015,
            thermalCoefficientCold: 0.020,
            regenEfficiency: 0.65,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    console.log(`✅ Fleet expanded with ${vehicles.length} new models.`);
}

seedVehicles()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
