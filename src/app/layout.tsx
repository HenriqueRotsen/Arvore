import type { Metadata } from "next";
import { Hammersmith_One, Playfair_Display } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

const hammersmith = Hammersmith_One({
  variable: "--font-hammersmith",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rotsen — Árvore Genealógica",
  description:
    "Árvore genealógica colaborativa da família Rotsen — veja parentescos e cadastre pessoas e vínculos.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${hammersmith.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
