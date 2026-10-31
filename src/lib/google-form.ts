import { services, TARIFF_RULES } from "./catalog";

/**
 * Exact Google Form configuration for:
 * https://forms.gle/DYqwvwHXGxERZihD7
 * Resolved public form:
 * https://docs.google.com/forms/d/e/1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg/viewform
 */
export const GOOGLE_FORM_CONFIG = {
  shortUrl:
    process.env.NEXT_PUBLIC_GOOGLE_FORM_SHORT_URL ||
    "https://forms.gle/DYqwvwHXGxERZihD7",
  formId:
    process.env.NEXT_PUBLIC_GOOGLE_FORM_ID ||
    "1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg",
  get viewUrl() {
    return `https://docs.google.com/forms/d/e/${this.formId}/viewform`;
  },
  get responseUrl() {
    return `https://docs.google.com/forms/d/e/${this.formId}/formResponse`;
  },
  title: "FORM ORDER SMART MESSENGER BRIGHTON HUB CIBUBUR",
  fields: {
    name_code: {
      itemId: 1566074241,
      entryId: "entry.879620768",
      title: "NAMA DAN KODE AGENT",
      type: "TEXT",
      required: true,
    },
    unit: {
      itemId: 760147080,
      entryId: "entry.370605340",
      title: "UNIT",
      type: "LIST",
      required: true,
    },
    date: {
      itemId: 1829319111,
      entryId: "entry.934170759",
      title: "TANGGAL PENGERJAAN",
      type: "DATE",
      required: true,
    },
    address: {
      itemId: 508325269,
      entryId: "entry.1051884350",
      title: "ALAMAT LENGKAP PENUGASAN (Blok dan Nomor Rumah)",
      type: "PARAGRAPH_TEXT",
      required: true,
    },
    task: {
      itemId: 1176534648,
      entryId: "entry.902053342",
      title: "TUGAS YANG DIBERIKAN KE MESSENGER",
      type: "CHECKBOX",
      required: true,
    },
    other: {
      itemId: 1142790665,
      entryId: "entry.1271873642",
      title: "TUGAS LAINNYA (JIKA TUGAS TIDAK ADA DI LIST ATAS)",
      type: "PARAGRAPH_TEXT",
      required: false,
    },
    owner: {
      itemId: 1280203260,
      entryId: "entry.2046702710",
      title: "APAKAH SUDAH KONFIRMASI PEMILIK/OWNER",
      type: "CHECKBOX",
      required: true,
    },
  },
} as const;

export interface GoogleFormSubmissionInput {
  name: string;
  code?: string;
  email?: string;
  unit: string;
  date: string;
  address: string;
  maps?: string;
  task: string;
  tasks?: string[];
  other?: string;
  owner: string;
  banners?: number;
  height?: number;
  estimatedKm?: number;
  requestId?: string;
}

export function resolveGoogleFormTaskLabel(taskIdOrLabel: string): string {
  const found = services.find(
    (s) => s.id === taskIdOrLabel || s.label === taskIdOrLabel || s.googleFormLabel === taskIdOrLabel
  );
  if (found) return found.googleFormLabel;
  if (taskIdOrLabel === "Lainnya") return "Lainnya :";
  return taskIdOrLabel;
}

export function formatAgentIdentity(name: string, code?: string): string {
  const cleanName = name.trim();
  const cleanCode = (code || "").trim();
  if (!cleanCode) return cleanName;
  if (cleanName.toLowerCase().includes(cleanCode.toLowerCase())) return cleanName;
  return `${cleanName} (${cleanCode})`;
}

export function formatAddressForGoogleForm(address: string, maps?: string): string {
  const base = address.trim();
  const cleanMaps = (maps || "").trim();
  if (!cleanMaps || /^[-–—]+$/.test(cleanMaps)) return base;
  if (base.includes(cleanMaps)) return base;
  return `${base}\nSharelock Maps: ${cleanMaps}`;
}

export function formatOtherNotesForGoogleForm(input: GoogleFormSubmissionInput): string {
  const parts: string[] = [];
  if (input.other && input.other.trim()) {
    parts.push(input.other.trim());
  }
  const allTasks = input.tasks?.length ? input.tasks : [input.task];
  if (allTasks.includes("banner") && input.banners && input.banners > 0) {
    const heightInfo = input.height ? `, tinggi ±${input.height}m` : "";
    parts.push(`Pemasangan ${input.banners} banner${heightInfo}`);
  }
  if (input.estimatedKm && input.estimatedKm > 0) {
    parts.push(`Estimasi jarak PP ±${input.estimatedKm} km`);
  }
  if (input.email && input.email.trim()) {
    parts.push(`Kontak: ${input.email.trim()}`);
  }
  return parts.join(" | ");
}

/**
 * Builds URLSearchParams for Google Forms prefill (`viewform?usp=pp_url`)
 * or direct POST (`formResponse`).
 */
export function buildGoogleFormParams(
  input: GoogleFormSubmissionInput,
  mode: "prefill" | "post" = "prefill"
): URLSearchParams {
  const params = new URLSearchParams();
  if (mode === "prefill") {
    params.set("usp", "pp_url");
  }

  const { fields } = GOOGLE_FORM_CONFIG;
  params.set(fields.name_code.entryId, formatAgentIdentity(input.name, input.code));
  params.set(fields.unit.entryId, input.unit.trim());

  const cleanDate = input.date.trim();
  params.set(fields.date.entryId, cleanDate);
  if (mode === "post" && /^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const [year, month, day] = cleanDate.split("-");
    params.set(`${fields.date.entryId}_year`, year);
    params.set(`${fields.date.entryId}_month`, String(Number(month)));
    params.set(`${fields.date.entryId}_day`, String(Number(day)));
  }

  params.set(
    fields.address.entryId,
    formatAddressForGoogleForm(input.address, input.maps)
  );

  const taskList =
    input.tasks && input.tasks.length > 0 ? input.tasks : [input.task];
  for (const t of taskList) {
    if (!t) continue;
    params.append(fields.task.entryId, resolveGoogleFormTaskLabel(t));
  }

  const otherNotes = formatOtherNotesForGoogleForm(input);
  if (otherNotes) {
    params.set(fields.other.entryId, otherNotes);
  }

  params.set(fields.owner.entryId, input.owner.trim());

  if (mode === "post") {
    params.set("fvv", "1");
    params.set("pageHistory", "0");
    if (input.email && input.email.trim()) {
      params.set("emailAddress", input.email.trim());
    }
  }

  return params;
}

/**
 * Generates a 1-click pre-filled Google Form URL matching all 7 fields
 * of https://forms.gle/DYqwvwHXGxERZihD7
 */
export function buildPrefilledGoogleFormUrl(input: GoogleFormSubmissionInput): string {
  const params = buildGoogleFormParams(input, "prefill");
  return `${GOOGLE_FORM_CONFIG.viewUrl}?${params.toString()}`;
}

export interface TariffCalculationResult {
  roundTripKm: number;
  travelCost: number;
  bannerCount: number;
  bannerCost: number;
  totalEstimatedCost: number;
  distanceWithinBannerLimit: boolean;
  heightWithinBannerLimit: boolean;
  eligibleForBanner: boolean;
}

export function calculateTariffEstimate(options: {
  roundTripKm: number;
  hasBanner: boolean;
  bannerCount?: number;
  bannerHeightMeters?: number;
}): TariffCalculationResult {
  const safeKm = Math.max(0, Number.isFinite(options.roundTripKm) ? options.roundTripKm : 0);
  const safeBanners =
    options.hasBanner && Number.isFinite(options.bannerCount)
      ? Math.max(1, Math.min(100, Math.round(options.bannerCount!)))
      : 0;
  const safeHeight =
    options.hasBanner && Number.isFinite(options.bannerHeightMeters)
      ? Math.max(0.5, options.bannerHeightMeters!)
      : 1;

  const travelCost = Math.round(safeKm * TARIFF_RULES.ratePerKmRoundTrip);
  const bannerCost = options.hasBanner ? safeBanners * TARIFF_RULES.bannerInstallFee : 0;
  const distanceWithinBannerLimit = safeKm <= TARIFF_RULES.maxBannerDistanceKm;
  const heightWithinBannerLimit = safeHeight <= TARIFF_RULES.maxBannerHeightMeters;

  return {
    roundTripKm: safeKm,
    travelCost,
    bannerCount: safeBanners,
    bannerCost,
    totalEstimatedCost: travelCost + bannerCost,
    distanceWithinBannerLimit,
    heightWithinBannerLimit,
    eligibleForBanner: !options.hasBanner || (distanceWithinBannerLimit && heightWithinBannerLimit),
  };
}

/**
 * Streamlined 1-file Google Apps Script connector that requires ZERO external
 * ledger spreadsheets and ZERO extra Form columns.
 */
export function getStreamlinedAppsScriptSnippet(): string {
  return `/**
 * Konektor Ringkas Google Form Smart Messenger Brighton HUB Cibubur
 * Pasang langsung pada Script Editor Google Form ( tanpa perlu Spreadsheet tambahan ).
 */
const FORM_ITEM_IDS = {
  name_code: 1566074241,
  unit: 760147080,
  date: 1829319111,
  address: 508325269,
  task: 1176534648,
  other: 1142790665,
  owner: 1280203260
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const data = payload.data ? JSON.parse(payload.body || "{}").data?.order || payload.data : payload;
    const form = FormApp.getActiveForm();
    let res = form.createResponse();

    const nameVal = data.code ? data.name + " (" + data.code + ")" : data.name;
    res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.name_code).asTextItem().createResponse(nameVal));
    res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.unit).asListItem().createResponse(data.unit));
    res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.date).asDateItem().createResponse(new Date(data.date + "T12:00:00+07:00")));
    res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.address).asParagraphTextItem().createResponse(data.address));
    res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.task).asCheckboxItem().createResponse([data.taskLabel || data.task]));
    if (data.other) {
      res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.other).asParagraphTextItem().createResponse(data.other));
    }
    res = res.withItemResponse(form.getItemById(FORM_ITEM_IDS.owner).asCheckboxItem().createResponse([data.owner]));

    const submitted = res.submit();
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      data: { id: data.id || Utilities.getUuid(), state: "synced", responseId: submitted.getId(), updatedAt: new Date().toISOString() }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, code: "SUBMIT_ERROR", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
}
