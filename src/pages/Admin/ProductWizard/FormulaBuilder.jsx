// RUTA: src/pages/Admin/ProductWizard/FormulaBuilder.jsx
//
// Constructor de fórmulas libre: el usuario encadena operaciones
// (sumar/restar/multiplicar/dividir) sobre una medida de origen (Ancho o
// Alto de la ventana). Sin límite de pasos, con vista previa en vivo usando
// una medida de ejemplo.

import { FaPlus, FaTrashAlt, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { OPS, opSymbol, evaluateFormula } from "@/utils/formulaEngine";
import InfoTip from "./InfoTip";

export default function FormulaBuilder({
  label,
  origenLabel,
  steps,
  onChange,
  exampleBase = 100,
}) {
  const addStep = () => {
    onChange([...(steps || []), { op: "restar", value: 0 }]);
  };

  const updateStep = (idx, patch) => {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const removeStep = (idx) => {
    onChange(steps.filter((_, i) => i !== idx));
  };

  const moveStep = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const result = evaluateFormula(exampleBase, steps);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center">
          {label}
          <InfoTip text={`Cómo se convierte la medida de la ventana en la medida real de corte de esta pieza. Vas encadenando operaciones sobre el ${origenLabel?.toLowerCase() || "valor"} — ej. "restar 8.5" significa que el corte final es 8.5 cm menos que el ${origenLabel?.toLowerCase() || "valor"} de la ventana. Si no agregas ningún paso, se corta exactamente igual.`} />
        </p>
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <FaPlus size={10} /> Añadir paso
        </button>
      </div>

      {/* Cadena de pasos */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
          {origenLabel}
        </span>
        {(steps || []).map((step, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-1.5 py-1"
          >
            <select
              value={step.op}
              onChange={(e) => updateStep(idx, { op: e.target.value })}
              className="text-xs border-none bg-transparent focus:outline-none focus:ring-0 font-medium text-gray-700"
            >
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {opSymbol(o.value)}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={step.value}
              onChange={(e) => updateStep(idx, { value: parseFloat(e.target.value) || 0 })}
              className="w-14 text-xs border-none bg-transparent focus:outline-none focus:ring-0 text-right"
            />
            <div className="flex flex-col -mx-0.5">
              <button
                type="button"
                onClick={() => moveStep(idx, -1)}
                disabled={idx === 0}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                title="Mover antes"
              >
                <FaArrowUp size={8} />
              </button>
              <button
                type="button"
                onClick={() => moveStep(idx, 1)}
                disabled={idx === steps.length - 1}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                title="Mover después"
              >
                <FaArrowDown size={8} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeStep(idx)}
              className="text-red-300 hover:text-red-500 ml-0.5"
              title="Quitar paso"
            >
              <FaTrashAlt size={10} />
            </button>
          </div>
        ))}
        {(!steps || steps.length === 0) && (
          <span className="text-xs text-gray-400 italic">Sin pasos — se usa {origenLabel.toLowerCase()} tal cual.</span>
        )}
      </div>

      {/* Vista previa en vivo */}
      <p className="text-xs text-gray-500">
        Ejemplo con {origenLabel.toLowerCase()} = {exampleBase} cm →{" "}
        {result.error ? (
          <span className="text-red-500 font-medium">{result.error}</span>
        ) : (
          <span className="font-semibold text-emerald-600">{result.value} cm</span>
        )}
      </p>
    </div>
  );
}
