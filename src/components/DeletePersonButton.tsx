"use client";

import { deletePerson } from "@/lib/actions/people";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function DeletePersonButton({
  personId,
  name,
}: {
  personId: string;
  name: string;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = fold(typed) === fold(name);

  useEffect(() => {
    if (!open) return;
    setTyped("");
    window.setTimeout(() => inputRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Apagar pessoa
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md border border-line bg-background p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="font-serif text-2xl font-normal italic">
              Apagar {name}?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Os vínculos de parentesco desta pessoa também saem. Para confirmar,
              digite o nome completo:
            </p>
            <p className="mt-3 font-serif text-lg italic">{name}</p>
            <form
              action={deletePerson.bind(null, personId)}
              onSubmit={(event) => {
                if (!matches) event.preventDefault();
              }}
              className="mt-4 space-y-4"
            >
              <input
                ref={inputRef}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Digite o nome para confirmar"
                className="input-line"
                aria-label="Nome da pessoa para confirmar a exclusão"
              />
              <div className="flex flex-wrap items-center gap-3">
                <DeleteSubmit disabled={!matches} />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DeleteSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-danger" disabled={disabled || pending}>
      {pending ? "Apagando…" : "Apagar de vez"}
    </button>
  );
}
