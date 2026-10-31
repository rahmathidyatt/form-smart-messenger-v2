"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileCheck2,
  Info,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  UserCheck,
} from "lucide-react";
import { agentFormSchema, type AgentFormInput } from "@/lib/agent-form";
import { services, units } from "@/lib/catalog";
import { resolveGoogleFormTaskLabel } from "@/lib/google-form";
import { receiptSchema, type OrderInput, type Receipt } from "@/lib/submission";
import { jakartaDate } from "@/lib/utils";
import {
  ToastNotification,
  type ToastMessage,
} from "@/components/toast-notification";

const storageKey = "smart-messenger-pending-v3";
const draftStorageKey = "smart-messenger-draft-v3";
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
  order: OrderInput;
}

function addDaysToJakartaDate(daysToAdd: number): string {
  const base = jakartaDate();
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

function sanitizeDraft(raw: unknown): AgentFormInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const str = (key: keyof AgentFormInput) =>
    typeof obj[key] === "string" ? (obj[key] as string) : "";
  const draft: AgentFormInput = {
    email: str("email"),
    nameCode: str("nameCode"),
    unit: str("unit"),
    date: str("date"),
    address: str("address"),
    maps: str("maps"),
    task: str("task"),
    other: str("other"),
    owner: str("owner"),
    consent: Boolean(obj.consent),
  };
  const hasAnyValue =
    Boolean(draft.email) ||
    Boolean(draft.nameCode) ||
    Boolean(draft.unit) ||
    Boolean(draft.date) ||
    Boolean(draft.address) ||
    Boolean(draft.maps) ||
    Boolean(draft.task) ||
    Boolean(draft.other) ||
    Boolean(draft.owner) ||
    draft.consent;
  return hasAnyValue ? draft : null;
}

/**
 * Custom hook that persists form inputs into localStorage so agent data
 * survives accidental page refreshes or navigation away from the form.
 */
function useFormDraftPersistence(params: {
  watchedValues: Partial<AgentFormInput>;
  reset: (values: AgentFormInput) => void;
  attemptRef: React.MutableRefObject<Attempt | null>;
}) {
  const { watchedValues, reset, attemptRef } = params;
  const hydratedRef = useRef(false);

  const email = watchedValues.email ?? "";
  const nameCode = watchedValues.nameCode ?? "";
  const unit = watchedValues.unit ?? "";
  const date = watchedValues.date ?? "";
  const address = watchedValues.address ?? "";
  const maps = watchedValues.maps ?? "";
  const task = watchedValues.task ?? "";
  const other = watchedValues.other ?? "";
  const owner = watchedValues.owner ?? "";
  const consent = Boolean(watchedValues.consent);

  // Restore saved draft from localStorage (or pending attempt from sessionStorage) on mount
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftStorageKey);
      if (rawDraft) {
        const parsedDraft = sanitizeDraft(JSON.parse(rawDraft));
        if (parsedDraft) {
          reset(parsedDraft);
        }
      } else {
        const rawPending = sessionStorage.getItem(storageKey);
        if (rawPending) {
          const saved = JSON.parse(rawPending);
          if (receiptSchema.safeParse(saved?.receipt).success && saved?.order) {
            const { name, code, ...rest } = saved.order;
            const ui = sanitizeDraft({
              ...rest,
              nameCode: code ? `${name} ${code}` : name,
            });
            if (ui) {
              attemptRef.current = saved;
              reset(ui);
            }
          }
        }
      }
    } catch {
      // Ignore storage access errors
    } finally {
      hydratedRef.current = true;
    }
  }, [reset, attemptRef]);

  // Persist user input changes to localStorage
  useEffect(() => {
    if (!hydratedRef.current) return;
    const currentDraft: AgentFormInput = {
      email,
      nameCode,
      unit,
      date,
      address,
      maps,
      task,
      other,
      owner,
      consent,
    };
    try {
      if (sanitizeDraft(currentDraft)) {
        localStorage.setItem(draftStorageKey, JSON.stringify(currentDraft));
      } else {
        localStorage.removeItem(draftStorageKey);
      }
    } catch {
      // Ignore localStorage quota/access errors
    }
  }, [
    email,
    nameCode,
    unit,
    date,
    address,
    maps,
    task,
    other,
    owner,
    consent,
  ]);

  const clearPersistedDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  };

  return { clearPersistedDraft };
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
        Formulir Pemesanan
      </span>
    </div>
   );
}

export function SimpleForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sentReceipt, setSentReceipt] = useState<SubmittedReceiptState | null>(null);
  const [copiedWa, setCopiedWa] = useState(false);

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
    formState: { errors, isSubmitting },
  } = useForm<AgentFormInput, unknown, OrderInput>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: initial,
    mode: "onSubmit",
  });

  const isSubmittingOrder = busy || isSubmitting;

  const watchedValues = useWatch({ control });
  const task = watchedValues.task || "";
  const owner = watchedValues.owner || "";

  const { clearPersistedDraft } = useFormDraftPersistence({
    watchedValues,
    reset,
    attemptRef: attempt,
  });

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

    inFlight.current = true;
    setBusy(true);
    setSentReceipt(null);
    setMessage("");
    setToast(null);

    const finalOrder: OrderInput = {
      ...order,
      other: (order.other || "").trim().slice(0, 1000),
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

    try {
      const data = await request("/api/orders", {
        ...current.receipt,
        order: current.order,
        website: "",
      });

      if (data.ok && data.data && data.data.state === "synced" && data.data.responseId) {
        const receiptRecord: SubmittedReceiptState = {
          id: data.data.id || current.receipt.id,
          responseId: data.data.responseId,
          updatedAt: data.data.updatedAt || new Date().toISOString(),
          order: finalOrder,
        };

        try {
          clearPersistedDraft();
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
        setToast({
          id: receiptRecord.id,
          type: "success",
          title: "Berhasil dikirim",
          description: `Pesanan berhasil dikirim (${receiptRecord.responseId}). Formulir telah direset otomatis.`,
        });
        reset(initial);
        return;
      }

      const errorMessages: Record<string, string> = {
        NOT_CONFIGURED:
          "Layanan pengiriman belum aktif pada server. Data formulir Anda tetap tersimpan dan siap dikirim ulang.",
        CONFIG:
          "Konfigurasi layanan belum lengkap. Data formulir Anda tetap tersimpan.",
        PUBLIC_FORM_ID_NOT_ALLOWED:
          "Konfigurasi ID formulir belum sesuai. Silakan hubungi staf operasional cabang.",
        FORM_SCHEMA:
          "Struktur formulir sedang diperbarui. Data Anda tetap tersimpan.",
        FORM_CLOSED:
          "Formulir pemesanan saat ini sedang ditutup untuk menerima respons baru.",
        VALIDATION: "Periksa kembali kolom yang wajib diisi.",
        RATE_LIMIT: "Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.",
        CONFLICT: "Pesanan ini sedang diproses atau sudah dikirim sebelumnya.",
        UPSTREAM_UNKNOWN:
          "Gagal mengirim pesanan. Periksa koneksi Anda, lalu coba kirim kembali.",
      };

      const code = typeof data?.code === "string" ? data.code : "UPSTREAM_UNKNOWN";
      const errText =
        errorMessages[code] ||
        "Pengiriman pesanan belum berhasil. Data formulir Anda tetap tersimpan, silakan coba lagi.";
      setMessage(errText);
      setToast({
        id: crypto.randomUUID(),
        type: "error",
        title: "Pengiriman Gagal",
        description: errText,
      });
    } catch {
      const netErrText =
        "Koneksi jaringan terganggu saat menghubungi server. Data formulir Anda tetap tersimpan, silakan coba kirim kembali.";
      setMessage(netErrText);
      setToast({
        id: crypto.randomUUID(),
        type: "error",
        title: "Pengiriman Gagal",
        description: netErrText,
      });
    } finally {
      setBusy(false);
      inFlight.current = false;
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* Header Section */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 mb-6 border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-400 mb-2.5">
            <span>Brighton HUB Cibubur</span>
            <span aria-hidden="true">·</span>
            <span>Layanan Operasional Smart Messenger</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight"
            style={{ textWrap: "balance" }}
          >
            Form Order Smart Messenger
          </h1>
          <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
            Ajukan pemasangan banner properti, pengiriman MoU transaksi, pengambilan
            kunci klien, atau distribusi dokumen PA.
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-400 block">Tarif Perjalanan PP</span>
            <strong className="font-mono tabular-nums text-lg font-bold text-amber-400 mt-0.5 block">
              Rp900 / km
            </strong>
            <span className="text-[11px] text-slate-400">
              Dihitung total jarak pulang-pergi
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Jasa Pasang Banner</span>
            <strong className="font-mono tabular-nums text-lg font-bold text-white mt-0.5 block">
              +Rp5.000 / banner
            </strong>
            <span className="text-[11px] text-slate-400">
              Maks. jarak 25 km & tinggi 4 meter
            </span>
          </div>
        </div>
      </section>

      {/* Receipt / Confirmation State when an order is submitted */}
      {sentReceipt && (
        <section
          id="form-success-banner"
          ref={receiptRef}
          role="status"
          aria-live="polite"
          className="mb-6 bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-xs scroll-mt-20"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <span>Berhasil dikirim</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {sentReceipt.responseId}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Berhasil dikirim — Bukti Pengajuan Smart Messenger
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Data pesanan telah berhasil dikirim dan formulir telah direset secara otomatis.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyWhatsAppReceipt(sentReceipt)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-start sm:self-center"
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

          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
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
              <button
                type="button"
                onClick={() => {
                  clearPersistedDraft();
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

      {/* Agent Order Form */}
      <form
        noValidate
        aria-busy={isSubmittingOrder}
        onSubmit={(event) => {
          event.preventDefault();
          if (inFlight.current || isSubmittingOrder) return;
          void handleSubmit(submit)(event);
        }}
        className="space-y-6"
      >
        <fieldset disabled={isSubmittingOrder} className="space-y-6">
          {/* Data Pemesan & Unit */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Data Pemesan & Unit Brighton
              </h2>
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

              <div>
                <label
                  htmlFor="unit"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Unit Brighton <span className="text-red-600">*</span>
                </label>
                <select
                  id="unit"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  {...register("unit")}
                  {...a11y("unit")}
                >
                  <option value="">Pilih unit Brighton</option>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                {err("unit")}
              </div>
            </div>
          </section>

          {/* Tanggal & Alamat Lengkap Penugasan */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Tanggal & Alamat Lengkap Penugasan
              </h2>
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="date"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Estimasi Tanggal Pengerjaan <span className="text-red-600">*</span>
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
                <input
                  id="date"
                  type="date"
                  min={jakartaDate()}
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white text-slate-900"
                  {...register("date")}
                  {...a11y("date")}
                />
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
              </div>
            </div>
          </section>

          {/* Tugas yang Diberikan ke Messenger */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Tugas yang Diberikan ke Messenger
              </h2>
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
                {err("task")}
              </div>

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
                  placeholder="Jelaskan rincian tugas tambahan, jumlah banner, kontak penerima di lokasi, atau instruksi khusus untuk messenger"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                  {...register("other")}
                  {...a11y("other")}
                />
                {err("other")}
              </div>

              {/* Owner Confirmation Radio Group */}
              <fieldset className="pt-1">
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
                    Pengajuan tetap dapat dikirim untuk ditinjau staf. Namun tugas
                    lapangan yang memerlukan izin pemilik baru akan dieksekusi
                    setelah konfirmasi tersedia.
                  </p>
                )}
              </fieldset>
            </div>
          </section>

          {/* Persetujuan & Pengiriman */}
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

            {message && (
              <div
                id="form-error-banner"
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900"
              >
                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p>{message}</p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="submit"
                disabled={isSubmittingOrder}
                aria-busy={isSubmittingOrder}
                aria-live="polite"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2
                      data-testid="submit-spinner"
                      className="w-4 h-4 animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    <span>Menyinkronkan Pesanan…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Kirim & Sinkronkan Pesanan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmittingOrder}
                onClick={() => {
                  clearPersistedDraft();
                  reset(initial);
                  setMessage("");
                  setToast(null);
                  setSentReceipt(null);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Formulir</span>
              </button>
            </div>
          </section>
        </fieldset>
      </form>
    </div>
  );
}
