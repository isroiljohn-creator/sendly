import { Request, Response, NextFunction } from "express";
import { sendErrorToTelegram } from "../services/monitoring";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error("Global Error Interceptor caught:", err);
  
  // Send crash / 500 errors to Telegram
  const statusCode = err.status || err.statusCode || 500;
  if (statusCode >= 500) {
    sendErrorToTelegram(err, `HTTP ${req.method} ${req.originalUrl}`).catch(() => {});
  }
  
  const errorMessage = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: errorMessage,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}
