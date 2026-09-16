/**
 * E-postutsending via Resend.
 *
 * Uten RESEND_API_KEY skrives koden til serverkonsollen i stedet. Det gjør at
 * hele innloggingsflyten kan kjøres lokalt uten konto hos noen, og at en
 * glemt nøkkel i produksjon feiler synlig framfor stille.
 */

const ENDPOINT = "https://api.resend.com/emails";

export type SendResult = { ok: true } | { ok: false; message: string };

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "TrappApp <onboarding@resend.dev>";
}

export async function sendLoginCode(
  email: string,
  code: string,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[TrappApp] RESEND_API_KEY mangler – sender ikke e-post.\n` +
        `           Innloggingskode for ${email}: ${code}`,
    );
    return { ok: true };
  }

  const text = [
    `Koden din til TrappApp er ${code}`,
    "",
    "Den varer i 10 minutter. Har du ikke bedt om den, kan du se bort fra denne e-posten.",
  ].join("\n");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [email],
        subject: `${code} er koden din til TrappApp`,
        text,
      }),
    });

    if (response.ok) return { ok: true };

    const body = await response.text();
    console.error(`[TrappApp] Resend svarte ${response.status}: ${body}`);

    // Testdomenet resend.dev kan bare sende til kontoeierens egen adresse.
    // Uten denne beskjeden ser feilen ut som om koden aldri ble laget.
    if (response.status === 403) {
      return {
        ok: false,
        message:
          "E-posten kunne ikke sendes til denne adressen. Appen bruker fortsatt " +
          "Resend sitt testdomene, som bare når kontoeieren.",
      };
    }

    return { ok: false, message: "Klarte ikke å sende e-posten. Prøv igjen." };
  } catch {
    return { ok: false, message: "Klarte ikke å sende e-posten. Prøv igjen." };
  }
}
