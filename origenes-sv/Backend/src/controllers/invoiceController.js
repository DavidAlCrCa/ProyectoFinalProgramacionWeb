import { invoiceQuerySchema } from "../schemas/invoice.schema.js";
import * as invoiceService from "../services/invoiceService.js";
import { parseOrRespond, requireId } from "../utils/validation.js";

export async function listInvoices(req, res) {
  const filters = parseOrRespond(invoiceQuerySchema, req.query, res);
  if (!filters) return;
  res.json(await invoiceService.listInvoices(filters));
}

export async function getInvoice(req, res) {
  const invoiceId = requireId(req.params.id, res, "factura");
  if (!invoiceId) return;
  res.json(await invoiceService.getInvoice(invoiceId));
}
