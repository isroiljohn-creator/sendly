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

import { closePool } from "./config/db";
import { closeQueues } from "./services/queue";

async function handleGracefulShutdown(signal: string) {
  console.log(`${signal} signal received. Shutting down gracefully...`);
  
  const forceExitTimeout = setTimeout(() => {
    console.warn("Graceful shutdown timed out, forcing exit.");
    process.exit(1);
  }, 10000);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log("HTTP server closed.");

    await closeQueues().catch((err) => {
      console.error("Error closing Bull queues:", err);
    });

    await closePool().catch((err) => {
      console.error("Error closing database pool:", err);
    });

    console.log("Graceful shutdown completed successfully.");
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

import { sendErrorToTelegram } from "./services/monitoring";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception caught:", err);
  sendErrorToTelegram(err, "Uncaught Exception (Process Crash)").then(() => {
    process.exit(1);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  sendErrorToTelegram(reason instanceof Error ? reason : new Error(String(reason)), "Unhandled Rejection").catch(() => {});
});

