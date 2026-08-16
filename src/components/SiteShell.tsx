"use client";

import { Header } from "@/components/Header";
import { usePathname } from "next/navigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const landing = pathname === "/";

  return (
    <>
      {landing ? null : <Header />}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );
}
