import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function Header() {
  return (
    <header className="bg-[#f4f1e6]">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <Link href="/arvore" className="flex items-center gap-3.5">
            <BrandLogo size="sm" priority />
            <span className="min-w-0">
              <span className="block text-[1.4rem] leading-none uppercase tracking-[0.34em] text-[#3d3d3d]">
                Rotsen
              </span>
              <span className="mt-1.5 block font-serif text-[13px] italic leading-none text-[#6d7b63]">
                Árvore Genealógica
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-6 sm:gap-8">
            <Link href="/arvore" className="link-nav">
              Árvore
            </Link>
            <Link href="/busca" className="link-nav">
              Buscar
            </Link>
            <Link href="/pessoas" className="link-nav">
              Pessoas
            </Link>
            <Link href="/pessoas/nova" className="btn-solid btn-sm">
              Nova pessoa
            </Link>
          </nav>
        </div>
      </div>
      <div className="rule" />
    </header>
  );
}
