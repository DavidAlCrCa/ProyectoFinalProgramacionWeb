import { pool } from "../config/db.js";
import { fail } from "../utils/errors.js";

// Las fechas se comparan en hora de El Salvador (UTC-6), no en la zona del servidor de BD.
const TIME_ZONE = "America/El_Salvador";

const INVOICE_COLUMNS = `
  i.id, i.sale_id AS "saleId", i.invoice_number AS "invoiceNumber",
  i.document_type AS "documentType", i.subtotal, i.tax, i.total,
  i.created_at AS "createdAt",
  i.customer_name AS "customerName", i.customer_nit AS "customerNit", i.customer_nrc AS "customerNrc",
  s.payment_method AS "paymentMethod", u.full_name AS cashier`;

// Lista las facturas de una sucursal, de la más reciente a la más antigua.
// El WHERE se arma con parámetros ($1, $2…): los valores nunca se concatenan al SQL.
export async function listInvoices({ branchId, documentType, from, to, search }) {
  const conditions = ["i.branch_id = $1"];
  const params = [branchId];
  const addCondition = (sql, value) => {
    params.push(value);
    conditions.push(sql.replaceAll("?", `$${params.length}`));
  };

  if (documentType) addCondition("i.document_type = ?", documentType);
  if (from) addCondition(`(i.created_at AT TIME ZONE '${TIME_ZONE}')::DATE >= ?::DATE`, from);
  if (to) addCondition(`(i.created_at AT TIME ZONE '${TIME_ZONE}')::DATE <= ?::DATE`, to);
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    addCondition(
      "(i.invoice_number ILIKE ? OR i.customer_name ILIKE ? OR i.customer_nit ILIKE ? OR i.customer_nrc ILIKE ?)",
      pattern
    );
  }

  const result = await pool.query(
    `SELECT ${INVOICE_COLUMNS}
     FROM invoices i
     JOIN sales s ON s.id = i.sale_id
     JOIN users u ON u.id = s.cashier_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY i.created_at DESC, i.id DESC
     LIMIT 200`,
    params
  );
  return result.rows;
}

// Detalle de una factura: encabezado + líneas vendidas (para verla o imprimirla).
export async function getInvoice(invoiceId) {
  const invoice = await pool.query(
    `SELECT ${INVOICE_COLUMNS}, b.name AS branch
     FROM invoices i
     JOIN sales s ON s.id = i.sale_id
     JOIN users u ON u.id = s.cashier_id
     JOIN branches b ON b.id = i.branch_id
     WHERE i.id = $1`,
    [invoiceId]
  );
  if (!invoice.rowCount) throw fail(404, "La factura no existe.");

  const items = await pool.query(
    `SELECT product_name AS "productName", quantity, unit_price AS "unitPrice", line_total AS "lineTotal"
     FROM sale_items WHERE sale_id = $1 ORDER BY id`,
    [invoice.rows[0].saleId]
  );
  return { ...invoice.rows[0], items: items.rows };
}
