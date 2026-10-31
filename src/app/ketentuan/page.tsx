import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  MapPin,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import { services, TARIFF_RULES, units } from "@/lib/catalog";
import { GOOGLE_FORM_CONFIG } from "@/lib/google-form";
import { rupiah } from "@/lib/utils";

export default function TermsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 lg:p-10 border border-slate-800">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
            <span>PANDUAN LAYANAN & SOP OPERASIONAL</span>
            <span aria-hidden="true">·</span>
            <span>BRIGHTON HUB CIBUBUR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Ketentuan Tarif & Standar Layanan Smart Messenger
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Rincian perhitungan biaya perjalanan, batas teknis pemasangan banner,
            serta daftar 9 layanan resmi yang tersinkronisasi dengan Google Form
            Smart Messenger Brighton HUB Cibubur.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors whitespace-nowrap"
            >
              <span>Mulai Buat Pesanan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={GOOGLE_FORM_CONFIG.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors whitespace-nowrap"
            >
              <span>Buka Google Form Resmi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Tariff Formulas */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              01. SKEMA NON-BANNER
            </span>
            <MapPin className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Tarif Perjalanan Messenger (Tanpa Pasang Banner)
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono tabular-nums text-sm font-bold text-slate-900">
            Total Jarak Tempuh PP (km) × {rupiah(TARIFF_RULES.ratePerKmRoundTrip)}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Berlaku untuk pengantaran MoU transaksi, pengambilan/pengiriman
            dokumen PA, pengantaran kunci properti, pembukaan akses kunjungan
            klien, BLT developer, distribusi flayer, maupun pengiriman hadiah.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">
              02. SKEMA PEMASANGAN BANNER
            </span>
            <Ruler className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Tarif Perjalanan + Jasa Pemasangan Banner
          </h2>
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 font-mono tabular-nums text-sm font-bold text-slate-900">
            (Jarak Tempuh PP × {rupiah(TARIFF_RULES.ratePerKmRoundTrip)}) + (
            Jumlah Banner × {rupiah(TARIFF_RULES.bannerInstallFee)})
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Jarak pemasangan banner maksimal{" "}
                <strong className="font-mono tabular-nums">
                  {TARIFF_RULES.maxBannerDistanceKm} km
                </strong>
                .
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Tinggi pemasangan banner maksimal{" "}
                <strong className="font-mono tabular-nums">
                  {TARIFF_RULES.maxBannerHeightMeters} meter
                </strong>
                .
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Operational Rules & Catalog */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-amber-700">
                KATALOG LAYANAN RESMI
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                9 Jenis Tugas Smart Messenger
              </h2>
            </div>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {services.map((s, idx) => (
              <div
                key={s.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-xs font-bold text-slate-400">
                      0{idx + 1}.
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {s.label}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 pl-6">
                    {s.description}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 pl-6 sm:pl-0 shrink-0">
                  {s.surchargePerUnit > 0
                    ? `+${rupiah(s.surchargePerUnit)} / banner`
                    : s.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="text-base font-bold text-slate-900">
                Ketentuan Pembayaran & Konfirmasi Owner
              </h2>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li>
                <strong className="text-slate-900">Pembayaran di Awal:</strong>{" "}
                Pembayaran (payment) dilakukan di awal sebelum proses pemasangan
                atau pengerjaan Smart Messenger dimulai. Hubungi staf kantor
                cabang untuk verifikasi jarak dan instruksi pembayaran.
              </li>
              <li>
                <strong className="text-slate-900">
                  Kelengkapan Titik Lokasi:
                </strong>{" "}
                Mohon memberikan alamat lengkap (blok & nomor rumah) atau share
                location (sharelock) beserta foto properti kepada staf cabang
                agar messenger dapat menemukan lokasi dengan akurat.
              </li>
              <li>
                <strong className="text-slate-900">Izin Pemilik Properti:</strong>{" "}
                Pastikan pemilik/owner telah dikonfirmasi sebelum messenger
                diberangkatkan untuk pemasangan banner atau pembukaan kunci.
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              31 Unit Brighton Terdaftar
            </h2>
            <p className="text-xs text-slate-500">
              Seluruh unit berikut tersedia di formulir website dan terhubung
              langsung ke daftar pilihan UNIT pada Google Form:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1 text-xs text-slate-700">
              {units.map((u, idx) => (
                <span key={u} className="font-mono text-[11px]">
                  {u}
                  {idx < units.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
