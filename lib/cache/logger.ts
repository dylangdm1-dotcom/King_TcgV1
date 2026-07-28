/**
 * 🪵 System Logger V3.6
 * Gestion centralisée des logs structurés (Scan, Gemini, API, Cache)
 */

 type LogLevel = "debug" | "info" | "warn" | "error";
 type LogCategory = "SCAN" | "GEMINI" | "API" | "CACHE" | "TRANSLATOR";
 
 interface LogEntry {
   timestamp: string;
   category: LogCategory;
   level: LogLevel;
   message: string;
   data?: unknown;
 }
 
 class Logger {
   private isDevelopment = process.env.NODE_ENV !== "production";
 
   private formatMessage(entry: LogEntry): string {
     const icon = {
       SCAN: "🔍",
       GEMINI: "🤖",
       API: "🌐",
       CACHE: "⚡",
       TRANSLATOR: "🗣️",
     }[entry.category];
 
     return `[${entry.timestamp}] ${icon} [${entry.category}] [${entry.level.toUpperCase()}]: ${entry.message}`;
   }
 
   private log(category: LogCategory, level: LogLevel, message: string, data?: unknown) {
     const entry: LogEntry = {
       timestamp: new Date().toISOString(),
       category,
       level,
       message,
       data,
     };
 
     if (!this.isDevelopment && level === "debug") return;
 
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
 
   scan(message: string, data?: unknown) {
     this.log("SCAN", "info", message, data);
   }
 
   gemini(message: string, data?: unknown) {
     this.log("GEMINI", "info", message, data);
   }
 
   api(message: string, data?: unknown) {
     this.log("API", "info", message, data);
   }
 
   cache(message: string, data?: unknown) {
     this.log("CACHE", "debug", message, data);
   }
 
   translator(message: string, data?: unknown) {
     this.log("TRANSLATOR", "debug", message, data);
   }
 
   error(category: LogCategory, message: string, error?: unknown) {
     this.log(category, "error", message, error);
   }
 
   warn(category: LogCategory, message: string, data?: unknown) {
     this.log(category, "warn", message, data);
   }
 }
 
 export const logger = new Logger();
