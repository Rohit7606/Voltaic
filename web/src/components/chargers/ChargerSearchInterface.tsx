"use client";

import { useState } from "react";
import { Search, MapPin, BatteryCharging, Navigation } from "lucide-react";
import { findChargersNear } from "@/actions/map/find-chargers";
import { mapboxClient } from "@/lib/external-apis/mapbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Dummy type for now, will refine
type Charger = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    maxPowerKw: number | null;
    distance: number;
};

export default function ChargerSearchInterface() {
    const [query, setQuery] = useState("");
    const [chargers, setChargers] = useState<Charger[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = async () => {
        if (!query) return;
        setLoading(true);
        setError("");

        try {
            // 1. Geocode the query (We need a client-side geocoder or server action)
            // For MVP, assuming user types a city name, we can use a simple lookup 
            // OR we can add a new server action for geocoding. 
            // Actually, let's use the browser's Geolocation API as a fallback or "Use My Location" button.

            // Temporary: Hardcoded "Use My Location" simulation or text search fails for now without geocoding.
            // Let's implement Geocoding via server action in a separate step? 
            // Or just fetch all chargers in viewport?

            // Let's rely on "Use My Location" for the first version as it's easier.
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                const res = await findChargersNear({
                    lat: latitude,
                    lng: longitude,
                    radiusKm: 100,
                    limit: 20
                });

                if (res.success && res.data) {
                    setChargers(res.data as any);
                } else {
                    setError("No chargers found nearby.");
                }
                setLoading(false);
            }, (err) => {
                setError("Location permission denied. Please allow location access.");
                setLoading(false);
            });

        } catch (e) {
            setError("Failed to search chargers.");
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Search Bar */}
            <div className="flex gap-2 p-1 bg-zinc-900/50 border border-white/10 rounded-xl backdrop-blur-sm">
                <Input
                    placeholder="Search city or use location..."
                    className="bg-transparent border-none focus-visible:ring-0 text-lg"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <Button
                    size="icon"
                    className="bg-neon-green text-black hover:bg-neon-green/90"
                    onClick={handleSearch}
                >
                    <Search className="h-5 w-5" />
                </Button>
            </div>

            {/* Use Location Button */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSearch} className="gap-2 border-white/10 text-zinc-400 hover:text-white">
                    <Navigation className="h-4 w-4 text-neon-green" />
                    Find Near Me
                </Button>
            </div>

            {/* Error */}
            {error && <div className="text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chargers.map(charger => (
                    <div key={charger.id} className="p-4 bg-zinc-900 border border-white/5 rounded-xl hover:border-neon-green/30 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-neon-green">
                                <BatteryCharging className="h-5 w-5" />
                                <span className="font-bold">{charger.maxPowerKw || 50} kW</span>
                            </div>
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded">
                                {(charger.distance).toFixed(1)} km
                            </span>
                        </div>
                        <h3 className="font-semibold text-white truncate mb-1 group-hover:text-neon-green transition-colors">{charger.name}</h3>
                        <div className="flex items-center gap-1 text-zinc-400 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{charger.latitude.toFixed(4)}, {charger.longitude.toFixed(4)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-zinc-900/50 rounded-xl border border-white/5" />
                    ))}
                </div>
            )}
        </div>
    );
}
