// Carrier tracking URL helpers for shop shipments.
// Normalizes free-form carrier strings, falls back to auto-detection
// from common tracking-number patterns, and returns a canonical URL.

export type Carrier = "usps" | "ups" | "fedex" | "dhl";

const CARRIER_ALIASES: Record<string, Carrier> = {
  usps: "usps",
  "u.s.p.s": "usps",
  "us postal": "usps",
  "us postal service": "usps",
  "united states postal service": "usps",
  "united states postal": "usps",
  ups: "ups",
  "united parcel service": "ups",
  fedex: "fedex",
  "fed ex": "fedex",
  "federal express": "fedex",
  dhl: "dhl",
  "dhl express": "dhl",
  "dhl ecommerce": "dhl",
};

export function normalizeCarrier(carrier: string | null | undefined): Carrier | null {
  if (!carrier) return null;
  const key = carrier.trim().toLowerCase().replace(/\s+/g, " ");
  if (CARRIER_ALIASES[key]) return CARRIER_ALIASES[key];
  // Loose contains-match as a fallback (e.g. "DHL Express USA")
  for (const [alias, c] of Object.entries(CARRIER_ALIASES)) {
    if (alias.length >= 3 && key.includes(alias)) return c;
  }
  return null;
}

/**
 * Best-effort carrier detection from a tracking number's shape.
 * Returns null when ambiguous — we'd rather skip the link than send a wrong one.
 */
export function detectCarrierFromTracking(rawTracking: string): Carrier | null {
  const t = (rawTracking || "").replace(/[\s-]/g, "").toUpperCase();
  if (!t) return null;

  // UPS — "1Z" + 16 alphanumeric chars
  if (/^1Z[0-9A-Z]{16}$/.test(t)) return "ups";

  // USPS — 20–22 digit IMpb (often starts with 9), or 13-char S10 ending in US
  if (/^9[0-9]{19,21}$/.test(t)) return "usps";
  if (/^[A-Z]{2}[0-9]{9}US$/.test(t)) return "usps";

  // FedEx — 12, 15, 20, or 22 digit forms (avoid USPS overlap above)
  if (/^[0-9]{12}$/.test(t)) return "fedex";
  if (/^[0-9]{15}$/.test(t)) return "fedex";

  // DHL Express — 10 or 11 digit air waybill
  if (/^[0-9]{10,11}$/.test(t)) return "dhl";

  return null;
}

export function trackingUrlFor(
  carrier: string | null | undefined,
  tracking: string | null | undefined,
): string | undefined {
  const raw = (tracking || "").trim();
  if (!raw) return undefined;

  const resolved =
    normalizeCarrier(carrier) ?? detectCarrierFromTracking(raw) ?? null;
  if (!resolved) return undefined;

  const t = encodeURIComponent(raw);
  switch (resolved) {
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case "ups":
      return `https://www.ups.com/track?loc=en_US&tracknum=${t}&requester=ST/`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case "dhl":
      return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${t}`;
  }
}

/** Human-readable carrier label, falling back to the user's original string. */
export function carrierLabel(carrier: string | null | undefined, tracking?: string | null): string | undefined {
  const resolved = normalizeCarrier(carrier) ?? (tracking ? detectCarrierFromTracking(tracking) : null);
  if (resolved) return { usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL" }[resolved];
  return carrier?.trim() || undefined;
}