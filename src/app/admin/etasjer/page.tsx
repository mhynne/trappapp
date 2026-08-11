import { AdminShell } from "@/components/admin/AdminShell";
import { FloorManager } from "@/components/admin/FloorManager";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllFloors } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function FloorsPage() {
  await requireAdmin();
  const floors = await getAllFloors();

  return (
    <AdminShell active="etasjer">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Etasjer</h1>
          <p className="text-sm text-muted">
            Hver etasje har sin egen QR-plakat. Slår du av en etasje, slutter
            plakaten å virke uten at gamle turer forsvinner.
          </p>
        </div>

        <FloorManager
          floors={floors.map((floor) => ({
            id: floor.id,
            number: floor.number,
            label: floor.label,
            qrToken: floor.qrToken,
            isActive: floor.isActive,
          }))}
        />
      </div>
    </AdminShell>
  );
}
