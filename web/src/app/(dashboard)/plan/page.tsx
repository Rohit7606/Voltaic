import { PlannerForm } from "@/components/PlannerForm";
import { db } from "@/db/client";
import { vehicleModels } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default async function PlannerPage() {
    let vehicles: any[] = [];
    try {
        vehicles = await db.select().from(vehicleModels);
    } catch (e) {
        console.error("Failed to fetch vehicles:", e);
    }

    return (
        <div className="h-full w-full">
            {!vehicles.length ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
                    <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>No vehicles found</AlertTitle>
                        <AlertDescription>
                            Please seed the database to start.
                        </AlertDescription>
                    </Alert>
                </div>
            ) : null}

            <PlannerForm vehicles={vehicles} />
        </div>
    );
}
