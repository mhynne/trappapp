import { AppShell } from "@/components/AppShell";
import { DeleteMyData } from "@/components/DeleteMyData";
import { getCurrentParticipant } from "@/lib/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personvern – TrappApp",
};

export default async function PrivacyPage() {
  const participant = await getCurrentParticipant();

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Personvern</h1>
          <p className="text-sm text-muted">
            Kort om hva TrappApp lagrer, og hvordan du blir kvitt det.
          </p>
        </header>

        <Section title="Hva vi lagrer">
          <ul className="list-disc space-y-1 pl-5">
            <li>Kallenavnet du selv velger.</li>
            <li>
              En tilfeldig ID som ligger i nettleseren din, slik at appen kjenner
              deg igjen. Den sier ingenting om hvem du er.
            </li>
            <li>
              Hver trappetur du registrerer: fra og til hvilken etasje, tidspunkt
              og poeng.
            </li>
          </ul>
        </Section>

        <Section title="Hva vi ikke lagrer">
          <p>
            Ingen navn, e-postadresse, telefonnummer eller pålogging. Vi henter
            ikke posisjon, og vi kobler ikke bruken din til jobbkontoen din.
          </p>
        </Section>

        <Section title="Hvem ser hva">
          <p>
            Kallenavnet, poengsummen og antall etasjer vises på resultatlisten
            for alle som bruker appen. De som administrerer TrappApp ser i
            tillegg de enkelte turene, slik at åpenbare feilregistreringer kan
            fjernes.
          </p>
          <p className="mt-2">
            Husk at et kallenavn kan avsløre hvem du er på en liten arbeidsplass,
            selv om det ikke er navnet ditt. Velg noe du er komfortabel med at
            kollegene ser.
          </p>
        </Section>

        <Section title="Hvor lenge">
          <p>
            Turene beholdes så lenge konkurransen og etterarbeidet krever det, og
            slettes deretter. Du kan slette alt selv når som helst.
          </p>
        </Section>

        <Section title="Slette dataene dine">
          {participant ? (
            <div className="space-y-3">
              <p>
                Du er registrert som{" "}
                <strong className="font-semibold">{participant.nickname}</strong>.
              </p>
              <DeleteMyData />
            </div>
          ) : (
            <p>
              Du har ikke registrert noe ennå, så det finnes ingenting å slette.
            </p>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </section>
  );
}
