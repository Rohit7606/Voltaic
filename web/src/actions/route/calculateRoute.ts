'use server';

// Force Refresh: Schema Update
import { db } from "@/db/client";
import { vehicleModels } from "@/db/schema";
import { mapboxClient } from "@/lib/external-apis/mapbox";
import { openElevationClient } from "@/lib/external-apis/elevation";
import { openWeatherClient } from "@/lib/external-apis/weather";
import { PhysicsEngine } from "@/lib/physics/engine";
import { segmentPolyline, calculateRouteComplexity, getDistance } from "@/lib/utils/geometry";


import { z } from "zod";
import { eq } from "drizzle-orm";

const calculateRouteSchema = z.object({
    start: z.object({ lat: z.number(), lng: z.number() }),
    end: z.object({ lat: z.number(), lng: z.number() }),
    waypoints: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
    vehicleId: z.string().uuid(),
    currentSoC: z.number().min(0).max(100).optional().default(100),
});

type RouteResult = {
    success: boolean;
    data?: any;
    error?: string;
}

export async function calculateRoute(input: z.infer<typeof calculateRouteSchema>): Promise<RouteResult> {
    try {
        const { start, end, waypoints, vehicleId, currentSoC } = calculateRouteSchema.parse(input);

        // Fetch vehicle
        const vehicle = await db
            .select()
            .from(vehicleModels)
            .where(eq(vehicleModels.id, vehicleId))
            .limit(1);

        if (!vehicle[0]) {
            return { success: false, error: "Vehicle not found" };
        }

        // Construct Coordinates Array [Start, ...Waypoints, End]
        const coordinates = [
            [start.lng, start.lat],
            ...(waypoints || []).map(wp => [wp.lng, wp.lat]),
            [end.lng, end.lat]
        ] as [number, number][];

        // Get Route
        const routeResponse = await mapboxClient.getDirections({
            coordinates: coordinates,
            profile: "driving",
            geometries: "geojson",
        });

        if (!routeResponse.routes || !routeResponse.routes[0]) {
            return { success: false, error: "No route found" };
        }

        const route = routeResponse.routes[0];
        const geometry = route.geometry as any;

        // Segment
        const SEGMENT_LENGTH_METERS = 5000; // 5km segments
        const segments = segmentPolyline(geometry.coordinates, SEGMENT_LENGTH_METERS);
        const legs = route.legs || [];

        // Elevations
        const points = segments.map(seg => ({ lat: seg.coords[0][1], lng: seg.coords[0][0] }));
        let elevations: number[] = [];
        try {
            elevations = await openElevationClient.getElevations(points);
        } catch (e) {
            console.warn("Elevation fetch failed, assuming flat terrain", e);
            elevations = new Array(points.length).fill(0);
        }

        // Weather
        const midpoint = segments[Math.floor(segments.length / 2)].coords[0];
        let weather = { main: { temp: 25 } };
        try {
            weather = await openWeatherClient.getCurrentWeather({
                lat: midpoint[1],
                lon: midpoint[0],
            });
        } catch (e) {
            console.warn("Weather fetch failed, using default 25C", e);
        }

        const engine = new PhysicsEngine(vehicle[0]);

        // ----------------------------------------------------------------------
        // THE SIMPLE PROTOCOL SIMULATION
        // ----------------------------------------------------------------------
        const segmentData: any[] = [];
        let currentBatteryKwh = (currentSoC / 100) * vehicle[0].usableCapacityKwh;
        let cumulativeDist = 0;
        let currentLegIndex = 0;
        let panicPointIndex = -1;

        // Calculate cumulative leg endpoints for absolute distance checking
        const legEndPoints = legs.reduce((acc, leg) => {
            const last = acc.length > 0 ? acc[acc.length - 1] : 0;
            acc.push(last + leg.distance);
            return acc;
        }, [] as number[]);

        console.log("🛣️ Route Legs:", legs.length, "Endpoints:", legEndPoints);

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // 1. Calculate Consumption
            const el1 = elevations[i] || 0;
            const el2 = elevations[min(i + 1, elevations.length - 1)] || el1;
            const elevationChange = el2 - el1;
            const grade = elevationChange / segment.distance;

            const consumption = engine.calculateSegmentEnergy({
                distance: segment.distance,
                grade,
                speed: 80, // MVP fixed speed
                temperature: weather.main.temp,
            });

            currentBatteryKwh -= consumption;
            cumulativeDist += segment.distance;

            segmentData.push({
                distance: segment.distance,
                energy: consumption,
                elevation: el1,
            });


            // 2. Check for Charger Stop (Coordinate Proximity) - SIMULATE CHARGE
            // The 'waypoints' variable is already destructured from 'input' at the top of the function.

            // 2. Check for Charger Stop (Coordinate Proximity) - SIMULATE CHARGE
            // Use massive 100km buffer to ensure we catch the stop despite segment drift or simplification
            // This effectively says: "If we are in the region of the charger, use it."
            if (waypoints && waypoints.length > 0 && currentLegIndex < waypoints.length) {
                const targetWP = waypoints[currentLegIndex];
                const currentLoc = segments[i].coords[segments[i].coords.length - 1]; // [lng, lat]

                const distMeters = getDistance(
                    { lat: currentLoc[1], lng: currentLoc[0] },
                    { lat: targetWP.lat, lng: targetWP.lng }
                );

                // Initialize min distance tracking
                if (!segmentData[i].minDistToWP) segmentData[i].minDistToWP = distMeters;
                const prevDist = i > 0 ? segmentData[i - 1].minDistToWP || Infinity : Infinity;

                // Logic: If distance starts INCREASING (we passed it) and we were close (< 5km)
                // AND the new distance is still reasonable (< 10km) - prevents triggering on "Target Selection Jump"
                const passingCheck = (distMeters > prevDist) && (prevDist < 5000) && (distMeters < 10000);

                // Strict proximity detection (increased to 3km to catch drifting stops)
                const strictProximity = distMeters < 3000;

                if (passingCheck || strictProximity) {
                    const targetKwh = vehicle[0].usableCapacityKwh;
                    // Only charge if we haven't already charged for this leg
                    if (currentBatteryKwh < targetKwh) {
                        currentBatteryKwh = targetKwh; // Virtual Charge
                    }
                    currentLegIndex++;
                }

                // Store for next iteration comparison
                segmentData[i].minDistToWP = distMeters;
            }

            // 3. Panic Check (Smart)
            const currentSoCPercent = (currentBatteryKwh / vehicle[0].usableCapacityKwh) * 100;

            if (currentSoCPercent < 25 && panicPointIndex === -1 && i < segments.length - 2) {
                // Check where we are going
                let suppressPanic = false;

                // Determine target (Next Waypoint or End)
                let targetCoords: { lat: number, lng: number } | null = null;
                let isHeadingToCharger = false;

                if (waypoints && currentLegIndex < waypoints.length) {
                    targetCoords = waypoints[currentLegIndex];
                    isHeadingToCharger = true;
                } else {
                    targetCoords = end; // Heading to destination
                }

                if (targetCoords) {
                    const currentLoc = segment.coords[segment.coords.length - 1]; // [lng, lat]
                    const distToTargetKm = getDistKm(currentLoc[1], currentLoc[0], targetCoords.lat, targetCoords.lng);

                    // SUPPRESSION LOGIC:
                    // 1. If heading to a charger (Waypoint)
                    // 2. AND we are close (< 75km) 
                    // 3. AND we aren't completely dead (> 5%)
                    // -> Assume we can make it to the planned stop.
                    if (isHeadingToCharger && distToTargetKm < 75 && currentSoCPercent > 5) {
                        suppressPanic = true;
                        // console.log(`🛡️ Suppressing Panic at ${currentSoCPercent.toFixed(1)}% - Charger ${distToTargetKm.toFixed(1)}km ahead`);
                    }

                    // Note: If heading to Destination, we NEVER suppress if < 25%, 
                    // because we must ensure 20% arrival buffer.
                }

                if (!suppressPanic) {
                    console.log(`🚨 Panic Triggered at ${currentSoCPercent.toFixed(1)}% SoC`);
                    panicPointIndex = i;
                    break; // Stop simulation to handle rescue
                }
            }
        } // Close the loop

        // ----------------------------------------------------------------------
        // AUTO-RESCUE LOGIC
        // ----------------------------------------------------------------------
        const currentWaypoints = waypoints || [];

        // Prevent infinite loops: Limit changes to 5 stops
        if (panicPointIndex !== -1 && currentWaypoints.length < 5) {
            const panicSegment = segments[panicPointIndex];
            const panicCoords = panicSegment.coords[0]; // [lng, lat]

            console.log(`🔍 Searching for Relief Charger (50kW+) near [${panicCoords[1]}, ${panicCoords[0]}]...`);

            // This import might be problematic if circular, but it's okay if type-only or handled well.
            // Using dynamic import inside async function is safe.
            const { findChargersNear } = await import("@/actions/map/find-chargers");

            const chargersRes = await findChargersNear({
                lat: panicCoords[1],
                lng: panicCoords[0],
                radiusKm: 150, // Large radius
                minPowerKw: 50, // RELIABILITY: 50kW+ ensures coverage. 150kW is too sparse for panic mode.
                limit: 50
            });

            if (chargersRes.success && chargersRes.data && chargersRes.data.length > 0) {
                // A* Heuristic: Cost = Dist(Panic -> Charger) + Dist(Charger -> Dest)
                let bestScore = Infinity;
                let bestCharger: any = null;

                // Fallback: Keep track of the absolute closest charger in case safe options fail
                let minimalDist = Infinity;
                let closestCharger: any = null;

                for (const charger of chargersRes.data) {
                    // Check duplicates (Increased radius to 2km to prevent clustering)
                    const isDuplicate = currentWaypoints.some(wp =>
                        Math.abs(wp.lat - charger.latitude) < 0.02 &&
                        Math.abs(wp.lng - charger.longitude) < 0.02
                    );
                    if (isDuplicate) continue;

                    const g_score = getDistKm(panicCoords[1], panicCoords[0], charger.latitude, charger.longitude);

                    // Track closest regardless of safety
                    if (g_score < minimalDist) {
                        minimalDist = g_score;
                        closestCharger = charger;
                    }

                    // Smart Scorer: Maximize forward progress while ensuring reachability
                    const estimatedRangeKm = (currentBatteryKwh || 10) * 4.0;
                    const safeReachKm = estimatedRangeKm * 0.95; // 5% safety buffer

                    // 1. Safety Filter: Must be reachable with current battery
                    if (g_score > safeReachKm) continue;

                    const h_score = getDistKm(charger.latitude, charger.longitude, end.lat, end.lng);
                    const total_score = (g_score * 0.1) + h_score;

                    if (total_score < bestScore) {
                        bestScore = total_score;
                        bestCharger = charger;
                    }
                }

                // If no safe charger found, use the closest one (Desperate Mode)
                if (!bestCharger && closestCharger) {
                    console.warn(`⚠️ No reachable charger found. Using closest option (${minimalDist.toFixed(1)}km away).`);
                    bestCharger = closestCharger;
                    bestScore = minimalDist;
                }


                if (bestCharger) {
                    console.log(`✅ Found Best Charger: ${bestCharger.name} (Score: ${bestScore.toFixed(1)})`);

                    // RECURSIVE CALL
                    // 1. Add new charger
                    const unsortedWaypoints = [...currentWaypoints, { lat: bestCharger.latitude, lng: bestCharger.longitude }];

                    // 2. Sort waypoints by distance from START to ensure linear progression (Fixes Zig-Zag)
                    const sortedWaypoints = unsortedWaypoints.sort((a, b) => {
                        const distA = getDistance({ lat: start.lat, lng: start.lng }, { lat: a.lat, lng: a.lng });
                        const distB = getDistance({ lat: start.lat, lng: start.lng }, { lat: b.lat, lng: b.lng });
                        return distA - distB;
                    });

                    const newResult = await calculateRoute({
                        start,
                        end,
                        waypoints: sortedWaypoints,
                        vehicleId,
                        currentSoC: input.currentSoC // Maintain original start SoC
                    });

                    // Flatten injected stops for reporting
                    if (newResult.success && newResult.data) {
                        const existingInjected = newResult.data.injectedStops || [];
                        const combinedStops = [bestCharger, ...existingInjected];

                        // SORT the reporting list to match the visual route order
                        combinedStops.sort((a: any, b: any) => {
                            const aLat = a.latitude ?? a.lat;
                            const aLng = a.longitude ?? a.lng;
                            const bLat = b.latitude ?? b.lat;
                            const bLng = b.longitude ?? b.lng;

                            const distA = getDistance({ lat: start.lat, lng: start.lng }, { lat: aLat, lng: aLng });
                            const distB = getDistance({ lat: start.lat, lng: start.lng }, { lat: bLat, lng: bLng });

                            console.log(`[Sort] A: ${a.name || 'Unknown'} (${(distA / 1000).toFixed(1)}km) vs B: ${b.name || 'Unknown'} (${(distB / 1000).toFixed(1)}km)`);

                            return distA - distB;
                        });

                        return {
                            ...newResult,
                            data: {
                                ...newResult.data,
                                injectedStops: combinedStops,
                                injectedStop: bestCharger
                            }
                        };
                    }
                    return newResult;
                } else {
                    console.warn("⚠️ No suitable unique charger found.");
                }
            } else {
                console.warn("❌ No 50kW+ chargers found within 150km.");
            }
        }

        const finalSegmentData: any[] = [];
        let finalBatteryKwh = (currentSoC / 100) * vehicle[0].usableCapacityKwh;
        let finalCumulativeDist = 0;
        let finalLegIndex = 0;
        let totalEnergyConsumed = 0;

        // Reuse geometry/segments for FINAL simulation (with Charge Stops)
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const el1 = elevations[i] || 0;
            const el2 = elevations[min(i + 1, elevations.length - 1)] || el1;
            const grade = (el2 - el1) / segment.distance;

            const consumption = engine.calculateSegmentEnergy({
                distance: segment.distance,
                grade,
                speed: 80,
                temperature: weather.main.temp,
            });

            finalBatteryKwh -= consumption;
            finalCumulativeDist += segment.distance;
            totalEnergyConsumed += consumption;

            finalSegmentData.push({
                distance: segment.distance,
                energy: consumption,
                elevation: el1
            });


            // Check for Stop (Leg Boundary)
            // Check for Stop (Leg Boundary) - Coordinate Proximity Mode
            if (waypoints && finalLegIndex < waypoints.length) {
                const targetWP = waypoints[finalLegIndex];
                // Use the last coordinate of the segment as current position
                // (Assuming segment has [lng, lat] arrays)
                // Need to safely access coords. 
                // Note: 'segments' is derived from geometry, but let's ensure we have the lat/lng.
                // segment comes from 'const segments = ...' which implies it has coords?
                // Checking line 147: `segments[i].coords` is used. So it exists.

                const currentLoc = segment.coords ? segment.coords[segment.coords.length - 1] : null;

                if (currentLoc) {
                    const distToStop = getDistKm(currentLoc[1], currentLoc[0], targetWP.lat, targetWP.lng) * 1000; // Meters

                    // Trigger charge if within 5km (5000m) of the waypoint
                    // CRITICAL FIX: Must match or exceed the "Panic Detection" threshold (3km) 
                    // otherwise we get "Ghost Stops" where the route stops but the graph thinks we missed it.
                    if (distToStop < 5000) {
                        // We are at a waypoint/stop.
                        const targetKwh = vehicle[0].usableCapacityKwh;
                        const currentSoCPercent = (finalBatteryKwh / targetKwh) * 100;

                        // SMART CHARGING: Only charge if we really need it (SoC < 60%)
                        // This prevents "Opportunity Charging" at 80% that ruins the graph/schedule
                        if (currentSoCPercent < 60 && finalBatteryKwh < targetKwh) {
                            const chargeAdded = targetKwh - finalBatteryKwh;
                            finalSegmentData.push({
                                distance: 0,
                                energy: -chargeAdded, // Negative consumption = Charging
                                elevation: el1
                            });
                            finalBatteryKwh = targetKwh;
                        }

                        // Advance to next leg target
                        finalLegIndex++;
                    }
                }
            }
        }

        const finalSoC = (finalBatteryKwh / vehicle[0].usableCapacityKwh) * 100;

        return {
            success: true,
            data: {
                route: geometry,
                distanceKm: route.distance / 1000,
                durationMin: route.duration / 60,
                energyConsumedKwh: totalEnergyConsumed,
                finalSoC: Math.max(0, finalSoC),
                segmentData: finalSegmentData,
                environmentalData: {
                    temperature: weather.main.temp,
                    elevationGain: 0,
                },
                injectedStops: [], // Default to empty if no panic recursion occurred
            },
        };

    } catch (error) {
        console.error("Route calculation error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

function min(a: number, b: number) { return a < b ? a : b; }

function getDistKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
