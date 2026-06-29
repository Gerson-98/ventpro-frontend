// RUTA: src/pages/Admin/Tabs/WindowSeriesTab.jsx

import { useEffect, useState, useMemo } from "react";
import { FaPlus, FaTrashAlt, FaEdit, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";

const EMPTY_FORM = {
  name: "",
  displayName: "",
  sort_order: 0,
  active: true,
  linkedCategoryIds: [],
};

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function WindowSeriesTab() {
  const [series, setSeries] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
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
      const [seriesRes, categoriesRes] = await Promise.all([
        api.get("/window-series"),
        api.get("/window-categories"),
      ]);
      setSeries(Array.isArray(seriesRes.data) ? seriesRes.data : []);
      setAllCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (err) {
      console.error("Error al cargar series:", err);
      setError("No se pudieron cargar los datos. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // IDs de categorías actualmente vinculadas al item que se está editando
  const currentLinkedIds = useMemo(() => {
    if (!editingItem?.categories) return [];
    return editingItem.categories.map(sc => sc.category?.id ?? sc.category_id).filter(Boolean);
  }, [editingItem]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("El nombre de la serie es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      let savedId = editingItem?.id;

      if (editingItem) {
        // Actualizar metadatos de la serie
        await api.patch(`/window-series/${editingItem.id}`, {
          name: formData.name.trim(),
          displayName: formData.displayName.trim() || null,
          sort_order: Number(formData.sort_order) || 0,
          active: formData.active,
        });
      } else {
        // Crear la serie
        const res = await api.post("/window-series", {
          name: formData.name.trim(),
          displayName: formData.displayName.trim() || null,
          sort_order: Number(formData.sort_order) || 0,
          active: formData.active,
        });
        savedId = res.data.id;
      }

      // Sincronizar categorías vinculadas:
      // Primero calcular cuáles agregar y cuáles quitar
      const previousIds = currentLinkedIds;
      const nextIds = formData.linkedCategoryIds.map(Number);
      const toAdd = nextIds.filter(id => !previousIds.includes(id));
      const toRemove = previousIds.filter(id => !nextIds.includes(id));

      await Promise.all([
        ...toAdd.map(catId => api.post(`/window-series/${savedId}/categories/${catId}`)),
        ...toRemove.map(catId => api.delete(`/window-series/${savedId}/categories/${catId}`)),
      ]);

      closeModal();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar la serie.";
      setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
      console.error("Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar esta serie?\nSe desvincularán todos sus tipos de ventana (quedarán sin serie).")) return;
    try {
      await api.delete(`/window-series/${id}`);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo eliminar.";
      alert(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  const openEdit = (item) => {
    const linkedIds = (item.categories || [])
      .map(sc => sc.category?.id ?? sc.category_id)
      .filter(Boolean)
      .map(String);
    setEditingItem(item);
    setFormData({
      name: item.name,
      displayName: item.displayName || "",
      sort_order: item.sort_order ?? 0,
      active: item.active ?? true,
      linkedCategoryIds: linkedIds,
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

  const toggleCategory = (id) => {
    const strId = String(id);
    setFormData(prev => ({
      ...prev,
      linkedCategoryIds: prev.linkedCategoryIds.includes(strId)
        ? prev.linkedCategoryIds.filter(x => x !== strId)
        : [...prev.linkedCategoryIds, strId],
    }));
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Series</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Define las series de aluminio/PVC (ej: SERIE 60, SERIE 80) y asigna qué categorías de ventanas pertenecen a cada serie.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm"
        >
          <FaPlus size={13} />
          <span className="hidden sm:inline">Nueva Serie</span>
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
      ) : series.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No hay series configuradas. Crea la primera para comenzar.
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
                  <th className="py-3 px-4 text-left">Categorías vinculadas</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Orden</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {series.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900 text-xs">{s.name}</td>
                    <td className="py-2.5 px-4">
                      {s.displayName ? (
                        <span className="text-gray-800">{s.displayName}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {s.categories && s.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.categories.map(sc => {
                            const cat = sc.category || sc;
                            return (
                              <span key={cat.id} className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-100">
                                {cat.displayName || cat.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500 italic">Sin categorías</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${s.active ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                        {s.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs text-gray-500">{s.sort_order}</td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          <FaEdit size={14} />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
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
            {series.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 leading-tight">{s.name}</p>
                    {s.displayName && <p className="text-xs text-gray-500 mt-0.5">{s.displayName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="text-blue-500 p-1.5 rounded-lg border border-blue-100 active:bg-blue-50">
                      <FaEdit size={13} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50">
                      <FaTrashAlt size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.categories && s.categories.length > 0 ? (
                    s.categories.map(sc => {
                      const cat = sc.category || sc;
                      return (
                        <span key={cat.id} className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-100">
                          {cat.displayName || cat.name}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-amber-500 italic">Sin categorías vinculadas</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.active ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                    {s.active ? "Activa" : "Inactiva"}
                  </span>
                  <span className="text-xs text-gray-400">Orden: {s.sort_order}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && series.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">{series.length} series</p>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-auto max-h-[92dvh] sm:max-w-lg overflow-hidden shadow-2xl border border-gray-100">

            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

            <div className="flex justify-between items-center px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                {editingItem ? "Editar Serie" : "Nueva Serie"}
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
                  placeholder="Ej: SERIE 80"
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
                  placeholder="Ej: Serie 80mm"
                  value={formData.displayName}
                  onChange={(e) => setFormData(p => ({ ...p, displayName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si se deja vacío, en el selector de cotización se mostrará el nombre interno.
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

              {/* Categorías vinculadas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorías vinculadas
                </label>
                {allCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No hay categorías creadas. Ve al tab "Categorías" para crearlas primero.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                    {allCategories.map(cat => {
                      const checked = formData.linkedCategoryIds.includes(String(cat.id));
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(cat.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {cat.displayName || cat.name}
                          </span>
                          {cat.displayName && cat.displayName !== cat.name && (
                            <span className="text-xs text-gray-400 ml-auto">{cat.name}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  Las categorías vinculadas a esta serie aparecerán en el selector de cotización cuando el usuario elija esta serie.
                </p>
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
                  {saving ? (<><Spinner /> Guardando...</>) : (editingItem ? "Guardar Cambios" : "Crear Serie")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
