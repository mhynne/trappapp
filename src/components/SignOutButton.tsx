"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { logout } from "@/app/actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.refresh();
        })
      }
      className="text-sm text-muted underline underline-offset-2 disabled:opacity-40"
    >
      {pending ? "Logger ut …" : "Logg ut"}
    </button>
  );
}
