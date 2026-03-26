const { getEnv } = require("../utils/env");
const { AppError } = require("../utils/errorHandler");

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_RETRIES = 1;

const SYSTEM_PROMPT = `You are a compassionate and knowledgeable women's health assistant named Abeba.

YOUR SCOPE — you may ONLY discuss:
• Pregnancy (stages, symptoms, prenatal care, postpartum)
• Menstruation (cycles, irregular periods, PMS, menstrual hygiene)
• Ovulation (tracking, signs, fertile windows)
• Fertility (conception tips, lifestyle factors, common concerns)
• General women's reproductive health (PCOS, endometriosis, contraception basics, menopause)

STRICT RULES:
1. If a user asks about ANY topic outside the scope above, politely decline and redirect them. Example: "I'm here to help with women's reproductive health topics. For other questions, please consult an appropriate resource."
2. NEVER diagnose a medical condition.
3. NEVER prescribe or recommend specific medications or dosages.
4. ALWAYS encourage the user to consult a qualified healthcare professional for personal medical decisions.
5. Use a calm, supportive, empathetic, and non-judgmental tone at all times.
6. Keep answers clear, evidence-informed, and easy to understand.
7. When unsure, say so honestly rather than guessing.
8. Respect cultural sensitivities around reproductive health topics.`;

/**
 * Call the Gemini generateContent endpoint with timeout + retry.
 */
const callGeminiAPI = async (url, body, retriesLeft = MAX_RETRIES) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError(
          "The AI service is temporarily busy. Please try again in a few seconds.",
          429,
        );
      }
      const errorBody = await response.text();
      throw new AppError(
        `Gemini API error (${response.status}): ${errorBody}`,
        502,
      );
    }

    return await response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      if (retriesLeft > 0) {
        return callGeminiAPI(url, body, retriesLeft - 1);
      }
      throw new AppError("Gemini API request timed out", 504);
    }

    if (err instanceof AppError) {
      // Never retry on rate limit — it wastes quota
      if (retriesLeft > 0 && err.statusCode === 502) {
        return callGeminiAPI(url, body, retriesLeft - 1);
      }
      throw err;
    }

    throw new AppError("Failed to reach Gemini API", 502);
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Build the contents array expected by the Gemini API.
 *
 * @param {string} message  – current user message
 * @param {Array}  history  – optional prior turns [{role, text}]
 */
const buildContents = (message, history = []) => {
  const contents = [];

  for (const turn of history) {
    contents.push({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.text }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  return contents;
};

/**
 * Extract the text reply from a Gemini API response.
 */
const parseResponse = (data) => {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AppError("Gemini returned an empty or invalid response", 502);
  }
  return text.trim();
};

/**
 * Send a message to Gemini and return the assistant's reply.
 *
 * @param {Object}  params
 * @param {string}  params.message – user input (required)
 * @param {Array}   [params.history] – previous conversation turns
 * @returns {Promise<{reply: string}>}
 */
const sendMessage = async ({ message, history = [] }) => {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new AppError("Message cannot be empty", 400);
  }

  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);

  const apiKey = getEnv("GEMINI_API_KEY", { required: true });
  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: buildContents(trimmed, history),
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const data = await callGeminiAPI(url, body);
  const reply = parseResponse(data);

  return { reply };
};

module.exports = { sendMessage };
