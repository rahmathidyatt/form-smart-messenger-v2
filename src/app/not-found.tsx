import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
      <p className="text-xs font-semibold text-amber-700">HALAMAN TIDAK DITEMUKAN</p>
      <h1 className="text-2xl font-extrabold text-slate-900">
        Halaman yang Anda tuju tidak tersedia
      </h1>
      <p className="text-sm text-slate-600">
        Silakan kembali ke halaman utama untuk mengajukan pesanan Smart Messenger
        atau memeriksa status pengajuan.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Formulir Order</span>
        </Link>
      </div>
    </div>
  );
}
