import express from "express";
import cors from "cors";
import { errorMiddleware } from "./middleware/error";
import { authMiddleware, AuthenticatedRequest } from "./middleware/auth";
import oauthRouter from "./routes/oauth";
import webhookRouter from "./routes/webhook";
import contactsRouter from "./routes/contacts";
import messagesRouter from "./routes/messages";
import tagsRouter from "./routes/tags";
import gamificationRouter from "./routes/gamification";
import referralsRouter from "./routes/referrals";
import broadcastsRouter from "./routes/broadcasts";
import analyticsRouter from "./routes/analytics";

const app = express();

// Standard middleware
app.use(
  cors({
    origin: [
      "https://www.sendly.uz",
      "https://sendly.uz",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// Configure express.json to capture the raw body buffer for signature verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Public health check route
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    message: "Instagram Chatbot Automation Engine is online.",
    timestamp: new Date().toISOString(),
  });
});

// Protected test endpoint to verify JWT Auth Middleware works
app.get("/api/protected", authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    message: "Authorization successful!",
    user_id: req.user?.user_id,
  });
});

// Mount OAuth and Webhook routers
app.use("/oauth/instagram", oauthRouter);
app.use("/webhook", webhookRouter);

// Mount core application routers
app.use("/api/contacts", contactsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/gamification", gamificationRouter);
app.use("/", referralsRouter);
app.use("/api/broadcasts", broadcastsRouter);
app.use("/api/analytics", analyticsRouter);

// Fallback for unmatched routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  (error as any).status = 404;
  next(error);
});

// Register global error middleware (must be registered last)
app.use(errorMiddleware);

export default app;
