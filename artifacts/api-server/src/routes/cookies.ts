import { Router, type IRouter } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { getCookiesPath } from "../lib/downloader";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /cookies — check if a cookies file is set
router.get("/cookies", (_req, res): void => {
  const cookiesPath = getCookiesPath();
  const set = fs.existsSync(cookiesPath);
  res.json({ set, path: set ? path.basename(cookiesPath) : null });
});

// POST /cookies — upload cookies.txt content (plain text body)
router.post(
  "/cookies",
  express.text({ type: ["text/plain", "application/octet-stream", "*/*"], limit: "10mb" }),
  (req, res): void => {
    const content = typeof req.body === "string" ? req.body : "";
    if (!content.trim()) {
      res.status(400).json({ error: "Request body must contain the cookies.txt content" });
      return;
    }

    const cookiesPath = getCookiesPath();
    const dir = path.dirname(cookiesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(cookiesPath, content, "utf-8");
    logger.info({ cookiesPath }, "Cookies file saved");
    res.json({ set: true });
  }
);

// DELETE /cookies — remove the cookies file
router.delete("/cookies", (_req, res): void => {
  const cookiesPath = getCookiesPath();
  if (fs.existsSync(cookiesPath)) {
    fs.unlinkSync(cookiesPath);
    logger.info({ cookiesPath }, "Cookies file cleared");
  }
  res.json({ set: false });
});

export default router;
