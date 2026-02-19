import { PlannerForm } from "@/components/PlannerForm";
import { db } from "@/db/client";
import { vehicleModels } from "@/db/schema";

export const dynamic = 'force-dynamic'; // Ensure fresh vehicle data

export default async function PlannerPage() {
    // Fetch vehicles for the planner dropdown
    const vehicles = await db.select().from(vehicleModels);

    return (
        <main className="relative h-full w-full overflow-hidden">
            <PlannerForm vehicles={vehicles} />
        </main>
    );
}
