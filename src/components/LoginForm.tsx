"use client";

import { useActionState } from "react";
import { authenticate } from "@/lib/actions/auth";

export function LoginForm() {
  const [error, action, pending] = useActionState(authenticate, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {error ? (
        <p className="rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
