import type { Metadata, Viewport } from "next";
import { Hammersmith_One, Playfair_Display } from "next/font/google";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f1e6",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${hammersmith.variable} ${playfair.variable} min-h-dvh antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
