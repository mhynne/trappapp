import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";

import { PrintButton } from "@/components/admin/PrintButton";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllFloors } from "@/lib/admin-data";
import { getAllLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

/** Adressen QR-kodene skal peke på. */
async function baseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost:3000";
  const proto = store.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function PostersPage() {
  await requireAdmin();

  const [floors, locations, base] = await Promise.all([
    getAllFloors(),
    getAllLocations(),
    baseUrl(),
  ]);

  const activeLocations = locations.filter((l) => l.isActive);
  const byId = new Map(locations.map((l) => [l.id, l]));

  // Bygg som er slått av skal ikke få plakater.
  const active = floors
    .filter((floor) => floor.isActive && byId.get(floor.locationId)?.isActive)
    .sort((a, b) =>
      (byId.get(a.locationId)?.name ?? "").localeCompare(
        byId.get(b.locationId)?.name ?? "",
      ) || b.number - a.number,
    );

  // Navnet trykkes bare når det finnes flere bygg å forveksle.
  const showLocation = activeLocations.length > 1;

  const posters = await Promise.all(
    active.map(async (floor) => {
      const url = `${base}/t/${floor.qrToken}`;
      const svg = await QRCode.toString(url, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      });
      return {
        floor,
        url,
        svg,
        locationName: showLocation
          ? (byId.get(floor.locationId)?.name ?? null)
          : null,
      };
    }),
  );

  const isLocal = /localhost|127\.0\.0\.1/.test(base);

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="no-print mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">QR-plakater</h1>
            <p className="text-sm text-muted">
              Én A4-side per aktiv etasje, gruppert per bygg. Bruk «Skriv ut» og
              velg skriver eller «Lagre som PDF».
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium"
            >
              Tilbake
            </Link>
            <PrintButton />
          </div>
        </div>

        {isLocal ? (
          <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            QR-kodene peker på <code>{base}</code>, som bare virker på denne
            maskinen. Sett <code>NEXT_PUBLIC_APP_URL</code> til den offentlige
            adressen før du skriver ut plakater på ordentlig.
          </p>
        ) : (
          <p className="text-sm text-muted">
            QR-kodene peker på <code>{base}</code>.
          </p>
        )}

        {posters.length === 0 && (
          <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
            Ingen aktive etasjer. Legg dem inn under{" "}
            <Link href="/admin/etasjer" className="underline underline-offset-2">
              Etasjer
            </Link>
            .
          </p>
        )}
      </div>

      <div className="posters">
        {posters.map(({ floor, url, svg, locationName }) => (
          <section key={floor.id} className="poster">
            <p className="poster-eyebrow">
              {locationName ? `${locationName} · Tok du trappa?` : "Tok du trappa?"}
            </p>
            <h2 className="poster-floor">{floor.label}</h2>
            <p className="poster-lead">
              Skann og registrer turen – det tar fem sekunder.
            </p>
            <div
              className="poster-qr"
              // QR-koden er generert på serveren av qrcode-pakken.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="poster-url">{url}</p>
            <p className="poster-foot">TrappApp · hver etasje gir poeng</p>
          </section>
        ))}
      </div>
    </>
  );
}

const PRINT_CSS = `
.posters { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 0 16px 48px; }

.poster {
  width: 210mm;
  max-width: 100%;
  aspect-ratio: 210 / 297;
  background: #ffffff;
  color: #0b1f17;
  border: 1px solid #d8ded9;
  border-radius: 8px;
  padding: 18mm 16mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
}

.poster-eyebrow {
  font-size: 30pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #047857;
  margin: 0;
}

.poster-floor {
  font-size: 64pt;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 4mm 0 0;
}

.poster-lead {
  font-size: 16pt;
  color: #3f5249;
  margin: 4mm 0 0;
}

.poster-qr {
  width: 118mm;
  margin: 8mm 0 0;
}

.poster-qr svg { width: 100%; height: auto; display: block; }

.poster-url {
  font-size: 11pt;
  color: #5d6b64;
  word-break: break-all;
  margin: 5mm 0 0;
}

.poster-foot {
  font-size: 12pt;
  color: #047857;
  font-weight: 600;
  margin: auto 0 0;
}

@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #ffffff !important; }
  .posters { display: block; gap: 0; padding: 0; }
  .poster {
    width: 210mm;
    height: 297mm;
    aspect-ratio: auto;
    max-width: none;
    border: 0;
    border-radius: 0;
    break-after: page;
    page-break-after: always;
  }
  .poster:last-child { break-after: auto; page-break-after: auto; }
}
`;
