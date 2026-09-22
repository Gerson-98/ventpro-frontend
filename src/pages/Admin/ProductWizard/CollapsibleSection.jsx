// RUTA: src/pages/Admin/ProductWizard/CollapsibleSection.jsx
//
// Sección plegable reutilizable (acordeón) para agrupar bloques largos de
// formulario dentro del asistente de productos. El encabezado siempre es
// visible; el contenido se expande/colapsa con una transición suave.
//
// Puede usarse "no controlado" (defaultOpen) cuando el padre no necesita
// forzar el estado, o "controlado" (open + onToggle) cuando el padre
// necesita abrirlo programáticamente (ej: al marcar un checkbox "usa X").

import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  headerExtra = null,
  children,
}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const contentRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(open ? "none" : "0px");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (open) {
      setMaxHeight(el.scrollHeight + "px");
      const t = setTimeout(() => setMaxHeight("none"), 300);
      return () => clearTimeout(t);
    } else {
      setMaxHeight(el.scrollHeight + "px");
      requestAnimationFrame(() => setMaxHeight("0px"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => {
    if (isControlled) {
      onToggle?.(!open);
    } else {
      setInternalOpen((v) => !v);
    }
  };

  return (
    <div>
      {title !== undefined && title !== null && (
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center justify-between gap-2 text-left py-1"
        >
          <span className="flex items-center gap-2 flex-1 min-w-0">
            {typeof title === "string" ? (
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
            ) : (
              title
            )}
          </span>
          <span className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerExtra}
            <FaChevronDown
              size={11}
              className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              onClick={toggle}
            />
          </span>
        </button>
      )}
      <div
        ref={contentRef}
        style={{ maxHeight, overflow: "hidden", transition: "max-height 0.3s ease" }}
      >
        <div className="pt-2 space-y-3">{children}</div>
      </div>
    </div>
  );
}

// Botón chevron independiente — para cuando el encabezado clicable ya existe
// fuera del componente (ej: una card cuyo título/checkbox vive en el padre)
// y solo se necesita el ícono que abre/cierra la sección.
export function CollapsibleChevron({ open, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-gray-400 hover:text-gray-600 p-1 -m-1 rounded-full hover:bg-gray-100 flex-shrink-0 ${className}`}
      aria-label={open ? "Contraer" : "Expandir"}
    >
      <FaChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}
