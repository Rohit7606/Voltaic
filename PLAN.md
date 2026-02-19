# PLAN.md - Master Squad Ledger 📘

## 🎯 The Vision
Transforming **Voltaic** from a basic EV route calculator into a **commercial-grade, cockpit-style route planning suite** that rivals Tesla/Rivian in-car navigation.

---

## 💎 Phase 1: The Foundation (Completed)
**Key Architecture Decisions:**
1. **Server Actions over API Routes** - Type-safe end-to-end, no API drift
2. **Self-hosted OpenElevation** - No rate limits, <100ms latency
3. **PostGIS for spatial queries** - Efficient charger-to-route distance calculations
4. **Session-only state** - No user accounts in MVP (reduces complexity)
5. **Zero-Cost Simulation Strategy (Fleet)**:
    *   **Concept**: "Demo Mode" Logic.
    *   **Implementation**: No complex CRUD for vehicles. The "Fleet" is a client-side simulation running on pre-seeded data.
    *   **Benefit**: Zero database writes, zero auth complexity, looks "Enterprise" for ₹0.

---

## 🚀 Phase 4: "The Intelligence Layer" (CURRENT)
**Goal:** Prove the "Smart" in "Smart Routing".

### 1. Robustness & Verification ("The Nerd") 🤓
*   [x] **Physics Stress Test**: Simulate "Chennai to Ooty" (Steep climb) to validate battery drain vs elevation math.
*   [ ] **Charger Search Engine**: Full-page search with map/list split view.
*   [ ] **Realistic Seed Data**: Populate DB with 50+ high-fidelity chargers (Tata Power, Zeon, Jio-bp) along Mumbai-Pune corridor.

### 2. Smart Auto-Routing ("The Brain") 🧠
*   [ ] **Auto-Charger Injection**: Algorithm to automatically insert charging stops when `SoC < 10%`.
*   [ ] **Charging Strategy**: "Charge 15 mins at Zeon Vellore to reach Chennai with 20%".
*   [ ] **Waypoint Logic**: Update routing engine to handle A -> B -> C navigation.
*   [x] **Add Stop UI**: Functional "Add Stop" button in Planner.

### 3. Real Terrain Data 🏔️
*   [x] **OpenElevation API Integration**: Replace mock hill data with real satellite altitude data.

---

## 🚀 Phase 2: "The Elevation" (CURRENT)
**Goal:** Add "Soul" and "Wow Factor" – moving from Project to Product.

### 1. Visual Immersion 🏙️
*   [ ] **3D Terrain & Buildings**: Enable Mapbox 3D layer for realistic city/highway views.
*   [ ] **Animated Route Flow**: "Ant-march" animations to show direction and speed.
*   [ ] **Cinematic Camera**: Auto-pitch and bearing adjustments during route preview.

### 2. Data Depth & Analytics 📊
*   [ ] **Elevation Profile**: Interactive area chart showing altitude changes along the route.
*   [x] **Live Dashboard**: Replace static placeholders with a "Real-time Fleet Simulation" (Active users on map).
*   [x] **Smart Charts**: Energy consumption vs. Distance graphs using `recharts`.

### 3. Smart Enhancements 🌤️
*   [ ] **Weather Overlay**: Live wind/rain layers affecting range predictions.
*   [ ] **Intelligent Charger Rating**: "Recommended" badges based on charger reliability/speed.

---

## 🌍 Phase 3: Production & Scale (Future)
**Goal:** Real users, real accounts, real world.

### 1. User Systems 👤
*   [ ] **Authentication**: Supabase Auth (Google/GitHub/Email).
*   [ ] **Garage**: Implementation of "My Vehicles" to save custom configs.
*   [ ] **Saved Routes**: History and favorites.

### 2. Mobile & PWA 📱
*   [ ] **Touch Optimization**: Bottom-sheet UI for mobile users.
*   [ ] **Installable PWA**: Offline capabilities and home-screen icon.

### 3. Deployment ☁️
*   [ ] **Vercel Production**: CI/CD pipeline.
*   [ ] **Supabase Hardening**: RLS policies and production database scaling.

---

## 📍 Current Squad Status
**Active Phase:** Phase 2 (Elevation)
**Focus:** 3D Maps & Elevation Charts
**Squad Mode:** WAR ROOM (High Velocity)
