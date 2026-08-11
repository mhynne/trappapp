import { AdminShell } from "@/components/admin/AdminShell";
import { PeriodList, type PeriodListItem } from "@/components/admin/PeriodList";
import type { PeriodFormValues } from "@/components/admin/PeriodEditor";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateRange } from "@/lib/format";
import { getActivePeriod, getAllPeriods } from "@/lib/periods";
import { toOsloDateString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function PeriodsPage() {
  await requireAdmin();

  const [periods, active] = await Promise.all([
    getAllPeriods(),
    getActivePeriod(),
  ]);

  const items: PeriodListItem[] = periods.map((period) => ({
    id: period.id,
    name: period.name,
    // Sluttdatoen lagres som midnatt inn til dagen etter – vis siste hele dag.
    startDate: toOsloDateString(period.startsAt),
    endDate: toOsloDateString(period.endsAt, true),
    pointsUp: String(Number(period.pointsUp)),
    pointsDown: String(Number(period.pointsDown)),
    dailyPointsCap: String(Number(period.dailyPointsCap)),
    rangeLabel: formatDateRange(period.startsAt, period.endsAt),
    isActive: period.id === active?.id,
  }));

  return (
    <AdminShell active="perioder">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perioder</h1>
          <p className="text-sm text-muted">
            En periode er én konkurranse med egne poengregler. Bare én bør pågå
            om gangen.
          </p>
        </div>

        <PeriodList periods={items} suggestion={nextMonthSuggestion()} />
      </div>
    </AdminShell>
  );
}

/** Forslag til ny periode: inneværende måned med standardregler. */
function nextMonthSuggestion(): PeriodFormValues {
  const today = toOsloDateString(new Date());
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");

  const monthNames = [
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return {
    name: `${monthNames[month - 1]} ${year}`,
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
    pointsUp: "1",
    pointsDown: "0.5",
    dailyPointsCap: "40",
  };
}
