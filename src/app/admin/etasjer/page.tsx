import { AdminShell } from "@/components/admin/AdminShell";
import { FloorManager } from "@/components/admin/FloorManager";
import { LocationManager } from "@/components/admin/LocationManager";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllFloors } from "@/lib/admin-data";
import { getAllLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

export default async function FloorsPage() {
  await requireAdmin();
  const [floors, locations] = await Promise.all([
    getAllFloors(),
    getAllLocations(),
  ]);

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

        <LocationManager
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
            isActive: location.isActive,
            floorCount: floors.filter((f) => f.locationId === location.id).length,
          }))}
        />

        {locations.map((location) => (
          <section key={location.id} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {location.name}
              {!location.isActive && (
                <span className="ml-2 text-xs font-normal text-muted">
                  ikke aktiv
                </span>
              )}
            </h2>
            <FloorManager
              locationId={location.id}
              floors={floors
                .filter((floor) => floor.locationId === location.id)
                .map((floor) => ({
                  id: floor.id,
                  number: floor.number,
                  label: floor.label,
                  qrToken: floor.qrToken,
                  isActive: floor.isActive,
                }))}
            />
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
