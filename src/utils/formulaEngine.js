// RUTA: src/utils/formulaEngine.js
//
// Espejo en el frontend del motor de fórmulas del backend
// (src/common/formula-engine.util.ts). Se usa SOLO para la vista previa en
// vivo mientras el usuario arma la fórmula en el wizard — la fuente de
// verdad real es siempre el backend (POST /product-wizard/preview).

export const OPS = [
  { value: "sumar", label: "Sumar (+)" },
  { value: "restar", label: "Restar (−)" },
  { value: "multiplicar", label: "Multiplicar (×)" },
  { value: "dividir", label: "Dividir (÷)" },
];

const OP_SYMBOL = { sumar: "+", restar: "−", multiplicar: "×", dividir: "÷" };

export function opSymbol(op) {
  return OP_SYMBOL[op] || "?";
}

// Evalúa una cadena de pasos sobre un valor base. Devuelve { value, error }.
export function evaluateFormula(base, steps) {
  let value = Number(base) || 0;
  for (const step of steps || []) {
    const v = Number(step.value);
    if (!Number.isFinite(v)) return { value: null, error: "Valor inválido" };
    switch (step.op) {
      case "sumar":
        value += v;
        break;
      case "restar":
        value -= v;
        break;
      case "multiplicar":
        value *= v;
        break;
      case "dividir":
        if (v === 0) return { value: null, error: "División entre cero" };
        value /= v;
        break;
      default:
        return { value: null, error: "Operación desconocida" };
    }
  }
  return { value: Math.round(value * 100) / 100, error: null };
}

// Texto legible de la fórmula completa, ej: "Ancho − 1" o "Ancho + 8 ÷ 3"
export function formulaToText(origenLabel, steps) {
  if (!steps || steps.length === 0) return origenLabel;
  return (
    origenLabel +
    " " +
    steps.map((s) => `${opSymbol(s.op)} ${s.value}`).join(" ")
  );
}
