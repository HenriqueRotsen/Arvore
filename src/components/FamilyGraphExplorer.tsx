"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FamilyTreeView, type TreePerson } from "@/components/FamilyTreeView";
import type { Node as RelativesNode } from "relatives-tree/lib/types";
import {
  edgeKindLabel,
  findKinship,
  kinshipLabel,
  kinshipLineLabel,
  kinshipRoleLabel,
  type Adjacency,
} from "@/lib/graph";

export function FamilyGraphExplorer({
  nodes,
  people,
  rootId,
  adjacency,
}: {
  nodes: RelativesNode[];
  people: Record<string, TreePerson>;
  rootId: string;
  adjacency: Adjacency;
}) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [picking, setPicking] = useState<"from" | "to">("from");

  const options = useMemo(
    () =>
      Object.values(people).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    [people],
  );

  const result = useMemo(() => {
    if (!fromId || !toId) return undefined;
    return findKinship(adjacency, fromId, toId);
  }, [adjacency, fromId, toId]);

  function selectPerson(id: string) {
    if (picking === "from") {
      setFromId(id);
      setPicking("to");
      return;
    }
    setToId(id);
    setPicking("from");
  }

  const pathIds = result?.nodeIds ?? [];
  const fromName = people[fromId]?.name ?? fromId;
  const toName = people[toId]?.name ?? toId;
  const role = result ? kinshipRoleLabel(result, people[toId]?.gender) : "";
  const roleTitle = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section className="shrink-0">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <PersonPick
            label={picking === "from" ? "De (toque na árvore)" : "De"}
            active={picking === "from"}
            value={fromId}
            options={options}
            onChange={(id) => {
              setFromId(id);
              setPicking("to");
            }}
          />
          <PersonPick
            label={picking === "to" ? "Até (toque na árvore)" : "Até"}
            active={picking === "to"}
            value={toId}
            options={options}
            onChange={(id) => {
              setToId(id);
              setPicking("from");
            }}
          />
          <button
            type="button"
            className="btn-outline w-full sm:w-auto"
            onClick={() => {
              setFromId("");
              setToId("");
              setPicking("from");
            }}
          >
            Limpar
          </button>
        </div>

        {fromId && toId && result === null ? (
          <p className="mt-6 text-sm text-terracotta">
            Não há caminho no grafo entre essas pessoas — ainda não há cadeia
            de pai/filho ou cônjuge ligando os dois.
          </p>
        ) : null}

        {result ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="font-serif text-2xl font-normal italic text-accent-dark">
              {roleTitle}
              {result.relation === "blood"
                ? ` · ${kinshipLabel(result.distance)}${
                    result.line ? ` · ${kinshipLineLabel(result.line)}` : ""
                  }`
                : ""}
            </p>
            {result.relation === "self" ? (
              <p className="mt-2 text-sm text-muted">Você escolheu a mesma pessoa.</p>
            ) : (
              <p className="mt-2 text-sm">
                <span className="font-medium">{toName}</span> é {role} de{" "}
                <span className="font-medium">{fromName}</span>.
              </p>
            )}
            {result.relation === "affinity" ? (
              <p className="mt-2 text-sm text-muted">
                Não há ancestral comum de sangue. O caminho passa por casamento
                ou parceria.
              </p>
            ) : null}
            {result.relation === "blood" && result.line === "collateral" ? (
              <p className="mt-2 text-sm text-muted">
                {result.ancestorIds.length > 1
                  ? "Ancestrais comuns: "
                  : "Ancestral comum: "}
                {result.ancestorIds
                  .map((id) => people[id]?.name ?? id)
                  .join(", ")}
              </p>
            ) : null}
            {result.steps.length > 0 ? (
              <ol className="mt-3 flex flex-wrap items-center gap-1 text-sm">
                {result.steps.map((step, index) => (
                  <li
                    key={`${step.fromId}-${step.toId}`}
                    className="flex items-center gap-1"
                  >
                    {index === 0 ? (
                      <span className="font-medium">
                        {people[step.fromId]?.name ?? step.fromId}
                      </span>
                    ) : null}
                    <span className="text-muted">
                      — {edgeKindLabel(step.kind)} →
                    </span>
                    <span className="font-medium">
                      {people[step.toId]?.name ?? step.toId}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
      </section>

      <FamilyTreeView
        nodes={nodes}
        people={people}
        rootId={rootId}
        adjacency={adjacency}
        highlightedIds={pathIds}
        selectedFrom={fromId}
        selectedTo={toId}
        onSelectPerson={selectPerson}
      />
    </div>
  );
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function PersonPick({
  label,
  value,
  options,
  active,
  onChange,
}: {
  label: string;
  value: string;
  options: TreePerson[];
  active: boolean;
  onChange: (id: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((person) => person.id === value);

  const matches = useMemo(() => {
    const needle = fold(query);
    return options
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
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
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

  function choose(person: TreePerson) {
    setOpen(false);
    setQuery("");
    onChange(person.id);
  }

  return (
    <div ref={rootRef} className="relative">
      <span className="field-label">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-11 w-full items-center justify-between border-0 border-b bg-transparent py-2 text-left text-base outline-none focus:border-accent sm:text-sm ${
          active ? "border-accent" : "border-line"
        }`}
      >
        <span className={selected ? "truncate text-foreground" : "text-muted"}>
          {selected?.name ?? "Buscar pelo nome…"}
        </span>
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
        <div className="absolute z-40 mt-1 w-full overflow-hidden border border-line bg-background">
          <div className="border-b border-line p-3">
            <input
              ref={searchRef}
              value={query}
              autoComplete="off"
              placeholder="Pesquisar"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (matches.length === 0) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => (index + 1) % matches.length);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex(
                    (index) => (index - 1 + matches.length) % matches.length,
                  );
                }
                if (event.key === "Enter" && matches[activeIndex]) {
                  event.preventDefault();
                  choose(matches[activeIndex]);
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
                <li
                  key={person.id}
                  role="option"
                  aria-selected={person.id === value}
                >
                  <button
                    type="button"
                    className={`block min-h-11 w-full px-3 py-2 text-left text-sm ${
                      index === activeIndex ? "bg-accent/10 text-accent-dark" : ""
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
