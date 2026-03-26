const geminiService = require("../services/gemini.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateChatInput } = require("../utils/validation");
const { checkDomain } = require("../utils/domainFilter");

const sendMessage = asyncHandler(async (req, res) => {
  // 1. Validate & sanitize input
  const { message, history } = validateChatInput(req.body);

  console.log(`[CHAT] Incoming message (${message.length} chars)`);

  // 2. Domain filter — block off-topic before calling Gemini
  const domainCheck = checkDomain(message);
  if (!domainCheck.allowed) {
    console.log("[CHAT] Blocked by domain filter — Gemini NOT called");
    return res.status(200).json({ reply: domainCheck.reply });
  }

  console.log("[CHAT] Domain check passed — calling Gemini");

  // 3. Call Gemini service
  const result = await geminiService.sendMessage({ message, history });

  res.status(200).json(result);
});

module.exports = { sendMessage };
