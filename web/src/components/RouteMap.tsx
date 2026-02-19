import { Map, Source, Layer, Marker, NavigationControl, useMap, MapRef, Popup, ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Zap, X, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RouteMapProps {
    routeGeometry: any; // GeoJSON
    chargers: any[];
    onBoundsChange?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
    onAddStop?: (charger: any) => void;
}

export function RouteMap({ routeGeometry, chargers, onBoundsChange, onAddStop }: RouteMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [selectedCharger, setSelectedCharger] = useState<any>(null);

    useEffect(() => {
        if (routeGeometry && mapRef.current) {
            const map = mapRef.current.getMap();
            const coords = routeGeometry.coordinates;
            // Calculate bounds
            const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
            for (const coord of coords) {
                bounds.extend(coord as [number, number]);
            }

            map.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 400, right: 50 },
                duration: 2000
            });
        }
    }, [routeGeometry]);

    const handleMoveEnd = (e: ViewStateChangeEvent) => {
        if (onBoundsChange) {
            const bounds = e.target.getBounds();
            if (bounds) {
                onBoundsChange({
                    minLat: bounds.getSouth(),
                    maxLat: bounds.getNorth(),
                    minLng: bounds.getWest(),
                    maxLng: bounds.getEast()
                });
            }
        }
    };

    return (
        <div className="h-full w-full rounded-none overflow-hidden relative">
            <Map
                ref={mapRef}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                initialViewState={{
                    longitude: 78.9629, // Center of India
                    latitude: 20.5937,
                    zoom: 5,
                }}
                mapStyle="mapbox://styles/mapbox/navigation-guidance-night-v4"
                onMoveEnd={handleMoveEnd}
            >
                <NavigationControl position="top-right" />

                {routeGeometry && (
                    <Source id="route" type="geojson" data={routeGeometry}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                "line-color": "#D2FF00",
                                "line-width": 6,
                                "line-opacity": 0.8
                            }}
                        />
                    </Source>
                )}

                {chargers.map((charger) => (
                    <Marker
                        key={charger.id}
                        longitude={charger.longitude}
                        latitude={charger.latitude}
                        anchor="bottom"
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setSelectedCharger(charger);
                        }}
                    >
                        <div className="bg-black rounded-full p-2 shadow-[0_0_15px_rgba(210,255,0,0.5)] border-2 border-primary cursor-pointer hover:bg-black/80 hover:scale-110 transition-all duration-200 z-50 group">
                            <Zap className="h-4 w-4 text-primary group-hover:animate-pulse fill-primary" />
                        </div>
                    </Marker>
                ))}

                {selectedCharger && (
                    <Popup
                        longitude={selectedCharger.longitude}
                        latitude={selectedCharger.latitude}
                        anchor="bottom" // Changed to bottom to float above pin
                        offset={15} // Add spacing from the pin
                        onClose={() => setSelectedCharger(null)}
                        closeOnClick={false}
                        className="custom-mapbox-popup" // We might need global CSS for this to remove default styles
                        maxWidth="300px"
                    >
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090b]/90 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] p-0 min-w-[240px]">

                            {/* Decorative Top Highlight */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                            {/* Header Section */}
                            <div className="p-4 pb-3 border-b border-white/5 relative">
                                <div className="flex justify-between items-start gap-3">
                                    <h3 className="font-bold text-base text-white leading-tight pr-6">
                                        {selectedCharger.name}
                                    </h3>
                                    <div className="absolute top-3 right-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCharger(null);
                                            }}
                                            className="text-neutral-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-neutral-300 font-mono tracking-wider uppercase h-5 px-1.5">
                                        {selectedCharger.operator}
                                    </Badge>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedCharger.isOperational ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                                        <span className={`text-[10px] font-medium ${selectedCharger.isOperational ? "text-emerald-400" : "text-red-400"}`}>
                                            {selectedCharger.isOperational ? "Online" : "Offline"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Specs Grid */}
                            <div className="p-4 space-y-3 bg-gradient-to-b from-white/[0.02] to-transparent">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center justify-center gap-1">
                                        <Zap className="h-3.5 w-3.5 text-primary mb-0.5" />
                                        <span className="text-sm font-bold text-white font-mono">{selectedCharger.maxPowerKw} <span className="text-[10px] text-neutral-500 font-sans">kW</span></span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center justify-center gap-1">
                                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Price</span>
                                        <span className="text-sm font-bold text-white font-mono">₹{selectedCharger.pricePerKwh || "18"}<span className="text-[10px] text-neutral-500 font-sans">/u</span></span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {(selectedCharger.connectorTypes || ["Type 2"]).map((type: string) => (
                                        <div key={type} className="px-2 py-1 rounded text-[10px] bg-neutral-800 text-neutral-300 border border-white/5">
                                            {type}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="p-4 pt-0">
                                <Button
                                    className="w-full h-9 bg-primary text-black hover:bg-primary/90 font-bold text-xs uppercase tracking-wide shadow-[0_0_20px_rgba(210,255,0,0.3)] hover:shadow-[0_0_25px_rgba(210,255,0,0.5)] transition-all transform active:scale-95 group"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAddStop) onAddStop(selectedCharger);
                                        setSelectedCharger(null);
                                    }}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                                    Add as Stop
                                </Button>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>
        </div>
    );
}
