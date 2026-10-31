"use client";

import { Phone } from "lucide-react";

export function AdminDashboard() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 block">
          Kontak Smart Messenger
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
          Mas Apry
        </h1>
        <p className="font-mono tabular-nums text-2xl sm:text-3xl font-extrabold text-slate-900">
          0895391196166
        </p>
        <div className="pt-2">
          <a
            href="https://wa.me/62895391196166"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span>Hubungi via WhatsApp (0895391196166)</span>
          </a>
        </div>
      </section>
    </div>
  );
}
