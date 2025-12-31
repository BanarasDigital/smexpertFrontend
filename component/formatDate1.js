// component/formatDate.js
// Robust, locale-safe conversation time display

// Force Indian locale by default (works fine globally too)
const LOCALE = "en-IN";

/**
 * Safely coerce many date inputs to a valid Date or return null.
 * Accepts: Date, number (ms), ISO string (with/without Z)
 */
function toDateSafe(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return input;

  // If numeric string, treat as ms
  if (typeof input === "string" && /^\d+$/.test(input)) {
    const n = Number(input);
    const d = new Date(n);
    return isNaN(d) ? null : d;
  }

  // ISO or general string
  const d = new Date(input);
  if (!isNaN(d)) return d;

  // Number ms
  if (typeof input === "number") {
    const d2 = new Date(input);
    return isNaN(d2) ? null : d2;
  }
  return null;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(a, b /* a = target, b = now */) {
  const y = new Date(b);
  y.setDate(b.getDate() - 1);
  return isSameDay(a, y);
}

/**
 * WhatsApp-like time formatting:
 * - Today: "h:mm AM/PM"
 * - Yesterday: "Yesterday"
 * - Same year: "DD Mon" (e.g., "05 Oct")
 * - Else: "DD/MM/YY"
 */
export function formatConversationDate(input) {
  const d = toDateSafe(input);
  if (!d) return "";

  const now = new Date();

  if (isSameDay(d, now)) {
    return new Intl.DateTimeFormat(LOCALE, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  if (isYesterday(d, now)) return "Yesterday";

  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(LOCALE, {
      day: "2-digit",
      month: "short",
    }).format(d);
  }

  // DD/MM/YY
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
