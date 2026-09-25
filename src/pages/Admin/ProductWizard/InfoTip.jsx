// RUTA: src/pages/Admin/ProductWizard/InfoTip.jsx
//
// Icono "?" pequeño que muestra una explicación simple al tocarlo/pasar el
// mouse — para los conceptos del asistente que no son obvios a simple vista
// (categoría, variantes, piezas, etc.). Pensado para que cualquiera lo
// entienda sin tener que preguntar.

import { useState } from "react";

export default function InfoTip({ text, placement = "bottom" }) {
  const [open, setOpen] = useState(false);
  const isTop = placement === "top";

  return (
    <span className="relative inline-flex items-center align-middle ml-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold hover:bg-blue-100 hover:text-blue-600 transition-colors"
        aria-label="Ayuda"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-30 left-1/2 -translate-x-1/2 w-56 p-2 rounded-lg bg-gray-800 text-white text-[11px] leading-snug shadow-lg pointer-events-none ${
            isTop ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {text}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              isTop ? "top-full border-t-gray-800" : "bottom-full border-b-gray-800"
            }`}
          />
        </span>
      )}
    </span>
  );
}
