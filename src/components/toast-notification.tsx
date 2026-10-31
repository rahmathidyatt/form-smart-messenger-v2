"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error";
  title: string;
  description: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function ToastNotification({
  toast,
  onDismiss,
  durationMs = 6000,
}: ToastNotificationProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [toast, durationMs, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      id="toast-notification"
      data-testid="toast-notification"
      data-toast-type={toast.type}
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      aria-atomic="true"
      className={`fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-md rounded-xl border p-4 shadow-lg transition-all ${
        isSuccess
          ? "bg-slate-900 border-emerald-500 text-white"
          : "bg-slate-900 border-red-500 text-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isSuccess
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            data-testid="toast-title"
            className={`text-xs font-bold tracking-wide uppercase ${
              isSuccess ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {toast.title}
          </p>
          <p
            data-testid="toast-description"
            className="mt-1 text-xs leading-relaxed text-slate-200"
          >
            {toast.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
          data-testid="toast-dismiss"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
