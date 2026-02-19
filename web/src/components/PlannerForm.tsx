"use client";

import { useState } from "react";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Zap, Battery, MapPin, Navigation, Info } from "lucide-react";
import { RouteMap } from "@/components/RouteMap";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { geocodeLocation } from "@/actions/map/geocode";

import { ElevationChart } from "@/components/planner/ElevationChart";

interface Vehicle {
    id: string;
    name: string;
    batteryCapacityKwh: number;
    make: string;
}



export function PlannerForm({ vehicles }: { vehicles: Vehicle[] }) {
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [vehicleId, setVehicleId] = useState("");
    const [soc, setSoc] = useState("80");
    const [view, setView] = useState<"form" | "results">("form");

    // Multi-Stop Routing State
    const [stops, setStops] = useState<{ name: string, lat: number, lng: number }[]>([]);

    // Charger Intelligence State
    const [showChargers, setShowChargers] = useState(false);
    const [mapChargers, setMapChargers] = useState<any[]>([]);
    const [isFetchingChargers, setIsFetchingChargers] = useState(false);



    const { mutate, data: result, isPending } = useRouteCalculation({
        onSuccess: (data) => {
            // @ts-ignore
            if (data?.data?.injectedStops) {
                // @ts-ignore
                const newStops = data.data.injectedStops;

                setStops(prev => {
                    // Merge new stops, avoiding duplicates
                    const uniqueStops = [...prev];
                    newStops.forEach((stop: any) => {
                        if (!uniqueStops.some(s => s.lat === stop.latitude && s.lng === stop.longitude)) {
                            uniqueStops.push({ name: stop.name, lat: stop.latitude, lng: stop.longitude });
                        }
                    });
                    return uniqueStops;
                });
            }
            // Legacy Fallback
            // @ts-ignore
            else if (data?.data?.injectedStop) {
                // @ts-ignore
                const stop = data.data.injectedStop;
                setStops(prev => {
                    if (prev.some(s => s.lat === stop.latitude && s.lng === stop.longitude)) return prev;
                    return [...prev, { name: stop.name, lat: stop.latitude, lng: stop.longitude }];
                });
            }
        }
    });

    const handleCalculate = async () => {
        if (!vehicleId || !start || !end) return;

        const [startRes, endRes] = await Promise.all([
            geocodeLocation(start),
            geocodeLocation(end)
        ]);

        if (!startRes.data || !endRes.data) {
            // Ideally add toast here
            return;
        }

        // Clear previous auto-injected stops before recalculation
        // This prevents stale stops from accumulating in the UI
        setStops([]);

        mutate({
            start: { lat: startRes.data.lat, lng: startRes.data.lng },
            end: { lat: endRes.data.lat, lng: endRes.data.lng },
            vehicleId,
            currentSoC: Number(soc)
        });
    };

    // Charger Fetching Logic
    const handleMapMove = async (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
        if (!showChargers) return;

        setIsFetchingChargers(true);
        // import dynamically to avoid server component issues? No, its a client component.
        // We need to import the action. 
        // Note: For now, importing from top-level is fine.
        // const { getChargersInBounds } = await import("@/actions/map/get-chargers");

        // Simulating the import at top-level instead for cleaner code
    };

    const [selectedMake, setSelectedMake] = useState<string>("");

    // Normalize makes (Merge "MG Motor" -> "MG")
    const normalizedVehicles = vehicles.map(v => ({
        ...v,
        make: v.make === "MG Motor" ? "MG" : v.make
    }));

    // Extract unique makes
    const makes = Array.from(new Set(normalizedVehicles.map(v => v.make))).sort();

    // Filter models by selected make (checking against normalized make)
    const filteredModels = normalizedVehicles.filter(v => v.make === selectedMake);

    const BrandLogos: Record<string, string> = {
        "Tata": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/200px-Tata_logo.svg.png",
        "MG": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/MG_Motor_2021_logo.svg/200px-MG_Motor_2021_logo.svg.png",
        "MG Motor": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/MG_Motor_2021_logo.svg/200px-MG_Motor_2021_logo.svg.png",
        "BYD": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/BYD_Auto_2022_logo.svg/320px-BYD_Auto_2022_logo.svg.png",
        "Hyundai": "/logos/hyundai.png",
        "BMW": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/200px-BMW.svg.png",
        "Kia": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Kia_logo.svg/200px-Kia_logo.svg.png",
        "Mahindra": "/logos/mahindra.png",
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Full Screen Map Layer */}
            <div className="absolute inset-0 z-0 bg-neutral-950/80"> {/* Darkened Map Overlay */}
                <RouteMap
                    routeGeometry={result?.success ? result.data.route : null}
                    chargers={showChargers ? mapChargers : (result?.success ? result.data.chargers : [])}
                    onBoundsChange={async (bounds) => {
                        if (!showChargers) return;
                        // Debounce or just fetch
                        const { getChargersInBounds } = await import("@/actions/map/get-chargers");
                        const res = await getChargersInBounds(bounds);
                        if (res.success && res.data) {
                            setMapChargers(res.data);
                        }
                    }}
                    onAddStop={(charger) => {
                        // Add as waypoint
                        setStops(prev => [...prev, { name: charger.name, lat: charger.latitude, lng: charger.longitude }]);
                    }}
                />

                {/* Map Controls */}
                <div className="absolute top-24 right-6 z-20 flex flex-col gap-2">
                    <Button
                        size="sm"
                        variant={showChargers ? "default" : "secondary"}
                        onClick={() => setShowChargers(!showChargers)}
                        className={`h-9 shadow-xl backdrop-blur-md ${showChargers ? 'bg-primary text-black hover:bg-primary/90' : 'bg-black/50 text-white border border-white/10 hover:bg-black/70'}`}
                    >
                        <Zap className="mr-2 h-4 w-4" />
                        {showChargers ? "Hide Chargers" : "Show Chargers"}
                    </Button>
                </div>
            </div>

            {/* "Mission Control" Panel - Tesla Style Sidebar */}
            <div className="absolute top-0 left-0 z-10 h-full w-[400px] pt-20 pb-6 px-6 pointer-events-none flex flex-col">
                <div className="pointer-events-auto flex flex-col w-full h-auto max-h-full bg-[#09090b]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-white/5">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Trip Planner</h2>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        {/* 1. Vehicle Config (Split Make/Model) */}
                        <div className="space-y-3">
                            <Label className="text-[10px] text-neutral-400 font-mono uppercase">Vehicle Configuration</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Select onValueChange={(val) => { setSelectedMake(val); setVehicleId(""); }}>
                                    <SelectTrigger className="h-12 bg-black/50 border-white/10 text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 hover:bg-black/60 hover:border-white/20 relative">
                                        <SelectValue placeholder="Make" className={selectedMake && BrandLogos[selectedMake] ? "sr-only" : ""} />
                                        {selectedMake && BrandLogos[selectedMake] && (
                                            <div className="absolute inset-x-3 inset-y-0 flex items-center gap-2 pointer-events-none">
                                                <img
                                                    src={BrandLogos[selectedMake]}
                                                    alt={selectedMake}
                                                    className="w-5 h-5 object-contain bg-white rounded-sm p-[1px]"
                                                />
                                                <span className="truncate">{selectedMake}</span>
                                            </div>
                                        )}
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#111] border-white/10 text-white">
                                        {makes.map(make => (
                                            <SelectItem key={make} value={make} className="text-sm hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    {BrandLogos[make] && (
                                                        <img
                                                            src={BrandLogos[make]}
                                                            alt={make}
                                                            className="w-5 h-5 object-contain bg-white rounded-sm p-[1px]"
                                                        />
                                                    )}
                                                    <span>{make}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select onValueChange={setVehicleId} disabled={!selectedMake}>
                                    <SelectTrigger className="h-12 bg-black/50 border-white/10 text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 hover:bg-black/60 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <SelectValue placeholder="Model" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#111] border-white/10 text-white">
                                        {filteredModels.map(v => (
                                            <SelectItem key={v.id} value={v.id} className="text-sm hover:bg-white/5 transition-colors">{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Battery Input */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-neutral-400 font-mono uppercase">Start Battery</Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={soc}
                                        onChange={e => setSoc(e.target.value)}
                                        className="h-12 bg-black/50 border-white/10 text-white pl-10 pr-10 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200 hover:bg-black/60 hover:border-white/20"
                                    />
                                    <Battery className="w-5 h-5 absolute left-3 top-3.5 text-neutral-500 group-hover:text-primary transition-colors" />
                                    <div className="absolute right-3 top-3.5 text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors">%</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Route Timeline (Flex Layout for Perfect Alignment) */}
                        <div className="flex gap-3 relative pt-2">
                            {/* Timeline Graphics Column */}
                            <div className="flex flex-col items-center w-6 pt-2">
                                {/* Start Dot */}
                                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(210,255,0,0.8)] z-10 shrink-0"></div>

                                {/* Dynamic Lines & Dots for Stops */}
                                {stops.map((_, index) => (
                                    <>
                                        <div className="w-0.5 h-10 bg-neutral-800 my-0.5 shrink-0"></div>
                                        <div className="w-2 h-2 rounded-full border border-neutral-500 bg-neutral-900 z-10 shrink-0"></div>
                                    </>
                                ))}

                                {/* Connecting Line to End */}
                                <div className="w-0.5 grow bg-gradient-to-b from-primary/50 to-neutral-800 my-1 min-h-[20px] transition-all duration-300"></div>

                                {/* End Dot */}
                                <div className="w-2.5 h-2.5 rounded-full border-2 border-white bg-black z-10 shrink-0"></div>
                            </div>

                            {/* Inputs Column */}
                            <div className="flex-1 flex flex-col gap-2">
                                <Input
                                    value={start}
                                    onChange={e => setStart(e.target.value)}
                                    placeholder="Start Location"
                                    className="h-12 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-neutral-600 focus-visible:border-primary focus-visible:ring-0 px-4 text-sm transition-all duration-200 hover:border-white/20"
                                />

                                {/* Render Stops */}
                                {stops.map((stop, index) => (
                                    <div key={index} className="relative group animate-in fade-in slide-in-from-left-2">
                                        <Input
                                            value={stop.name}
                                            readOnly
                                            className="h-12 bg-transparent border border-white/10 rounded-lg text-neutral-200 pl-4 pr-10 text-sm focus-visible:ring-0 cursor-default transition-all duration-200 hover:border-white/20"
                                        />
                                        <button
                                            onClick={() => setStops(prev => prev.filter((_, i) => i !== index))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all duration-200"
                                        >
                                            <span className="sr-only">Remove</span>
                                            <span className="text-lg leading-none">×</span>
                                        </button>
                                    </div>
                                ))}

                                <Input
                                    value={end}
                                    onChange={e => setEnd(e.target.value)}
                                    placeholder="Destination"
                                    className="h-12 bg-transparent border border-white/10 rounded-lg text-white placeholder:text-neutral-600 focus-visible:border-primary focus-visible:ring-0 px-4 text-sm transition-all duration-200 hover:border-white/20"
                                />
                            </div>
                        </div>

                        {/* 3. Action Button */}
                        <Button
                            className="w-full bg-gradient-to-r from-primary to-primary/90 text-black hover:from-primary/90 hover:to-primary/80 font-bold h-12 uppercase tracking-wide shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 mt-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            onClick={handleCalculate}
                            disabled={isPending || !vehicleId}
                        >
                            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Navigation className="mr-2 h-5 w-5" />}
                            Calculate Route
                        </Button>

                        {/* 4. Results Section (Conditional) */}
                        {result?.success && result.data && (
                            <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 space-y-4">

                                {/* Elevation & Physics Analysis */}
                                {result.data.segmentData ? (
                                    <ElevationChart
                                        data={(() => {
                                            const vehicle = vehicles.find(v => v.id === vehicleId);
                                            const capacity = vehicle?.batteryCapacityKwh || 100; // Fallback
                                            let currentDist = 0;
                                            let currentEnergy = 0;
                                            const startEnergy = (Number(soc) / 100) * capacity;

                                            // Add Start Point
                                            const data = [{
                                                dist: 0,
                                                elev: result.data.segmentData[0]?.elevation || 0,
                                                soc: Number(soc)
                                            }];

                                            result.data.segmentData.forEach((seg: any) => {
                                                currentDist += seg.distance;
                                                currentEnergy += seg.energy;
                                                const remaining = startEnergy - currentEnergy;
                                                data.push({
                                                    dist: Number((currentDist / 1000).toFixed(1)),
                                                    elev: Math.round(seg.elevation),
                                                    soc: Math.max(0, Number(((remaining / capacity) * 100).toFixed(1)))
                                                });
                                            });
                                            return data;
                                        })()}
                                    />
                                ) : (
                                    <ElevationChart data={[]} />
                                )}

                                {/* Trip Stats Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all duration-300 group cursor-default">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                                            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">Consumption</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white leading-none font-mono">
                                            {result.data.energyConsumedKwh.toFixed(1)} <span className="text-sm font-normal text-neutral-500">kWh</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-400/30 hover:bg-white/10 transition-all duration-300 group cursor-default">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Info className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                                            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">Efficiency</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white leading-none font-mono">
                                            98 <span className="text-sm font-normal text-neutral-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Arrival Prediction */}
                                <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-black rounded-xl p-5 border border-white/10 hover:border-primary/30 relative overflow-hidden group transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Battery className="w-16 h-16 text-white" />
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <div>
                                            <div className="text-[10px] text-neutral-400 uppercase tracking-widest mb-2 font-medium">Projected Arrival</div>
                                            <div className={result.data.finalSoC < 20 ? "text-4xl font-bold text-red-500 font-mono" : "text-4xl font-bold text-primary font-mono"}>
                                                {result.data.finalSoC.toFixed(0)}%
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-neutral-500 mb-1">Confidence</div>
                                            <div className="text-base text-green-400 font-bold">94%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Background Noise/Texture optional */}
                    <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
                </div>
            </div>
        </div >
    );
}
