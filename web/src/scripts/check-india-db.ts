
import { db } from "../db/client";
import { chargingStations } from "../db/schema";
import { count, sql, desc } from "drizzle-orm";

async function checkIndiaData() {
    // 1. Total Count
    const total = await db.select({ count: count() }).from(chargingStations);
    console.log(`🇮🇳 Total Chargers in DB: ${total[0].count}`);

    // 2. Sample High Power Chargers (50kW+)
    const highPower = await db.query.chargingStations.findMany({
        where: (table, { gte }) => gte(table.maxPowerKw, 50),
        limit: 5,
        orderBy: [desc(chargingStations.maxPowerKw)]
    });

    console.log("\n⚡ Sample 50kW+ Chargers:");
    highPower.forEach(c => {
        console.log(`   - ${c.name}: ${c.maxPowerKw}kW [${c.latitude}, ${c.longitude}]`);
    });

    // 3. Check South India Region (approx lat 8-15, lng 75-80)
    const southIndia = await db.query.chargingStations.findMany({
        where: (table, { and, gte, lte }) => and(
            gte(table.latitude, 8), lte(table.latitude, 15),
            gte(table.longitude, 74), lte(table.longitude, 81)
        ),
        limit: 5
    });

    console.log(`\n🌴 South India Chargers (Sample): ${southIndia.length} found in sample query`);
    southIndia.forEach(c => {
        console.log(`   - ${c.name}: [${c.latitude}, ${c.longitude}]`);
    });
}

checkIndiaData()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
