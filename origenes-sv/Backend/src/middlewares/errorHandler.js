import { handleError } from "../utils/errors.js";

export function errorHandler(error, _req, res, _next) {
  handleError(error, res);
}

export function apiNotFound(_req, res) {
  res.status(404).json({ error: "Recurso API no encontrado." });
}
