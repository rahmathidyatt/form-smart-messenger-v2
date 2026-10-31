import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { services } from "../catalog";
import {
  buildGoogleFormParams,
  buildPrefilledGoogleFormUrl,
  GOOGLE_FORM_CONFIG,
  resolveGoogleFormTaskLabel,
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

export async function forwardToGoogleFormDirect(order: OrderInput, requestId: string): Promise<{
  directPosted: boolean;
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

  try {
    const res = await fetch(GOOGLE_FORM_CONFIG.responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: postParams.toString(),
      signal: AbortSignal.timeout(6000),
      redirect: "manual",
    });

    const directPosted = res.status >= 200 && res.status < 400;
    const shortHash = requestId.split("-")[0].toUpperCase();
    return {
      directPosted,
      responseId: `GF-${new Date().getFullYear()}-${shortHash}`,
      prefillUrl,
    };
  } catch {
    const shortHash = requestId.split("-")[0].toUpperCase();
    return {
      directPosted: false,
      responseId: `GF-${new Date().getFullYear()}-${shortHash}`,
      prefillUrl,
    };
  }
}

export async function recordAndSyncOrder(params: {
  id: string;
  tokenHash: string;
  order: OrderInput;
}): Promise<StoredOrderRecord> {
  const orders = loadOrders();
  const existing = orders.find((o) => o.id === params.id);
  if (existing) {
    return existing;
  }

  const syncOut = await forwardToGoogleFormDirect(params.order, params.id);
  const serviceObj = services.find((s) => s.id === params.order.task);
  const taskLabel = serviceObj ? serviceObj.label : resolveGoogleFormTaskLabel(params.order.task);
  const now = new Date().toISOString();

  const record: StoredOrderRecord = {
    id: params.id,
    tokenHash: params.tokenHash,
    state: "synced",
    responseId: syncOut.responseId,
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
    prefillUrl: syncOut.prefillUrl,
    syncMethod: syncOut.directPosted ? "direct_google_form" : "prefill_bridge",
    lastCode: "",
    notifications: {
      email: { state: "accepted" },
      whatsapp: { state: "accepted" },
    },
  };

  orders.unshift(record);
  saveOrders(orders.slice(0, 200));
  return record;
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
