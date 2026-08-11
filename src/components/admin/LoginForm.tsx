"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { login } from "@/app/admin/actions";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await login(password);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message ?? "Innlogging feilet.");
        setPassword("");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-20 max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6"
    >
      <div>
        <h1 className="text-xl font-semibold">Administrasjon</h1>
        <p className="mt-1 text-sm text-muted">
          Skriv inn administratorpassordet for TrappApp.
        </p>
      </div>
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Passord"
        className="w-full rounded-xl border border-line bg-background px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Logger inn …" : "Logg inn"}
      </button>
    </form>
  );
}
