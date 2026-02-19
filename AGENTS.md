# AGENTS.md - System Instructions for AI Coding Assistant
**Project:** Voltaic MVP - EV Journey Intelligence Platform  
**Version:** 1.0  
**Date:** January 29, 2026  
**Target:** Cursor/Windsurf/Antigravity AI Assistant

---

## 1. PROJECT OVERVIEW

### 1.1 Product Summary

**What We're Building:**  
Voltaic is an EV route planning web application that provides physics-based energy consumption predictions for electric vehicles in India. Unlike Google Maps, Voltaic accounts for:
- **Thermal degradation** (extreme heat >40°C reduces battery performance)
- **Topography** (Western Ghats elevation changes consume significant energy)
- **Vehicle-specific physics** (drag, mass, rolling resistance)
- **Charging infrastructure** (real charger locations with availability)

**Primary User Story:**  
Rajesh owns a Tata Nexon EV and wants to drive from Mumbai to Lonavala (83 km, 600m elevation gain). His dashboard shows 60% charge, but he doesn't know if he'll make it or where to charge. Voltaic calculates:
- Predicted arrival charge: 28% (accounting for uphill climb + heat)
- Trust score: 82% confidence
- Recommended charging stop: Bolt.Earth Lonavala (15 min charge)
- Clear explanation: "Your route climbs 580m. At 32°C, AC will use ~1.2 kW continuously."

**Success Definition:**  
MVP launches when energy consumption predictions are within <10% error of real-world validation drives (20 test routes).

---

### 1.2 Technical Architecture Summary

**Stack:**
- **Frontend:** Next.js 16 (App Router) + React Server Components
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State:** TanStack Query (server state) + Zustand (client state)
- **Database:** Supabase (PostgreSQL + PostGIS)
- **ORM:** Drizzle ORM
- **Maps:** Mapbox GL JS
- **Deployment:** Vercel

**Key Architecture Decisions:**
1. **Server Actions over API Routes** - Type-safe end-to-end, no API drift
2. **Self-hosted OpenElevation** - No rate limits, <100ms latency
3. **PostGIS for spatial queries** - Efficient charger-to-route distance calculations
4. **Session-only state** - No user accounts in MVP (reduces complexity)

**Data Flow (Route Calculation):**
```
User Input → calculateRoute Server Action → 
  ├─ Fetch vehicle parameters (Supabase)
  ├─ Get route geometry (Mapbox API)
  ├─ Fetch elevations (OpenElevation self-hosted)
  ├─ Get weather (OpenWeatherMap API)
  └─ Physics Engine calculates energy per segment
→ Return: { route, energyData, finalSoC, trustScore }
```

---

## 2. DATABASE SCHEMA

### 2.1 Core Tables (Drizzle ORM)

#### Vehicle Models Table
```typescript
export const vehicleModels = pgTable('vehicle_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),                    // "Tata Nexon EV"
  make: text('make').notNull(),                    // "Tata Motors"
  model: text('model').notNull(),                  // "Nexon EV"
  year: integer('year').notNull(),                 // 2024
  
  // Battery
  batteryCapacityKwh: real('battery_capacity_kwh').notNull(),    // 30.2
  usableCapacityKwh: real('usable_capacity_kwh').notNull(),      // 28.5
  
  // Physics parameters
  dragCoefficient: real('drag_coefficient').notNull(),           // 0.33
  frontalAreaM2: real('frontal_area_m2').notNull(),             // 2.3
  massKg: real('mass_kg').notNull(),                            // 1400
  rollingResistance: real('rolling_resistance').notNull(),      // 0.01
  motorEfficiency: real('motor_efficiency').notNull().default(0.90),
  regenEfficiency: real('regen_efficiency').notNull().default(0.70),
  
  // Thermal coefficients
  thermalCoefficientHeat: real('thermal_coefficient_heat').notNull().default(0.015),
  thermalCoefficientCold: real('thermal_coefficient_cold').notNull().default(0.010),
  
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### Charging Stations Table
```typescript
export const chargingStations = pgTable('charging_stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),                                  // "Bolt.Earth - Lonavala"
  location: geography('location', { type: 'point', srid: 4326 }).notNull(), // PostGIS
  address: text('address'),
  city: text('city'),
  state: text('state'),
  
  operator: text('operator').notNull(),                          // "Bolt.Earth"
  operatorId: text('operator_id'),
  
  connectorTypes: jsonb('connector_types').notNull().$type<string[]>(),  // ["CCS2", "CHAdeMO"]
  maxPowerKw: real('max_power_kw').notNull(),                   // 15.0
  numberOfPorts: integer('number_of_ports').notNull().default(1),
  
  pricePerKwh: real('price_per_kwh'),                           // 18.0 (₹)
  pricingModel: text('pricing_model'),                          // "per_kwh"
  
  isOperational: boolean('is_operational').notNull().default(true),
  lastVerified: timestamp('last_verified'),
  
  source: text('source').notNull(),                              // "open_charge_map"
  externalId: text('external_id'),
  
  amenities: jsonb('amenities').$type<string[]>(),              // ["restroom", "cafe"]
  accessNotes: text('access_notes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  locationIdx: index('charging_location_gist_idx').using('gist', table.location),
  operatorIdx: index('charging_operator_idx').on(table.operator),
}));
```

#### Route Calculations (Cache) Table
```typescript
export const routeCalculations = pgTable('route_calculations', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Input parameters
  startLocation: geography('start_location', { type: 'point', srid: 4326 }).notNull(),
  endLocation: geography('end_location', { type: 'point', srid: 4326 }).notNull(),
  vehicleModelId: uuid('vehicle_model_id').notNull().references(() => vehicleModels.id),
  startSoc: real('start_soc').notNull(),                        // 60.0 (%)
  
  // Output data
  routeGeometry: jsonb('route_geometry').notNull().$type<RouteGeometry>(),
  distanceKm: real('distance_km').notNull(),
  energyConsumedKwh: real('energy_consumed_kwh').notNull(),
  finalSoc: real('final_soc').notNull(),
  
  // Energy breakdown
  baseConsumptionKwh: real('base_consumption_kwh').notNull(),
  gradientPenaltyKwh: real('gradient_penalty_kwh').notNull(),
  thermalPenaltyKwh: real('thermal_penalty_kwh').notNull(),
  
  // Trust metrics
  trustScore: real('trust_score').notNull(),                    // 0-100
  confidenceFactors: jsonb('confidence_factors').$type<ConfidenceFactors>(),
  
  // Environmental data
  temperatureCelsius: real('temperature_celsius'),
  elevationGainM: real('elevation_gain_m'),
  elevationLossM: real('elevation_loss_m'),
  
  calculationDurationMs: integer('calculation_duration_ms'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull().default(sql`NOW() + INTERVAL '1 hour'`),
});
```

---

## 3. CORE PHYSICS ENGINE

### 3.1 Physics Calculations (Located in `src/lib/physics/engine.ts`)

**Key Formulas:**

1. **Aerodynamic Drag Force:**
   ```
   F_aero = 0.5 × C_d × A × ρ × v²
   where ρ (air density) = 1.225 kg/m³ at sea level
   ```

2. **Rolling Resistance Force:**
   ```
   F_roll = C_rr × m × g
   where g = 9.81 m/s²
   ```

3. **Gradient Resistance Force:**
   ```
   F_grade = m × g × sin(θ)
   where θ = arctan(elevation_change / distance)
   ```

4. **Segment Energy Consumption:**
   ```
   Energy (kWh) = (F_aero + F_roll + F_grade) × distance / (efficiency × 3600 × 1000)
   ```

5. **Thermal Penalty:**
   ```typescript
   if (temp > 25°C): penalty = (temp - 25) × thermalCoefficientHeat
   if (temp < 15°C): penalty = (15 - temp) × thermalCoefficientCold
   totalEnergy = baseEnergy × (1 + penalty)
   ```

### 3.2 Trust Score Calculation

```typescript
function calculateTrustScore(factors: {
  elevationDataQuality: number;    // 0-1 (1 = high res data)
  weatherDataAge: number;           // hours (0 = real-time)
  routeComplexity: number;          // 0-1 (0 = straight highway)
  trafficDataAvailable: boolean;    // MVP: always false
}): number {
  let score = 100;
  
  // Penalize old weather data
  if (factors.weatherDataAge > 6) score -= 20;
  
  // Penalize low elevation resolution
  if (factors.elevationDataQuality < 0.7) score -= 15;
  
  // Penalize complex routes (many turns, mixed terrain)
  if (factors.routeComplexity > 0.5) score -= 10;
  
  // MVP: no real-time traffic → always reduce by 10
  score -= 10;
  
  return Math.max(0, Math.min(100, score));
}
```

---

## 4. SERVER ACTIONS

### 4.1 calculateRoute Action (Primary User Flow)

**File:** `src/actions/route/calculateRoute.ts`

```typescript
"use server";

import { db } from "@/lib/db/client";
import { vehicleModels } from "@/db/schema";
import { mapboxClient } from "@/lib/external-apis/mapbox";
import { openElevationClient } from "@/lib/external-apis/elevation";
import { openWeatherClient } from "@/lib/external-apis/weather";
import { PhysicsEngine } from "@/lib/physics/engine";
import { z } from "zod";

const calculateRouteSchema = z.object({
  start: z.object({ lat: z.number(), lng: z.number() }),
  end: z.object({ lat: z.number(), lng: z.number() }),
  vehicleId: z.string().uuid(),
  currentSoC: z.number().min(0).max(100),
});

export async function calculateRoute(input: z.infer<typeof calculateRouteSchema>) {
  try {
    // 1. Validate input
    const { start, end, vehicleId, currentSoC } = calculateRouteSchema.parse(input);
    
    // 2. Fetch vehicle parameters from database
    const vehicle = await db
      .select()
      .from(vehicleModels)
      .where(eq(vehicleModels.id, vehicleId))
      .limit(1);
    
    if (!vehicle[0]) {
      return { success: false, error: "Vehicle not found" };
    }
    
    // 3. Fetch route geometry from Mapbox
    const routeResponse = await mapboxClient.getDirections({
      coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
      profile: "driving",
      geometries: "geojson",
    });
    
    if (!routeResponse.routes[0]) {
      return { success: false, error: "No route found" };
    }
    
    const route = routeResponse.routes[0];
    
    // 4. Segment route into 1km chunks
    const segments = segmentPolyline(route.geometry.coordinates, 1000); // 1km segments
    
    // 5. Batch fetch elevations for all segment points
    const elevations = await openElevationClient.getElevations(
      segments.map(seg => ({ lat: seg.coords[0][1], lng: seg.coords[0][0] }))
    );
    
    // 6. Get current weather at route midpoint
    const midpoint = segments[Math.floor(segments.length / 2)].coords[0];
    const weather = await openWeatherClient.getCurrentWeather({
      lat: midpoint[1],
      lon: midpoint[0],
    });
    
    // 7. Initialize physics engine
    const engine = new PhysicsEngine(vehicle[0]);
    
    // 8. Calculate energy for each segment
    const segmentResults = segments.map((segment, i) => {
      const elevationChange = elevations[i + 1] - elevations[i];
      const grade = elevationChange / segment.distance;
      
      const baseEnergy = engine.calculateSegmentEnergy({
        distance: segment.distance,
        grade: grade,
        speed: 80, // km/h (MVP: fixed average speed)
        temperature: weather.main.temp,
      });
      
      return {
        distance: segment.distance,
        energy: baseEnergy,
        elevation: elevations[i],
      };
    });
    
    // 9. Calculate totals
    const totalEnergy = segmentResults.reduce((sum, seg) => sum + seg.energy, 0);
    const availableEnergy = (currentSoC / 100) * vehicle[0].usableCapacityKwh;
    const finalSoC = ((availableEnergy - totalEnergy) / vehicle[0].usableCapacityKwh) * 100;
    
    // 10. Calculate trust score
    const trustScore = calculateTrustScore({
      elevationDataQuality: 0.9, // OpenElevation is high quality
      weatherDataAge: 0, // Real-time
      routeComplexity: calculateRouteComplexity(route.geometry),
      trafficDataAvailable: false,
    });
    
    // 11. Return results
    return {
      success: true,
      data: {
        route: route.geometry,
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        energyConsumedKwh: totalEnergy,
        finalSoC: Math.max(0, finalSoC),
        trustScore,
        segmentData: segmentResults,
        breakdown: {
          baseConsumption: totalEnergy * 0.7, // Approximate split
          gradientPenalty: totalEnergy * 0.2,
          thermalPenalty: totalEnergy * 0.1,
        },
        environmentalData: {
          temperature: weather.main.temp,
          elevationGain: Math.max(...elevations) - Math.min(...elevations),
        },
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
```

### 4.2 findChargersOnRoute Action

**File:** `src/actions/charging/findChargersOnRoute.ts`

```typescript
"use server";

import { db } from "@/lib/db/client";
import { chargingStations } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function findChargersOnRoute(params: {
  routeGeometry: GeoJSON.LineString;
  corridorWidthKm: number; // Default: 10km
}) {
  // Use PostGIS to find chargers within corridor
  const chargers = await db
    .select()
    .from(chargingStations)
    .where(
      sql`ST_DWithin(
        ${chargingStations.location}::geography,
        ST_GeomFromGeoJSON(${JSON.stringify(params.routeGeometry)})::geography,
        ${params.corridorWidthKm * 1000}
      )`
    )
    .where(eq(chargingStations.isOperational, true));
  
  return {
    success: true,
    data: chargers,
  };
}
```

---

## 5. FRONTEND & UI/UX STANDARDS

### UI/UX & ARCHITECTURE STANDARDS (SENIOR BAR)

**Goal:** Build a production-ready, senior-level data dashboard web app that is calm, clear, and fast. This is a tool interface, not a marketing page.

#### 5.1 App Architecture Requirements

* **Single Source of Truth:** Use a single source of truth for data (API/database). The UI reads from query cache, not random component state.
* **State Separation:**
  * Server state: TanStack Query
  * UI state: Local component state (Zustand/Context)
  * Form state: React Hook Form
* **Next.js Patterns:**
  * Use `/app/(dashboard)/layout.tsx` with a persistent sidebar.
  * Implement route-level loading and error boundaries.
  * Use Server Components for initial data fetching and Client Components for interactivity.

#### 5.2 Design Frameworks (Non-negotiable)

* **Information Architecture (IA):** Organize by user goals/decisions, not by features.
* **Cognitive Load Reduction:** Reduce visual noise; make scanning effortless.
* **Progressive Disclosure:** Default view is simple; advanced controls appear only when needed.
* **Perceived Performance:** UI should feel instant via optimistic updates, skeletons, and non-blocking interactions.

#### 5.3 Layout & Hierarchy

* Strict grid; consistent spacing scale.
* Main content dominates; navigation is visually quiet.
* No oversized logos/banners. This is a tool.

#### 5.4 Color & Token System

* Neutral base + **one accent** used only for primary actions/highlights.
* System colors:
  * red = error/destructive
  * green = success
* Contrast must be readable. Never use color as the only indicator.

#### 5.5 Navigation

* Persistent left sidebar:
  * grouped links
  * clear active state
  * settings/logout at bottom
* Top bar only for global page actions + global search (optional).

#### 5.6 Tables (Core Dashboard Utility)

Use TanStack Table features:
* Search + filters + sort
* Pagination (client or server)
* Row selection with bulk actions (selection reveals contextual toolbar)
* Column visibility + responsive columns

#### 5.7 Charts (Keep them Functional)

* Only line and bar charts.
* Always include axes, labels, values, gridlines.
* Tooltips on hover.
* Choose chart approach:
  * Use **Recharts** for simple "business dashboards"
  * Use **ECharts** if dataset is large/high-frequency updates
* Prefer functional clarity over fancy visuals.

#### 5.8 Interaction Patterns (Radix-backed)

* **Popover** for small, non-blocking actions (display options, quick filters).
* **Dialog/Modal** for complex or blocking flows (create/edit item).
* **Toast notifications** for success/error/warning.
* **Optimistic UI** for common mutations:
  * immediate UI update, rollback on failure
  * use TanStack Query optimistic updates or React's useOptimistic pattern

#### 5.9 States & Trust (Must be designed)

For every data region/component, implement:
* Loading (skeletons)
* Empty state (clear CTA)
* Error state (recoverable, retry)
* Success confirmation (toasts)

Users should never wonder "did that work?"

#### 5.10 Data Layer Requirements (Be Explicit)

Define:
* Data entities (e.g., Users, Projects, Links, Events, Metrics)
* Which endpoints power which cards/tables/charts
* Refresh strategy:
  * polling vs websocket vs manual refresh
* Caching rules:
  * stale time, refetch on focus, invalidation on mutation (TanStack Query)

#### 5.11 Security & "Responsible App" Defaults

* Enforce RBAC/permissions server-side (not just UI hiding).
* Validate all inputs with Zod on server.
* Avoid exposing secrets to client.
* Add basic audit logging hooks for key actions (create/update/delete).
* Follow OWASP Top 10 mindset: secure defaults, least privilege, safe error handling.

---

## 6. IMPLEMENTATION DELIVERABLES

### 6.1 What you must output

1. **A working Next.js dashboard app scaffold:**
   * routes, layout, sidebar, top actions

2. **One "Dashboard Overview" page with:**
   * KPI cards
   * a table with filtering/sorting/selection + bulk actions
   * a line chart + bar chart

3. **A "Create/Edit" flow:**
   * modal dialog form with validation + toast + optimistic update

4. **Fully implemented loading/empty/error states**

5. **Clean, consistent component patterns and tokens**

### 6.2 Final Quality Gate

* Understandable in **<10 seconds**
* Calm, professional, data-first
* Accessible keyboard navigation (Radix primitives help here)
* Fast-feeling interactions (optimistic updates + good loading UX)

---

## 7. VOLTAIC-SPECIFIC UI COMPONENTS

### 7.1 Route Planner Page (`/app/plan/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [Logo] Voltaic         [User Menu]  [Help] │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Vehicle Selector │  │ Current SoC     │ │
│  │ Tata Nexon EV ▼  │  │ [=====>    ] 60%│ │
│  └──────────────────┘  └─────────────────┘ │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Start: Mumbai, Powai              📍 │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ End: Lonavala Lake                📍 │  │
│  └──────────────────────────────────────┘  │
│                                             │
│        [Calculate Route] (Primary CTA)      │
│                                             │
└─────────────────────────────────────────────┘
```

### 7.2 Results Display

**Energy Breakdown Card:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Energy Consumption</CardTitle>
    <CardDescription>Breakdown for your route</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between mb-2">
          <span>Current: 60%</span>
          <span>Arrival: 28%</span>
        </div>
        <Progress value={28} max={60} />
      </div>
      
      {/* Energy Details */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base consumption</span>
          <span className="font-medium">10.2 kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gradient penalty</span>
          <span className="font-medium text-orange-600">+2.8 kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Thermal penalty (32°C)</span>
          <span className="font-medium text-red-600">+1.1 kWh</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>14.1 kWh</span>
        </div>
      </div>
      
      {/* Trust Score Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="success">High Confidence</Badge>
        <span className="text-sm text-muted-foreground">82%</span>
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            Based on: Real-time weather, high-res elevation data, conservative estimates
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </CardContent>
</Card>
```

**Warning Banner (Conditional):**
```typescript
{finalSoC < 30 && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Low arrival charge predicted</AlertTitle>
    <AlertDescription>
      Your arrival charge is below 30%. Consider adding a charging stop.
      <Button variant="link" onClick={showChargers}>
        Show charging options →
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 7.3 Map Visualization

**Use Mapbox GL JS:**
```typescript
"use client";

import Map, { Source, Layer } from "react-map-gl";
import { useEffect } from "react";

export function RouteMap({ routeGeometry, chargers, segmentData }) {
  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 73.0,
        latitude: 19.0,
        zoom: 10,
      }}
      style={{ width: "100%", height: "600px" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {/* Route Line - Colored by energy consumption */}
      <Source id="route" type="geojson" data={routeGeometry}>
        <Layer
          id="route-line"
          type="line"
          paint={{
            "line-color": [
              "interpolate",
              ["linear"],
              ["get", "energyIntensity"],
              0, "#22c55e", // Green (low consumption)
              0.5, "#eab308", // Yellow (medium)
              1, "#ef4444", // Red (high consumption)
            ],
            "line-width": 6,
          }}
        />
      </Source>
      
      {/* Charger Markers */}
      {chargers.map((charger) => (
        <Marker
          key={charger.id}
          longitude={charger.location.coordinates[0]}
          latitude={charger.location.coordinates[1]}
          onClick={() => showChargerDetails(charger)}
        >
          <div className="bg-blue-600 rounded-full p-2">
            <Zap className="h-4 w-4 text-white" />
          </div>
        </Marker>
      ))}
    </Map>
  );
}
```

---

## 8. CACHING & PERFORMANCE

### 8.1 TanStack Query Setup

**File:** `src/app/providers.tsx`

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 8.2 Query Hooks

**File:** `src/hooks/useRouteCalculation.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { calculateRoute } from "@/actions/route/calculateRoute";
import { toast } from "sonner";

export function useRouteCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calculateRoute,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Route calculated successfully");
        // Cache the result
        queryClient.setQueryData(["route", data.data], data.data);
      } else {
        toast.error(data.error || "Failed to calculate route");
      }
    },
    onError: (error) => {
      toast.error("Network error. Please try again.");
      console.error(error);
    },
  });
}
```

---

## 9. ERROR HANDLING & LOADING STATES

### 9.1 Error Boundaries

**File:** `src/app/plan/error.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message || "An unexpected error occurred"}
        </AlertDescription>
        <Button onClick={reset} variant="outline" className="mt-4">
          Try again
        </Button>
      </Alert>
    </div>
  );
}
```

### 9.2 Loading States

**File:** `src/app/plan/loading.tsx`

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[600px] w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
```

### 9.3 Empty States

```typescript
<Card>
  <CardContent className="flex flex-col items-center justify-center py-12">
    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium mb-2">No route calculated</h3>
    <p className="text-muted-foreground text-center mb-4">
      Enter a start and end location to calculate your EV journey
    </p>
    <Button>Get started</Button>
  </CardContent>
</Card>
```

---

## 10. TESTING REQUIREMENTS

### 10.1 Unit Tests (Physics Functions)

**File:** `src/lib/physics/__tests__/engine.test.ts`

```typescript
import { PhysicsEngine } from "../engine";
import { describe, it, expect } from "vitest";

describe("PhysicsEngine", () => {
  const testVehicle = {
    batteryCapacityKwh: 30.2,
    dragCoefficient: 0.33,
    frontalAreaM2: 2.3,
    massKg: 1400,
    rollingResistance: 0.01,
    motorEfficiency: 0.90,
  };

  const engine = new PhysicsEngine(testVehicle);

  it("calculates aerodynamic force correctly", () => {
    const force = engine.calculateAeroForce(80); // 80 km/h
    expect(force).toBeCloseTo(156.7, 1); // Expected value from formula
  });

  it("calculates rolling resistance correctly", () => {
    const force = engine.calculateRollingResistance();
    expect(force).toBeCloseTo(137.3, 1); // m × g × C_rr
  });

  it("calculates gradient force for uphill", () => {
    const force = engine.calculateGradeForce(0.05); // 5% grade
    expect(force).toBeGreaterThan(0);
  });

  it("applies regenerative braking for downhill", () => {
    const energy = engine.calculateSegmentEnergy({
      distance: 1000,
      grade: -0.05, // Downhill
      speed: 60,
      temperature: 25,
    });
    expect(energy).toBeLessThan(0); // Negative = energy recovered
  });

  it("applies thermal penalty correctly", () => {
    const energyHot = engine.calculateSegmentEnergy({
      distance: 1000,
      grade: 0,
      speed: 80,
      temperature: 40, // Hot day
    });
    
    const energyNormal = engine.calculateSegmentEnergy({
      distance: 1000,
      grade: 0,
      speed: 80,
      temperature: 25, // Normal day
    });
    
    expect(energyHot).toBeGreaterThan(energyNormal);
  });
});
```

### 10.2 Integration Tests (Server Actions)

**File:** `src/actions/route/__tests__/calculateRoute.test.ts`

```typescript
import { calculateRoute } from "../calculateRoute";
import { db } from "@/lib/db/client";
import { describe, it, expect, beforeAll } from "vitest";

describe("calculateRoute integration", () => {
  beforeAll(async () => {
    // Seed test vehicle
    await seedTestVehicle();
  });

  it("calculates Mumbai-Lonavala route successfully", async () => {
    const result = await calculateRoute({
      start: { lat: 19.0760, lng: 72.8777 }, // Mumbai
      end: { lat: 18.7529, lng: 73.4074 },   // Lonavala
      vehicleId: TEST_VEHICLE_ID,
      currentSoC: 80,
    });

    expect(result.success).toBe(true);
    expect(result.data?.distanceKm).toBeGreaterThan(80);
    expect(result.data?.finalSoC).toBeLessThan(80);
    expect(result.data?.trustScore).toBeGreaterThan(0);
  });

  it("handles invalid vehicle ID gracefully", async () => {
    const result = await calculateRoute({
      start: { lat: 19.0760, lng: 72.8777 },
      end: { lat: 18.7529, lng: 73.4074 },
      vehicleId: "invalid-uuid",
      currentSoC: 80,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Vehicle not found");
  });
});
```

---

## 11. DEPLOYMENT CHECKLIST

### 11.1 Environment Variables

**File:** `.env.example`

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For migrations

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."

# External APIs
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.xxx"
OPENWEATHER_API_KEY="xxx"
OPEN_ELEVATION_URL="http://localhost:8080"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
VERCEL_ANALYTICS_ID="xxx"

# Environment
NODE_ENV="development"
```

### 11.2 Pre-Launch Verification

**Run this checklist before deploying:**

- [ ] All environment variables set in Vercel
- [ ] Database migrations run on production
- [ ] Seed data loaded (8+ vehicles, 500+ chargers)
- [ ] OpenElevation service deployed and accessible
- [ ] API rate limits configured (OpenWeather: 1000/day)
- [ ] Error tracking active (Sentry)
- [ ] Analytics configured (Vercel Analytics)
- [ ] Lighthouse score >90 (Performance, Accessibility, Best Practices)
- [ ] Mobile responsive tested (360px, 375px, 414px widths)
- [ ] Error boundaries tested (force errors in dev)
- [ ] Loading states visible (throttle network in DevTools)
- [ ] TypeScript build passes with zero errors
- [ ] Unit tests pass (80%+ coverage on physics)
- [ ] Integration tests pass (calculateRoute scenarios)

---

## 12. CRITICAL DEVELOPMENT RULES

### 12.1 Code Quality Standards

1. **TypeScript Strict Mode:** NO `any` types allowed
2. **Error Handling:** EVERY async function must have try-catch
3. **Validation:** ALL user inputs validated with Zod on server
4. **Accessibility:** ALL interactive elements keyboard-accessible
5. **Performance:** Route calculation must complete in <5 seconds (p95)

### 12.2 Git Commit Conventions

```
feat: Add vehicle selection dropdown
fix: Correct thermal penalty calculation
perf: Optimize elevation batch fetching
docs: Update README with deployment steps
test: Add unit tests for physics engine
```

### 12.3 File Naming Conventions

- **Components:** PascalCase (`RouteMap.tsx`)
- **Actions:** camelCase (`calculateRoute.ts`)
- **Hooks:** camelCase with `use` prefix (`useRouteCalculation.ts`)
- **Utils:** camelCase (`formatEnergy.ts`)
- **Constants:** UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

---

## 13. QUICK REFERENCE: COMMON TASKS

### 13.1 Add a New Vehicle Model

```typescript
// 1. Add to seed script (scripts/seed-database.ts)
await db.insert(vehicleModels).values({
  name: "MG ZS EV",
  make: "MG Motor",
  model: "ZS EV",
  year: 2024,
  batteryCapacityKwh: 44.5,
  usableCapacityKwh: 42.0,
  dragCoefficient: 0.35,
  frontalAreaM2: 2.5,
  massKg: 1600,
  rollingResistance: 0.011,
});

// 2. Run seed script
npm run db:seed
```

### 13.2 Add a Charging Station

```typescript
await db.insert(chargingStations).values({
  name: "Tata Power - Mumbai-Pune Expressway",
  location: sql`ST_GeographyFromText('POINT(73.5 18.9)')`,
  operator: "Tata Power",
  connectorTypes: ["CCS2", "Type 2"],
  maxPowerKw: 50.0,
  pricePerKwh: 15.0,
  isOperational: true,
  source: "manual",
});
```

### 13.3 Run Validation Drive Test

```typescript
// Create validation script (scripts/validate-route.ts)
const result = await calculateRoute({
  start: { lat: 19.0760, lng: 72.8777 },
  end: { lat: 18.7529, lng: 73.4074 },
  vehicleId: NEXON_EV_ID,
  currentSoC: 80,
});

console.log("Predicted final SoC:", result.data.finalSoC);
// Drive the route and compare actual vs predicted
```

---

## 14. MVP SCOPE BOUNDARIES

### ✅ IN SCOPE (Must Build)

- Vehicle selection (8-10 models)
- Route planning with energy calculation
- Physics-based consumption model
- Thermal adjustments
- Elevation-based calculations
- Charging station display on map
- Trust score calculation
- Basic error handling
- Responsive mobile UI

### ❌ OUT OF SCOPE (Phase 2)

- User accounts / login
- Saved routes
- Route history
- Real-time traffic integration
- Live charger availability
- AI/ML predictions
- Turn-by-turn navigation
- Mobile native app
- Social sharing
- Multi-stop routes
- Alternative route suggestions
- Driving style customization
- Weather alerts
- Community features

---

## 15. EMERGENCY CONTACTS & ESCALATION

**If stuck for >2 hours:**
1. Document the blocker (error messages, steps to reproduce)
2. Check these resources:
   - Next.js 15 docs: https://nextjs.org/docs
   - Drizzle ORM docs: https://orm.drizzle.team
   - TanStack Query docs: https://tanstack.com/query
   - Mapbox GL JS docs: https://docs.mapbox.com/mapbox-gl-js
3. Search GitHub issues for similar problems
4. Escalate to Product Owner if blocker is critical

**Common Issues:**
- **PostGIS not enabled:** Run `CREATE EXTENSION postgis;` in Supabase SQL editor
- **Mapbox 401 error:** Verify token has Directions API enabled
- **OpenElevation timeout:** Check service is running: `curl http://localhost:8080/api/v1/lookup?locations=19,72`
- **Route calculation slow:** Check if elevation batch size is too large (max 100 points/request)

---

## 16. SUCCESS METRICS (Track in Dashboard)

**Week 1-2 Post-Launch:**
- Routes calculated per day
- Average calculation time
- Error rate (%)
- Lighthouse Performance score
- User feedback (NPS)

**Primary KPI:**
- **Mean Absolute Error (MAE):** <10% deviation from actual drives

**How to Calculate MAE:**
```typescript
// After 20 validation drives:
const predictions = [28, 35, 42, ...]; // Predicted final SoC
const actuals = [26, 37, 40, ...];     // Actual final SoC

const mae = predictions.reduce((sum, pred, i) => {
  return sum + Math.abs(pred - actuals[i]);
}, 0) / predictions.length;

console.log("MAE:", mae, "%");
// Goal: MAE < 10%
```

---

## 17. FINAL REMINDERS

**Before you start coding:**
1. Read this document twice
2. Set up all API keys
3. Verify database connection
4. Run `npm install` and ensure no errors
5. Create a branch: `git checkout -b feature/route-planner`

**While coding:**
1. Commit frequently (every feature/fix)
2. Test in browser after each component
3. Check mobile view (DevTools responsive mode)
4. Run TypeScript check: `npm run type-check`
5. Use React DevTools + TanStack Query DevTools

**Before submitting:**
1. Run full test suite: `npm test`
2. Check Lighthouse score: `npm run build && npm start`
3. Verify all acceptance criteria from PRD
4. Document any deviations from spec
5. Record demo video (Loom/QuickTime)

---

**YOU ARE NOW READY TO BUILD VOLTAIC MVP.**

This document is your single source of truth. When in doubt, refer back here. Good luck! 🚗⚡
