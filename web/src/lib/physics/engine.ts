import { type InferSelectModel } from 'drizzle-orm';
import { vehicleModels } from '@/db/schema';

type Vehicle = InferSelectModel<typeof vehicleModels>;

export interface SegmentParams {
    distance: number; // meters
    grade: number;    // decimal (e.g., 0.05 for 5%)
    speed: number;    // km/h
    temperature: number; // Celsius
}

export class PhysicsEngine {
    private vehicle: Vehicle;
    private readonly G = 9.81;
    private readonly RHO_AIR = 1.225; // kg/m^3 at sea level

    constructor(vehicle: Vehicle) {
        this.vehicle = vehicle;
    }

    /**
     * Calculates Aerodynamic Drag Force (F_aero)
     * F_aero = 0.5 * Cd * A * rho * v^2
     * @param speedKmph Speed in km/h
     * @returns Force in Newtons
     */
    public calculateAeroForce(speedKmph: number): number {
        const v = speedKmph / 3.6; // Convert to m/s
        return 0.5 * this.vehicle.dragCoefficient * this.vehicle.frontalAreaM2 * this.RHO_AIR * (v * v);
    }

    /**
     * Calculates Rolling Resistance Force (F_roll)
     * F_roll = Crr * m * g
     * @returns Force in Newtons
     */
    public calculateRollingResistance(): number {
        return this.vehicle.rollingResistance * this.vehicle.massKg * this.G;
    }

    /**
     * Calculates Gradient Resistance Force (F_grade)
     * F_grade = m * g * sin(theta)
     * For small angles, sin(theta) ≈ tan(theta) = grade
     * We stick to sin(arctan(grade)) for accuracy
     * @param grade Gradient as a decimal (rise/run)
     * @returns Force in Newtons
     */
    public calculateGradeForce(grade: number): number {
        const theta = Math.atan(grade);
        return this.vehicle.massKg * this.G * Math.sin(theta);
    }

    /**
     * Calculates Thermal Penalty Multiplier
     * @param temperature Celsius
     * @returns Multiplier (e.g., 0.10 for 10% penalty)
     */
    public calculateThermalPenalty(temperature: number): number {
        if (temperature > 25) {
            return (temperature - 25) * this.vehicle.thermalCoefficientHeat;
        } else if (temperature < 15) {
            return (15 - temperature) * this.vehicle.thermalCoefficientCold;
        }
        return 0;
    }

    /**
     * Calculates Energy Consumption for a Segment
     * @param params Segment parameters
     * @returns Energy in kWh
     */
    public calculateSegmentEnergy(params: SegmentParams): number {
        const { distance, grade, speed, temperature } = params;

        const fAero = this.calculateAeroForce(speed);
        const fRoll = this.calculateRollingResistance();
        const fGrade = this.calculateGradeForce(grade);

        // Total Force
        let fTotal = fAero + fRoll + fGrade;

        // Handle Regenerative Braking
        // If fTotal < 0, we are coasting/braking.
        // However, regen is not 100% efficient.
        // If fTotal is negative, we multiply by regenEfficiency to get actual energy recovered.
        // If fTotal is positive, we divide by motorEfficiency to get actual energy used.

        let energyJoules = 0;

        if (fTotal > 0) {
            // Consuming energy
            energyJoules = (fTotal * distance) / this.vehicle.motorEfficiency;
        } else {
            // Recovering energy
            energyJoules = (fTotal * distance) * this.vehicle.regenEfficiency;
        }

        // Apply Thermal Penalty to Base Consumption (only when consuming?)
        // Usually thermal load (AC/Heater) is a constant auxiliary load, 
        // but the spec formula says: totalEnergy = baseEnergy * (1 + penalty)
        // We will apply it to the final energy if it's consumption.
        // If recovering, thermal load still consumes energy, so it reduces recovery or adds consumption.
        // For simplicity based on spec:

        // Aux load approach: 
        // Spec: "At 32°C, AC will use ~1.2 kW continuously."
        // 3.1 formula: totalEnergy = baseEnergy * (1 + penalty)
        // This is a simplified multiplier model. We use that.

        // Logic: If consuming, increase consumption. If recovering, reduce recovery (or switch to consumption).
        // Let's apply standard logic:
        // Energy_net = Energy_motion + Energy_thermal
        // But utilizing the spec's multiplier on the motion energy for MVP simplicity as requested.

        const penalty = this.calculateThermalPenalty(temperature);

        // If energyJoules is positive (consumption), we increase it.
        // If negative (regen), we assume thermal load consumes energy, so we add positive energy (less regen).
        // Actually, the formula `baseEnergy * (1 + penalty)` implies scaling. 
        // Let's implement strictly as:

        const finalEnergyJoules = energyJoules * (1 + penalty); // If negative, this makes it MORE negative? No.

        // Correct logic for penalty: It's always a COST.
        // If we simply scale, a negative energy becomes more negative (more regen), which is wrong. Thermal penalty should COST energy.
        // But the spec says: `totalEnergy = baseEnergy * (1 + penalty)`.
        // If baseEnergy is negative, `(1 + penalty)` makes it more negative. This snippet might assume baseEnergy is always consumption or handled absolutely.
        // Let's assume for MVP:
        // If energy > 0: energy * (1 + penalty)
        // If energy < 0: energy - (abs(energy) * penalty) OR just add a fixed aux load power * time.
        // Given the formula structure, I will apply it only to the propulsion consumption component.

        // Revised implementation based on common sense + spec intent:
        // Calculate time taken
        const timeSeconds = distance / (speed / 3.6);
        // Calculate aux power based on temperature?
        // Spec describes penalty as multiplier.

        // Let's stick to the multiplier on POSITIVE energy only.
        if (energyJoules > 0) {
            return (finalEnergyJoules / 3600 / 1000); // Joules to kWh
        } else {
            // For regen, we don't apply the multiplier, but maybe we should subtract aux load?
            // Leaving regen as is for now to match the "1 + penalty" formula context which usually applies to discharge.
            return (energyJoules / 3600 / 1000);
        }
    }
}
