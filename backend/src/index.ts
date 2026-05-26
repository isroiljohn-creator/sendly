import app from "./app";
import { env } from "./config/env";
import { recoverStuckSessions, recoverStuckBroadcasts } from "./services/queue";

const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Chatbot Engine is listening on http://localhost:${port}`);
  console.log(`🔒 Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`====================================================`);

  // Recover any stuck delay sessions from database on server startup
  recoverStuckSessions().catch((err) => {
    console.error("[Startup] Failed to run stuck sessions recovery:", err);
  });

  // Recover any stuck sending broadcasts on server startup
  recoverStuckBroadcasts().catch((err) => {
    console.error("[Startup] Failed to run stuck broadcasts recovery:", err);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received. Shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
  });
});
