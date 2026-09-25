// RUTA: src/pages/Admin/ProductWizard/InfoTip.jsx
//
// Icono "?" pequeño que muestra una explicación simple al tocarlo/pasar el
// mouse — para los conceptos del asistente que no son obvios a simple vista
// (categoría, variantes, piezas, etc.). Pensado para que cualquiera lo
// entienda sin tener que preguntar.

import { useState } from "react";

export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false);

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
          className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2 rounded-lg bg-gray-800 text-white text-[11px] leading-snug shadow-lg pointer-events-none"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </span>
      )}
    </span>
  );
}
