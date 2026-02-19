import { Suspense } from "react";
import ChargerSearchInterface from "@/components/chargers/ChargerSearchInterface";

export const metadata = {
    title: "Find Chargers | Voltaic",
    description: "Locate high-speed EV chargers across India.",
};

export default function ChargersPage() {
    return (
        <div className="h-full w-full p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-neon-green to-emerald-400 bg-clip-text text-transparent">
                    Charger Network
                </h1>
                <p className="text-zinc-400 max-w-2xl">
                    Search over 2,000+ verified high-speed charging stations. Filter by power, provider, and availability.
                </p>
            </div>

            <Suspense fallback={<div className="text-neon-green animate-pulse">Loading Interface...</div>}>
                <ChargerSearchInterface />
            </Suspense>
        </div>
    );
}
