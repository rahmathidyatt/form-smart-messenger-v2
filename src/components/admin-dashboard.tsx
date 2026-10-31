"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Search,
} from "lucide-react";
import { statusLabels } from "@/lib/submission";
import {
  getStreamlinedAppsScriptSnippet,
  GOOGLE_FORM_CONFIG,
} from "@/lib/google-form";
import type { StoredOrderRecord } from "@/lib/server/order-store";

export function AdminDashboard() {
  const token = useRef("");
  const [rows, setRows] = useState<StoredOrderRecord[]>([]);
  const [connected, setConnected] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "connector">("orders");
  const [copiedScript, setCopiedScript] = useState(false);

  const load = useCallback(async function refresh(
    action = "dashboard",
    id?: string
  ) {
    setBusy(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.current) {
        headers.Authorization = `Bearer ${token.current}`;
      }
      const r = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify(id ? { action, id } : { action }),
      });
      const j = await r.json();
      if (!j.ok) {
        if (j.code === "UNAUTHORIZED") {
          setNeedsAuth(true);
          setConnected(false);
          throw new Error("Masukkan kunci akses admin untuk membuka dashboard.");
        }
        throw new Error(
          "Dashboard belum dapat diakses atau aksi belum diizinkan."
        );
      }
      if (action === "dashboard") {
        setRows(Array.isArray(j.data) ? j.data : []);
        setConnected(true);
        setNeedsAuth(false);
      } else {
        await refresh();
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExportCsv = () => {
    const headers = [
      "ID_Pengajuan",
      "ID_Form",
      "Status",
      "Tanggal_Pengerjaan",
      "Nama_Kode_Agent",
      "Unit",
      "Tugas",
      "Alamat",
      "Catatan_Lainnya",
      "Konfirmasi_Owner",
      "Dibaca_Staf",
    ];
    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.responseId || "",
          r.state,
          r.date,
          `"${(r.name || "").replace(/"/g, '""')}"`,
          r.unit,
          `"${(r.task || "").replace(/"/g, '""')}"`,
          `"${(r.address || "").replace(/"/g, '""')}"`,
          `"${(r.other || "").replace(/"/g, '""')}"`,
          r.owner,
          r.read ? "SUDAH" : "BELUM",
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart-messenger-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(getStreamlinedAppsScriptSnippet());
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      // Ignore clipboard error
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.unit.toLowerCase().includes(q) ||
      r.task.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.responseId && r.responseId.toLowerCase().includes(q))
    );
  });

  const unreadCount = rows.filter((r) => r.state === "synced" && !r.read).length;
  const bannerOrderCount = rows.filter((r) =>
    r.task.toLowerCase().includes("banner")
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Operational Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 mb-2">
            <span>PANEL STAF & KONEKTOR GOOGLE FORM</span>
            <span aria-hidden="true">·</span>
            <span>BRIGHTON HUB CIBUBUR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Dashboard Operasional Smart Messenger
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Kelola antrean pengajuan agent, verifikasi jarak tempuh dan izin
            owner, serta pantau pemetaan langsung ke Google Form HRD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Perbarui Antrean</span>
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Unduh CSV</span>
          </button>
          <a
            href={GOOGLE_FORM_CONFIG.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors whitespace-nowrap"
          >
            <span>Buka Google Form HRD</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Optional Admin Token Prompt (only shown if server requires ADMIN_ACCESS_TOKEN) */}
      {needsAuth && !connected && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg">
          <h2 className="text-base font-bold text-slate-900">
            Otorisasi Staf Operasional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Server ini mengaktifkan proteksi token staf. Masukkan kunci akses
            admin untuk memuat antrean.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              token.current = String(
                new FormData(e.currentTarget).get("access") || ""
              );
              void load();
              e.currentTarget.reset();
            }}
            className="mt-4 space-y-3"
          >
            <label className="block text-xs font-semibold text-slate-700">
              Kunci Akses Admin
              <input
                type="password"
                name="access"
                required
                autoComplete="off"
                minLength={32}
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors"
            >
              Buka Dashboard
            </button>
          </form>
        </section>
      )}

      {connected && (
        <>
          {/* 4-Column Operational KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs font-medium text-slate-500">
                Total Pengajuan Tercatat
              </span>
              <strong className="block font-mono tabular-nums text-2xl font-extrabold text-slate-900 mt-1">
                {rows.length}
              </strong>
              <span className="text-[11px] text-slate-500">
                Tersimpan di memori operasional
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs font-medium text-slate-500">
                Notifikasi Belum Dibaca
              </span>
              <strong
                aria-live="polite"
                className="block font-mono tabular-nums text-2xl font-extrabold text-amber-600 mt-1"
              >
                {unreadCount}
              </strong>
              <span className="text-[11px] text-slate-500">
                {unreadCount} notifikasi belum dibaca staf
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs font-medium text-slate-500">
                Tugas Pasang Banner
              </span>
              <strong className="block font-mono tabular-nums text-2xl font-extrabold text-slate-900 mt-1">
                {bannerOrderCount}
              </strong>
              <span className="text-[11px] text-slate-500">
                Wajib verifikasi jarak ≤ 25 km
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs font-medium text-slate-500">
                Skema Google Form
              </span>
              <strong className="block font-mono tabular-nums text-2xl font-extrabold text-emerald-600 mt-1">
                7 / 7 Aktif
              </strong>
              <span className="text-[11px] text-slate-500">
                forms.gle/DYqwvwHXGxERZihD7
              </span>
            </div>
          </section>

          {/* Workspace Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "orders"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Antrean Pengajuan ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("connector")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "connector"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Konektor & Pemetaan Google Form
              </button>
            </div>

            {activeTab === "orders" && (
              <div className="relative w-full sm:w-72">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Cari pengajuan di dashboard"
                  placeholder="Cari nama agent, unit, atau ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {error}
            </p>
          )}

          {/* Tab 1: Orders Queue */}
          {activeTab === "orders" && (
            <section className="space-y-4">
              {filteredRows.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <p className="text-sm font-bold text-slate-900">
                    Belum ada pengajuan yang sesuai
                  </p>
                </div>
              ) : (
                filteredRows.map((row) => (
                  <article
                    key={row.id}
                    className={`bg-white border rounded-xl p-5 sm:p-6 transition-colors ${
                      !row.read
                        ? "border-amber-400 bg-amber-50/10"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono tabular-nums font-bold text-slate-900">
                            {row.responseId || row.id.slice(0, 8)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-700">
                            Unit {row.unit}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Jadwal: {row.date}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-emerald-700">
                            {statusLabels[row.state] ?? row.state}
                          </span>
                          {!row.read && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-bold text-amber-700">
                                Baru / Belum Dibaca
                              </span>
                            </>
                          )}
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          {row.name} — {row.task}
                        </h2>

                        {row.address && (
                          <p className="text-xs text-slate-600">
                            <strong>Alamat:</strong> {row.address}
                          </p>
                        )}
                        {row.other && (
                          <p className="text-xs text-slate-600">
                            <strong>Catatan:</strong> {row.other}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                          <span>
                            ID Pengajuan:{" "}
                            <code className="font-mono">{row.id}</code>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Konfirmasi Owner:{" "}
                            <strong>{row.owner || "YA"}</strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Notifikasi Email: {row.notifications?.email?.state ?? "accepted"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {row.prefillUrl && (
                          <a
                            href={row.prefillUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Buka di Google Form</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {row.state === "synced" && !row.read && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void load("ack", row.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tandai dibaca</span>
                          </button>
                        )}

                        {["failed", "needs_review", "retry_wait"].includes(
                          row.state
                        ) && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void load("retry", row.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <span>
                              {row.state === "needs_review"
                                ? "Rekonsiliasi dengan Form"
                                : "Coba sinkronisasi lagi"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          {/* Tab 2: Streamlined Google Form Schema & Zero-Ledger Connector */}
          {activeTab === "connector" && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-amber-700">
                    PEMETAAN RESMI TANPA KOLOM TAMBAHAN
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    7 Parameter Google Form Brighton HUB Cibubur
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Sistem memetakan seluruh input website langsung ke 7
                    pertanyaan asli pada{" "}
                    <code className="font-mono">
                      https://forms.gle/DYqwvwHXGxERZihD7
                    </code>{" "}
                    tanpa mengharuskan perubahan struktur Google Form.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Pertanyaan Form</th>
                        <th className="py-2.5 px-3 font-semibold">Entry ID</th>
                        <th className="py-2.5 px-3 font-semibold">Item ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.values(GOOGLE_FORM_CONFIG.fields).map((f) => (
                        <tr key={f.entryId}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {f.title}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-amber-700">
                            {f.entryId}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                            {f.itemId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-700">
                      OPSIONAL: OTOMASI APPS SCRIPT 1-FILE
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Script Konektor Tanpa Spreadsheet Tambahan
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Jika ingin menonaktifkan langkah konfirmasi klik di Google
                      Form yang memiliki wajib login Google, cukup tempel script
                      ringkas berikut langsung di editor Google Form.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAppsScript}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Script</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-80">
                  <code>{getStreamlinedAppsScriptSnippet()}</code>
                </pre>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Code2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Tidak memerlukan Cloudflare Turnstile, WhatsApp API, ataupun
                    Spreadsheet Ledger eksternal.
                  </span>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
