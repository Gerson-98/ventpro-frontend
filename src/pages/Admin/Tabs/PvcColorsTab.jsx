// RUTA: src/pages/Admin/Tabs/PvcColorsTab.jsx

import { useEffect, useState } from "react";
import { FaPlus, FaTrashAlt, FaEdit } from "react-icons/fa";
import api from "@/services/api";

export default function PvcColorsTab() {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  const loadColors = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pvc-colors");
      setColors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar colores PVC:", err);
      setColors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadColors(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editingColor) {
        await api.patch(`/pvc-colors/${editingColor.id}`, formData);
      } else {
        await api.post("/pvc-colors", formData);
      }
      await loadColors();
      closeModal();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar.";
      setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este color PVC?")) return;
    try {
      await api.delete(`/pvc-colors/${id}`);
      loadColors();
    } catch (err) {
      alert("Error al eliminar el color.");
    }
  };

  const handleEdit = (color) => {
    setEditingColor(color);
    setFormData({ name: color.name, description: color.description || "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingColor(null);
    setFormData({ name: "", description: "" });
    setFormError("");
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md transition">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Colores PVC</h2>
          <p className="text-gray-500 text-xs sm:text-sm">
            Administra los colores disponibles para los perfiles de PVC.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition text-sm"
        >
          <FaPlus size={13} />
          <span className="hidden sm:inline">Añadir Color</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm py-4">Cargando...</p>
      ) : colors.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-10">No hay colores registrados.</p>
      ) : (
        <>
          {/* ── Tabla desktop (sm+) ── */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-4 text-left">Nombre</th>
                  <th className="py-3 px-4 text-left">Descripción</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colors.map((color) => (
                  <tr key={color.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{color.name}</td>
                    <td className="py-2.5 px-4 text-gray-500">{color.description || "—"}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleEdit(color)} className="text-blue-600 hover:text-blue-800 transition" title="Editar">
                          <FaEdit size={15} />
                        </button>
                        <button onClick={() => handleDelete(color.id)} className="text-red-600 hover:text-red-800 transition" title="Eliminar">
                          <FaTrashAlt size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Cards móvil (< sm) ── */}
          <div className="sm:hidden border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {colors.map((color) => (
              <div key={color.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{color.name}</p>
                    {color.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{color.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(color)}
                      className="text-blue-500 p-1.5 rounded-lg border border-blue-100 active:bg-blue-50"
                    >
                      <FaEdit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(color.id)}
                      className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50"
                    >
                      <FaTrashAlt size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MODAL — bottom sheet móvil / centrado sm+ ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60">
          <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-auto max-h-[90dvh] sm:max-w-md overflow-hidden shadow-2xl border border-gray-100">

            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                {editingColor ? "Editar Color PVC" : "Nuevo Color PVC"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-5 py-4 sm:px-6 sm:py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2 pb-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-60"
                >
                  {saving ? "Guardando..." : editingColor ? "Guardar Cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}