import path from "node:path";

export type EnvConfig = {
  backendPublicUrl: string;
  portalBaseUrl: string;
  port: number;
  sqliteDbPath: string;
  encryptionKeyHex: string;
  blnkCloudApiOrigin: string;
  nodeEnv: string;
  logLevel: "debug" | "info" | "warn" | "error";
  logFormat: "pretty" | "json";
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function parseLogLevel(value: string): EnvConfig["logLevel"] {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  throw new Error(`LOG_LEVEL must be debug, info, warn, or error (got ${value})`);
}

function parseLogFormat(value: string): EnvConfig["logFormat"] {
  if (value === "pretty" || value === "json") {
    return value;
  }
  throw new Error(`LOG_FORMAT must be pretty or json (got ${value})`);
}

let cached: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cached) return cached;

  const backendPublicUrl = stripTrailingSlash(requireEnv("BACKEND_PUBLIC_URL"));
  const portalBaseUrl = stripTrailingSlash(
    process.env.PORTAL_BASE_URL?.trim() || backendPublicUrl
  );
  const encryptionKeyHex = requireEnv("ENCRYPTION_KEY_HEX");
  if (Buffer.from(encryptionKeyHex, "hex").length !== 32) {
    throw new Error("ENCRYPTION_KEY_HEX must decode to 32 bytes (64 hex chars)");
  }

  cached = {
    backendPublicUrl,
    portalBaseUrl,
    port: Number(process.env.PORT) || 4721,
    sqliteDbPath: process.env.SQLITE_DB_PATH?.trim() || path.join(process.cwd(), "data", "app.db"),
    encryptionKeyHex,
    blnkCloudApiOrigin: stripTrailingSlash(
      process.env.BLNK_CLOUD_API_ORIGIN?.trim() || "https://api.cloud.blnkfinance.com"
    ),
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    logLevel: parseLogLevel(process.env.LOG_LEVEL?.trim() || "info"),
    logFormat: parseLogFormat(process.env.LOG_FORMAT?.trim() || "pretty"),
  };

  return cached;
}

export function resetEnvForTests(): void {
  cached = null;
}
