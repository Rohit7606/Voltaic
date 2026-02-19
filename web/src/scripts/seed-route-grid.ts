import { db } from "../db/client";
import { openElevationClient } from "../lib/external-apis/elevation";

// Route: Chennai -> Ooty
// We'll interpolate points along this approximate path and fetch elevation.

const START = { lat: 13.0827, lng: 80.2707 }; // Chennai
const MID_1 = { lat: 12.9165, lng: 79.1325 }; // Vellore
const MID_2 = { lat: 12.5158, lng: 78.2138 }; // Krishnagiri
const MID_3 = { lat: 11.0168, lng: 76.9558 }; // Coimbatore
const END = { lat: 11.4102, lng: 76.6950 }; // Ooty

// Linear interpolation function
function interpolate(p1: { lat: number, lng: number }, p2: { lat: number, lng: number }, steps: number) {
    const points = [];
    const dLat = (p2.lat - p1.lat) / steps;
    const dLng = (p2.lng - p1.lng) / steps;
    for (let i = 0; i <= steps; i++) {
        points.push({
            lat: p1.lat + dLat * i,
            lng: p1.lng + dLng * i
        });
    }
    return points;
}

async function seedRouteGrid() {
    console.log("🛣️ Seeding Elevation for Route: Chennai -> Ooty...");

    // Generate ~200 points per leg (approx 1km resolution)
    const leg1 = interpolate(START, MID_1, 150);
    const leg2 = interpolate(MID_1, MID_2, 100);
    const leg3 = interpolate(MID_2, MID_3, 150);
    const leg4 = interpolate(MID_3, END, 100);

    const allPoints = [...leg1, ...leg2, ...leg3, ...leg4];
    console.log(`📍 Generated ${allPoints.length} points along the route.`);

    // Remove duplicates
    const uniqueHelper = new Set();
    const uniquePoints = allPoints.filter(p => {
        const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        if (uniqueHelper.has(key)) return false;
        uniqueHelper.add(key);
        return true;
    });

    console.log(`✨ Optimized to ${uniquePoints.length} unique points.`);

    // Batch process
    const BATCH_SIZE = 50;

    for (let i = 0; i < uniquePoints.length; i += BATCH_SIZE) {
        const batch = uniquePoints.slice(i, i + BATCH_SIZE);
        try {
            await openElevationClient.getElevations(batch);
            process.stdout.write(`\r✅ Route Segments: ${Math.min(i + BATCH_SIZE, uniquePoints.length)}/${uniquePoints.length}`);
            await new Promise(r => setTimeout(r, 1000)); // Gentle pace
        } catch (e) {
            console.error("Error:", e);
        }
    }

    console.log("\n🏁 Route Elevation Cached Successfully!");
}

seedRouteGrid()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
