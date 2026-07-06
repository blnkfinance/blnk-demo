import { randomUUID } from "node:crypto";
import { getEnv } from "./env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

type LogContext = Record<string, string | number | boolean | null | undefined>;

function shouldLog(level: LogLevel): boolean {
  const { logLevel } = getEnv();
  return LEVEL_ORDER[level] >= LEVEL_ORDER[logLevel];
}

function formatContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    safe[key] = value;
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;
  const { logFormat } = getEnv();
  const ctx = formatContext(context);
  if (logFormat === "json") {
    console.log(JSON.stringify({ level, message, ...ctx, ts: new Date().toISOString() }));
    return;
  }
  const ctxStr = ctx ? ` ${JSON.stringify(ctx)}` : "";
  console.log(`[${level}] ${message}${ctxStr}`);
}

export function newRequestId(): string {
  return randomUUID();
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    write("debug", message, context);
  },
  info(message: string, context?: LogContext): void {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    write("error", message, context);
  },
};
