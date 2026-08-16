"use client";

import { CityAutocomplete } from "@/components/CityAutocomplete";
import type { Person } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { dateInputValue } from "@/lib/person";

export function PersonForm({
  person,
  action,
  submitLabel,
}: {
  person?: Person;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const autosave = Boolean(person);
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number>(0);
  const [deceased, setDeceased] = useState(
    Boolean(person?.deceased || person?.deathDate),
  );

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  function submitIfValid() {
    const form = formRef.current;
    if (!form || !autosave) return;
    const firstName = String(new FormData(form).get("firstName") ?? "").trim();
    if (!firstName) return;
    form.requestSubmit();
  }

  function queueSave() {
    if (!autosave) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(submitIfValid, 700);
  }

  function saveNow() {
    if (!autosave) return;
    window.clearTimeout(timerRef.current);
    submitIfValid();
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
      onChange={(event) => {
        if (!autosave) return;
        const target = event.target;
        if (
          target instanceof HTMLInputElement &&
          (target.type === "file" ||
            target.type === "checkbox" ||
            target.type === "date")
        ) {
          saveNow();
          return;
        }
        if (target instanceof HTMLSelectElement) {
          saveNow();
          return;
        }
        queueSave();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="firstName" required defaultValue={person?.firstName} />
        <Field label="Sobrenome" name="lastName" defaultValue={person?.lastName} />
        <div>
          <label htmlFor="gender" className="field-label">
            Sexo
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={person?.gender ?? "other"}
            className="input-line"
          >
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="other">Outro / não informar</option>
          </select>
        </div>
        <Field
          label="Nascimento"
          name="birthDate"
          type="date"
          defaultValue={dateInputValue(person?.birthDate)}
        />
        <CityAutocomplete
          label="Cidade de nascimento"
          name="birthCity"
          defaultValue={person?.birthCity ?? ""}
          onCommit={saveNow}
        />
        <div className="sm:col-span-2 border-y border-line py-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="deceased"
              checked={deceased}
              onChange={(event) => setDeceased(event.target.checked)}
              className="size-4 accent-accent"
            />
            Esta pessoa faleceu
          </label>
          {deceased ? (
            <div className="mt-3">
              <Field
                label="Data de falecimento"
                name="deathDate"
                type="date"
                defaultValue={dateInputValue(person?.deathDate)}
              />
              <p className="mt-1 text-xs text-muted">
                A data é opcional se você souber só que a pessoa faleceu.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Sem esta marcação, a pessoa aparece como viva.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="photo" className="field-label">
            Foto
          </label>
          {person?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photoUrl}
              alt=""
              width={720}
              height={720}
              className="mb-3 h-28 w-28 rounded-full object-cover object-top"
            />
          ) : null}
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="w-full text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-accent file:px-4 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.22em] file:text-[#f4f1e6] hover:file:bg-accent-dark"
          />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="field-label">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={person?.notes ?? ""}
          className="input-line"
        />
      </div>
      {autosave ? (
        <SaveStatus />
      ) : (
        <button
          type="submit"
          className="btn-solid"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}

function SaveStatus() {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending) setSaved(true);
    wasPending.current = pending;
  }, [pending]);

  return (
    <p className="text-sm text-muted" aria-live="polite">
      {pending ? "Salvando…" : saved ? "Salvo" : "As alterações são salvas automaticamente."}
    </p>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="input-line"
      />
    </div>
  );
}
