import { z } from "zod";
import { idSchema } from "./common.schema.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use AAAA-MM-DD).");

// Filtros del listado: todos opcionales salvo la sucursal.
export const invoiceQuerySchema = z.object({
  branchId: idSchema,
  documentType: z.enum(["CONSUMER_FINAL", "CCF"]).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  search: z.string().trim().max(100).optional()
});
