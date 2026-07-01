import { Router, type IRouter } from "express";
import healthRouter from "./health";
import downloadsRouter from "./downloads";
import statsRouter from "./stats";
import authRouter from "./auth";
import schedulesRouter from "./schedules";
import previewRouter from "./preview";
import cookiesRouter from "./cookies";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(downloadsRouter);
router.use(statsRouter);
router.use(schedulesRouter);
router.use(previewRouter);
router.use(cookiesRouter);

export default router;
