import Link from "next/link";

import { LogoutButton } from "@/components/admin/LogoutButton";

const LINKS = [
  { href: "/admin", label: "Oversikt", key: "oversikt" },
  { href: "/admin/perioder", label: "Perioder", key: "perioder" },
  { href: "/admin/etasjer", label: "Etasjer", key: "etasjer" },
  { href: "/admin/plakater", label: "Plakater", key: "plakater" },
  { href: "/admin/moderasjon", label: "Moderasjon", key: "moderasjon" },
] as const;

export function AdminShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: (typeof LINKS)[number]["key"];
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">TrappApp</span>
            <span className="text-sm text-muted">administrasjon</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted underline underline-offset-2">
              Til appen
            </Link>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl flex-wrap gap-1 px-2 pb-2">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                active === link.key
                  ? "bg-brand-600 text-white"
                  : "text-muted hover:bg-surface-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
