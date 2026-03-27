const { Router } = require("express");
const healthRoutes = require("./health.routes");
const chatRoutes = require("./chat.routes");

const router = Router();

router.use("/health", healthRoutes);
router.use("/chat", chatRoutes);

module.exports = router;
