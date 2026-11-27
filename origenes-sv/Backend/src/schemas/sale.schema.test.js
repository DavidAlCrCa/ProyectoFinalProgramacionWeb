import assert from "node:assert/strict";
import test from "node:test";
import { employeeUpdateSchema } from "./employee.schema.js";
import { invoiceQuerySchema } from "./invoice.schema.js";
import { saleSchema } from "./sale.schema.js";

const base = { branchId: 1, paymentMethod: "CASH", items: [{ productId: 1, quantity: 2 }] };
const customer = { name: "Café Selecto S.A. de C.V.", nit: "06140101901013", nrc: "1234567" };

test("la factura de consumidor final no exige datos del cliente", () => {
  const result = saleSchema.safeParse({ ...base, documentType: "CONSUMER_FINAL" });
  assert.equal(result.success, true);
});

test("el CCF sin cliente se rechaza", () => {
  const result = saleSchema.safeParse({ ...base, documentType: "CCF" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path[0], "customer");
});

test("el CCF normaliza NIT y NRC al formato oficial", () => {
  const result = saleSchema.safeParse({ ...base, documentType: "CCF", customer });
  assert.equal(result.success, true);
  assert.equal(result.data.customer.nit, "0614-010190-101-3");
  assert.equal(result.data.customer.nrc, "123456-7");
});

test("el CCF rechaza NIT incompleto y NRC con letras", () => {
  const badNit = saleSchema.safeParse({ ...base, documentType: "CCF", customer: { ...customer, nit: "0614-0101" } });
  const badNrc = saleSchema.safeParse({ ...base, documentType: "CCF", customer: { ...customer, nrc: "12ab" } });
  assert.equal(badNit.success, false);
  assert.equal(badNrc.success, false);
});

test("editar empleado valida salario positivo y no pide sucursal", () => {
  assert.equal(employeeUpdateSchema.safeParse({ fullName: "Ana Pérez", position: "Barista", monthlySalary: "450" }).success, true);
  assert.equal(employeeUpdateSchema.safeParse({ fullName: "Ana Pérez", position: "Barista", monthlySalary: -5 }).success, false);
});

test("el filtro de facturas exige sucursal y fechas AAAA-MM-DD", () => {
  assert.equal(invoiceQuerySchema.safeParse({ branchId: "1", from: "2026-11-01", documentType: "CCF" }).success, true);
  assert.equal(invoiceQuerySchema.safeParse({ from: "2026-11-01" }).success, false);
  assert.equal(invoiceQuerySchema.safeParse({ branchId: "1", from: "01/11/2026" }).success, false);
});
