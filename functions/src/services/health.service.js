const checkHealth = async () => {
  return {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
};

module.exports = { checkHealth };
