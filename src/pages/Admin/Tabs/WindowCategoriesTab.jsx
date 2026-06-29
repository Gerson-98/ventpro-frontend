// RUTA: src/pages/Admin/Tabs/WindowCategoriesTab.jsx

import { useEffect, useState } from "react";
import { FaPlus, FaTrashAlt, FaEdit, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";

const EMPTY_FORM = {
  name: "",
  displayName: "",
  sort_order: 0,
  active: true,
};

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function WindowCategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/window-categories");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar categorías:", err);
      setError("No se pudieron cargar los datos. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("El nombre de la categoría es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim() || null,
        sort_order: Number(formData.sort_order) || 0,
        active: formData.active,
      };
      if (editingItem) {
        await api.patch(`/window-categories/${editingItem.id}`, payload);
      } else {
        await api.post("/window-categories", payload);
      }
      closeModal();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar la categoría.";
      setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
      console.error("Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría?\nLos tipos de ventana que la usen quedarán sin categoría.")) return;
    try {
      await api.delete(`/window-categories/${id}`);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo eliminar.";
      alert(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      displayName: item.displayName || "",
      sort_order: item.sort_order ?? 0,
      active: item.active ?? true,
    });
    setFormError("");
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Categorías</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Define las categorías de ventanas (ej: VENTANA CORREDIZA, PUERTA CORREDIZA) y vincúlalas a series desde el tab "Series".
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm"
        >
          <FaPlus size={13} />
          <span className="hidden sm:inline">Nueva Categoría</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-gray-400">
          <Spinner /><span className="ml-2">Cargando...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No hay categorías configuradas. Crea la primera para comenzar.
        </div>
      ) : (
        <>
          {/* ── Tabla desktop (md+) ── */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-4 text-left">Nombre interno</th>
                  <th className="py-3 px-4 text-left">Nombre comercial</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Orden</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900 text-xs">{c.name}</td>
                    <td className="py-2.5 px-4">
                      {c.displayName ? (
                        <span className="text-gray-800">{c.displayName}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${c.active ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                        {c.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs text-gray-500">{c.sort_order}</td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          <FaEdit size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Cards móvil (< md) ── */}
          <div className="md:hidden border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {categories.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                    {c.displayName && <p className="text-xs text-gray-500 mt-0.5">{c.displayName}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.active ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                        {c.active ? "Activa" : "Inactiva"}
                      </span>
                      <span className="text-xs text-gray-400">Orden: {c.sort_order}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="text-blue-500 p-1.5 rounded-lg border border-blue-100 active:bg-blue-50">
                      <FaEdit size={13} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50">
                      <FaTrashAlt size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && categories.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">{categories.length} categorías</p>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-auto max-h-[92dvh] sm:max-w-md overflow-hidden shadow-2xl border border-gray-100">

            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

            <div className="flex justify-between items-center px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                {editingItem ? "Editar Categoría" : "Nueva Categoría"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-5 py-4 sm:px-6 sm:py-5 space-y-4">

              {/* Nombre interno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre interno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: VENTANA CORREDIZA"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Nombre comercial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre comercial <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ventana Corrediza"
                  value={formData.displayName}
                  onChange={(e) => setFormData(p => ({ ...p, displayName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Nombre que verá el vendedor al elegir la categoría en el selector de cotización.
                </p>
              </div>

              {/* Orden + Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden de visualización</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sort_order}
                    onChange={(e) => setFormData(p => ({ ...p, sort_order: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Menor = aparece primero.</p>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <label className="flex items-center gap-3 mt-1 cursor-pointer">
                    <div
                      onClick={() => setFormData(p => ({ ...p, active: !p.active }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.active ? "bg-blue-600" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? "translate-x-6" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700">{formData.active ? "Activa" : "Inactiva"}</span>
                  </label>
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <FaExclamationTriangle size={13} /> {formError}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2 pb-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (<><Spinner /> Guardando...</>) : (editingItem ? "Guardar Cambios" : "Crear Categoría")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
