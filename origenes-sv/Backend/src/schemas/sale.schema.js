import { z } from "zod";
import { idSchema, paymentMethods } from "./common.schema.js";

const onlyDigits = (value) => value.replace(/\D/g, "");

// NIT salvadoreño: 14 dígitos. Se acepta con o sin guiones y se guarda como 0000-000000-000-0.
const nitSchema = z.string().trim()
  .refine((value) => /^[\d-]+$/.test(value) && onlyDigits(value).length === 14,
    "El NIT debe tener 14 dígitos (formato 0000-000000-000-0).")
  .transform((value) => {
    const d = onlyDigits(value);
    return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13)}`;
  });

// NRC: número de registro + dígito verificador (ej. 123456-7).
const nrcSchema = z.string().trim()
  .refine((value) => /^[\d-]+$/.test(value) && onlyDigits(value).length >= 2 && onlyDigits(value).length <= 8,
    "El NRC debe tener entre 2 y 8 dígitos (ejemplo 123456-7).")
  .transform((value) => {
    const d = onlyDigits(value);
    return `${d.slice(0, -1)}-${d.slice(-1)}`;
  });

export const customerSchema = z.object({
  name: z.string().trim()
    .min(2, "Ingrese el nombre o razón social del cliente.")
    .max(160, "El nombre del cliente es demasiado largo."),
  nit: nitSchema,
  nrc: nrcSchema
});

export const saleSchema = z.object({
  branchId: idSchema,
  documentType: z.enum(["CONSUMER_FINAL", "CCF"]),
  paymentMethod: z.enum(paymentMethods),
  items: z.array(z.object({
    productId: idSchema,
    quantity: z.coerce.number().int().positive()
  })).min(1),
  customer: customerSchema.optional()
}).superRefine((data, ctx) => {
  // El comprobante de crédito fiscal siempre identifica al cliente. Si el cliente ya trae
  // errores (NIT inválido, etc.) no se agrega este mensaje genérico encima.
  if (data.documentType === "CCF" && !data.customer && !ctx.issues?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["customer"],
      message: "El CCF requiere nombre, NIT y NRC del cliente."
    });
  }
});
