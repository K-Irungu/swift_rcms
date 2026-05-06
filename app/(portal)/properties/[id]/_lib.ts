
// ─── Constants ────────────────────────────────────────────────────────────────

export const COUNTRY_CODES: Record<string, string> = {
  Kenya: "KE",
  Uganda: "UG",
  Tanzania: "TZ",
  Rwanda: "RW",
  Ethiopia: "ET",
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatKES(n: number) {
  return `KES ${n.toLocaleString("en-KE")}`;
}

