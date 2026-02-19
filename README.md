# Voltaic - EV Journey Intelligence Platform ⚡

<img width="1920" height="1440" alt="Image" src="https://github.com/user-attachments/assets/37915a12-9345-4c6d-84c0-543150eed889" />

![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)
![Next JS](https://img.shields.io/badge/Next-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostGIS](https://img.shields.io/badge/PostGIS-336791?style=for-the-badge&logo=postgresql&logoColor=white)

> **Current Status:** This project is currently in active development. Features are being built and tested. It is not yet deployed for public use.

## 🚀 Overview

Voltaic is a specialized electric vehicle (EV) route planning application designed for the unique challenges of Indian roads. Unlike generic navigation apps, Voltaic accounts for critical factors that affect EV range:

*   **Extreme Temperatures:** Thermal degradation models for >40°C heat.
*   **Topography:** Energy consumption penalties for steep gradients (e.g., Western Ghats).
*   **Vehicle Physics:** Route calculations based on specific vehicle drag, mass, and rolling resistance.
*   **Charging Infrastructure:** Real-time availability of chargers compatible with your specific EV.

## ✨ Key Features

*   **Physics-Based Routing:** Calculates energy consumption segment-by-segment using real-world physics formulas.
*   **Trust Score™:** An algorithm that gives you a confidence rating (0-100%) for every trip prediction based on data quality.
*   **Elevation Analysis:** Self-hosted OpenElevation integration for sub-100ms altitude queries.
*   **Interactive Dashboard:** A cockpit-style interface built for desktop planning.

## 🛠️ Tech Stack

*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Database:** Supabase (PostgreSQL + PostGIS)
*   **ORM:** Drizzle ORM
*   **Maps:** Mapbox GL JS
*   **Styling:** Tailwind CSS v4 + shadcn/ui
*   **State Management:** TanStack Query + Zustand

## 🏁 Getting Started

This project is a work in progress. To run it locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/voltaic.git
    cd voltaic/web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file with the following:
    ```env
    NEXT_PUBLIC_MAPBOX_TOKEN=your_token
    DATABASE_URL=your_supabase_url
    OPEN_ELEVATION_URL=your_elevation_server
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
