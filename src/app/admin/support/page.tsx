import { AdminShell } from "@/components/admin/AdminShell";
import { SupportReports } from "@/components/admin/SupportReports";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/format";
import { getReportsForAdmin } from "@/lib/support";

export const dynamic = "force-dynamic";

/** Kutter user agent til noe lesbart. Full streng er sjelden interessant. */
function kortNettleser(ua: string | null): string {
  if (!ua) return "nettleser ukjent";
  const nettleser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "ukjent nettleser";
  const system =
    /iPhone|iPad/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Macintosh/.test(ua) ? "Mac"
    : /Windows/.test(ua) ? "Windows"
    : "ukjent system";
  return `${nettleser} på ${system}`;
}

export default async function SupportPage() {
  await requireAdmin();
  const reports = await getReportsForAdmin();

  return (
    <AdminShell active="support">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-sm text-muted">
            Meldinger fra brukerne, uhåndterte først. Konteksten er fanget
            automatisk – nettleser og side løser som regel saken. Svar går per
            e-post fra din egen innboks.
          </p>
        </div>

        <SupportReports
          reports={reports.map((report) => ({
            id: report.id,
            message: report.message,
            avsender:
              report.nickname ??
              report.contactEmail ??
              "Ikke innlogget, ingen adresse oppgitt",
            mottatt: formatDateTime(report.createdAt),
            håndtert: report.handledAt !== null,
            kontekst: [
              kortNettleser(report.userAgent),
              `fra ${report.fromPage || "ukjent side"}`,
              report.serviceWorker === null
                ? "service worker ukjent"
                : report.serviceWorker
                  ? "service worker aktiv"
                  : "ingen service worker",
              `versjon ${report.appVersion ?? "ukjent"}`,
            ],
          }))}
        />
      </div>
    </AdminShell>
  );
}
