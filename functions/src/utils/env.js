const path = require("path");

/**
 * Load environment variables from a .env file in the functions directory.
 * In Firebase Functions production, use Firebase environment config or
 * Secret Manager instead.
 */
const loadEnv = () => {
  // Only load .env in non-production (emulator / local dev)
  if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({
      path: path.resolve(__dirname, "../../.env"),
    });
  }
};

/**
 * Safely read an environment variable. Throws if required and missing.
 */
const getEnv = (key, { required = false, defaultValue = undefined } = {}) => {
  const value = process.env[key] ?? defaultValue;
  if (required && (value === undefined || value === "")) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

module.exports = { loadEnv, getEnv };
