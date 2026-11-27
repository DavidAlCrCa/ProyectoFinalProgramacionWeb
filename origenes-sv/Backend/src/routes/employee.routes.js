import { Router } from "express";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee
} from "../controllers/employeeController.js";
import { requireManager } from "../middlewares/requireManager.js";

const router = Router();
router.get("/", listEmployees);
router.post("/", requireManager, createEmployee);
router.put("/:id", requireManager, updateEmployee);
router.delete("/:id", requireManager, deleteEmployee);

export default router;
