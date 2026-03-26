const { Router } = require("express");
const chatController = require("../controllers/chat.controller");
const { rateLimiter } = require("../utils/rateLimiter");

const router = Router();

router.post("/send", rateLimiter, chatController.sendMessage);

module.exports = router;
