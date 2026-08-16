import type { ReactNode } from "react";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );
}
