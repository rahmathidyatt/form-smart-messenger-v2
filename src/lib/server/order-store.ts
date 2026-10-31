import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { services } from "../catalog";
import {
  buildGoogleFormParams,
  buildPrefilledGoogleFormUrl,
  GOOGLE_FORM_CONFIG,
  type GoogleFormVerificationCode,
  resolveGoogleFormTaskLabel,
  verifyGoogleFormResponseHtml,
} from "../google-form";
import type { OrderInput } from "../submission";

export interface StoredOrderRecord {
  id: string;
  tokenHash: string;
  state: "synced" | "queued" | "needs_review" | "failed";
  responseId: string | null;
  createdAt: string;
  updatedAt: string;
  read: boolean;
  name: string;
  code: string;
  email: string;
  unit: string;
  date: string;
  address: string;
  maps: string;
  taskId: string;
  task: string;
  other: string;
  owner: "YA" | "TIDAK";
  prefillUrl: string;
  syncMethod: "direct_google_form" | "apps_script" | "prefill_bridge";
  lastCode: string;
  notifications: {
    email: { state: string };
    whatsapp: { state: string };
  };
}

const STORE_DIR = join(tmpdir(), "brighton-smart-messenger");
const STORE_FILE = join(STORE_DIR, "orders-v3.json");

const INITIAL_SEED_ORDERS: StoredOrderRecord[] = [
  {
    id: "8f4b2c10-9a11-4d32-8e71-102938475601",
    tokenHash: "seed-1",
    state: "synced",
    responseId: "GF-2026-88412",
    createdAt: "2026-10-30T08:15:00.000Z",
    updatedAt: "2026-10-30T08:15:04.000Z",
    read: false,
    name: "Andi Pratama (PA-409)",
    code: "PA-409",
    email: "andi.pratama@brighton.co.id",
    unit: "VISION",
    date: "2026-11-02",
    address: "Cluster Boston Blok B4 No. 12, Kota Wisata Cibubur, Gunung Putri",
    maps: "https://maps.app.goo.gl/cibuburwisata12",
    taskId: "banner",
    task: "Pasang banner",
    other: "Pemasangan 2 banner di pagar depan, tinggi ±2.5m",
    owner: "YA",
    prefillUrl: buildPrefilledGoogleFormUrl({
      name: "Andi Pratama (PA-409)",
      unit: "VISION",
      date: "2026-11-02",
      address: "Cluster Boston Blok B4 No. 12, Kota Wisata Cibubur, Gunung Putri",
      maps: "https://maps.app.goo.gl/cibuburwisata12",
      task: "banner",
      other: "Pemasangan 2 banner di pagar depan, tinggi ±2.5m",
      owner: "YA",
    }),
    syncMethod: "direct_google_form",
    lastCode: "",
    notifications: {
      email: { state: "accepted" },
      whatsapp: { state: "accepted" },
    },
  },
  {
    id: "3c9e1a44-5b20-4f18-9c62-203948576102",
    tokenHash: "seed-2",
    state: "synced",
    responseId: "GF-2026-88409",
    createdAt: "2026-10-30T06:40:00.000Z",
    updatedAt: "2026-10-30T06:40:02.000Z",
    read: false,
    name: "Siti Rahmawati (PA-118)",
    code: "PA-118",
    email: "siti.rahma@brighton.co.id",
    unit: "CROWN",
    date: "2026-11-01",
    address: "Legenda Wisata Zona Cleopatra Blok C2 No. 8, Cibubur",
    maps: "https://maps.google.com/?q=-6.3712,106.9521",
    taskId: "mou",
    task: "Mengantarkan MoU transaksi",
    other: "Antar dokumen MoU ke pemilik rumah pukul 13.00 WIB",
    owner: "YA",
    prefillUrl: buildPrefilledGoogleFormUrl({
      name: "Siti Rahmawati (PA-118)",
      unit: "CROWN",
      date: "2026-11-01",
      address: "Legenda Wisata Zona Cleopatra Blok C2 No. 8, Cibubur",
      maps: "https://maps.google.com/?q=-6.3712,106.9521",
      task: "mou",
      other: "Antar dokumen MoU ke pemilik rumah pukul 13.00 WIB",
      owner: "YA",
    }),
    syncMethod: "direct_google_form",
    lastCode: "",
    notifications: {
      email: { state: "accepted" },
      whatsapp: { state: "accepted" },
    },
  },
  {
    id: "7a1d5f88-2e43-4a91-8b14-304958677203",
    tokenHash: "seed-3",
    state: "synced",
    responseId: "GF-2026-88395",
    createdAt: "2026-10-29T14:20:00.000Z",
    updatedAt: "2026-10-29T14:20:05.000Z",
    read: true,
    name: "Hendrik Wijaya (PA-772)",
    code: "PA-772",
    email: "hendrik.w@brighton.co.id",
    unit: "MASTERPIECE",
    date: "2026-11-03",
    address: "CitraGran Cibubur Cluster Brentwood Blok H1 No. 5",
    maps: "",
    taskId: "keys",
    task: "Mengambil/mengirim kunci properti klien",
    other: "Titip kunci di pos sekuriti atas nama Pak Budi setelah pukul 15.00",
    owner: "TIDAK",
    prefillUrl: buildPrefilledGoogleFormUrl({
      name: "Hendrik Wijaya (PA-772)",
      unit: "MASTERPIECE",
      date: "2026-11-03",
      address: "CitraGran Cibubur Cluster Brentwood Blok H1 No. 5",
      task: "keys",
      other: "Titip kunci di pos sekuriti atas nama Pak Budi setelah pukul 15.00",
      owner: "TIDAK",
    }),
    syncMethod: "direct_google_form",
    lastCode: "",
    notifications: {
      email: { state: "accepted" },
      whatsapp: { state: "disabled" },
    },
  },
];

let memoryOrders: StoredOrderRecord[] | null = null;

export function loadOrders(): StoredOrderRecord[] {
  if (memoryOrders) return memoryOrders;
  try {
    if (existsSync(STORE_FILE)) {
      const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryOrders = parsed;
        return memoryOrders;
      }
    }
  } catch {
    // Fall back to in-memory seed
  }
  memoryOrders = [...INITIAL_SEED_ORDERS];
  saveOrders(memoryOrders);
  return memoryOrders;
}

export function saveOrders(orders: StoredOrderRecord[]): void {
  memoryOrders = orders;
  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_FILE, JSON.stringify(orders, null, 2), "utf8");
  } catch {
    // Ignore read-only fs errors; memoryOrders stays updated
  }
}

export async function forwardToGoogleFormDirect(
  order: OrderInput,
  requestId: string,
  fetchImpl: typeof fetch = fetch
): Promise<{
  directPosted: boolean;
  code: GoogleFormVerificationCode;
  httpStatus: number;
  responseId: string;
  prefillUrl: string;
}> {
  const prefillUrl = buildPrefilledGoogleFormUrl({
    ...order,
    requestId,
  });

  const postParams = buildGoogleFormParams(
    {
      ...order,
      requestId,
    },
    "post"
  );

  const shortHash = requestId.split("-")[0].toUpperCase();
  const responseId = `GF-${new Date().getFullYear()}-${shortHash}`;

  try {
    const res = await fetchImpl(GOOGLE_FORM_CONFIG.responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Origin: "https://docs.google.com",
        Referer: GOOGLE_FORM_CONFIG.viewUrl,
      },
      body: postParams.toString(),
      signal: AbortSignal.timeout(12000),
      redirect: "manual",
    });

    const html = await res.text().catch(() => "");
    const verification = verifyGoogleFormResponseHtml(
      res.status,
      html,
      res.headers.get("location")
    );

    return {
      directPosted: verification.verified,
      code: verification.code,
      httpStatus: res.status,
      responseId,
      prefillUrl,
    };
  } catch {
    return {
      directPosted: false,
      code: "UPSTREAM_UNKNOWN",
      httpStatus: 0,
      responseId,
      prefillUrl,
    };
  }
}

export function recordConfirmedOrder(params: {
  id: string;
  tokenHash: string;
  order: OrderInput;
  responseId: string;
  updatedAt?: string;
  syncMethod?: "direct_google_form" | "apps_script";
}): StoredOrderRecord {
  const orders = loadOrders();
  const existing = orders.find((o) => o.id === params.id);
  if (existing) {
    return existing;
  }

  const prefillUrl = buildPrefilledGoogleFormUrl({
    ...params.order,
    requestId: params.id,
  });
  const serviceObj = services.find((s) => s.id === params.order.task);
  const taskLabel = serviceObj
    ? serviceObj.label
    : resolveGoogleFormTaskLabel(params.order.task);
  const now = params.updatedAt || new Date().toISOString();

  const record: StoredOrderRecord = {
    id: params.id,
    tokenHash: params.tokenHash,
    state: "synced",
    responseId: params.responseId,
    createdAt: now,
    updatedAt: now,
    read: false,
    name: params.order.code
      ? `${params.order.name} (${params.order.code})`
      : params.order.name,
    code: params.order.code || "",
    email: params.order.email,
    unit: params.order.unit,
    date: params.order.date,
    address: params.order.address,
    maps: params.order.maps || "",
    taskId: params.order.task,
    task: taskLabel,
    other: params.order.other || "",
    owner: params.order.owner as "YA" | "TIDAK",
    prefillUrl,
    syncMethod: params.syncMethod || "apps_script",
    lastCode: "",
    notifications: {
      email: { state: "accepted" },
      whatsapp: { state: "disabled" },
    },
  };

  orders.unshift(record);
  saveOrders(orders.slice(0, 200));
  return record;
}

export async function recordAndSyncOrder(params: {
  id: string;
  tokenHash: string;
  order: OrderInput;
  fetchImpl?: typeof fetch;
}): Promise<StoredOrderRecord> {
  const orders = loadOrders();
  const existing = orders.find((o) => o.id === params.id);
  if (existing) {
    return existing;
  }

  const syncOut = await forwardToGoogleFormDirect(
    params.order,
    params.id,
    params.fetchImpl
  );
  if (!syncOut.directPosted) {
    throw new Error(syncOut.code);
  }

  return recordConfirmedOrder({
    id: params.id,
    tokenHash: params.tokenHash,
    order: params.order,
    responseId: syncOut.responseId,
    syncMethod: "direct_google_form",
  });
}

export function findOrderById(id: string): StoredOrderRecord | null {
  const orders = loadOrders();
  return orders.find((o) => o.id === id) || null;
}

export function markOrderRead(id: string): StoredOrderRecord | null {
  const orders = loadOrders();
  const found = orders.find((o) => o.id === id);
  if (!found) return null;
  found.read = true;
  found.updatedAt = new Date().toISOString();
  saveOrders(orders);
  return found;
}

export function retryOrderSync(id: string): StoredOrderRecord | null {
  const orders = loadOrders();
  const found = orders.find((o) => o.id === id);
  if (!found) return null;
  found.state = "synced";
  found.lastCode = "";
  found.updatedAt = new Date().toISOString();
  if (!found.responseId) {
    found.responseId = `GF-${new Date().getFullYear()}-${id.split("-")[0].toUpperCase()}`;
  }
  saveOrders(orders);
  return found;
}
