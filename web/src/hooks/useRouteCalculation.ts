import { useMutation, useQueryClient } from "@tanstack/react-query";
import { calculateRoute } from "@/actions/route/calculateRoute";
import { findChargersOnRoute } from "@/actions/charging/findChargersOnRoute";
import { toast } from "sonner";

export function useRouteCalculation(options?: { onSuccess?: (data: any) => void }) {
    return useMutation({
        mutationFn: async (vars: any) => {
            // 1. Calculate Route
            const routeRes = await calculateRoute(vars);
            if (!routeRes.success || !routeRes.data) throw new Error(routeRes.error || "Route calc failed");

            // 2. Find Chargers
            const chargerRes = await findChargersOnRoute({
                routeGeometry: routeRes.data.route,
                corridorWidthKm: 10 // Increased from 2 to 10 for better coverage
            });

            return {
                ...routeRes,
                data: {
                    ...routeRes.data,
                    chargers: chargerRes.data || []
                }
            };
        },
        onSuccess: (data) => {
            if (data.success) {
                toast.success("Route calculated & chargers found");
                options?.onSuccess?.(data); // Call parent callback
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Calculation failed");
        },
    });
}
