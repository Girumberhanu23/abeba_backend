const express = require("express");
const cors = require("cors");
const { loadEnv } = require("./utils/env");
const { requestLogger } = require("./utils/logger");
const { errorHandler, notFoundHandler } = require("./utils/errorHandler");
const routes = require("./routes");

// Load environment variables
loadEnv();

const app = express();

// --------------- Middleware ---------------
// CORS — allow requests from any origin (tighten in production)
app.use(cors({ origin: true }));

// JSON body parsing
app.use(express.json());

// URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// --------------- Routes ---------------
app.use("/", routes);

// --------------- Error Handling ---------------
// 404 handler — must come after all routes
app.use(notFoundHandler);

// Global error handler — must be last middleware
app.use(errorHandler);

module.exports = app;
