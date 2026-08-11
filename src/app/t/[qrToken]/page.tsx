import Link from "next/link";

import { ScanFlow } from "@/components/ScanFlow";
import { StairsMark } from "@/components/StairsMark";
import { getCurrentParticipant } from "@/lib/identity";
import { getActivePeriod } from "@/lib/periods";
import {
  getActiveFloors,
  getFloorByToken,
  getLastTrip,
  suggestFromFloor,
} from "@/lib/trips";

export const dynamic = "force-dynamic";

/** Siden man lander på når QR-koden i trappeoppgangen skannes. */
export default async function ScanPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;
  const scannedFloor = await getFloorByToken(qrToken);

  if (!scannedFloor || !scannedFloor.isActive) {
    return <UnknownCode />;
  }

  const [participant, floors, period] = await Promise.all([
    getCurrentParticipant(),
    getActiveFloors(),
    getActivePeriod(),
  ]);

  const lastTrip = participant ? await getLastTrip(participant.id) : null;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-5 py-8">
        <ScanFlow
          qrToken={qrToken}
          scannedFloor={{
            number: scannedFloor.number,
            label: scannedFloor.label,
          }}
          floors={floors.map((f) => ({ number: f.number, label: f.label }))}
          nickname={participant?.nickname ?? null}
          suggestedFrom={suggestFromFloor(floors, scannedFloor, lastTrip)}
          hasActivePeriod={period !== null}
        />
        <nav className="mt-10 flex justify-center gap-4 text-sm text-muted">
          <Link href="/resultater" className="underline underline-offset-2">
            Resultater
          </Link>
          <Link href="/meg" className="underline underline-offset-2">
            Min side
          </Link>
        </nav>
      </div>
    </div>
  );
}

function UnknownCode() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <StairsMark className="h-10 w-10 text-muted" />
      <h1 className="text-2xl font-bold">Ukjent QR-kode</h1>
      <p className="text-muted">
        Denne koden er ikke i bruk. Sjekk at du skannet plakaten i
        trappeoppgangen, eller si fra til den som drifter TrappApp.
      </p>
      <Link
        href="/"
        className="rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white"
      >
        Til forsiden
      </Link>
    </div>
  );
}
