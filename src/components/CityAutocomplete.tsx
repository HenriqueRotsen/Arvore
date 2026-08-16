"use client";

import { useEffect, useId, useRef, useState } from "react";

type CitySuggestion = {
  id: number;
  name: string;
  uf: string;
  label: string;
};

export function CityAutocomplete({
  name,
  label,
  defaultValue = "",
  onCommit,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  onCommit?: () => void;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setCities([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(
          `/api/cidades?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { cities: CitySuggestion[] };
        setCities(data.cities);
        setActive(0);
        if (focusedRef.current) setOpen(true);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setCities([]);
        }
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [value]);

  function choose(city: CitySuggestion) {
    setValue(city.label);
    setCities([]);
    setOpen(false);
    window.setTimeout(() => onCommit?.(), 0);
  }

  return (
    <div className="relative">
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && cities.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Ex.: Belo Horizonte"
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          focusedRef.current = true;
          if (cities.length > 0) setOpen(true);
        }}
        onBlur={() => {
          focusedRef.current = false;
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (!open || cities.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % cities.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + cities.length) % cities.length);
          }
          if (event.key === "Enter" && cities[active]) {
            event.preventDefault();
            choose(cities[active]);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        className="input-line"
      />
      {open && cities.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-line bg-background py-1"
        >
          {cities.map((city, index) => (
            <li key={city.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === active ? "bg-accent/10 text-accent-dark" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(city);
                }}
              >
                {city.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
