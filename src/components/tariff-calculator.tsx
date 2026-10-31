"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Ruler,
} from "lucide-react";
import { TARIFF_RULES } from "@/lib/catalog";
import {
  buildPrefilledGoogleFormUrl,
  calculateTariffEstimate,
  formatAddressForGoogleForm,
  formatOtherNotesForGoogleForm,
  GOOGLE_FORM_CONFIG,
  resolveGoogleFormTaskLabel,
  type GoogleFormSubmissionInput,
} from "@/lib/google-form";
import { rupiah } from "@/lib/utils";

interface TariffCalculatorProps {
  roundTripKm: number;
  onRoundTripKmChange: (km: number) => void;
  hasBanner: boolean;
  bannerCount: number;
  onBannerCountChange: (count: number) => void;
  bannerHeight: number;
  onBannerHeightChange: (height: number) => void;
  liveFormValues: GoogleFormSubmissionInput;
}

export function TariffCalculator({
  roundTripKm,
  onRoundTripKmChange,
  hasBanner,
  bannerCount,
  onBannerCountChange,
  bannerHeight,
  onBannerHeightChange,
  liveFormValues,
}: TariffCalculatorProps) {
  const [copiedPrefill, setCopiedPrefill] = useState(false);
  const [showSchema, setShowSchema] = useState(true);

  const estimate = calculateTariffEstimate({
    roundTripKm,
    hasBanner,
    bannerCount,
    bannerHeightMeters: bannerHeight,
  });

  const prefillUrl = buildPrefilledGoogleFormUrl({
    ...liveFormValues,
    banners: hasBanner ? bannerCount : undefined,
    height: hasBanner ? bannerHeight : undefined,
    estimatedKm: roundTripKm > 0 ? roundTripKm : undefined,
  });

  const handleCopyPrefill = async () => {
    try {
      await navigator.clipboard.writeText(prefillUrl);
      setCopiedPrefill(true);
      setTimeout(() => setCopiedPrefill(false), 2500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const mappedPreview = [
    {
      entry: GOOGLE_FORM_CONFIG.fields.name_code.entryId,
      label: "Nama & Kode Agent",
      value: liveFormValues.name || "—",
    },
    {
      entry: GOOGLE_FORM_CONFIG.fields.unit.entryId,
      label: "Unit Brighton",
      value: liveFormValues.unit || "—",
    },
    {
      entry: GOOGLE_FORM_CONFIG.fields.date.entryId,
      label: "Tanggal Pengerjaan",
      value: liveFormValues.date || "—",
    },
    {
      entry: GOOGLE_FORM_CONFIG.fields.address.entryId,
      label: "Alamat Lengkap",
      value: liveFormValues.address
        ? formatAddressForGoogleForm(liveFormValues.address, liveFormValues.maps)
        : "—",
    },
    {
      entry: GOOGLE_FORM_CONFIG.fields.task.entryId,
      label: "Tugas Messenger",
      value: liveFormValues.task
        ? resolveGoogleFormTaskLabel(liveFormValues.task)
        : "—",
    },
    {
      entry: GOOGLE_FORM_CONFIG.fields.other.entryId,
      label: "Tugas Lainnya / Catatan",
      value:
        formatOtherNotesForGoogleForm({
          ...liveFormValues,
          banners: hasBanner ? bannerCount : undefined,
          height: hasBanner ? bannerHeight : undefined,
          estimatedKm: roundTripKm > 0 ? roundTripKm : undefined,
        }) || "—",
    },
    {
      entry: GOOGLE_FORM_CONFIG.fields.owner.entryId,
      label: "Konfirmasi Owner",
      value: liveFormValues.owner || "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Interactive Tariff & Eligibility Simulator */}
      <section
        aria-label="Kalkulator estimasi tarif Smart Messenger"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-amber-700">
              SIMULATOR BIAYA OPERASIONAL
            </p>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Kalkulator Tarif & Kelayakan
            </h2>
          </div>
          <Calculator className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-5">
          {/* Distance Slider & Input */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <label htmlFor="calc-distance" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Estimasi Jarak Tempuh PP (km)</span>
              </label>
              <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                {roundTripKm} km
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="calc-distance"
                type="range"
                min={1}
                max={40}
                step={1}
                value={roundTripKm}
                onChange={(e) => onRoundTripKmChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <input
                type="number"
                aria-label="Input angka jarak PP dalam kilometer"
                min={0}
                max={100}
                value={roundTripKm}
                onChange={(e) =>
                  onRoundTripKmChange(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-20 px-2.5 py-1.5 text-sm font-mono tabular-nums text-right border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
              <span>Tarif dasar: Rp900 / km PP</span>
              <span>Batas pasang banner: maks. 25 km</span>
            </div>
          </div>

          {/* Banner Specific Controls */}
          {hasBanner && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="calc-banners"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Jumlah Banner
                  </label>
                  <input
                    id="calc-banners"
                    type="number"
                    min={1}
                    max={100}
                    value={bannerCount}
                    onChange={(e) =>
                      onBannerCountChange(
                        Math.max(1, Math.min(100, Number(e.target.value) || 1))
                      )
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="calc-height"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Tinggi Pasang (m)
                  </label>
                  <input
                    id="calc-height"
                    type="number"
                    min={0.5}
                    max={6}
                    step={0.5}
                    value={bannerHeight}
                    onChange={(e) =>
                      onBannerHeightChange(Math.max(0.5, Number(e.target.value) || 1))
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Eligibility Check Banner */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  estimate.eligibleForBanner
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {estimate.eligibleForBanner ? (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">
                    {estimate.eligibleForBanner
                      ? "Memenuhi syarat batas teknis pemasangan banner"
                      : "Melewati batas standar pemasangan banner"}
                  </p>
                  {!estimate.distanceWithinBannerLimit && (
                    <p>
                      Jarak {roundTripKm} km melebihi batas maksimal{" "}
                      {TARIFF_RULES.maxBannerDistanceKm} km. Konfirmasikan ke staf
                      kantor cabang.
                    </p>
                  )}
                  {!estimate.heightWithinBannerLimit && (
                    <p className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Tinggi {bannerHeight} m melebihi batas maksimal{" "}
                        {TARIFF_RULES.maxBannerHeightMeters} meter.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown Summary */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>
                Biaya perjalanan ({roundTripKm} km × Rp900)
              </span>
              <span className="font-mono tabular-nums font-medium text-white">
                {rupiah(estimate.travelCost)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>
                Jasa pasang banner (
                {hasBanner ? `${bannerCount} × Rp5.000` : "Tidak dipilih"})
              </span>
              <span className="font-mono tabular-nums font-medium text-white">
                {rupiah(estimate.bannerCost)}
              </span>
            </div>
            <div className="pt-2.5 border-t border-slate-800 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-400 block">
                  ESTIMASI TOTAL BIAYA
                </span>
                <span className="text-[11px] text-slate-400">
                  Dikonfirmasi staf sebelum pembayaran
                </span>
              </div>
              <span className="font-mono tabular-nums text-xl font-extrabold text-amber-400">
                {rupiah(estimate.totalEstimatedCost)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Google Form Connection & Pre-fill Bridge */}
      <section
        aria-label="Koneksi langsung Google Form"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              INTEGRASI LANGSUNG GOOGLE FORMS
            </p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Sinkronisasi 7 Kolom Form HRD
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowSchema((s) => !s)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            {showSchema ? "Sembunyikan" : "Lihat Pemetaan"}
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          Setiap isian Anda secara otomatis dipetakan ke parameter resmi{" "}
          <span className="font-mono text-slate-800">forms.gle/DYqwvwHXGxERZihD7</span>{" "}
          tanpa memerlukan aplikasi perantara tambahan.
        </p>

        {showSchema && (
          <dl className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
            {mappedPreview.map((item) => (
              <div
                key={item.entry}
                className="px-3 py-2 bg-slate-50/60 flex items-start justify-between gap-3"
              >
                <dt className="text-slate-600 font-medium shrink-0">
                  <span>{item.label}</span>
                  <span className="block font-mono text-[10px] text-slate-400">
                    {item.entry}
                  </span>
                </dt>
                <dd className="font-medium text-slate-900 text-right break-words max-w-[250px]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <a
            href={prefillUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Buka Form Terisi Otomatis</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={handleCopyPrefill}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {copiedPrefill ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Tautan Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Salin Link Pre-fill</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
