import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = "";
  const authHeader = req.headers.authorization;
  
  const jwtPattern = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      const candidate = parts[1];
      if (jwtPattern.test(candidate)) {
        token = candidate;
      }
    }
  } else if (req.query.token) {
    const candidate = req.query.token as string;
    if (jwtPattern.test(candidate)) {
      token = candidate;
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Authorization token is missing. Provide in header or ?token=<jwt>" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { user_id: string };
    req.user = { user_id: decoded.user_id };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
