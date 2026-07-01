import type { Request, Response, NextFunction } from "express";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mediadl";

/** Routes that don't require authentication */
const PUBLIC_PATHS = new Set([
  "/api/healthz",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
]);

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If no password is configured, allow all traffic
  if (!process.env.ADMIN_PASSWORD) {
    next();
    return;
  }

  if (PUBLIC_PATHS.has(req.path)) {
    next();
    return;
  }

  if (req.session.authenticated === true) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export function validatePassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
