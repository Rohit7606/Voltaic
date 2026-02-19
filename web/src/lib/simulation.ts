import { vehicleModels } from "@/db/schema";

export interface FleetVehicle {
    id: string;
    modelId: string;
    modelName: string;
    status: "driving" | "charging" | "idle" | "service";
    soc: number;
    latitude: number;
    longitude: number;
    speed: number;
    lastUpdated: Date;
}

// Mock Fleet Generator
export function generateFleetStatus(vehicles: typeof vehicleModels.$inferSelect[]): FleetVehicle[] {
    const fleet: FleetVehicle[] = [];
    // Mumbai Coordinates
    const baseLat = 19.0760;
    const baseLng = 72.8777;

    const statuses: FleetVehicle["status"][] = ["driving", "driving", "driving", "charging", "idle", "idle", "service"];

    // Generate 12 active vehicles
    for (let i = 0; i < 12; i++) {
        // Random Vehicle Model from DB or Generic
        const vehicle = vehicles[i % vehicles.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Random location scatter around Mumbai
        const latOffset = (Math.random() - 0.5) * 0.15;
        const lngOffset = (Math.random() - 0.5) * 0.15;

        fleet.push({
            id: `FLT-${1000 + i}`,
            modelId: vehicle ? vehicle.id : "unknown",
            modelName: vehicle ? vehicle.name : "Generic EV",
            status: status,
            soc: Math.floor(Math.random() * 80) + 10, // 10-90%
            latitude: baseLat + latOffset,
            longitude: baseLng + lngOffset,
            speed: status === "driving" ? Math.floor(Math.random() * 60) + 20 : 0,
            lastUpdated: new Date()
        });
    }

    return fleet;
}

// Generate Efficiency Data for Chart (Last 24h)
export function generateEfficiencyHistory() {
    const data = [];
    const now = new Date();
    for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        // Base consumption ~15 + random variance + peak hour traffic
        const hour = time.getHours();
        const trafficFactor = (hour > 8 && hour < 20) ? Math.random() * 5 : 0;
        const value = 14 + Math.random() * 2 + trafficFactor;

        data.push({
            time: `${hour}:00`,
            consumption: Number(value.toFixed(1)),
        });
    }
    return data;
}
