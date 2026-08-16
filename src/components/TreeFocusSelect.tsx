"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function TreeFocusSelect({
  people,
  currentId,
}: {
  people: Array<{ id: string; name: string }>;
  currentId: string;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const needle = fold(query);
    return people
      .filter((person) => !needle || fold(person.name).includes(needle))
      .sort((a, b) => {
        if (needle) {
          const aStarts = fold(a.name).startsWith(needle) ? 0 : 1;
          const bStarts = fold(b.name).startsWith(needle) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
        }
        return a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 12);
  }, [people, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    window.setTimeout(() => searchRef.current?.focus(), 0);

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(person: { id: string; name: string }) {
    setOpen(false);
    setQuery("");
    router.push(`/arvore?de=${encodeURIComponent(person.id)}`);
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-80">
      <span className="field-label">Ver a partir de</span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between border-0 border-b border-line bg-transparent py-2 text-left text-base outline-none focus:border-accent sm:text-sm"
      >
        <span className="text-muted">Buscar pelo nome…</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`size-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden border border-line bg-background">
          <div className="border-b border-line p-3">
            <input
              ref={searchRef}
              value={query}
              autoComplete="off"
              placeholder="Pesquisar"
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (matches.length === 0) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => (index + 1) % matches.length);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => (index - 1 + matches.length) % matches.length);
                }
                if (event.key === "Enter" && matches[active]) {
                  event.preventDefault();
                  choose(matches[active]);
                }
              }}
              className="input-line"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-56 overflow-auto py-1">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">Ninguém encontrado.</li>
            ) : (
              matches.map((person, index) => (
                <li key={person.id} role="option" aria-selected={person.id === currentId}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      index === active ? "bg-accent/10 text-accent-dark" : ""
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(person);
                    }}
                  >
                    {person.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
