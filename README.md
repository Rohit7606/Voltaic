# Voltaic — EV Journey Intelligence Platform ⚡

<img width="1920" height="1280" alt="Image" src="https://github.com/user-attachments/assets/7c830707-4907-4659-8b48-73465a8957e9" />

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgis.net/)
[![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)](https://mapbox.com/)
[![Status](https://img.shields.io/badge/Status-MVP%20Complete-brightgreen?style=for-the-badge)](https://github.com/)

> **⚠️ Disclaimer:** Voltaic is a research and academic project. Range predictions are estimates derived from physics models and should not be solely relied upon for real-world trip planning. Always verify charging availability before long-distance EV journeys.

---

## Problem Statement

- **The ARAI Gap:** India's ARAI-certified EV ranges are measured under ideal lab conditions — flat surface, 23°C, no AC, constant speed. Real-world Indian roads deviate dramatically, with drivers experiencing **30–40% less range** than the certified figure in practice.

- **Navigation Blind Spots:** Generic apps like Google Maps and Apple Maps are fundamentally blind to the physics of electric mobility. They cannot account for elevation change, thermal battery degradation, or connector compatibility — the three factors that most impact EV range in India.

- **Range Anxiety:** The fear of running out of charge mid-journey is the single largest psychological barrier to EV adoption in India, especially for intercity travel across terrain like the Western Ghats and Nilgiri Hills.

- **No India-First Tooling:** Existing EV routing tools are built for western markets. They ignore India-specific realities — extreme summer heat (>40°C), state-wise electricity tariff variations, and the specific EV models dominating the Indian market (Tata, MG, Mahindra).

- There is a critical need for a **purpose-built Journey Intelligence Platform** that treats every EV route as a physics problem and delivers transparent, explainable, confidence-scored predictions.

---

## Project Objective

**Voltaic** is an advanced EV Journey Intelligence Platform engineered to eliminate range anxiety for Indian EV owners through physics-backed, context-aware route predictions.

The platform aims to:
- **Physics-Based Energy Prediction:** Calculate aerodynamic drag, rolling resistance, gradient forces, and thermal penalties for every 5km segment of any route — no machine learning, pure Newtonian mechanics.
- **Trust Score™:** Provide a proprietary 0–100% confidence score that tells users *how reliable* a prediction is and *why*, based on data quality factors like weather staleness and elevation resolution.
- **Recursive Auto-Rescue Algorithm:** Automatically detect when SoC will drop below 25% mid-route and inject optimal charging stops using an A*-inspired heuristic — recursively re-simulating until the route is safe.
- **State-Wise Economics Engine:** Compare EV running costs against ICE vehicles using accurate electricity tariff data from all 22 Indian states, with CO₂ avoidance quantification per trip.
- **Vehicle Comparison Garage:** Side-by-side comparison of 12 popular Indian-market EVs using real-world (not ARAI) range data, with full physics parameter profiles.

---

## Sustainable Development Goals (SDGs)

This project aligns with the following United Nations Sustainable Development Goals:

### SDG 7: Affordable and Clean Energy
- **Target 7.3:** Voltaic's Economics dashboard explicitly quantifies savings from home vs. public charging, encouraging off-peak home charging (cleaner, cheaper grid power) and optimizing how Indians consume EV energy.

### SDG 9: Industry, Innovation and Infrastructure
- **Target 9.5:** Voltaic is a first-of-its-kind physics engine for EV mobility in India. It also maps and rates India's emerging charging infrastructure across 2,400+ stations, contributing directly to infrastructure transparency and reliability.

### SDG 11: Sustainable Cities and Communities
- **Target 11.6:** By making long-distance EV travel predictable and stress-free, Voltaic accelerates the shift away from fossil-fuel vehicles in Indian cities, directly reducing urban air pollution and transport-related emissions.

### SDG 12: Responsible Consumption and Production
- **Target 12.8:** The Economics page provides exact CO₂ avoidance calculations per trip, per month, and per year — making the environmental impact of EV ownership tangible and personal, promoting informed consumption decisions.

### SDG 13: Climate Action
- **Target 13.3:** Every trip planned through Voltaic is a trip taken in an electric vehicle instead of a petrol/diesel one. The platform quantifies this contribution to climate action at the individual level, making it visible and motivating.

---

## Proposed Solution

Voltaic uses a **"Journey Intelligence Platform" Architecture**. Unlike generic navigation apps that treat all vehicles as ICE, Voltaic models every route as a physics problem, segmenting it into 5km chunks and applying first-principles mechanics at each step.

### Architecture & Workflow:

*High-level system architecture showing data flow from user input to physics-backed route intelligence*

<img width="1693" height="929" alt="Image" src="https://github.com/user-attachments/assets/53eeb882-a336-46e0-8e93-7b2b333c8034" />

1. **Journey Input:** User enters origin, destination, current vehicle, and battery State of Charge (SoC %). The Mapbox Geocoding API resolves location names to coordinates.
2. **Route Geometry:** The Mapbox Directions API fetches the full GeoJSON route polyline, segmented into uniform 5km chunks for physics analysis.
3. **Environmental Data Layer:** Elevation data is resolved via a two-tier cache (L1 in-memory → L2 PostgreSQL). Live weather (temperature, wind, rain) is fetched from OpenWeatherMap at the route midpoint.
4. **Physics Engine:** For each segment, four forces are calculated — aerodynamic drag, rolling resistance, gradient resistance, and thermal penalty — producing a per-segment energy consumption in kWh.
5. **Auto-Rescue Intervention:**
    - **Green Route:** SoC remains above 25% throughout — route returned as safe.
    - **Panic Point Detected:** SoC drops below 25% — the algorithm finds the nearest high-power charger, injects it as a waypoint, and recursively re-simulates up to 5 times.
6. **Trust Score Calculation:** A confidence score (0–100%) is computed by penalizing for stale weather data, low-resolution elevation, and complex route geometry — making the prediction transparent, not a black box.
7. **Journey Intelligence Report:** Results are rendered on an interactive Mapbox map with an elevation profile chart, energy breakdown card, charger popups with reliability scores, and a color-coded Trust Score badge (Green ≥70% / Orange 40–70% / Red <40%).

---

## 🛠️ Technologies Used

### **Frontend Stack**
- **Framework:** Next.js 16.1.6 (App Router with React Server Components)
- **Language:** TypeScript 5.x
- **UI Library:** shadcn/ui (Radix UI Primitives)
- **Styling:** TailwindCSS v4 (Zero-Runtime CSS)
- **Animations:** Framer Motion (spring physics, layout transitions)
- **Maps:** Mapbox GL JS + react-map-gl
- **Data Visualization:** Recharts (Elevation profiles, Energy breakdown charts, Economics comparisons)
- **State Management:** TanStack Query (server state) + Zustand

### **Backend & Database Stack**
- **Database:** Supabase (PostgreSQL + PostGIS extension)
- **ORM:** Drizzle ORM (type-safe SQL queries + migrations)
- **Validation:** Zod V3 (runtime input validation for Server Actions)
- **Authentication:** Supabase Auth + @supabase/ssr (cookie-based server-side sessions)
- **API Architecture:** Next.js Server Actions (zero API drift, end-to-end TypeScript safety)

### **External API Integrations**
- **Mapbox Directions API:** Route geometry, distance, and duration
- **Mapbox Geocoding API:** Place name → coordinate resolution
- **Open-Meteo Elevation API:** Altitude data for route segments (PostgreSQL-cached)
- **OpenWeatherMap API:** Real-time temperature, wind speed, and rainfall per route

### **Physics Engine**
- **Approach:** Deterministic Newtonian mechanics — no ML models, no GPU inference
- **Model:** 4-force physics model (Aero drag + Rolling resistance + Gradient + Thermal penalty)
- **Segmentation:** 5km route chunks (100 segments for a 500km route, not 5,000)
- **Caching:** Two-tier elevation cache achieves Zero-API Runs for most Indian highway routes

---

## 📸 System Visuals

### 1. Economics & TCO Dashboard
*State-wise electricity tariff comparison, animated monthly savings KPI cards, CO₂ avoidance metrics, and a breakeven period calculator — EV vs. ICE, per state, per vehicle.*

<img width="1920" height="1280" alt="Image" src="https://github.com/user-attachments/assets/03c9536f-e3d0-4b6b-8c79-dc395d45d700" />

### 2. Elevation Profile & Energy Consumption Chart
*A Recharts area chart overlaying altitude vs. distance with segment-by-segment energy consumption — visualizing exactly where the Western Ghats or a steep highway ramp costs the battery.*

<img width="1920" height="1280" alt="Image" src="https://github.com/user-attachments/assets/fc936e48-cc11-42b3-a2e1-fbf7bda0bafa" />

### 3. EV Comparison Garage
*Head-to-head comparison of up to 3 Indian-market EVs — real-world range vs. ARAI range, battery specs, charging speeds, and pricing. Cloud-synced for authenticated users.*

<img width="1920" height="1280" alt="Image" src="https://github.com/user-attachments/assets/c69789a9-f077-4561-aa88-5646d9daa726" />



---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ and npm/pnpm
- A Supabase project (for database + auth)
- Mapbox account (for routing + geocoding tokens)
- OpenWeatherMap API key

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/voltaic.git
cd voltaic/web
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Set Up Environment Variables
Create a `.env.local` file in the root of `apps/web`:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_supabase_postgres_url
OPENWEATHER_API_KEY=your_openweathermap_key
OPEN_ELEVATION_URL=https://api.open-meteo.com
```

### 4. Run the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

---

## 📊 Project Status

| Domain | Status | Notes |
|:-------|:-------|:------|
| **Route Planner** | ✅ **Complete** | Physics engine, Auto-Rescue, Trust Score live |
| **Physics Engine** | ✅ **Stable** | 4-force Newtonian model with thermal penalties |
| **Database** | ✅ **Active** | 12 vehicle profiles, 2,400+ charging stations seeded |
| **Authentication** | ✅ **Secure** | Supabase OAuth (GitHub) + server-side sessions |
| **EV Garage** | ✅ **Complete** | 12 Indian-market EVs with cloud sync |
| **Economics Engine** | ✅ **Complete** | 22 Indian states with real tariff data |
| **PWA** | ✅ **Active** | Installable, offline-capable, mobile-optimized |
| **Saved Routes** | 🔄 **In Progress** | Roadmap Phase 3 |
| **Vercel Deployment** | 🔄 **In Progress** | CI/CD pipeline pending |

---

## ⚙️ Physics Engine Methodology

Voltaic computes energy consumption deterministically — no machine learning, just physics. For every 5km route segment, four forces are resolved:

**1. Aerodynamic Drag Force**
```
F_aero = 0.5 × Cd × A × ρ × v_relative²
```
Where `Cd` is the vehicle's drag coefficient, `A` is frontal area (m²), `ρ` is air density (1.225 kg/m³), and `v_relative` includes headwind speed.

**2. Rolling Resistance Force**
```
F_roll = Crr × m × g × rain_multiplier
```
The `rain_multiplier` scales from 1.0 (dry) to 1.5 (heavy rain) using live weather data.

**3. Gradient Resistance Force**
```
F_grade = m × g × sin(arctan(elevation_change / horizontal_distance))
```
A negative grade enables regenerative braking energy recovery at `regen_efficiency`.

**4. Total Energy Per Segment**
```
If F_total > 0:  Energy = (F_total × distance) / motor_efficiency      [consumption]
If F_total < 0:  Energy = (F_total × distance) × regen_efficiency       [recovery]

Final Energy (kWh) = Energy (Joules) / 3,600,000
```

**Thermal Penalty Model**
```
If temperature > 25°C:  penalty = (temp − 25) × thermal_coefficient_heat
If temperature < 15°C:  penalty = (15 − temp) × thermal_coefficient_cold

Final Energy = Base Energy × (1 + penalty)
```

This ensures that driving a Tata Nexon EV through Rajasthan in 44°C heat is correctly modeled as significantly more expensive than the same route in October.

---

## 🎯 Key Features

- ✅ **Physics-Based Route Simulation:** Computes real energy cost per segment using aerodynamic, rolling, gradient, and thermal force models
- ✅ **Trust Score™:** Proprietary 0–100% confidence metric explaining prediction reliability — no black-box outputs
- ✅ **Recursive Auto-Rescue:** A*-inspired algorithm that auto-injects optimal charging stops when SoC < 25%, recursively re-simulating up to 5 times
- ✅ **Smart Panic Suppression:** Prevents false alarm cascading when vehicle is already en route to a planned charger
- ✅ **Zero-API Elevation Cache:** Two-tier (in-memory + PostgreSQL) caching with linear interpolation achieves zero external calls for most Indian highway routes
- ✅ **State-Wise Economics Engine:** Accurate home vs. public charging costs across 22 Indian states with CO₂ avoidance quantification
- ✅ **Intelligent Charger Rating:** Scores each charger (0–100) on operational status, power output, and network reputation — "Recommended" badges for top scorers
- ✅ **EV Comparison Garage:** 12 Indian-market EVs with real-world range data, cloud-synced for authenticated users
- ✅ **Progressive Web App:** Fully installable on mobile, offline-capable with a service worker
- ✅ **Green AI Design:** Pure deterministic physics — no GPU inference, no model training, no AI API calls

---

<p align="center">
  <strong>Eliminating Range Anxiety. Accelerating India's EV Future.</strong><br>
  Built with ❤️ by Rohit!
</p>
