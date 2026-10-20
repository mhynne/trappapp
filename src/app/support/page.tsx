import { AppShell } from "@/components/AppShell";
import { SupportForm } from "@/components/SupportForm";
import { getCurrentParticipant } from "@/lib/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Si fra om et problem – TrappApp",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ fra?: string }>;
}) {
  const { fra } = await searchParams;
  const participant = await getCurrentParticipant();

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">
            Si fra om et problem
          </h1>
          <p className="text-sm text-muted">
            {participant
              ? `Du er logget inn som ${participant.nickname}.`
              : "Du trenger ikke være logget inn for å sende denne."}
          </p>
        </header>

        <SupportForm innlogget={participant !== null} fraSide={fra ?? null} />
      </div>
    </AppShell>
  );
}
