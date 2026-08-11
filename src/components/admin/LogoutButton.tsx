"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { logout } from "@/app/admin/actions";

export function LogoutButton() {
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
      className="rounded-full border border-line px-3 py-1.5 text-sm font-medium"
    >
      {pending ? "Logger ut …" : "Logg ut"}
    </button>
  );
}
