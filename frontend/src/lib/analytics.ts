// Labels and helpers shared by the dashboard, API log and activity log screens

export const RANGE_OPTIONS = [
  { key: "24h", label: "24 hours", period: "previous 24 hours" },
  { key: "7d", label: "7 days", period: "previous 7 days" },
  { key: "30d", label: "30 days", period: "previous 30 days" },
  { key: "90d", label: "90 days", period: "previous 90 days" },
] as const;

export const LOG_RANGE_OPTIONS = [
  { key: "1h", label: "Last hour" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
] as const;

export const ACTIVITY_CATEGORIES: Record<string, string> = {
  auth: "Sign-in & accounts",
  admin: "Admin",
  profile: "Portfolio content",
  site: "Websites",
  template: "Templates",
  master: "Masters",
  media: "Media",
  message: "Messages",
  booking: "Trip bookings",
  drivers: "Driver applications",
  reviews: "Ratings & reviews",
  forms: "Custom forms",
  enquiries: "Business enquiries",
  guest: "Visitors",
  other: "Other",
};

export const PAGE_TYPES: Record<string, string> = {
  home: "Home",
  template: "Template detail",
  customize: "Builder",
  portfolio: "Portfolios",
  auth: "Sign-in pages",
  other: "Other",
};

export const API_STATUS: Record<string, { label: string; icon: string }> = {
  success: { label: "Success", icon: "✓" },
  failed: { label: "Rejected", icon: "!" },
  error: { label: "Error", icon: "✕" },
};

// "adminUpdateTemplate" -> "Admin update template"
export function humanizeAction(action: string) {
  const words = action.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const capitalize = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v);

// Downloads rows as a CSV file (opened fine by Excel and Google Sheets)
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Leading =,+,-,@ would run as a formula in spreadsheets
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
