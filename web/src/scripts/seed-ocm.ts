
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../db/client';
import { chargingStations } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

async function seedOpenChargeMap() {
    console.log('🌍 Connecting to Open Charge Map API...');

    const API_KEY = process.env.OPEN_CHARGE_MAP_KEY || '123'; // Use dummy or env
    // '123' is often used as a sandbox key in their docs examples, but likely needs a real one for full access.
    // If no key, some endpoints work with rate limits.

    // Country Code for India is 'IN'
    const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&maxresults=2000&compact=true&verbose=false&key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Voltaic-App/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`OCM API failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📡 Received ${data.length} stations from OCM.`);

        let newCount = 0;
        let updateCount = 0;

        for (const station of data) {
            // Map OCM to our Schema
            const addressInfo = station.AddressInfo || {};
            const connections = station.Connections || [];

            // Determine max power
            let maxPower = 0;
            const connectorTypes: string[] = [];

            connections.forEach((conn: any) => {
                if (conn.PowerKW && conn.PowerKW > maxPower) maxPower = conn.PowerKW;
                if (conn.ConnectionType?.Title) connectorTypes.push(conn.ConnectionType.Title);
            });

            // Fallback for power if missing but Fast Charger
            if (maxPower === 0 && connectorTypes.some(c => c.includes("CCS"))) maxPower = 50;

            const stationData = {
                name: addressInfo.Title || "Unknown Station",
                latitude: addressInfo.Latitude,
                longitude: addressInfo.Longitude,
                address: addressInfo.AddressLine1,
                city: addressInfo.Town,
                state: addressInfo.StateOrProvince,
                operator: station.OperatorInfo?.Title || "Unknown Operator",
                connectorTypes: connectorTypes.length > 0 ? connectorTypes : ["Type 2"],
                maxPowerKw: maxPower > 0 ? maxPower : 7.2, // Assume AC Type 2 if unknown
                isOperational: station.StatusType?.IsOperational !== false,
                externalId: String(station.ID),
                source: 'open_charge_map',
                pricePerKwh: null, // OCM rarely has pricing
            };

            // Check existing by external ID
            const existing = await db.select().from(chargingStations).where(eq(chargingStations.externalId, String(station.ID)));

            if (existing.length > 0) {
                // Update
                // We typically skip overwrite unless we want to refresh
                // For now, let's skip to speed up
                // updateCount++;
            } else {
                // Insert
                await db.insert(chargingStations).values({
                    id: uuidv4(),
                    ...stationData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                newCount++;
            }
        }

        console.log(`✅ Seeding Complete. New: ${newCount}, Skipped: ${data.length - newCount}`);

    } catch (err) {
        console.error("❌ Failed to seed from OCM:", err);
        // Fallback or exit
        process.exit(1);
    }
}

seedOpenChargeMap()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
