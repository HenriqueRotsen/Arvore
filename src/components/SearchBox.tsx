"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        const value = query.trim();
        if (!value) return;
        router.push(`/busca?q=${encodeURIComponent(value)}`);
      }}
    >
      <label className="sr-only" htmlFor="busca">
        Buscar pessoa
      </label>
      <input
        id="busca"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar um nome"
        className="input-line"
      />
    </form>
  );
}
