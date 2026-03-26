const healthService = require("../services/health.service");
const { asyncHandler } = require("../utils/asyncHandler");

const getHealth = asyncHandler(async (req, res) => {
  const result = await healthService.checkHealth();
  res.status(200).json(result);
});

module.exports = { getHealth };
