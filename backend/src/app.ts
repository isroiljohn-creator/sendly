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

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://graph.facebook.com https://api.telegram.org https://generativelanguage.googleapis.com;"
  );
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

// Standard middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://www.sendly.uz",
        "https://sendly.uz",
        "http://localhost:3000",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Configure express.json to capture the raw body buffer for signature verification
app.use(
  express.json({
    limit: "500kb",
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
