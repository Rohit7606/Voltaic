import { pgTable, serial, text, timestamp, boolean, real, uuid, integer, jsonb, index } from 'drizzle-orm/pg-core';

// Vehicle Models Table
export const vehicleModels = pgTable('vehicle_models', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),

    // Battery
    batteryCapacityKwh: real('battery_capacity_kwh').notNull(),
    usableCapacityKwh: real('usable_capacity_kwh').notNull(),

    // Physics parameters
    dragCoefficient: real('drag_coefficient').notNull(),
    frontalAreaM2: real('frontal_area_m2').notNull(),
    massKg: real('mass_kg').notNull(),
    rollingResistance: real('rolling_resistance').notNull(),
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

// Charging Stations Table
// Note: 'geography' type requires PostGIS. For standard Postgres without PostGIS, we might use separate lat/lng or custom types.
// Assuming PostGIS is available as per request.
// Using custom type for geography if needed or just handled raw.
// Drizzle supports custom types. For now, we'll keep it simple or assume extensions.

export const chargingStations = pgTable('charging_stations', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    // location: geography('location', { type: 'point', srid: 4326 }).notNull(), // Requires extension
    // Fallback for now until PostGIS extension is fully confirmed/configured in Drizzle custom types:
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),

    address: text('address'),
    city: text('city'),
    state: text('state'),

    operator: text('operator').notNull(),
    operatorId: text('operator_id'),

    connectorTypes: jsonb('connector_types').notNull().$type<string[]>(),
    maxPowerKw: real('max_power_kw').notNull(),
    numberOfPorts: integer('number_of_ports').notNull().default(1),

    pricePerKwh: real('price_per_kwh'),
    pricingModel: text('pricing_model'),

    isOperational: boolean('is_operational').notNull().default(true),
    lastVerified: timestamp('last_verified'),

    source: text('source').notNull(),
    externalId: text('external_id'),

    // Status
    status: text('status').notNull().default('unknown'),

    amenities: jsonb('amenities').$type<string[]>(),
    accessNotes: text('access_notes'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
    return {
        // Index for spatial queries
        latIdx: index('idx_chargers_lat').on(table.latitude),
        lngIdx: index('idx_chargers_lng').on(table.longitude),
    }
});

// Elevation Cache Table (Production Ready)
export const elevationCacheTable = pgTable('elevation_cache', {
    id: uuid('id').defaultRandom().primaryKey(),
    // Rounding to 4 decimal places for cache hits (11m precision)
    // Storing as string or real? Real is fine.
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    elevation: real('elevation').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
    return {
        // Composite index for fast lookups
        latLngIdx: index('idx_elevation_lat_lng').on(table.latitude, table.longitude),
    }
});

// Route Calculations Table
export const routeCalculations = pgTable('route_calculations', {
    id: uuid('id').defaultRandom().primaryKey(),

    startLocationLat: real('start_location_lat').notNull(),
    startLocationLng: real('start_location_lng').notNull(),
    endLocationLat: real('end_location_lat').notNull(),
    endLocationLng: real('end_location_lng').notNull(),

    vehicleModelId: uuid('vehicle_model_id').notNull().references(() => vehicleModels.id),
    startSoc: real('start_soc').notNull(),

    // Output data - storing geometry as JSONB for now
    routeGeometry: jsonb('route_geometry').notNull(),
    distanceKm: real('distance_km').notNull(),
    energyConsumedKwh: real('energy_consumed_kwh').notNull(),
    finalSoc: real('final_soc').notNull(),

    // Energy breakdown
    baseConsumptionKwh: real('base_consumption_kwh').notNull(),
    gradientPenaltyKwh: real('gradient_penalty_kwh').notNull(),
    thermalPenaltyKwh: real('thermal_penalty_kwh').notNull(),

    // Trust metrics
    trustScore: real('trust_score').notNull(),
    confidenceFactors: jsonb('confidence_factors'),

    // Environmental data
    temperatureCelsius: real('temperature_celsius'),
    elevationGainM: real('elevation_gain_m'),
    elevationLossM: real('elevation_loss_m'),

    calculationDurationMs: integer('calculation_duration_ms'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
});
