import { renderIcon } from "@/lib/icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Fanens ikon. Samme trappemotiv som hjemskjerm- og Apple-ikonet, slik at
 * appen ser lik ut overalt. Erstatter standard favicon.ico fra Next.js.
 */
export default function Icon() {
  return renderIcon(32);
}
