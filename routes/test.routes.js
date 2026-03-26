const { Router } = require("express");
const router = Router();
const geminiService = require("../services/gemini.service");

router.get("/ai-test", async (req, res) => {
  try {
    const reply = await geminiService.sendMessage({
      message: "Is it normal to have cramps before period?",
    });

    res.json(reply);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;