const { AppError } = require("./errorHandler");

const WINDOW_MS = 60_000;       // 1 minute
const MAX_REQUESTS = 15;        // per window per IP

/** IP → { count, resetTime } */
const store = new Map();

/** Evict expired entries periodically (every 2 minutes). */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(ip);
    }
  }
}, 120_000).unref();

/**
 * Express middleware — rate-limits requests per IP address.
 */
const rateLimiter = (req, _res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  let entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    throw new AppError(
      "Too many requests. Please wait a moment before trying again.",
      429,
    );
  }

  next();
};

module.exports = { rateLimiter };
