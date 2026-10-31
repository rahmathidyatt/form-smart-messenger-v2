import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { GOOGLE_FORM_CONFIG } from "@/lib/google-form";

export default function MasukPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
          <ShieldCheck className="w-4 h-4" />
          <span>AKSES TANPA LOGIN TAMBAHAN</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Pemesanan Langsung Tanpa Akun Terpisah
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Untuk mempercepat operasional agent Brighton HUB Cibubur, pengajuan
          Smart Messenger tidak memerlukan pembuatan akun baru. Anda dapat
          langsung mengisi formulir order interaktif atau membuka Google Form
          resmi.
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors"
          >
            <span>Buka Formulir Pemesanan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <span>Buka Panel Staf Operasional</span>
          </Link>
          <a
            href={GOOGLE_FORM_CONFIG.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            <span>Google Form HRD</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
