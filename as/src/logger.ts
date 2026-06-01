/**
 * Tamarix AS -- Logger utility
 *
 * Provides structured logging with module prefixes and configurable log levels.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export function createLogger(module: string) {
  const prefix = `[AS] [${module}]`;

  function formatMsg(level: string, msg: string, ...args: unknown[]): string {
    const ts = new Date().toISOString();
    const extra = args.length > 0 ? " " + args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") : "";
    return `${ts} ${level.toUpperCase()} ${prefix} ${msg}${extra}`;
  }

  return {
    debug(msg: string, ...args: unknown[]) {
      if (shouldLog("debug")) console.debug(formatMsg("debug", msg, ...args));
    },
    info(msg: string, ...args: unknown[]) {
      if (shouldLog("info")) console.info(formatMsg("info", msg, ...args));
    },
    warn(msg: string, ...args: unknown[]) {
      if (shouldLog("warn")) console.warn(formatMsg("warn", msg, ...args));
    },
    error(msg: string, ...args: unknown[]) {
      if (shouldLog("error")) console.error(formatMsg("error", msg, ...args));
    }
  };
}
