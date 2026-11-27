import { employeeSchema, employeeUpdateSchema } from "../schemas/employee.schema.js";
import * as employeeService from "../services/employeeService.js";
import { parseOrRespond, requireId } from "../utils/validation.js";

export async function listEmployees(req, res) {
  const branchId = requireId(req.query.branchId, res, "sucursal");
  if (!branchId) return;
  res.json(await employeeService.listEmployees(branchId));
}

export async function createEmployee(req, res) {
  const data = parseOrRespond(employeeSchema, req.body, res);
  if (!data) return;
  res.status(201).json(await employeeService.createEmployee(data));
}

export async function updateEmployee(req, res) {
  const employeeId = requireId(req.params.id, res, "empleado");
  if (!employeeId) return;
  const data = parseOrRespond(employeeUpdateSchema, req.body, res);
  if (!data) return;
  res.json(await employeeService.updateEmployee(employeeId, data));
}

export async function deleteEmployee(req, res) {
  const employeeId = requireId(req.params.id, res, "empleado");
  if (!employeeId) return;
  await employeeService.deactivateEmployee(employeeId);
  res.json({ deleted: true });
}
