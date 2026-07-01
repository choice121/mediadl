import { Router, type IRouter } from "express";
import { validatePassword } from "../middlewares/auth";

const router: IRouter = Router();

// POST /auth/login
router.post("/auth/login", (req, res): void => {
  const { password } = req.body as { password?: string };

  if (!password || !validatePassword(password)) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const session = req.session as Record<string, unknown>;
  session.authenticated = true;
  res.json({ ok: true });
});

// POST /auth/logout
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /auth/me
router.get("/auth/me", (req, res): void => {
  const session = req.session as Record<string, unknown>;
  const authRequired = !!process.env.ADMIN_PASSWORD;
  res.json({
    authenticated: !authRequired || session.authenticated === true,
    authRequired,
  });
});

export default router;
