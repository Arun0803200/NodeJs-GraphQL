import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  // AWS
  AWS_REGION: required("AWS_REGION"),
  AWS_ACCESS_KEY_ID: required("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: required("AWS_SECRET_ACCESS_KEY"),
  AWS_S3_BUCKET_NAME: required("AWS_S3_BUCKET_NAME"),

  // Database
  DB_HOST: optional("DB_HOST", "localhost"),
  DB_PORT: parseInt(optional("DB_PORT", "5432"), 10),
  DB_USERNAME: required("DB_USERNAME"),
  DB_PASSWORD: required("DB_PASSWORD"),
  DB_NAME: optional("DB_NAME", "user_portfolio"),

  // Server
  PORT: parseInt(optional("PORT", "4000"), 10),

  // JWT
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),

  // Frontend base URL, used in password-reset emails
  FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:5173"),

  // SMTP (optional). When SMTP_HOST is empty, reset links are logged to the console instead of emailed.
  SMTP_HOST: optional("SMTP_HOST", ""),
  SMTP_PORT: parseInt(optional("SMTP_PORT", "587"), 10),
  SMTP_USER: optional("SMTP_USER", ""),
  SMTP_PASS: optional("SMTP_PASS", ""),
  SMTP_FROM: optional("SMTP_FROM", "Portfolio Builder <no-reply@portfolio.local>"),

  // Media storage: "local" writes to UPLOAD_DIR, "s3" uses the AWS bucket above.
  // Files are always served through the API at <PUBLIC_API_URL>/media/<key>.
  STORAGE_DRIVER: optional("STORAGE_DRIVER", "local") as "local" | "s3",
  UPLOAD_DIR: optional("UPLOAD_DIR", "uploads"),
  PUBLIC_API_URL: optional("PUBLIC_API_URL", `http://localhost:${optional("PORT", "4000")}`),
  // Max size of the original file; images are re-encoded to compact webp after upload
  MAX_UPLOAD_MB: parseInt(optional("MAX_UPLOAD_MB", "10"), 10),

  // Analytics: how long raw events are kept before the daily cleanup removes them
  API_EVENT_RETENTION_DAYS: parseInt(optional("API_EVENT_RETENTION_DAYS", "90"), 10),
  PAGE_VIEW_RETENTION_DAYS: parseInt(optional("PAGE_VIEW_RETENTION_DAYS", "365"), 10),
  ACTIVITY_RETENTION_DAYS: parseInt(optional("ACTIVITY_RETENTION_DAYS", "365"), 10),

  // Platform contact: WhatsApp number (digits with country code, e.g. 919840012345) that receives "Contact us" enquiries from every site
  ADMIN_WHATSAPP: optional("ADMIN_WHATSAPP", "").replace(/\D/g, ""),
  // Optional email copy of each enquiry (falls back to the server log when SMTP is not configured)
  ADMIN_EMAIL: optional("ADMIN_EMAIL", ""),

  // Travels/taxi websites: free OpenStreetMap services by default; point these at self-hosted copies for heavy traffic
  NOMINATIM_URL: optional("NOMINATIM_URL", "https://nominatim.openstreetmap.org"),
  OSRM_URL: optional("OSRM_URL", "https://router.project-osrm.org"),
  OVERPASS_URL: optional("OVERPASS_URL", "https://overpass-api.de/api/interpreter"),
  // OpenStreetMap services require an identifying User-Agent with a contact address
  GEO_USER_AGENT: optional("GEO_USER_AGENT", "Portfolia/1.0 (portfolio travels booking)"),
};
