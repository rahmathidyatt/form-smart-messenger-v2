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
} from "../src/lib/google-form";

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

test("buildGoogleFormParams in post mode includes split date components for formResponse", () => {
  const params = buildGoogleFormParams(
    {
      name: "Siti Rahma (PA-200)",
      unit: "CROWN",
      date: "2026-11-05",
      address: "Jl. Alternatif Cibubur No. 8",
      task: "other",
      other: "Kirim dokumen tambahan",
      owner: "TIDAK",
    },
    "post"
  );

  assert.equal(params.get("entry.934170759_year"), "2026");
  assert.equal(params.get("entry.934170759_month"), "11");
  assert.equal(params.get("entry.934170759_day"), "5");
  assert.equal(params.get("entry.902053342"), "Lainnya :");
  assert.equal(params.get("entry.2046702710"), "TIDAK");
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
