import { Router, type IRouter } from "express";
import healthRouter from "./health";
import downloadsRouter from "./downloads";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(downloadsRouter);
router.use(statsRouter);

export default router;
