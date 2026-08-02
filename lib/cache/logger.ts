 // lib/cache/logger.ts
  // King_TCG System Logger V5.0
 

type LogLevel = "debug" | "info" | "warn" | "error";

type LogCategory =
  | "SCAN"
  | "GEMINI"
  | "API"
  | "CACHE"
  | "TRANSLATOR";

interface LogEntry {
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private readonly isDevelopment =
    process.env.NODE_ENV !== "production";

  private readonly icons: Record<LogCategory, string> = {
    SCAN: "🔍",
    GEMINI: "🤖",
    API: "🌐",
    CACHE: "⚡",
    TRANSLATOR: "🗣️",
  };

  private formatMessage(entry: LogEntry): string {
    const icon = this.icons[entry.category];

    return `[${entry.timestamp}] ${icon} [${entry.category}] [${entry.level.toUpperCase()}]: ${entry.message}`;
  }

  private log(
    category: LogCategory,
    level: LogLevel,
    message: string,
    data?: unknown
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      data,
    };

    // Les logs debug sont désactivés en production.
    if (!this.isDevelopment && level === "debug") {
      return;
    }

    const formatted = this.formatMessage(entry);

    switch (level) {
      case "error":
        console.error(formatted, data ?? "");
        break;

      case "warn":
        console.warn(formatted, data ?? "");
        break;

      case "info":
        console.info(formatted, data ?? "");
        break;

      case "debug":
        console.debug(formatted, data ?? "");
        break;
    }
  }

  /**
   * 🔍 Scanner
   */
  scan(message: string, data?: unknown): void {
    this.log("SCAN", "info", message, data);
  }

  /**
   * 🤖 Gemini Vision V5
   */
  gemini(message: string, data?: unknown): void {
    this.log("GEMINI", "info", message, data);
  }

  /**
   * 🌐 API
   */
  api(message: string, data?: unknown): void {
    this.log("API", "info", message, data);
  }

  /**
   * ⚡ Cache
   */
  cache(message: string, data?: unknown): void {
    this.log("CACHE", "debug", message, data);
  }

  /**
   * 🗣️ Traduction / résolution Pokémon
   */
  translator(message: string, data?: unknown): void {
    this.log("TRANSLATOR", "debug", message, data);
  }

  /**
   * ❌ Erreur
   */
  error(
    category: LogCategory,
    message: string,
    error?: unknown
  ): void {
    this.log(category, "error", message, error);
  }

  /**
   * ⚠️ Avertissement
   */
  warn(
    category: LogCategory,
    message: string,
    data?: unknown
  ): void {
    this.log(category, "warn", message, data);
  }
}

export const logger = new Logger();