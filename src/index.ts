// src/index.ts
import "source-map-support/register";
import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import geoip from "geoip-lite";

// A more specific type for the origin object
export interface Origin {
  file?: string;
  func?: string;
  line?: number;
}

export interface LoggerOptions {
  logFile: string;
  maskFields?: string[];
  captureBody?: boolean;
  trackQuery?: boolean;
  onlyLogOnError?: boolean;
  maxBodySize?: number;
  trackUser?: (req: Request) => string;
  trackOrigin?: boolean;
  onLog?: (logEntry: LogEntry) => void;
  enableGeoIP?: boolean;
  slowThresholdMs?: number;
  trackSlow?: boolean;
  requestIdHeader?: string;
  prettyPrint?: boolean;
  logHeaders?: boolean;
  logParams?: boolean;
  logResponseBody?: boolean;
  excludePaths?: string[];
}

interface LogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  route: string;
  status: number;
  ip?: string;
  durationMs?: number;
  slow?: boolean;
  user?: string;
  body?: any;
  query?: any;
  responseSnippet?: string;
  origin?: Origin;
  location?: { country?: string; region?: string; city?: string };
  headers?: any;
  params?: any;
}

// Express middleware type that works across versions
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export function logger(options: LoggerOptions): ExpressMiddleware {
  const {
    logFile,
    maskFields = ["password", "token"],
    captureBody = true,
    trackQuery = false,
    onlyLogOnError = false,
    maxBodySize = 1024,
    trackUser = () => "anonymous",
    trackOrigin = false,
    onLog,
    enableGeoIP = false,
    slowThresholdMs = 1000,
    trackSlow = false,
    requestIdHeader = "x-request-id",
    prettyPrint = false,
    logHeaders = false,
    logParams = false,
    logResponseBody = false,
    excludePaths = [],
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (excludePaths.includes(req.path)) return next();

    // Start timing after middleware setup, closer to actual request processing
    const start = process.hrtime.bigint();
    const chunks: Buffer[] = [];
    const originalSend = res.send;

    const requestId = Array.isArray(req.headers[requestIdHeader])
      ? (req.headers[requestIdHeader] as string[])[0]
      : (req.headers[requestIdHeader] as string) || uuidv4();
    (req as any).requestId = requestId;

    // Store origin info on the request object to capture it later
    if (trackOrigin) {
      (req as any)._logwiseOrigin = null;
    }

    // Override res.send to capture origin info when response is actually sent
    res.send = function (chunk: any) {
      // Capture origin info right before sending response (this is when we have controller context)
      if (trackOrigin && !(req as any)._logwiseOrigin) {
        (req as any)._logwiseOrigin = getOriginInfo();
      }
      
      if (logResponseBody && chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return originalSend.apply(this, arguments as any);
    };

    res.on("finish", () => {
      if (onlyLogOnError && res.statusCode < 400) return;

      const duration = getDurationInMs(start);
      const maskedBody = maskFieldsFromObject(req.body, maskFields);
      const responseSnippet = logResponseBody
        ? Buffer.concat(chunks).toString("utf8").substring(0, 200)
        : undefined;

      // Normalize IP address
      const normalizedIp = normalizeIpAddress(req);

      const logEntry: LogEntry = {
        requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        route: req.originalUrl,
        status: res.statusCode,
        ip: normalizedIp,
        durationMs: duration,
        user: trackUser(req),
        body: captureBody ? limitSize(maskedBody, maxBodySize) : undefined,
        responseSnippet,
      };

      // Only add slow property when tracking is enabled AND the request is actually slow
      if (trackSlow && duration > slowThresholdMs) {
        logEntry.slow = true;
      }

      if (trackQuery) {
        logEntry.query = maskFieldsFromObject(req.query, maskFields);
      }

      if (trackOrigin && (req as any)._logwiseOrigin) {
        logEntry.origin = (req as any)._logwiseOrigin;
      }

      if (
        enableGeoIP &&
        normalizedIp &&
        normalizedIp !== "127.0.0.1" &&
        normalizedIp !== "unknown"
      ) {
        const geo = geoip.lookup(normalizedIp);
        if (geo) {
          logEntry.location = {
            country: geo.country,
            region: geo.region,
            city: geo.city,
          };
        }
      } else if (
        enableGeoIP &&
        normalizedIp &&
        (normalizedIp === "127.0.0.1" || normalizedIp === "unknown")
      ) {
        logEntry.location = {
          country: "Not available for local requests",
          region: "Not available for local requests",
          city: "Not available for local requests",
        };
      }

      if (logHeaders) {
        logEntry.headers = maskFieldsFromObject(req.headers, maskFields);
      }

      if (logParams && req.params && Object.keys(req.params).length > 0) {
        logEntry.params = req.params;
      }

      if (onLog) onLog(logEntry);

      writeLog(logFile, logEntry, prettyPrint);
    });

    next();
  };
}

function normalizeIpAddress(req: Request): string {
  // Get the client IP address with fallbacks (using modern methods)
  const clientIp =
    req.ip ||
    req.socket.remoteAddress ||
    (req.headers["x-forwarded-for"] as string) ||
    (req.headers["x-real-ip"] as string) ||
    (req.headers["cf-connecting-ip"] as string) || // Cloudflare
    (req.headers["x-client-ip"] as string) ||
    "unknown";

  // Handle IPv6 loopback (::1) and convert to IPv4 equivalent
  if (clientIp === "::1" || clientIp === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  if (typeof clientIp === "string" && clientIp.startsWith("::ffff:")) {
    return clientIp.replace("::ffff:", "");
  }

  // Handle forwarded headers (can contain multiple IPs)
  if (typeof clientIp === "string" && clientIp.includes(",")) {
    return clientIp.split(",")[0].trim();
  }

  return clientIp;
}

function getDurationInMs(start: bigint): number {
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1e6; // Convert nanoseconds to milliseconds
  return Math.round(duration * 100) / 100; // Round to 2 decimal places
}

function maskFieldsFromObject(obj: any, fields: string[]) {
  if (!obj || typeof obj !== "object") return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  for (const field of fields) {
    if (field in clone) clone[field] = "****";
  }
  return clone;
}

function limitSize(obj: any, maxBytes: number) {
  const json = JSON.stringify(obj);
  if (Buffer.byteLength(json, "utf8") > maxBytes) {
    return { message: "Body too large to log" };
  }
  return obj;
}

function writeLog(filePath: string, logEntry: any, pretty: boolean) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const logLine = JSON.stringify(logEntry, null, pretty ? 2 : 0) + "\n" ;
  fs.appendFile(filePath, logLine, (err) => {
    if (err) console.error("Failed to write log:", err);
  });
}

function getOriginInfo(): Origin {
  const stack = new Error().stack?.split("\n");
  if (!stack) return {};

  // Find the first stack frame outside of logwise and express
  for (let i = 1; i < stack.length; i++) {
    const line = stack[i];

    // Skip frames from node internals, node_modules, or our own code.
    if (
      !line ||
      line.includes("node:internal") ||
      line.includes("internal/") ||
      line.includes("node_modules") || // Excludes all external libs
      line.includes("getOriginInfo") || // Excludes self
      line.includes("logwise") || // Excludes self
      line.includes("res.send") || // Excludes the monkey-patched send
      line.includes("ServerResponse.send")
    ) {
      continue;
    }

    // Regex to parse V8 stack trace lines, handles windows/unix paths with spaces
    // Groups: 1: functionName, 2: filePath, 3: lineNumber
    const match = /at (?:(.*)\s+\()?(?:file:\/\/)?(.+?):(\d+):\d+\)?$/.exec(
      line.trim()
    );

    if (match) {
      const [_, func, file] = match;
      const funcName = func ? func.trim() : "anonymous";
      const fileName = path.basename(file);

      return {
        file: fileName,
        func: funcName,
      };
    }
  }

  return {};
}
