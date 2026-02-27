// RUTA: src/pages/Admin/Tabs/GlassColorsTab.jsx

import { useEffect, useState } from "react";
import { FaPlus, FaTrashAlt, FaEdit, FaExclamationTriangle, FaLink, FaUnlink } from "react-icons/fa";
import api from "@/services/api";

const EMPTY_FORM = { name: "", description: "", material_id: "" };

export default function GlassColorsTab() {
  const [colors, setColors] = useState([]);
  const [materials, setMaterials] = useState([]);  // VIDRIO + PERFIL (para DUELA)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // ── Carga ─────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Cargamos colores de vidrio + materiales tipo VIDRIO y PERFIL en paralelo
      // PERFIL se incluye porque DUELA es un Material tipo PERFIL
      const [colorsRes, vidRes, perRes] = await Promise.all([
        api.get("/glass-colors"),
        api.get("/materials?type=VIDRIO"),
        api.get("/materials?type=PERFIL"),
      ]);

      setColors(Array.isArray(colorsRes.data) ? colorsRes.data : []);

      // Combinamos y marcamos el tipo para distinguirlos en el select
      const vidrios = (Array.isArray(vidRes.data) ? vidRes.data : []).map((m) => ({ ...m, _tipo: "VIDRIO" }));
      const perfiles = (Array.isArray(perRes.data) ? perRes.data : []).map((m) => ({ ...m, _tipo: "PERFIL" }));
      setMaterials([...vidrios, ...perfiles]);

    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getMaterialName = (id) => {
    if (!id) return null;
    return materials.find((m) => m.id === id)?.name ?? null;
  };

  const openCreate = () => {
    setEditingColor(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (color) => {
    setEditingColor(color);
    setFormData({
      name: color.name,
      description: color.description ?? "",
      material_id: color.material_id ?? "",
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingColor(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      material_id: formData.material_id !== "" ? Number(formData.material_id) : null,
    };

    setSaving(true);
    try {
      if (editingColor) {
        await api.patch(`/glass-colors/${editingColor.id}`, payload);
      } else {
        await api.post("/glass-colors", payload);
      }
      closeModal();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar.";
      setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este color de vidrio?")) return;
    try {
      await api.delete(`/glass-colors/${id}`);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al eliminar.";
      alert(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">

      {/* Encabezado */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Colores de Vidrio</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Administra los colores disponibles y vincula cada uno con su material de precio.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm"
        >
          <FaPlus size={13} /> Añadir Color
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16 text-gray-400">
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Cargando...
        </div>
      ) : colors.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No hay colores registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="py-3 px-4 text-left">Nombre</th>
                <th className="py-3 px-4 text-left">Descripción</th>
                <th className="py-3 px-4 text-left">Material vinculado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {colors.map((color) => {
                const matName = getMaterialName(color.material_id);
                return (
                  <tr key={color.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{color.name}</td>
                    <td className="py-2.5 px-4 text-gray-500">{color.description || "—"}</td>
                    <td className="py-2.5 px-4">
                      {matName ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <FaLink size={9} /> {matName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <FaUnlink size={9} /> Sin vincular
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => openEdit(color)}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="Editar"
                        >
                          <FaEdit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(color.id)}
                          className="text-red-400 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          <FaTrashAlt size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota informativa sobre DUELA */}
      {!loading && colors.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          💡 <strong>DUELA</strong> es un material tipo PERFIL — vincúlala al perfil PVC correspondiente, no a un VIDRIO.
        </p>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-100 relative">

            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingColor ? "Editar Color de Vidrio" : "Nuevo Color de Vidrio"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Ej: BRONCE, CLARO, DUELA..."
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Material vinculado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material vinculado (precio)
                </label>
                <select
                  value={formData.material_id}
                  onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  <option value="">— Sin vincular —</option>

                  {/* Grupo VIDRIO */}
                  {materials.filter((m) => m._tipo === "VIDRIO").length > 0 && (
                    <optgroup label="── VIDRIO ──">
                      {materials
                        .filter((m) => m._tipo === "VIDRIO")
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}

                  {/* Grupo PERFIL (para DUELA y similares) */}
                  {materials.filter((m) => m._tipo === "PERFIL").length > 0 && (
                    <optgroup label="── PERFIL (ej: DUELA) ──">
                      {materials
                        .filter((m) => m._tipo === "PERFIL")
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  El material define el precio que usa el calculador de costos.
                </p>
              </div>

              {/* Error */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <FaExclamationTriangle size={13} /> {formError}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    editingColor ? "Guardar Cambios" : "Crear Color"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}