"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { chooseNickname } from "@/app/actions";

/** Kallenavn-oppsett brukt utenfor skanne-flyten (forsiden). */
export function NicknameCard() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await chooseNickname(value);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-line bg-surface p-5"
    >
      <label htmlFor="kallenavn" className="block font-semibold">
        Velg et kallenavn
      </label>
      <p className="text-sm text-muted">
        Dette er navnet andre ser på resultatlisten. Du trenger ikke bruke ditt
        eget navn.
      </p>
      <input
        id="kallenavn"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="F.eks. Trappetroll"
        maxLength={20}
        className="w-full rounded-xl border border-line bg-background px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || value.trim().length < 2}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Lagrer …" : "Kom i gang"}
      </button>
    </form>
  );
}
