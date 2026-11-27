// Ayudas para capturar documentos de identificación tributaria salvadoreños.
// La API vuelve a validar y normalizar todo: esto solo mejora la captura en pantalla.

// NIT: 14 dígitos en grupos 4-6-3-1 → 0614-010190-101-3
export function formatNit(value) {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 13), digits.slice(13)]
      .filter(Boolean)
      .join("-");
  }
  
  // NRC: se permiten dígitos y guion (ej. 123456-7); la API lo deja como número-dígito verificador.
  export function formatNrc(value) {
    return value.replace(/[^\d-]/g, "").slice(0, 10);
  }
  
  export const countDigits = (value) => value.replace(/\D/g, "").length;
  