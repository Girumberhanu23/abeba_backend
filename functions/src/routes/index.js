const { Router } = require("express");
const healthRoutes = require("./health.routes");
const chatRoutes = require("./chat.routes");

const router = Router();

router.use("/health", healthRoutes);

// Versioned API routes
router.use("/api/v1/chat", chatRoutes);

// Keep legacy path working during transition
router.use("/chat", chatRoutes);

module.exports = router;
