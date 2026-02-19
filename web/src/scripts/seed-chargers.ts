import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../db/client';
import { chargingStations } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

const DATA_URL = 'https://raw.githubusercontent.com/mglsj/indian_ev_charging_stations/main/data.json';

interface RawCharger {
    name: string;
    address: string;
    city: string;
    state: string;
    lattitude: string; // Note the typo in source
    longitude: string;
    type: string;
    pincode?: string;
    availability?: number;
}

const CONNECTOR_TYPES = ['CCS2', 'Type 2', 'Chademo', 'Bharat DC001'];

// Helper to simulate realistic technical specs based on keywords
function enrichChargerData(name: string, type: string) {
    const nameLower = name.toLowerCase();

    // Default values (Slow/AC)
    let maxPowerKw = 7.4;
    let connectors = ['Type 2'];
    let operator = 'Unknown Network';

    // High Speed Detection (Expanded)
    if (nameLower.includes('tata') || nameLower.includes('zeon') || nameLower.includes('jio') || nameLower.includes('statiq') || nameLower.includes('fast') || nameLower.includes('dc') || nameLower.includes('evre') || nameLower.includes('relux') || nameLower.includes('lion') || nameLower.includes('kazam')) {
        maxPowerKw = 50; // DC Fast
        connectors = ['CCS2', 'Type 2'];
    }

    // Ultra Fast Detection
    if (nameLower.includes('hyper') || nameLower.includes('ultra') || nameLower.includes('350') || nameLower.includes('240')) {
        maxPowerKw = 150;
        connectors = ['CCS2'];
    }

    // Network Detection
    if (nameLower.includes('tata')) operator = 'Tata Power';
    else if (nameLower.includes('zeon')) operator = 'Zeon Charging';
    else if (nameLower.includes('jio')) operator = 'Jio-bp';
    else if (nameLower.includes('statiq')) operator = 'Statiq';
    else if (nameLower.includes('ather')) operator = 'Ather Grid';
    else if (nameLower.includes('ola')) operator = 'Ola Hypercharger';
    else if (nameLower.includes('eesl')) operator = 'EESL';
    else if (nameLower.includes('evre')) operator = 'EVRE';
    else if (nameLower.includes('relux')) operator = 'Relux Electric';
    else if (nameLower.includes('lion')) operator = 'LionCharge';
    else if (nameLower.includes('kazam')) operator = 'Kazam';

    // Price Simulation (₹15 - ₹25 per unit)
    const price = Math.floor(Math.random() * (25 - 15) + 15);

    return { maxPowerKw, connectors, operator, price };
}

async function seedChargers() {
    console.log('🔌 Fetching charger data from GitHub...');

    try {
        const response = await fetch(DATA_URL);
        const rawData: RawCharger[] = await response.json();

        console.log(`✅ Fetched ${rawData.length} stations.`);

        const cleanData = rawData
            .filter(c => c.lattitude && c.longitude && !isNaN(parseFloat(c.lattitude)))
            .map(c => {
                const { maxPowerKw, connectors, operator, price } = enrichChargerData(c.name, c.type);

                return {
                    id: uuidv4(),
                    name: c.name,
                    latitude: parseFloat(c.lattitude),
                    longitude: parseFloat(c.longitude),
                    address: c.address,
                    city: c.city,
                    state: c.state,
                    operator: operator,
                    connectorTypes: connectors,
                    maxPowerKw: maxPowerKw,
                    numberOfPorts: Math.floor(Math.random() * 4) + 1, // 1-4 ports
                    pricePerKwh: price,
                    isOperational: c.availability !== 0, // 0 usually means offline in this dataset
                    source: 'github-mglsj',
                    externalId: c.name + c.lattitude,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            });

        console.log(`✨ Prepared ${cleanData.length} valid records from GitHub.`);

        // Manual South India Hubs (Verified High Priority)
        const SOUTH_INDIA_HUBS = [
            {
                name: "Zeon Charging - A2B Rasipuram",
                address: "A2B Restaurant, NH 44, Rasipuram, Tamil Nadu",
                city: "Rasipuram",
                state: "Tamil Nadu",
                latitude: 11.4589,
                longitude: 78.1633,
                operator: "Zeon Charging",
                maxPowerKw: 60,
                connectors: ["CCS2", "Type 2"],
                count: 2
            },
            {
                name: "Zeon Charging - Hotel Saravana Bhavan, Krishnagiri",
                address: "NH 44, Krishnagiri, Tamil Nadu",
                city: "Krishnagiri",
                state: "Tamil Nadu",
                latitude: 12.5266,
                longitude: 78.2146,
                operator: "Zeon Charging",
                maxPowerKw: 60,
                connectors: ["CCS2"],
                count: 2
            },
            {
                name: "Relux Electric - Salem Hub",
                address: "Salem-Kochi Highway, Salem",
                city: "Salem",
                state: "Tamil Nadu",
                latitude: 11.6643,
                longitude: 78.1460,
                operator: "Relux Electric",
                maxPowerKw: 120,
                connectors: ["CCS2"],
                count: 4
            },
            {
                name: "Tata Power - Ooty Main",
                address: "Commercial Rd, Ooty",
                city: "Ooty",
                state: "Tamil Nadu",
                latitude: 11.4100,
                longitude: 76.6950,
                operator: "Tata Power",
                maxPowerKw: 30,
                connectors: ["CCS2"],
                count: 1
            },
            // Add more strategic points if needed
        ];

        const manualData = SOUTH_INDIA_HUBS.map(hub => ({
            id: uuidv4(),
            name: hub.name,
            latitude: hub.latitude,
            longitude: hub.longitude,
            address: hub.address,
            city: hub.city,
            state: hub.state,
            operator: hub.operator,
            connectorTypes: hub.connectors,
            maxPowerKw: hub.maxPowerKw,
            numberOfPorts: hub.count,
            pricePerKwh: 22,
            isOperational: true,
            source: 'manual-verified-south',
            externalId: `manual-${hub.name.replace(/\s/g, '-')}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        console.log(`➕ Adding ${manualData.length} manual verified hubs.`);

        const finalData = [...cleanData, ...manualData];

        // Batch insert
        const BATCH_SIZE = 100;
        for (let i = 0; i < finalData.length; i += BATCH_SIZE) {
            const batch = finalData.slice(i, i + BATCH_SIZE);
            await db.insert(chargingStations).values(batch).onConflictDoNothing().execute();
            process.stdout.write(`\r💾 Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(finalData.length / BATCH_SIZE)}`);
        }

        console.log('🚀 Charger seeding complete!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

async function seedSynthetic() {
    console.log("🧪 Seeding Synthetic Superchargers for Demo Reliability...");

    // Key locations on Chennai-Ooty Route (NH44/NH544)
    const syntheticChargers = [
        {
            name: "Voltaic Superhub - Vellore",
            lat: 12.9165, lng: 79.1325,
            kw: 150, operator: "Voltaic Network"
        },
        {
            name: "Voltaic Superhub - Krishnagiri",
            lat: 12.5186, lng: 78.2137,
            kw: 150, operator: "Voltaic Network"
        },
        {
            name: "Voltaic Superhub - Salem",
            lat: 11.6643, lng: 78.1460,
            kw: 150, operator: "Voltaic Network"
        },
        {
            name: "Voltaic Superhub - Erode",
            lat: 11.3410, lng: 77.7172,
            kw: 150, operator: "Voltaic Network"
        },
        {
            name: "Voltaic Superhub - Mettupalayam",
            lat: 11.3000, lng: 76.9500,
            kw: 150, operator: "Voltaic Network"
        }
    ];

    const batch = syntheticChargers.map(c => ({
        id: uuidv4(),
        name: c.name,
        latitude: c.lat,
        longitude: c.lng,
        address: "Highway NH44",
        city: "Voltaic City",
        state: "Tamil Nadu",
        operator: c.operator,
        connectorTypes: ["CCS2"],
        maxPowerKw: c.kw,
        numberOfPorts: 8,
        pricePerKwh: 18,
        isOperational: true,
        source: "synthetic-demo",
        externalId: `syn-${c.name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    await db.insert(chargingStations).values(batch).onConflictDoNothing();
    console.log(`✅ Injected ${batch.length} Synthetic Superchargers.`);
}

seedChargers().then(() => seedSynthetic());
