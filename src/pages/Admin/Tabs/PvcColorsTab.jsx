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
    <div className="bg-white p-6 rounded-lg shadow-md transition">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Colores PVC</h2>
          <p className="text-gray-500 text-sm">
            Administra los colores disponibles para los perfiles de PVC.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaPlus /> Añadir Color
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Cargando...</p>
      ) : colors.length === 0 ? (
        <p className="text-gray-600">No hay colores registrados.</p>
      ) : (
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
              <th className="py-3 px-4 text-left">Nombre</th>
              <th className="py-3 px-4 text-left">Descripción</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => (
              <tr key={color.id} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{color.name}</td>
                <td className="py-2 px-4">{color.description || "—"}</td>
                <td className="py-2 px-4 text-right space-x-3">
                  <button onClick={() => handleEdit(color)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                  <button onClick={() => handleDelete(color.id)} className="text-red-600 hover:text-red-800"><FaTrashAlt /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border relative">
            <button onClick={closeModal} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {editingColor ? "Editar Color PVC" : "Nuevo Color PVC"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-md p-2"
                  rows={3}
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{formError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
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