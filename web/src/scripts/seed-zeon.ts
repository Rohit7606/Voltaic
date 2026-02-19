
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/client';
import { chargingStations } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Mock Mapbox Geocoding if needed, or real? 
// We will use a fetch to Mapbox API directly in this script to be self-contained.
async function geocode(query: string) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) throw new Error("Missing Mapbox Token");

    // Bias towards India
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=in&limit=1`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            return {
                lat: data.features[0].center[1],
                lng: data.features[0].center[0],
                address: data.features[0].place_name
            };
        }
    } catch (e) {
        console.error(`Geocode failed for ${query}`, e);
    }
    return null;
}

async function seedZeon() {
    console.log('🕷️ Starting Zeon Network Crawler...');

    const filePath = path.join(process.cwd(), 'src/data/zeon_locations.json');
    const locations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`Loaded ${locations.length} targets.`);

    let added = 0;

    for (const locName of locations) {
        // Rate limit slightly
        await new Promise(r => setTimeout(r, 250));

        const geo = await geocode(locName);
        if (geo) {
            console.log(`📍 Found: ${locName} -> ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`);

            await db.insert(chargingStations).values({
                id: uuidv4(),
                name: locName,
                address: geo.address,
                latitude: geo.lat,
                longitude: geo.lng,
                operator: "Zeon Charging",
                connectorTypes: ["CCS2", "Type 2"],
                maxPowerKw: 60, // Standard Zeon speed
                isOperational: true,
                pricePerKwh: 24,
                source: "zeon_crawler",
                createdAt: new Date(),
                updatedAt: new Date()
            });
            added++;
        } else {
            console.warn(`⚠️ Could not locate: ${locName}`);
        }
    }

    console.log(`✅ Crawler finished. Added ${added} stations.`);
}

seedZeon()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
