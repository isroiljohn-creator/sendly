import app from "./app";
import { env } from "./config/env";

const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Chatbot Engine is listening on http://localhost:${port}`);
  console.log(`🔒 Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`====================================================`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received. Shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
  });
});
