import { Router } from "express";
import { createPayroll, listPayroll } from "../controllers/payrollController.js";
import { requireManager } from "../middlewares/requireManager.js";

const router = Router();
router.get("/", requireManager, listPayroll);
router.post("/", requireManager, createPayroll);

export default router;
