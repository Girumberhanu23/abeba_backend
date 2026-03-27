const geminiService = require("../services/gemini.service");
const { validateChatInput } = require("../utils/validation");
const { checkDomain } = require("../utils/domainFilter");

const sendMessage = async (req, res) => {
  try {
    // 1. Validate & sanitize input
    const { message, history } = validateChatInput(req.body);

    console.log(`[CHAT] Incoming message (${message.length} chars), history: ${history.length} turns`);

    // 2. Domain filter — block off-topic before calling Gemini
    const domainCheck = checkDomain(message);
    if (!domainCheck.allowed) {
      console.log("[CHAT] Blocked by domain filter — Gemini NOT called");
      return res.status(200).json({ reply: domainCheck.reply });
    }

    console.log("[CHAT] Domain check passed — calling Gemini");

    // 3. Call Gemini service (handles primary → fallback → static)
    const result = await geminiService.sendMessage({ message, history });

    console.log(
      `[CHAT] Response — model: ${result.model ?? "none"}, ` +
      `fallback: ${result.fallback}, source: ${result.source}`,
    );

    return res.status(200).json({ reply: result.reply });
  } catch (err) {
    console.error(`[CHAT] Unhandled error: ${err.message}`);

    // Always return { reply } — even for unexpected errors
    const statusCode = err.statusCode || 500;
    let reply;

    if (statusCode === 400) {
      reply = err.message;
    } else if (statusCode === 429) {
      reply = "Too many requests. Please wait a moment before trying again.";
    } else {
      reply = geminiService.STATIC_FALLBACK_REPLY;
    }

    return res.status(statusCode).json({ reply });
  }
};

module.exports = { sendMessage };
