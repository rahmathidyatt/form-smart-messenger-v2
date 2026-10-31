"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  MapPin,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { statusLabels } from "@/lib/submission";
import type { StoredOrderRecord } from "@/lib/server/order-store";

type FilterCategory = "all" | "banner" | "docs" | "owner_pending";

export function StatusForm() {
  const [orders, setOrders] = useState<StoredOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [lookupInput, setLookupInput] = useState("");
  const [lookupResult, setLookupResult] = useState<Record<string, string> | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (active && json.ok && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupInput.trim();
    if (!q) return;
    setLookupBusy(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setLookupResult(json.data);
      } else {
        setLookupError(
          "Pengajuan dengan kode atau nama tersebut belum ditemukan."
        );
      }
    } catch {
      setLookupError("Gagal memeriksa status. Silakan coba kembali.");
    } finally {
      setLookupBusy(false);
    }
  };

  const handleCopySummary = async (order: StoredOrderRecord) => {
    const summary = [
      `*ORDER SMART MESSENGER BRIGHTON HUB CIBUBUR*`,
      `Referensi: ${order.responseId || order.id}`,
      `Agent: ${order.name} · Unit ${order.unit}`,
      `Tanggal Pengerjaan: ${order.date}`,
      `Tugas: ${order.task}`,
      `Alamat: ${order.address}`,
      order.other ? `Catatan: ${order.other}` : null,
      `Konfirmasi Owner: ${order.owner}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "banner" && order.taskId !== "banner") return false;
    if (
      activeFilter === "docs" &&
      !["documents", "mou", "blt"].includes(order.taskId)
    ) {
      return false;
    }
    if (activeFilter === "owner_pending" && order.owner !== "TIDAK") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.name.toLowerCase().includes(q) ||
      order.unit.toLowerCase().includes(q) ||
      order.address.toLowerCase().includes(q) ||
      order.task.toLowerCase().includes(q) ||
      order.id.toLowerCase().includes(q) ||
      (order.responseId && order.responseId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-amber-700 mb-2">
            <span>RIWAYAT & PELACAKAN PENGAJUAN</span>
            <span aria-hidden="true">·</span>
            <span>BRIGHTON HUB CIBUBUR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Riwayat & Cek Status Pesanan Smart Messenger
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Pantau status sinkronisasi pengajuan Anda, salin format laporan untuk
            staf cabang, atau buka kembali tautan Google Form resmi yang telah
            terisi otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Muat Ulang Data</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors whitespace-nowrap"
          >
            <span>Buat Pesanan Baru</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Direct Order Lookup Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-slate-900">
          Lacak Cepat Berdasarkan Nomor Referensi / Nama Agent
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Masukkan kode referensi (mis. <code className="font-mono">GF-2026-88412</code>),
          UUID pengajuan, atau nama agent untuk memeriksa status langsung dari server.
        </p>

        <form
          onSubmit={handleLookup}
          className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Kode referensi atau nama agent"
              placeholder="Ketik nomor referensi GF-2026-... atau nama agent..."
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={lookupBusy}
            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {lookupBusy ? "Memeriksa…" : "Periksa Status"}
          </button>
        </form>

        {lookupError && (
          <p
            role="alert"
            className="mt-3 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
          >
            {lookupError}
          </p>
        )}

        {lookupResult && (
          <div
            role="status"
            className="mt-4 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {statusLabels[lookupResult.state] ?? lookupResult.state}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{lookupResult.responseId}</span>
              </div>
              <p className="text-slate-700">
                {lookupResult.name ? `${lookupResult.name} · ` : ""}
                Unit {lookupResult.unit} · Tanggal Pengerjaan: {lookupResult.date} ·{" "}
                {lookupResult.task}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Filter & Live Search Toolbar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Interactive Segmented Filter Controls */}
          <div
            role="group"
            aria-label="Filter kategori pesanan"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit"
          >
            {(
              [
                { id: "all", label: `Semua (${orders.length})` },
                {
                  id: "banner",
                  label: `Pasang Banner (${orders.filter((o) => o.taskId === "banner").length})`,
                },
                {
                  id: "docs",
                  label: `Dokumen & MoU (${
                    orders.filter((o) =>
                      ["documents", "mou", "blt"].includes(o.taskId)
                    ).length
                  })`,
                },
                {
                  id: "owner_pending",
                  label: `Owner Belum Konfirmasi (${
                    orders.filter((o) => o.owner === "TIDAK").length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === tab.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Filter daftar pengajuan"
              placeholder="Filter agent, unit, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Order Cards List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 bg-white border border-slate-200 rounded-xl p-6 animate-pulse"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-base font-bold text-slate-900">
              Tidak ada pesanan yang cocok dengan filter
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Ubah kata kunci pencarian atau buat pengajuan baru pada halaman
              formulir utama.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors"
            >
              Buat Pesanan Baru
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2">
                    {/* Unboxed clean metadata with typographic separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {order.responseId || order.id.slice(0, 8)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-700">
                        Unit {order.unit}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {order.date}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-medium">
                        {statusLabels[order.state] ?? "Tersinkronisasi"}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {order.task}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {order.name}
                      </span>
                      <span>
                        Konfirmasi Pemilik:{" "}
                        <strong
                          className={
                            order.owner === "YA"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          {order.owner}
                        </strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {order.address}
                        {order.other ? ` — Catatan: ${order.other}` : ""}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => void handleCopySummary(order)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {copiedId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Ringkasan WA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
