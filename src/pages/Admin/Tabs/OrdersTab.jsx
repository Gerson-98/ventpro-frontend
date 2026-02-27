// Agrega al inicio:
import { useEffect, useState } from "react";


// Dentro del componente principal:
const [clients, setClients] = useState([]);
const API_URL = import.meta.env.VITE_API_URL;

useEffect(() => {
   fetch(`${API_URL}/clients`)
    .then((res) => res.json())
    .then((data) => setClients(data))
    .catch((err) => console.error("❌ Error al obtener clientes:", err));
}, []);



{/* MODAL */}
{showModal && (
  <div className="fixed inset-0 bg-gray-200/40 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-gray-200 animate-scaleIn relative">
      <button
        onClick={closeModal}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
      >
        ✕
      </button>

      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {editingOrder ? "Editar Pedido" : "Nuevo Pedido"}
      </h3>

      <form onSubmit={handleSave}>
        {/* Nombre del proyecto */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Proyecto
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Proyecto Santa Rosa"
            value={formData.project || ""}
            onChange={(e) =>
              setFormData({ ...formData, project: e.target.value })
            }
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Cliente */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <select
            required
            value={formData.clientId || ""}
            onChange={(e) =>
              setFormData({ ...formData, clientId: e.target.value })
            }
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total (Q)
          </label>
          <input
            type="number"
            required
            placeholder="Ej: 2500"
            value={formData.total || ""}
            onChange={(e) =>
              setFormData({ ...formData, total: e.target.value })
            }
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
)}
