const { getEnv } = require("../utils/env");

const PRIMARY_MODEL = "gemini-2.0-flash";
const FALLBACK_MODEL = "gemini-2.0-flash-lite";
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

const STATIC_FALLBACK_REPLY =
  "I'm having trouble accessing the assistant right now. " +
  "Generally, signs of ovulation may include changes in cervical mucus, " +
  "slight increases in basal body temperature, and mild pelvic discomfort. " +
  "For personalized advice, please consult a healthcare professional.";

/**
 * Call the Gemini generateContent endpoint with timeout + retry.
 * Retries once on 429, 5xx, or timeout. Returns parsed JSON on success.
 */
const callGeminiAPI = async (model, body, maxRetries = MAX_RETRIES) => {
  const apiKey = getEnv("GEMINI_API_KEY", { required: true });
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
        const errorBody = await response.text();
        const err = new Error(`Gemini API error (${response.status}): ${errorBody}`);
        err.statusCode = response.status;
        throw err;
      }

      return await response.json();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.name === "AbortError" ||
        (err.statusCode && (err.statusCode === 429 || err.statusCode >= 500));

      if (isRetryable && attempt < maxRetries) {
        console.warn(`[GEMINI] Attempt ${attempt + 1} failed for ${model}, retrying...`);
        continue;
      }
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
};

/**
 * Build the contents array expected by the Gemini API.
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
    throw new Error("Gemini returned an empty or invalid response");
  }
  return text.trim();
};

/**
 * Build the request body shared by both primary and fallback models.
 */
const buildRequestBody = (message, history) => ({
  system_instruction: {
    parts: [{ text: SYSTEM_PROMPT }],
  },
  contents: buildContents(message, history),
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
});

/**
 * Send a message to Gemini with multi-model fallback.
 *
 * Flow:
 * 1. Try primary model (gemini-2.0-flash) with 1 retry
 * 2. If that fails → try fallback model (gemini-1.5-flash), no retry
 * 3. If both fail → return a safe static fallback reply
 *
 * @param {Object}  params
 * @param {string}  params.message – user input (required)
 * @param {Array}   [params.history] – previous conversation turns
 * @returns {Promise<{reply: string, model: string|null, fallback: boolean, source: string}>}
 */
const sendMessage = async ({ message, history = [] }) => {
  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
  const body = buildRequestBody(trimmed, history);

  // 1) Try primary model with retry
  try {
    const data = await callGeminiAPI(PRIMARY_MODEL, body, MAX_RETRIES);
    const reply = parseResponse(data);
    return { reply, model: PRIMARY_MODEL, fallback: false, source: "ai" };
  } catch (primaryErr) {
    console.warn(`[GEMINI] Primary model (${PRIMARY_MODEL}) failed: ${primaryErr.message}`);
  }

  // 2) Try fallback model — no retries
  try {
    const data = await callGeminiAPI(FALLBACK_MODEL, body, 0);
    const reply = parseResponse(data);
    return { reply, model: FALLBACK_MODEL, fallback: true, source: "ai" };
  } catch (fallbackErr) {
    console.error(`[GEMINI] Fallback model (${FALLBACK_MODEL}) also failed: ${fallbackErr.message}`);
  }

  // 3) Both models failed — return controlled static response
  return { reply: STATIC_FALLBACK_REPLY, model: null, fallback: true, source: "static" };
};

module.exports = { sendMessage, STATIC_FALLBACK_REPLY };
