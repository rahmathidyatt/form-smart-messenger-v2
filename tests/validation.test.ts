import test from "node:test";
import assert from "node:assert/strict";
import { envelopeSchema, orderSchema, receiptSchema } from "../src/lib/submission";
import {
  checkOrigin,
  checkRateLimit,
  configured,
  isValidAppsScriptUrl,
  readBody,
  resetRateLimitsForTest,
  sameSecret,
  signature,
} from "../src/lib/server/bridge";

const valid = {
  email: "agent@example.test",
  name: "Agent Contoh",
  code: "TEST",
  unit: "VISION",
  date: "2099-01-01",
  address: "Jalan Contoh Blok A 12",
  maps: "",
  task: "documents",
  other: "",
  owner: "TIDAK",
  consent: true,
};

test("valid public order does not require login and allows owner pending", () => {
  assert.equal(orderSchema.safeParse(valid).success, true);
});

test("envelope schema does not require CAPTCHA challenge token", () => {
  const parsed = envelopeSchema.safeParse({
    id: "8f4b2c10-9a11-4d32-8e71-102938475601",
    token: "a".repeat(64),
    order: valid,
  });
  assert.equal(parsed.success, true);
});

test("reject missing, invalid unit, past date, invalid calendar date and consent", () => {
  for (const patch of [
    { name: "" },
    { unit: "FAKE" },
    { date: "2000-01-01" },
    { date: "2099-02-31" },
    { consent: false },
    { email: "invalid" },
    { task: "other", other: "" },
  ]) {
    assert.equal(orderSchema.safeParse({ ...valid, ...patch }).success, false);
  }
});

test("unknown fields cannot smuggle role or payment approvals", () => {
  assert.equal(orderSchema.safeParse({ ...valid, role: "admin" }).success, false);
});

test("invalid map schemes and spoofed hosts rejected", () => {
  for (const maps of [
    "javascript:alert(1)",
    "https://maps.google.com.evil.test",
    "http://google.com",
  ]) {
    assert.equal(orderSchema.safeParse({ ...valid, maps }).success, false);
  }
});

test("receipt token requires 256-bit random hexadecimal value shape", () => {
  assert.equal(receiptSchema.safeParse({ id: "any", token: "short" }).success, false);
});

test("signature binds timestamp nonce and request body", () => {
  assert.notEqual(
    signature("secret", 1, "a", "{}"),
    signature("secret", 1, "a", '{"action":"admin"}')
  );
  assert.equal(sameSecret("a", "a"), true);
  assert.equal(sameSecret("ab", "a"), false);
});

test("APPS_SCRIPT_URL validation accepts standard and Workspace /exec URLs", () => {
  assert.equal(
    isValidAppsScriptUrl("https://script.google.com/macros/s/AKfycbx12345/exec"),
    true
  );
  assert.equal(
    isValidAppsScriptUrl(
      "https://script.google.com/a/macros/brighton.co.id/s/AKfycbx12345/exec"
    ),
    true
  );
  assert.equal(
    isValidAppsScriptUrl("https://docs.google.com/forms/d/e/1FAIpQL/viewform"),
    false
  );
  assert.equal(isValidAppsScriptUrl(""), false);

  const prevUrl = process.env.APPS_SCRIPT_URL;
  try {
    process.env.APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx12345/exec";
    assert.equal(configured(), true);
    delete process.env.APPS_SCRIPT_URL;
    assert.equal(configured(), false);
  } finally {
    if (prevUrl === undefined) delete process.env.APPS_SCRIPT_URL;
    else process.env.APPS_SCRIPT_URL = prevUrl;
  }
});

test("same-origin check blocks mismatched Origin header and allows matching origin, Origin: null, and Sec-Fetch-Site: same-origin", () => {
  assert.throws(
    () =>
      checkOrigin(
        new Request("https://site.example/api/orders", {
          headers: { origin: "https://evil.example", host: "site.example" },
        })
      ),
    /ORIGIN/
  );
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("https://site.example/api/orders", {
        headers: { origin: "https://site.example", host: "site.example" },
      })
    )
  );
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("https://site.example/api/orders", {
        headers: { origin: "null", host: "site.example" },
      })
    )
  );
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("https://internal-lambda.netlify.internal/api/orders", {
        headers: {
          origin: "https://brighton-smart-messenger.netlify.app",
          host: "internal-lambda.netlify.internal",
          "sec-fetch-site": "same-origin",
        },
      })
    )
  );
});

test("server rate limiter blocks excessive requests without requiring CAPTCHA", () => {
  resetRateLimitsForTest();
  for (let i = 0; i < 3; i++) {
    checkRateLimit("test-client", 3, 60000);
  }
  assert.throws(() => checkRateLimit("test-client", 3, 60000), /RATE_LIMIT/);
  resetRateLimitsForTest();
});

test("oversized JSON is rejected even without content-length", async () => {
  await assert.rejects(
    readBody(
      new Request("https://site.example", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ large: "x".repeat(17000) }),
      })
    ),
    /TOO_LARGE/
  );
});

test("optional location accepts empty whitespace and dash without requiring https", () => {
  for (const maps of ["", "   ", "-", " - ", "–", "—"]) {
    const p = orderSchema.safeParse({ ...valid, maps });
    assert.equal(p.success, true);
    if (p.success) assert.equal(p.data.maps, "");
  }
});

test("optional location preserves valid Maps link and rejects non-link text", () => {
  const maps = "https://maps.app.goo.gl/example";
  assert.equal(orderSchema.parse({ ...valid, maps }).maps, maps);
  assert.equal(orderSchema.safeParse({ ...valid, maps: "bukan tautan" }).success, false);
});
