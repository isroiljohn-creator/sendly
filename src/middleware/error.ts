import { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error("Global Error Interceptor caught:", err);
  
  const statusCode = err.status || err.statusCode || 500;
  const errorMessage = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: errorMessage,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}
