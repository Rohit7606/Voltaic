import { db } from "@/db/client";
import { vehicleModels } from "@/db/schema";
import { generateEfficiencyHistory, generateFleetStatus } from "@/lib/simulation";
import { FleetTable } from "@/components/dashboard/FleetTable";
import { EfficiencyChart } from "@/components/dashboard/EfficiencyChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Car, Zap } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // 1. Fetch real DB vehicles
    const vehiclesData = await db.select().from(vehicleModels);

    // 2. Generate Active Fleet Simulation
    const fleet = generateFleetStatus(vehiclesData);
    const efficiencyData = generateEfficiencyHistory();

    // Stats
    const totalVehicles = vehiclesData.length * 4; // Mock scale
    const activeRoutes = fleet.filter(v => v.status === "driving").length;
    const avgEfficiency = 14.2;

    return (
        <div className="h-full w-full overflow-y-auto pt-24 px-8 pb-10 bg-black">
            <div className="space-y-8 container mx-auto max-w-7xl">

                {/* Header */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Mission Control</h1>
                        <p className="text-neutral-400 mt-1">Real-time telemetry and fleet operations.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-primary font-bold">
                            {new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono uppercase">System Active</div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-400">Total Fleet Size</CardTitle>
                            <Car className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{totalVehicles}</div>
                            <p className="text-xs text-neutral-500 mt-1">Across 4 zones</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-400">Active Routes</CardTitle>
                            <Activity className="h-4 w-4 text-green-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{activeRoutes}</div>
                            <p className="text-xs text-neutral-500 mt-1">Currently in motion</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-neutral-400">Avg. Efficiency</CardTitle>
                            <Zap className="h-4 w-4 text-yellow-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{avgEfficiency}</div>
                            <p className="text-xs text-neutral-500 mt-1">kWh / 100km</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                    {/* Left: Active Fleet Grid */}
                    <div className="h-full overflow-hidden">
                        <FleetTable fleet={fleet} />
                    </div>

                    {/* Right: Charts */}
                    <div className="h-full">
                        <EfficiencyChart data={efficiencyData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
