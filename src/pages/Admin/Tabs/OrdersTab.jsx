// RUTA: src/pages/Admin/Tabs/OrdersTab.jsx
// ─────────────────────────────────────────────────────────────────────────────
// NOTA: Este archivo contiene SOLO el fragmento enviado (hooks + modal).
// El resto del componente (tabla, handlers, etc.) no fue incluido en el
// archivo original — integrar este fragmento en el componente completo.
// ─────────────────────────────────────────────────────────────────────────────

// ── Imports a agregar al inicio del archivo ───────────────────────────────────
import { useEffect, useState } from "react";
import api from "@/services/api"; // ← usar api en lugar de fetch directo

// ── Hooks a agregar dentro del componente principal ───────────────────────────
const [clients, setClients] = useState([]);

useEffect(() => {
  // Migrado de fetch() nativo a api (Axios) — consistente con el resto del ERP
  api.get("/clients")
    .then((res) => setClients(Array.isArray(res.data) ? res.data : []))
    .catch((err) => console.error("❌ Error al obtener clientes:", err));
}, []);


// ══════════════════════════════════════════════════════════════════════════════
// MODAL — CREAR / EDITAR PEDIDO
// Patrón: bottom sheet en móvil (items-end, rounded-t-2xl, h-auto)
//         centrado max-w-md en sm+
// ══════════════════════════════════════════════════════════════════════════════
{
  showModal && (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-auto max-h-[92dvh] sm:max-w-md overflow-hidden shadow-2xl border border-gray-100">

        {/* Drag handle — solo visible en móvil */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            {editingOrder ? "Editar Pedido" : "Nuevo Pedido"}
          </h3>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 transition w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-5 py-4 sm:px-6 sm:py-5 space-y-4">

          {/* Nombre del proyecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Proyecto
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Proyecto Santa Rosa"
              value={formData.project || ""}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <select
              required
              value={formData.clientId || ""}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} — {client.email || "sin correo"}
                </option>
              ))}
            </select>
          </div>

          {/* Total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total (Q)
            </label>
            <input
              type="number"
              required
              placeholder="Ej: 2500"
              value={formData.total || ""}
              onChange={(e) => setFormData({ ...formData, total: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Botones — siempre visibles en el flujo del form */}
          <div className="flex gap-3 pt-2 pb-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-800 text-sm rounded-lg hover:bg-gray-200 active:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 active:bg-blue-800 transition font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}