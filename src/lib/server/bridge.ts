import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class ServiceError extends Error {
  constructor(
    public code: string,
    public status = 503
  ) {
    super(code);
  }
}

export function signingText(ts: number, nonce: string, body: string) {
  return `${ts}.${nonce}.${body}`;
}

export function signature(secret: string, ts: number, nonce: string, body: string) {
  return createHmac("sha256", secret).update(signingText(ts, nonce, body)).digest("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function sameSecret(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Validates whether a URL is a valid Google Apps Script Web App `/exec` endpoint.
 */
export function isValidAppsScriptUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const target = new URL(url.trim());
    return (
      target.origin === "https://script.google.com" &&
      /^\/macros\/s\/[^/]+\/exec$/.test(target.pathname) &&
      !target.search
    );
  } catch {
    return false;
  }
}

/**
 * Returns true when APPS_SCRIPT_URL is configured to a valid Google Apps Script Web App URL.
 */
export function configured(): boolean {
  return isValidAppsScriptUrl(process.env.APPS_SCRIPT_URL);
}

/**
 * Lightweight in-memory rate limiter for abuse protection without CAPTCHA.
 */
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(key: string, maxRequests = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    throw new ServiceError("RATE_LIMIT", 429);
  }
  recent.push(now);
  rateBuckets.set(key, recent);
}

export function resetRateLimitsForTest() {
  rateBuckets.clear();
}

/**
 * Sends an action and data payload to the Google Apps Script Web App gateway (`APPS_SCRIPT_URL`).
 * Only requires `APPS_SCRIPT_URL`.
 */
export async function bridge(action: string, data: unknown = {}) {
  const rawUrl = process.env.APPS_SCRIPT_URL?.trim();
  if (!isValidAppsScriptUrl(rawUrl)) {
    throw new ServiceError("NOT_CONFIGURED", 503);
  }

  let result: Response;
  try {
    result = await fetch(rawUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    throw new ServiceError("UPSTREAM_UNKNOWN", 503);
  }

  if (!result.ok) {
    console.error("SmartMessenger gateway HTTP", result.status);
    throw new ServiceError("UPSTREAM_UNKNOWN", 503);
  }

  let parsed: unknown;
  try {
    parsed = await result.json();
  } catch {
    console.error(
      "SmartMessenger gateway response is not JSON; check Apps Script Web App access is set to Anyone"
    );
    throw new ServiceError("UPSTREAM_UNKNOWN", 503);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { ok?: unknown }).ok !== "boolean"
  ) {
    throw new ServiceError("UPSTREAM_UNKNOWN", 503);
  }

  const envelope = parsed as { ok: boolean; code?: string; data?: unknown };
  if (!envelope.ok) {
    const code =
      typeof envelope.code === "string" && /^[A-Z_]{1,40}$/.test(envelope.code)
        ? envelope.code
        : "UPSTREAM_UNKNOWN";
    console.error("SmartMessenger gateway rejected request:", code);
    const known: Record<string, number> = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      VALIDATION: 400,
      RATE_LIMIT: 429,
      UNAUTHORIZED: 403,
      CONFIG: 503,
      PUBLIC_FORM_ID_NOT_ALLOWED: 503,
      FORM_SCHEMA: 503,
      FORM_CLOSED: 503,
    };
    throw new ServiceError(
      code in known ? code : "UPSTREAM_UNKNOWN",
      known[code] ?? 503
    );
  }

  return envelope.data;
}

/**
 * Verifies same-origin requests when the browser sends both Origin and Host headers.
 */
export function checkOrigin(req: Request) {
  const originHeader = req.headers.get("origin");
  if (!originHeader) return;
  try {
    const reqUrl = new URL(req.url);
    const originUrl = new URL(originHeader);
    if (
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1" ||
      originUrl.hostname === "0.0.0.0"
    ) {
      return;
    }
    const hostHeader =
      req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      req.headers.get("host")?.trim();
    const expectedHost = hostHeader || reqUrl.host;
    if (expectedHost && originUrl.host !== expectedHost) {
      throw new ServiceError("ORIGIN", 403);
    }
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError("ORIGIN", 403);
  }
}

export async function readBody(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    throw new ServiceError("VALIDATION", 400);
  }
  if (Number(req.headers.get("content-length")) > 16000) {
    throw new ServiceError("TOO_LARGE", 413);
  }
  const reader = req.body?.getReader();
  if (!reader) throw new ServiceError("VALIDATION", 400);
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16000) {
      await reader.cancel();
      throw new ServiceError("TOO_LARGE", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ServiceError("VALIDATION", 400);
  }
}

export function failure(error: unknown) {
  const e = error instanceof ServiceError ? error : new ServiceError("UNAVAILABLE", 503);
  return Response.json(
    { ok: false, code: e.code },
    { status: e.status, headers: { "Cache-Control": "no-store" } }
  );
}

export function success(data: unknown, status = 200) {
  return Response.json(
    { ok: true, data },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
