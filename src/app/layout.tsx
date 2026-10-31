import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { GOOGLE_FORM_CONFIG } from "@/lib/google-form";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brighton Smart Messenger Hub | Form Order & Kalkulator Operasional",
  description:
    "Platform pemesanan interaktif, kalkulator estimasi tarif perjalanan & banner, serta integrasi langsung Google Form Smart Messenger Brighton HUB Cibubur.",
  openGraph: {
    title: "Brighton Smart Messenger Hub",
    description:
      "Platform pemesanan interaktif, kalkulator estimasi tarif perjalanan & banner, serta integrasi langsung Google Form Smart Messenger Brighton HUB Cibubur.",
  },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <a className="skip-link" href="#main">
          Lewati ke konten utama
        </a>
        <Navigation />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Brighton HUB Cibubur</span>
              <span aria-hidden="true">·</span>
              <span>Layanan Operasional Smart Messenger</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link href="/" className="hover:text-slate-900 transition-colors">
                Formulir Order
              </Link>
              <Link href="/riwayat" className="hover:text-slate-900 transition-colors">
                Riwayat & Status
              </Link>
              <Link href="/ketentuan" className="hover:text-slate-900 transition-colors">
                Ketentuan & Tarif
              </Link>
              <Link href="/admin" className="hover:text-slate-900 transition-colors">
                Panel Staf
              </Link>
              <a
                href={GOOGLE_FORM_CONFIG.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 transition-colors font-medium text-slate-700"
              >
                Google Form Resmi ↗
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
