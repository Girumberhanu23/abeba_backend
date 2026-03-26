const { onRequest } = require("firebase-functions/v2/https");
const app = require("./app");

// Export the Express app as a Firebase HTTPS function
exports.api = onRequest({ region: "us-central1" }, app);
