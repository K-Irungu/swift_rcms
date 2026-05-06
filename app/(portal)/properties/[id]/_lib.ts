
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

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

