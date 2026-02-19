
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/client';
import { chargingStations } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

async function seedHighwayChargers() {
    console.log('Seeding strategic highway chargers...');

    const highwayChargers = [
        {
            name: "Zeon Charging - A2B Vellore",
            address: "Adyar Ananda Bhavan, NH 48, Pallikonda, Vellore, Tamil Nadu",
            latitude: 12.9205,
            longitude: 78.9695, // Near Vellore TOll
            operator: "Zeon Charging",
            connectorTypes: ["CCS2", "Type 2"],
            maxPowerKw: 60,
            isOperational: true,
            pricingPerKwh: 22,
        },
        {
            name: "Relux Electric - Star Biryani Ambur",
            address: "Star Biryani, NH 48, Ambur, Tamil Nadu",
            latitude: 12.7935,
            longitude: 78.7065, // Ambur center
            operator: "Relux Electric",
            connectorTypes: ["CCS2"],
            maxPowerKw: 50,
            isOperational: true,
            pricingPerKwh: 20,
        },
        {
            name: "Tata Power ezCharge - Vaniyambadi Toll",
            address: "NH 48, Vaniyambadi, Tamil Nadu",
            latitude: 12.6625,
            longitude: 78.6368,
            operator: "Tata Power",
            connectorTypes: ["CCS2", "Type 2"],
            maxPowerKw: 30,
            isOperational: true,
            pricingPerKwh: 19,
        },
        {
            name: "Zeon Charging - Saravana Bhavan Krishnagiri",
            address: "Saravana Bhavan, NH 44, Krishnagiri, Tamil Nadu",
            latitude: 12.5386,
            longitude: 78.2037, // Krishnagiri
            operator: "Zeon Charging",
            connectorTypes: ["CCS2", "CHAdeMO"],
            maxPowerKw: 120, // Ultra fast
            isOperational: true,
            pricingPerKwh: 24,
        },
        {
            name: "LionCharge - Natrampalli",
            address: "NH 48, Natrampalli, Tamil Nadu",
            latitude: 12.5700,
            longitude: 78.5000,
            operator: "LionCharge",
            connectorTypes: ["CCS2"],
            maxPowerKw: 50,
            isOperational: true,
            pricingPerKwh: 21,
        }
    ];

    for (const station of highwayChargers) {
        // Extract pricingPerKwh to map it correctly, rest spread
        const { pricingPerKwh, ...rest } = station;

        await db.insert(chargingStations).values({
            id: uuidv4(),
            ...rest,
            pricePerKwh: pricingPerKwh,
            source: 'manual_highway_seed',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    console.log(`✅ Injected ${highwayChargers.length} highway chargers.`);
}

seedHighwayChargers()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
