"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingHero() {
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLogo(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#1a1c18] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing-tree.jpg?v=2"
        alt=""
        className="landing-zoom absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28),rgba(0,0,0,0.52)_80%)]"
      />

      <div
        className={`relative z-10 flex flex-col items-center px-6 text-center transition-all duration-1000 ease-out ${
          showLogo ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rotsen-logo-white.png"
          alt="Rotsen — Árvore Genealógica"
          className="h-auto w-[min(22rem,78vw)] drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
        />
        <Link
          href="/arvore"
          className="mt-6 inline-flex min-h-11 items-center text-sm uppercase tracking-[0.28em] text-[#f4f1e6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] transition hover:text-white"
        >
          Ver a árvore
        </Link>
        <div className="mt-6 flex flex-col items-center gap-4 sm:mt-7 sm:flex-row sm:gap-10">
          <Link
            href="/busca"
            className="inline-flex min-h-11 items-center text-sm uppercase tracking-[0.28em] text-[#f4f1e6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] transition hover:text-white"
          >
            Buscar
          </Link>
          <Link
            href="/pessoas"
            className="inline-flex min-h-11 items-center text-sm uppercase tracking-[0.28em] text-[#f4f1e6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] transition hover:text-white"
          >
            Pessoas
          </Link>
        </div>
      </div>
    </main>
  );
}
