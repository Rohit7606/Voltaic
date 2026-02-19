import { PhysicsEngine } from "../engine";
import { describe, it, expect } from "vitest";

describe("PhysicsEngine", () => {
    const testVehicle = {
        id: "test-uuid",
        name: "Test Car",
        make: "Test Make",
        model: "Test Model",
        year: 2024,
        batteryCapacityKwh: 30.2,
        usableCapacityKwh: 28.5,
        dragCoefficient: 0.33,
        frontalAreaM2: 2.3,
        massKg: 1400,
        rollingResistance: 0.01,
        motorEfficiency: 0.90,
        regenEfficiency: 0.70,
        thermalCoefficientHeat: 0.015,
        thermalCoefficientCold: 0.010,
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const engine = new PhysicsEngine(testVehicle);

    it("calculates aerodynamic force correctly", () => {
        const force = engine.calculateAeroForce(80); // 80 km/h
        expect(force).toBeCloseTo(229.6, 1); // Calculated: 0.5 * 0.33 * 2.3 * 1.225 * (80/3.6)^2 ≈ 229.57
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
