import { pool } from "../config/db.js";
import { fail } from "../utils/errors.js";

export async function listEmployees(branchId) {
  const result = await pool.query(
    `SELECT id, full_name AS "fullName", position, monthly_salary AS "monthlySalary"
     FROM employees WHERE active = TRUE AND (branch_id = $1 OR branch_id IS NULL)
     ORDER BY full_name`,
    [branchId]
  );
  return result.rows;
}

export async function createEmployee(data) {
  const result = await pool.query(
    `INSERT INTO employees (branch_id, full_name, position, monthly_salary)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name AS "fullName", position, monthly_salary AS "monthlySalary"`,
    [data.branchId, data.fullName, data.position, data.monthlySalary]
  );
  return result.rows[0];
}

// Actualiza los datos de un empleado activo. Las planillas ya generadas no cambian
// porque payroll_lines guarda una copia del nombre y del salario del momento.
export async function updateEmployee(employeeId, data) {
  const result = await pool.query(
    `UPDATE employees SET full_name = $2, position = $3, monthly_salary = $4
     WHERE id = $1 AND active = TRUE
     RETURNING id, full_name AS "fullName", position, monthly_salary AS "monthlySalary"`,
    [employeeId, data.fullName, data.position, data.monthlySalary]
  );
  if (!result.rowCount) throw fail(404, "El empleado no existe o ya fue desactivado.");
  return result.rows[0];
}

// Desactiva (no borra) al empleado: payroll_lines lo referencia y el historial debe conservarse.
// Un empleado inactivo deja de aparecer en el listado y de entrar en nuevas planillas.
export async function deactivateEmployee(employeeId) {
  const result = await pool.query(
    "UPDATE employees SET active = FALSE WHERE id = $1 AND active = TRUE",
    [employeeId]
  );
  if (!result.rowCount) throw fail(404, "El empleado no existe o ya fue desactivado.");
}
