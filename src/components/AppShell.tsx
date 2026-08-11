import Link from "next/link";

import { StairsMark } from "@/components/StairsMark";

/** Felles ramme rundt alle sidene utenom skanne-siden og plakatutskrift. */
export function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: "hjem" | "resultater" | "meg";
}) {
  const links: { href: string; label: string; key: string }[] = [
    { href: "/", label: "Hjem", key: "hjem" },
    { href: "/resultater", label: "Resultater", key: "resultater" },
    { href: "/meg", label: "Min side", key: "meg" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <StairsMark className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-semibold tracking-tight">TrappApp</span>
          </Link>
        </div>
        <nav className="mx-auto flex max-w-2xl gap-1 px-2 pb-2">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-2xl px-4 pb-10 pt-4 text-center text-xs text-muted">
        <Link href="/personvern" className="underline underline-offset-2">
          Personvern
        </Link>
      </footer>
    </div>
  );
}
