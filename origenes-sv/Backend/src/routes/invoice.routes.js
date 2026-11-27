import { Router } from "express";
import { getInvoice, listInvoices } from "../controllers/invoiceController.js";

// Solo lectura: las facturas se crean al registrar una venta (POST /api/sales).
const router = Router();
router.get("/", listInvoices);
router.get("/:id", getInvoice);

export default router;
