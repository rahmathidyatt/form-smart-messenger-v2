import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleFormParams,
  buildPrefilledGoogleFormUrl,
  calculateTariffEstimate,
  formatAddressForGoogleForm,
  formatAgentIdentity,
  GOOGLE_FORM_CONFIG,
  resolveGoogleFormTaskLabel,
  verifyGoogleFormResponseHtml,
} from "../src/lib/google-form";
import { forwardToGoogleFormDirect } from "../src/lib/server/order-store";

test("Google Form configuration targets official Brighton HUB Cibubur form and 7 entry IDs", () => {
  assert.equal(GOOGLE_FORM_CONFIG.shortUrl, "https://forms.gle/DYqwvwHXGxERZihD7");
  assert.equal(
    GOOGLE_FORM_CONFIG.formId,
    "1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg"
  );
  assert.equal(GOOGLE_FORM_CONFIG.fields.name_code.entryId, "entry.879620768");
  assert.equal(GOOGLE_FORM_CONFIG.fields.unit.entryId, "entry.370605340");
  assert.equal(GOOGLE_FORM_CONFIG.fields.date.entryId, "entry.934170759");
  assert.equal(GOOGLE_FORM_CONFIG.fields.address.entryId, "entry.1051884350");
  assert.equal(GOOGLE_FORM_CONFIG.fields.task.entryId, "entry.902053342");
  assert.equal(GOOGLE_FORM_CONFIG.fields.other.entryId, "entry.1271873642");
  assert.equal(GOOGLE_FORM_CONFIG.fields.owner.entryId, "entry.2046702710");
});

test("resolveGoogleFormTaskLabel maps 'other' to exact Google Form choice 'Lainnya :'", () => {
  assert.equal(resolveGoogleFormTaskLabel("banner"), "Pasang banner");
  assert.equal(resolveGoogleFormTaskLabel("other"), "Lainnya :");
  assert.equal(resolveGoogleFormTaskLabel("Lainnya"), "Lainnya :");
});

test("buildPrefilledGoogleFormUrl populates all 7 official entry parameters", () => {
  const url = buildPrefilledGoogleFormUrl({
    name: "Rahmat",
    code: "PA-101",
    unit: "VISION",
    date: "2026-11-15",
    address: "Cluster Boston Blok B4 No. 12",
    maps: "https://maps.app.goo.gl/abc123",
    task: "banner",
    other: "Pasang di pagar depan",
    owner: "YA",
    banners: 2,
    height: 3,
  });

  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://docs.google.com");
  assert.equal(parsed.searchParams.get("usp"), "pp_url");
  assert.equal(parsed.searchParams.get("entry.879620768"), "Rahmat (PA-101)");
  assert.equal(parsed.searchParams.get("entry.370605340"), "VISION");
  assert.equal(parsed.searchParams.get("entry.934170759"), "2026-11-15");
  assert.ok(
    parsed.searchParams
      .get("entry.1051884350")
      ?.includes("https://maps.app.goo.gl/abc123")
  );
  assert.equal(parsed.searchParams.get("entry.902053342"), "Pasang banner");
  assert.ok(
    parsed.searchParams.get("entry.1271873642")?.includes("Pemasangan 2 banner")
  );
  assert.equal(parsed.searchParams.get("entry.2046702710"), "YA");
});

test("buildGoogleFormParams in post mode includes split date components and checkbox sentinels for formResponse", () => {
  const params = buildGoogleFormParams(
    {
      name: "Siti Rahma (PA-200)",
      email: "siti@brighton.co.id",
      unit: "CROWN",
      date: "2026-11-05",
      address: "Jl. Alternatif Cibubur No. 8",
      task: "other",
      other: "Kirim dokumen tambahan",
      owner: "TIDAK",
      requestId: "8f4b2c10-9a11-4d32-8e71-102938475601",
    },
    "post"
  );

  assert.equal(params.get("entry.934170759_year"), "2026");
  assert.equal(params.get("entry.934170759_month"), "11");
  assert.equal(params.get("entry.934170759_day"), "5");
  assert.equal(params.get("entry.902053342"), "Lainnya :");
  assert.equal(params.get("entry.902053342_sentinel"), "");
  assert.equal(params.get("entry.2046702710"), "TIDAK");
  assert.equal(params.get("entry.2046702710_sentinel"), "");
  assert.equal(params.get("emailAddress"), "siti@brighton.co.id");
  assert.ok(params.get("entry.1271873642")?.includes("Ref: 8F4B2C10"));
});

test("verifyGoogleFormResponseHtml distinguishes real confirmation from 401 auth and form validation errors", () => {
  assert.deepEqual(
    verifyGoogleFormResponseHtml(401, "<html>Unauthorized</html>"),
    { verified: false, code: "FORM_AUTH_REQUIRED" }
  );

  assert.deepEqual(
    verifyGoogleFormResponseHtml(
      302,
      "",
      "https://accounts.google.com/ServiceLogin?continue=..."
    ),
    { verified: false, code: "FORM_AUTH_REQUIRED" }
  );

  assert.deepEqual(
    verifyGoogleFormResponseHtml(
      200,
      '<form id="mG61Hd" data-first-entry="0"><div data-user-email-address="">Rekam alamat email dengan respons saya</div></form>'
    ),
    { verified: false, code: "FORM_AUTH_REQUIRED" }
  );

  assert.deepEqual(
    verifyGoogleFormResponseHtml(
      200,
      '<form id="mG61Hd" data-first-entry="0"><div role="alert">Pertanyaan ini wajib diisi</div></form>'
    ),
    { verified: false, code: "FORM_SCHEMA" }
  );

  assert.deepEqual(
    verifyGoogleFormResponseHtml(
      200,
      '<div class="vHW8K">Jawaban Anda telah direkam.</div><a href="https://docs.google.com/forms/d/e/1FAIpQL/viewform?usp=form_confirm">Kirim jawaban lain</a>'
    ),
    { verified: true, code: "SYNCED" }
  );
});

test("forwardToGoogleFormDirect only reports directPosted=true when Google Forms confirms submission", async () => {
  const sampleOrder = {
    email: "agent@brighton.co.id",
    name: "Rahmat (PA-101)",
    code: "",
    unit: "VISION",
    date: "2099-01-01",
    address: "Cluster Boston Blok B4 No. 12",
    maps: "",
    task: "banner",
    other: "Pasang 1 banner",
    owner: "YA",
    consent: true,
  };

  const unauthorizedResult = await forwardToGoogleFormDirect(
    sampleOrder,
    "8f4b2c10-9a11-4d32-8e71-102938475601",
    async () => new Response("Unauthorized", { status: 401 })
  );
  assert.equal(unauthorizedResult.directPosted, false);
  assert.equal(unauthorizedResult.code, "FORM_AUTH_REQUIRED");

  const confirmedResult = await forwardToGoogleFormDirect(
    sampleOrder,
    "8f4b2c10-9a11-4d32-8e71-102938475601",
    async () =>
      new Response(
        '<div class="vHW8K">Jawaban Anda telah direkam</div>',
        { status: 200 }
      )
  );
  assert.equal(confirmedResult.directPosted, true);
  assert.equal(confirmedResult.code, "SYNCED");
});

test("calculateTariffEstimate computes round-trip travel and banner installation fees accurately", () => {
  const nonBanner = calculateTariffEstimate({
    roundTripKm: 12,
    hasBanner: false,
    bannerCount: 3,
  });
  assert.equal(nonBanner.travelCost, 10800);
  assert.equal(nonBanner.bannerCost, 0);
  assert.equal(nonBanner.totalEstimatedCost, 10800);
  assert.equal(nonBanner.eligibleForBanner, true);

  const validBanner = calculateTariffEstimate({
    roundTripKm: 20,
    hasBanner: true,
    bannerCount: 2,
    bannerHeightMeters: 3.5,
  });
  assert.equal(validBanner.travelCost, 18000);
  assert.equal(validBanner.bannerCost, 10000);
  assert.equal(validBanner.totalEstimatedCost, 28000);
  assert.equal(validBanner.eligibleForBanner, true);

  const overLimitBanner = calculateTariffEstimate({
    roundTripKm: 28,
    hasBanner: true,
    bannerCount: 1,
    bannerHeightMeters: 4.5,
  });
  assert.equal(overLimitBanner.distanceWithinBannerLimit, false);
  assert.equal(overLimitBanner.heightWithinBannerLimit, false);
  assert.equal(overLimitBanner.eligibleForBanner, false);
});

test("formatAgentIdentity and formatAddressForGoogleForm avoid duplicate suffixes", () => {
  assert.equal(formatAgentIdentity("Budi (PA-01)", "PA-01"), "Budi (PA-01)");
  assert.equal(formatAddressForGoogleForm("Blok A1", "-"), "Blok A1");
});
