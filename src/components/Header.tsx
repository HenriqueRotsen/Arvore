"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const links = [
  { href: "/arvore", label: "Árvore" },
  { href: "/busca", label: "Buscar" },
  { href: "/pessoas", label: "Pessoas" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-[#f4f1e6]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-5">
        <Link href="/arvore" className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <BrandLogo size="sm" priority />
          <span className="min-w-0">
            <span className="block text-[1.15rem] leading-none uppercase tracking-[0.28em] text-[#3d3d3d] sm:text-[1.4rem] sm:tracking-[0.34em]">
              Rotsen
            </span>
            <span className="mt-1 hidden font-serif text-[13px] italic leading-none text-[#6d7b63] sm:block">
              Árvore Genealógica
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`link-nav ${pathname === link.href || pathname.startsWith(`${link.href}/`) ? "text-foreground" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/pessoas/nova" className="btn-solid btn-sm">
            Nova pessoa
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center text-accent-dark md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] overflow-y-auto border-t border-line bg-[#f4f1e6] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-14 items-center border-b border-line text-[13px] uppercase tracking-[0.22em] text-accent-dark"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/pessoas/nova" className="btn-solid mt-4 w-full">
            Nova pessoa
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
