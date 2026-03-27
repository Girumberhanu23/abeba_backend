const { AppError } = require("./errorHandler");

const MAX_MESSAGE_LENGTH = 1500;
const MAX_HISTORY_LENGTH = 8;
const VALID_ROLES = new Set(["user", "assistant"]);

/**
 * Validate and sanitize the chat request body.
 * Returns a cleaned { message, history } or throws AppError.
 */
const validateChatInput = ({ message, history }) => {
  // --- message ---
  if (message === undefined || message === null) {
    throw new AppError("Message is required", 400);
  }
  if (typeof message !== "string") {
    throw new AppError("Message must be a string", 400);
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    throw new AppError("Message cannot be empty", 400);
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(
      `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      400,
    );
  }

  // --- history ---
  let cleanHistory = [];
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) {
      throw new AppError("History must be an array", 400);
    }

    // Take only the last N entries
    const recent = history.slice(-MAX_HISTORY_LENGTH);

    for (const entry of recent) {
      if (!entry || typeof entry !== "object") {
        throw new AppError("Each history entry must be an object", 400);
      }
      if (!VALID_ROLES.has(entry.role)) {
        throw new AppError(
          'Each history entry must have role "user" or "assistant"',
          400,
        );
      }
      if (typeof entry.text !== "string" || entry.text.trim().length === 0) {
        throw new AppError(
          "Each history entry must have a non-empty text string",
          400,
        );
      }

      cleanHistory.push({
        role: entry.role,
        text: entry.text.trim().slice(0, MAX_MESSAGE_LENGTH),
      });
    }
  }

  return { message: trimmed, history: cleanHistory };
};

module.exports = { validateChatInput };
