// Flexible time parsing → canonical "h:MM AM/PM" (matches existing schedule format).
// Accepts: "9am", "9 PM", "9:30am", "2100", "21:00", "21:00:00", "7", "700", "1900".

function toCanonical(hours24: number, minutes: number): string {
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mer = hours24 < 12 ? "AM" : "PM";
  return `${h12}:${minutes.toString().padStart(2, "0")} ${mer}`;
}

export function parseFlexibleTime(input: string): string | null {
  if (!input) return null;
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!s) return null;

  // 1) AM/PM forms: "9AM", "9:30PM", "12:05AM"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const mer = ampm[3];
    if (h < 1 || h > 12 || m > 59) return null;
    if (mer === "AM") h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
    return toCanonical(h, m);
  }

  // 2) Colon 24h: "21:00", "21:00:00", "7:30"
  const colon = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (h > 23 || m > 59) return null;
    return toCanonical(h, m);
  }

  // 3) Compact military: "2100", "0700", "700", "7", "9"
  if (/^\d{1,4}$/.test(s)) {
    const n = parseInt(s, 10);
    let h: number, m: number;
    if (s.length <= 2) { h = n; m = 0; }
    else if (s.length === 3) { h = Math.floor(n / 100); m = n % 100; }
    else { h = Math.floor(n / 100); m = n % 100; }
    if (h > 23 || m > 59) return null;
    return toCanonical(h, m);
  }

  return null;
}

export interface TimeRange { start: string; end: string; }

// Parses a combined range like "17:00:00-18:50:00", "9am - 10:30am", "0700-0950".
export function parseTimeRange(input: string): TimeRange | null {
  if (!input) return null;
  const parts = input.split(/\s*[-–—to]+\s*/i).filter(Boolean);
  if (parts.length < 2) return null;
  const start = parseFlexibleTime(parts[0]);
  const end = parseFlexibleTime(parts[parts.length - 1]);
  if (!start || !end) return null;
  return { start, end };
}

// Canonical "h:MM AM/PM" → "HH:MM:SS" for the combined-input display.
export function toRangeString(start: string, end: string): string {
  const fmt = (t: string) => {
    const p = parseFlexibleTime(t);
    if (!p) return "";
    const m = p.match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/);
    if (!m) return "";
    let h = parseInt(m[1], 10);
    const min = m[2];
    const mer = m[3];
    if (mer === "AM") h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
    return `${h.toString().padStart(2, "0")}:${min}:00`;
  };
  const s = fmt(start);
  const e = fmt(end);
  if (!s || !e) return "";
  return `${s}-${e}`;
}
