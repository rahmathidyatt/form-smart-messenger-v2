"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileCheck2,
  Info,
  MapPin,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { agentFormSchema, type AgentFormInput } from "@/lib/agent-form";
import { services, TARIFF_RULES, units } from "@/lib/catalog";
import {
  buildPrefilledGoogleFormUrl,
  calculateTariffEstimate,
  formatOtherNotesForGoogleForm,
  resolveGoogleFormTaskLabel,
} from "@/lib/google-form";
import { receiptSchema, type OrderInput, type Receipt } from "@/lib/submission";
import { jakartaDate, rupiah } from "@/lib/utils";
import { Challenge } from "@/components/challenge";
import { TariffCalculator } from "@/components/tariff-calculator";

const storageKey = "smart-messenger-pending-v3";
const localHistoryKey = "smart-messenger-history-v3";

const initial: AgentFormInput = {
  email: "",
  nameCode: "",
  unit: "",
  date: "",
  address: "",
  maps: "",
  task: "",
  other: "",
  owner: "",
  consent: false,
};

type Attempt = { receipt: Receipt; order: OrderInput };

interface SubmittedReceiptState {
  id: string;
  responseId: string;
  updatedAt: string;
  prefillUrl: string;
  syncMethod: string;
  order: OrderInput;
  estimatedCost: number;
  roundTripKm: number;
  bannerCount: number;
  bannerHeight: number;
}

function addDaysToJakartaDate(daysToAdd: number): string {
  const base = jakartaDate();
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

export function Brand() {
  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <span className="text-lg font-extrabold tracking-tight text-slate-900">
          BRIGHT<span className="text-amber-600">O</span>N HUB CIBUBUR
        </span>
        <span className="block text-xs font-medium text-slate-500">
          Operasional Smart Messenger
        </span>
      </div>
      <span className="text-xs font-semibold text-slate-600">
        Formulir Terpadu
      </span>
    </div>
  );
}

export function SimpleForm({ ready = true }: { ready?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sentReceipt, setSentReceipt] = useState<SubmittedReceiptState | null>(null);
  const [copiedWa, setCopiedWa] = useState(false);

  // Interactive calculator & helper state
  const [unitSearch, setUnitSearch] = useState("");
  const [roundTripKm, setRoundTripKm] = useState(10);
  const [bannerCount, setBannerCount] = useState(2);
  const [bannerHeight, setBannerHeight] = useState(2.5);

  // Optional Turnstile state (only required if NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured)
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const [challenge, setChallenge] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);

  const attempt = useRef<Attempt | null>(null);
  const inFlight = useRef(false);
  const receiptRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (sentReceipt && receiptRef.current) {
      receiptRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sentReceipt]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AgentFormInput, unknown, OrderInput>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: initial,
    mode: "onSubmit",
  });

  const watchedValues = useWatch({ control });
  const task = watchedValues.task || "";
  const owner = watchedValues.owner || "";
  const selectedUnit = watchedValues.unit || "";
  const hasBanner = task === "banner";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!receiptSchema.safeParse(saved.receipt).success) return;
      const { name, code, ...rest } = saved.order;
      const ui = { ...rest, nameCode: code ? `${name} ${code}` : name };
      if (!agentFormSchema.safeParse(ui).success) return;
      attempt.current = saved;
      reset(ui);
    } catch {
      // Ignore storage access errors
    }
  }, [reset]);

  const filteredUnits = units.filter(
    (u) =>
      !unitSearch.trim() ||
      u.toLowerCase().includes(unitSearch.trim().toLowerCase()) ||
      u === selectedUnit
  );

  const applyScenarioPreset = (preset: "banner" | "mou" | "keys") => {
    setMessage("");
    setSentReceipt(null);
    if (preset === "banner") {
      setRoundTripKm(14);
      setBannerCount(2);
      setBannerHeight(2.5);
      reset({
        email: "rahmat.agent@brighton.co.id",
        nameCode: "Rahmat Hidayat (PA-208)",
        unit: "VISION",
        date: addDaysToJakartaDate(1),
        address: "Cluster Boston Blok B4 No. 12, Kota Wisata Cibubur, Gunung Putri",
        maps: "https://maps.app.goo.gl/cibuburwisata12",
        task: "banner",
        other: "Pasang 2 banner di pagar depan dan balkon lantai 1",
        owner: "YA",
        consent: true,
      });
    } else if (preset === "mou") {
      setRoundTripKm(18);
      reset({
        email: "siti.rahma@brighton.co.id",
        nameCode: "Siti Rahmawati (PA-118)",
        unit: "CROWN",
        date: addDaysToJakartaDate(1),
        address: "Legenda Wisata Zona Cleopatra Blok C2 No. 8, Cibubur",
        maps: "https://maps.google.com/?q=-6.3712,106.9521",
        task: "mou",
        other: "Antar dokumen MoU transaksi untuk ditandatangani pemilik pukul 14.00 WIB",
        owner: "YA",
        consent: true,
      });
    } else {
      setRoundTripKm(8);
      reset({
        email: "hendrik.wijaya@brighton.co.id",
        nameCode: "Hendrik Wijaya (PA-772)",
        unit: "MASTERPIECE",
        date: addDaysToJakartaDate(2),
        address: "CitraGran Cibubur Cluster Brentwood Blok H1 No. 5",
        maps: "-",
        task: "keys",
        other: "Ambil kunci properti di pos sekuriti atas nama Pak Budi",
        owner: "TIDAK",
        consent: true,
      });
    }
  };

  async function request(path: string, body: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35000),
    });
    return res.json();
  }

  async function submit(order: OrderInput) {
    if (inFlight.current) return;
    if (turnstileEnabled && !challenge) {
      setMessage("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setSentReceipt(null);
    setMessage("");

    // Enrich `other` with banner/distance info if task is banner and user used the calculator
    const enrichedOther = formatOtherNotesForGoogleForm({
      name: order.name,
      code: order.code,
      unit: order.unit,
      date: order.date,
      address: order.address,
      maps: order.maps,
      task: order.task,
      other: order.other,
      owner: order.owner,
      banners: order.task === "banner" ? bannerCount : undefined,
      height: order.task === "banner" ? bannerHeight : undefined,
      estimatedKm: roundTripKm > 0 ? roundTripKm : undefined,
    });

    const finalOrder: OrderInput = {
      ...order,
      other: enrichedOther.slice(0, 1000),
    };

    let current = attempt.current;
    if (current && JSON.stringify(current.order) !== JSON.stringify(finalOrder)) {
      current = null;
    }
    if (!current) {
      current = {
        receipt: {
          id: crypto.randomUUID(),
          token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
            v.toString(16).padStart(2, "0")
          ).join(""),
        },
        order: finalOrder,
      };
      attempt.current = current;
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      // Ignore sessionStorage failure
    }

    const tariff = calculateTariffEstimate({
      roundTripKm,
      hasBanner: finalOrder.task === "banner",
      bannerCount,
      bannerHeightMeters: bannerHeight,
    });

    const fallbackPrefillUrl = buildPrefilledGoogleFormUrl({
      name: finalOrder.name,
      code: finalOrder.code,
      email: finalOrder.email,
      unit: finalOrder.unit,
      date: finalOrder.date,
      address: finalOrder.address,
      maps: finalOrder.maps,
      task: finalOrder.task,
      other: finalOrder.other,
      owner: finalOrder.owner,
    });

    try {
      const data = await request("/api/orders", {
        ...current.receipt,
        order: current.order,
        challenge: challenge || "direct-mode",
        website: "",
      });

      if (data.ok && data.data) {
        const receiptRecord: SubmittedReceiptState = {
          id: data.data.id || current.receipt.id,
          responseId:
            data.data.responseId ||
            `GF-${new Date().getFullYear()}-${current.receipt.id.slice(0, 8).toUpperCase()}`,
          updatedAt: data.data.updatedAt || new Date().toISOString(),
          prefillUrl: data.data.prefillUrl || fallbackPrefillUrl,
          syncMethod: data.data.syncMethod || "direct_google_form",
          order: finalOrder,
          estimatedCost: tariff.totalEstimatedCost,
          roundTripKm,
          bannerCount: finalOrder.task === "banner" ? bannerCount : 0,
          bannerHeight: finalOrder.task === "banner" ? bannerHeight : 0,
        };

        try {
          sessionStorage.removeItem(storageKey);
          const prev = JSON.parse(localStorage.getItem(localHistoryKey) || "[]");
          localStorage.setItem(
            localHistoryKey,
            JSON.stringify([receiptRecord, ...prev].slice(0, 30))
          );
        } catch {
          // Ignore storage error
        }

        attempt.current = null;
        setSentReceipt(receiptRecord);
        setMessage("");
        return;
      }

      if (!data.ok) {
        const messages: Record<string, string> = {
          CHALLENGE: "Verifikasi kedaluwarsa. Silakan verifikasi kembali.",
          VALIDATION: "Periksa kembali kolom yang wajib diisi.",
          RATE_LIMIT: "Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.",
          CONFLICT: "Pesanan sebelumnya sedang diperiksa staf kantor.",
        };
        if (messages[data.code]) {
          setMessage(messages[data.code]);
          return;
        }
      }

      setMessage(
        "Pengiriman sedang disinkronkan. Anda juga dapat langsung membuka tautan Google Form terisi otomatis di samping."
      );
    } catch {
      setMessage(
        "Koneksi terganggu. Anda tetap dapat melanjutkan melalui tombol Google Form Terisi Otomatis."
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
      if (turnstileEnabled) {
        setChallenge("");
        setChallengeKey((k) => k + 1);
      }
    }
  }

  function err(field: keyof AgentFormInput) {
    return errors[field] ? (
      <span
        className="block text-xs font-medium text-red-600 mt-1.5"
        id={`${field}-error`}
        role="alert"
      >
        {errors[field]?.message}
      </span>
    ) : null;
  }

  function a11y(field: keyof AgentFormInput) {
    return {
      "aria-invalid": !!errors[field],
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
    };
  }

  const liveFormSnapshot = {
    name: watchedValues.nameCode || "",
    email: watchedValues.email || "",
    unit: watchedValues.unit || "",
    date: watchedValues.date || "",
    address: watchedValues.address || "",
    maps: watchedValues.maps || "",
    task: watchedValues.task || "",
    other: watchedValues.other || "",
    owner: watchedValues.owner || "",
  };

  const livePrefillUrl = buildPrefilledGoogleFormUrl({
    ...liveFormSnapshot,
    banners: hasBanner ? bannerCount : undefined,
    height: hasBanner ? bannerHeight : undefined,
    estimatedKm: roundTripKm > 0 ? roundTripKm : undefined,
  });

  const handleCopyWhatsAppReceipt = async (receipt: SubmittedReceiptState) => {
    const text = [
      `*KONFIRMASI ORDER SMART MESSENGER - BRIGHTON HUB CIBUBUR*`,
      `No. Referensi: ${receipt.responseId}`,
      `Agent: ${receipt.order.name}`,
      `Unit: ${receipt.order.unit}`,
      `Tanggal Pengerjaan: ${receipt.order.date}`,
      `Tugas: ${resolveGoogleFormTaskLabel(receipt.order.task)}`,
      `Alamat: ${receipt.order.address}`,
      receipt.order.maps ? `Maps: ${receipt.order.maps}` : null,
      receipt.order.other ? `Catatan: ${receipt.order.other}` : null,
      `Konfirmasi Owner: ${receipt.order.owner}`,
      `Estimasi Tarif (${receipt.roundTripKm} km PP): ${rupiah(receipt.estimatedCost)}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Hero Section & Regional Trust Signal */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 lg:p-10 mb-8 border border-slate-800">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-400 mb-3">
            <span>Brighton HUB Cibubur</span>
            <span aria-hidden="true">·</span>
            <span>Sistem Order & Kalkulator Smart Messenger</span>
            <span aria-hidden="true">·</span>
            <span>Terhubung ke Google Form HRD</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight"
            style={{ textWrap: "balance" }}
          >
            Form Order Smart Messenger & Simulasi Tarif Lapangan
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Ajukan pemasangan banner properti, pengiriman MoU transaksi, pengambilan
            kunci klien, atau distribusi dokumen PA. Terintegrasi langsung dengan{" "}
            <span className="text-white font-medium">
              Google Form Smart Messenger Brighton HUB Cibubur
            </span>{" "}
            tanpa perlu login tambahan.
          </p>
        </div>

        {/* Full-Width 4-Column Operational KPI Strip */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <span className="text-xs text-slate-400 block">Tarif Perjalanan PP</span>
            <strong className="font-mono tabular-nums text-lg sm:text-xl font-bold text-amber-400 mt-0.5 block">
              Rp900 / km
            </strong>
            <span className="text-[11px] text-slate-400">
              Dihitung total jarak pulang-pergi
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Jasa Pasang Banner</span>
            <strong className="font-mono tabular-nums text-lg sm:text-xl font-bold text-white mt-0.5 block">
              +Rp5.000 / banner
            </strong>
            <span className="text-[11px] text-slate-400">
              Maks. jarak 25 km & tinggi 4 meter
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Cakupan Unit Cabang</span>
            <strong className="font-mono tabular-nums text-lg sm:text-xl font-bold text-white mt-0.5 block">
              31 Unit Aktif
            </strong>
            <span className="text-[11px] text-slate-400">
              AKASIA hingga WISDOM & CIRCLE
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Koneksi Google Form</span>
            <strong className="font-mono tabular-nums text-lg sm:text-xl font-bold text-emerald-400 mt-0.5 block">
              7 Kolom Resmi
            </strong>
            <span className="text-[11px] text-slate-400">
              Sinkronisasi langsung & tautan pre-fill
            </span>
          </div>
        </div>
      </section>

      {/* Receipt / Confirmation State when an order is submitted */}
      {sentReceipt && (
        <section
          ref={receiptRef}
          role="status"
          aria-live="polite"
          className="mb-8 bg-white border-2 border-emerald-500 rounded-2xl p-6 sm:p-8 shadow-xs scroll-mt-20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <span>PESANAN BERHASIL DICATAT & DISIAPKAN</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {sentReceipt.responseId}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  Bukti Pengajuan Smart Messenger
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Data pesanan telah disimpan di sistem operasional dan siap
                  diteruskan/diverifikasi pada Google Form resmi HRD.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={sentReceipt.prefillUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Buka & Kirim di Google Form (Terisi Otomatis)</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => handleCopyWhatsAppReceipt(sentReceipt)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedWa ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Format WA Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan Konfirmasi Staf</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <dt className="text-slate-500 font-medium">Nama & Kode Agent</dt>
              <dd className="text-slate-900 font-bold text-sm mt-1">
                {sentReceipt.order.name}
              </dd>
              <dd className="text-slate-500 mt-0.5">{sentReceipt.order.email}</dd>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <dt className="text-slate-500 font-medium">Unit & Jadwal</dt>
              <dd className="text-slate-900 font-bold text-sm mt-1">
                Unit {sentReceipt.order.unit}
              </dd>
              <dd className="font-mono tabular-nums text-slate-600 mt-0.5">
                Tanggal: {sentReceipt.order.date}
              </dd>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <dt className="text-slate-500 font-medium">Tugas & Status Owner</dt>
              <dd className="text-slate-900 font-bold text-sm mt-1">
                {resolveGoogleFormTaskLabel(sentReceipt.order.task)}
              </dd>
              <dd className="text-slate-600 mt-0.5">
                Konfirmasi Owner: <strong>{sentReceipt.order.owner}</strong>
              </dd>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <dt className="text-amber-900 font-medium">
                Estimasi Biaya ({sentReceipt.roundTripKm} km PP)
              </dt>
              <dd className="font-mono tabular-nums text-slate-900 font-extrabold text-base mt-1">
                {rupiah(sentReceipt.estimatedCost)}
              </dd>
              <dd className="text-[11px] text-amber-800 mt-0.5">
                Menunggu verifikasi jarak staf cabang
              </dd>
            </div>
          </dl>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                ID Pengajuan:{" "}
                <code className="font-mono text-slate-800">{sentReceipt.id}</code>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/riwayat"
                className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Lihat di Riwayat & Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  reset(initial);
                  setSentReceipt(null);
                }}
                className="font-semibold text-amber-700 hover:text-amber-800"
              >
                Buat Pesanan Baru
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main 2-Column Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dynamic Order Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Preset Bar for Instant Interactive Testing */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span>Isi Cepat Contoh Penugasan:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyScenarioPreset("banner")}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-amber-100 hover:text-slate-900 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Contoh Pasang Banner
              </button>
              <button
                type="button"
                onClick={() => applyScenarioPreset("mou")}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-amber-100 hover:text-slate-900 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Contoh Antar MoU
              </button>
              <button
                type="button"
                onClick={() => applyScenarioPreset("keys")}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-amber-100 hover:text-slate-900 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Contoh Kunci Properti
              </button>
            </div>
          </div>

          {!ready && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Mode koneksi langsung Google Form aktif. Anda dapat mengirim
                pesanan dari halaman ini atau membuka tautan Google Form yang
                sudah terisi otomatis.
              </p>
            </div>
          )}

          <form
            noValidate
            onSubmit={(event) => {
              void handleSubmit(submit)(event);
            }}
            className="space-y-6"
          >
            <fieldset disabled={busy} className="space-y-6">
              {/* Section 01: Data Pemesan & Unit */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-amber-700">
                      01. IDENTITAS AGENT
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Data Pemesan & Unit Brighton
                    </h2>
                  </div>
                  <UserCheck className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                </div>

                <div className="mt-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="nameCode"
                        className="block text-xs font-semibold text-slate-800 mb-1.5"
                      >
                        Nama dan Kode Agent <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="nameCode"
                        type="text"
                        placeholder="Contoh: Rahmat Hidayat (PA-208)"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                        {...register("nameCode")}
                        {...a11y("nameCode")}
                      />
                      {err("nameCode")}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold text-slate-800 mb-1.5"
                      >
                        Email Pemesan <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="nama.agent@brighton.co.id"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                        {...register("email")}
                        {...a11y("email")}
                      />
                      {err("email")}
                    </div>
                  </div>

                  {/* Interactive Unit Selector with Search Filter */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label
                        htmlFor="unit"
                        className="block text-xs font-semibold text-slate-800"
                      >
                        Unit Brighton <span className="text-red-600">*</span>
                      </label>
                      <div className="relative w-full sm:w-56">
                        <Search
                          className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          aria-label="Cari nama unit Brighton"
                          placeholder="Filter 31 unit (mis. VISION)..."
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <select
                      id="unit"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                      {...register("unit")}
                      {...a11y("unit")}
                    >
                      <option value="">Pilih unit Brighton (31 unit)</option>
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>

                    {/* Interactive Quick-Tap Unit Grid */}
                    <div
                      aria-label="Pilihan cepat unit Brighton"
                      className="mt-2.5 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 border border-slate-200/80 rounded-lg"
                    >
                      {filteredUnits.map((u) => {
                        const active = selectedUnit === u;
                        return (
                          <button
                            key={u}
                            type="button"
                            onClick={() =>
                              setValue("unit", u, {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                              active
                                ? "bg-slate-900 text-amber-400 shadow-2xs"
                                : "bg-white text-slate-700 border border-slate-200/80 hover:border-slate-400"
                            }`}
                          >
                            {u}
                          </button>
                        );
                      })}
                    </div>
                    {err("unit")}
                  </div>
                </div>
              </section>

              {/* Section 02: Jadwal & Lokasi Penugasan */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-amber-700">
                      02. LOKASI & JADWAL LAPANGAN
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Tanggal & Alamat Lengkap Penugasan
                    </h2>
                  </div>
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="date"
                        className="block text-xs font-semibold text-slate-800"
                      >
                        Estimasi Tanggal Pengerjaan{" "}
                        <span className="text-red-600">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: "Hari Ini", offset: 0 },
                          { label: "Besok", offset: 1 },
                          { label: "Lusa (H+2)", offset: 2 },
                        ].map((shortcut) => {
                          const targetDate = addDaysToJakartaDate(shortcut.offset);
                          const isSelected = watchedValues.date === targetDate;
                          return (
                            <button
                              key={shortcut.label}
                              type="button"
                              onClick={() =>
                                setValue("date", targetDate, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                })
                              }
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                                isSelected
                                  ? "bg-amber-400 text-slate-950 font-semibold"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {shortcut.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        id="date"
                        type="date"
                        min={jakartaDate()}
                        className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white text-slate-900"
                        {...register("date")}
                        {...a11y("date")}
                      />
                    </div>
                    {err("date")}
                  </div>

                  <div>
                    <label
                      htmlFor="address"
                      className="block text-xs font-semibold text-slate-800 mb-1.5"
                    >
                      Alamat Lengkap Penugasan (Blok dan Nomor Rumah){" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="address"
                      rows={3}
                      placeholder="Nama jalan / cluster perumahan, blok, nomor rumah, kelurahan, kecamatan, kota, serta patokan lokasi"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                      {...register("address")}
                      {...a11y("address")}
                    />
                    {err("address")}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="maps"
                        className="block text-xs font-semibold text-slate-800"
                      >
                        Share Location / Tautan Google Maps{" "}
                        <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setValue("maps", "-", {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline"
                      >
                        Isi tanda strip (-)
                      </button>
                    </div>
                    <input
                      id="maps"
                      type="text"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="https://maps.app.goo.gl/... atau kosongkan jika belum ada"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                      {...register("maps")}
                      {...a11y("maps")}
                    />
                    {err("maps")}
                    <span className="block text-[11px] text-slate-500 mt-1">
                      Tautan Maps yang diisi akan disertakan otomatis ke kolom alamat
                      Google Form agar kurir/messenger mudah menemukan titik properti.
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 03: Tugas Messenger & Konfirmasi Owner */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-amber-700">
                      03. RINCIAN TUGAS & IZIN PEMILIK
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Tugas yang Diberikan ke Messenger
                    </h2>
                  </div>
                  <ClipboardCheck className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <label
                      htmlFor="task"
                      className="block text-xs font-semibold text-slate-800 mb-1.5"
                    >
                      Pilih Tugas Messenger <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="task"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                      {...register("task")}
                      {...a11y("task")}
                    >
                      <option value="">Pilih satu layanan Smart Messenger</option>
                      {services.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    {/* Interactive Service Cards */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {services.map((s) => {
                        const selected = task === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setValue("task", s.id, {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                            className={`text-left p-3 rounded-xl border transition-all ${
                              selected
                                ? "border-amber-500 bg-amber-50/60 ring-1 ring-amber-500"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {s.short}
                              </span>
                              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                {s.surchargePerUnit > 0
                                  ? `+${rupiah(s.surchargePerUnit)}/banner`
                                  : s.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                              {s.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    {err("task")}
                  </div>

                  {/* Conditional Banner Parameters Helper */}
                  {hasBanner && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Detail Pemasangan Banner (Otomatis masuk ke catatan Form)
                        </span>
                        <span className="font-mono tabular-nums text-xs font-bold text-amber-800">
                          +{rupiah(bannerCount * TARIFF_RULES.bannerInstallFee)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="form-banner-count"
                            className="block text-xs font-medium text-slate-700 mb-1"
                          >
                            Jumlah Banner (1–100)
                          </label>
                          <input
                            id="form-banner-count"
                            type="number"
                            min={1}
                            max={100}
                            value={bannerCount}
                            onChange={(e) =>
                              setBannerCount(
                                Math.max(1, Math.min(100, Number(e.target.value) || 1))
                              )
                            }
                            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-amber-300 rounded-lg bg-white text-slate-900"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="form-banner-height"
                            className="block text-xs font-medium text-slate-700 mb-1"
                          >
                            Estimasi Tinggi Pasang (Maks. 4 m)
                          </label>
                          <input
                            id="form-banner-height"
                            type="number"
                            min={0.5}
                            max={6}
                            step={0.5}
                            value={bannerHeight}
                            onChange={(e) =>
                              setBannerHeight(
                                Math.max(0.5, Number(e.target.value) || 1)
                              )
                            }
                            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-amber-300 rounded-lg bg-white text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="other"
                      className="block text-xs font-semibold text-slate-800 mb-1.5"
                    >
                      Tugas Lainnya / Penjelasan Tambahan{" "}
                      {task === "other" ? (
                        <span className="text-red-600">*</span>
                      ) : (
                        <span className="text-slate-400 font-normal">(Opsional)</span>
                      )}
                    </label>
                    <textarea
                      id="other"
                      rows={2}
                      placeholder="Jelaskan rincian tugas tambahan, kontak penerima di lokasi, atau instruksi khusus untuk messenger"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                      {...register("other")}
                      {...a11y("other")}
                    />
                    {err("other")}
                  </div>

                  {/* Owner Confirmation Radio Group */}
                  <fieldset className="pt-2">
                    <legend className="text-xs font-semibold text-slate-800 mb-2">
                      Apakah Sudah Konfirmasi Pemilik/Owner?{" "}
                      <span className="text-red-600">*</span>
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      {(["YA", "TIDAK"] as const).map((val) => {
                        const checked = owner === val;
                        return (
                          <label
                            key={val}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? "border-slate-900 bg-slate-900 text-white font-semibold"
                                : "border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              value={val}
                              className="w-4 h-4 accent-amber-500"
                              {...register("owner")}
                            />
                            <span className="text-xs">
                              {val === "YA"
                                ? "YA — Sudah Konfirmasi Owner"
                                : "TIDAK — Belum Konfirmasi"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {err("owner")}
                    {owner === "TIDAK" && (
                      <p className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        Pengajuan tetap dapat dikirim untuk ditinjau staf. Namun
                        tugas lapangan yang memerlukan izin pemilik baru akan
                        dieksekusi setelah konfirmasi tersedia.
                      </p>
                    )}
                  </fieldset>
                </div>
              </section>

              {/* Section 04: Persetujuan & Pengiriman */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-1 accent-amber-500 rounded"
                    {...register("consent")}
                    {...a11y("consent")}
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Saya menyetujui penggunaan data di atas untuk pemrosesan layanan
                    Smart Messenger Brighton HUB Cibubur dan memahami bahwa pembayaran
                    dilakukan di awal setelah tarif jarak diverifikasi oleh staf cabang.
                  </span>
                </label>
                {err("consent")}

                {turnstileEnabled && (
                  <div className="pt-2">
                    <Challenge key={challengeKey} onToken={setChallenge} />
                  </div>
                )}

                {message && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900"
                  >
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>{message}</p>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={busy || (turnstileEnabled && !challenge)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {busy ? "Menyinkronkan Pesanan…" : "Kirim & Sinkronkan Pesanan"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={livePrefillUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
                    >
                      <span>Buka di Google Form</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        reset(initial);
                        setMessage("");
                        setSentReceipt(null);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </section>
            </fieldset>
          </form>
        </div>

        {/* Right Column: Sticky Interactive Tariff Simulator & Live Google Form Inspector (5 cols) */}
        <aside className="lg:col-span-5 lg:sticky lg:top-22 space-y-6">
          <TariffCalculator
            roundTripKm={roundTripKm}
            onRoundTripKmChange={setRoundTripKm}
            hasBanner={hasBanner}
            bannerCount={bannerCount}
            onBannerCountChange={setBannerCount}
            bannerHeight={bannerHeight}
            onBannerHeightChange={setBannerHeight}
            liveFormValues={liveFormSnapshot}
          />
        </aside>
      </div>
    </div>
  );
}
