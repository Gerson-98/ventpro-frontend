// RUTA: src/pages/Admin/Tabs/WindowTypesTab.jsx

import { useEffect, useState, useMemo } from "react";
import { FaPlus, FaTrashAlt, FaEdit, FaSearch, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";

const EMPTY_FORM = { name: "", description: "", pvcColorIds: [] };

export default function WindowTypesTab() {
  const [windowTypes, setWindowTypes] = useState([]);
  const [pvcColors, setPvcColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [typesRes, colorsRes] = await Promise.all([
        api.get("/window-types"),
        api.get("/pvc-colors"),
      ]);
      setWindowTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      setPvcColors(Array.isArray(colorsRes.data) ? colorsRes.data : []);
    } catch (err) {
      console.error("Error al obtener los datos:", err);
      setError("No se pudieron cargar los datos. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() =>
    windowTypes.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase())
    ), [windowTypes, search]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    if (!editingType && formData.pvcColorIds.length === 0) {
      setFormError("Debes asociar al menos un color PVC.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      pvcColorIds: formData.pvcColorIds.map(Number),
    };

    setSaving(true);
    try {
      if (editingType) {
        await api.patch(`/window-types/${editingType.id}`, {
          name: payload.name,
          description: payload.description,
        });
      } else {
        await api.post("/window-types", payload);
      }
      closeModal();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar el tipo de ventana.";
      setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
      console.error("Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de ventana?\nEsta acción no se puede deshacer.")) return;
    try {
      await api.delete(`/window-types/${id}`);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo eliminar.";
      alert(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  const openEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      pvcColorIds: (type.pvcColors || []).map(c => String(c.id)),
    });
    setFormError("");
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingType(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  };

  const handleColorChange = (e) => {
    const selectedIds = Array.from(e.target.selectedOptions, o => o.value);
    setFormData(prev => ({ ...prev, pvcColorIds: selectedIds }));
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Tipos de Ventana</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Administra los diferentes tipos de ventanas y sus asociaciones de color PVC.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm"
        >
          <FaPlus size={13} />
          <span className="hidden sm:inline">Añadir Tipo</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4 sm:mb-5">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
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
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {search ? "No se encontraron resultados." : "No hay tipos de ventana configurados."}
        </div>
      ) : (
        <>
          {/* ── Tabla desktop (md+) ── */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-4 text-left">Nombre</th>
                  <th className="py-3 px-4 text-left">Descripción</th>
                  <th className="py-3 px-4 text-left">Colores PVC asociados</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{t.name}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">{t.description || "—"}</td>
                    <td className="py-2.5 px-4">
                      {t.pvcColors && t.pvcColors.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.pvcColors.map(c => (
                            <span key={c.id} className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin colores asociados</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openEdit(t)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          <FaEdit size={14} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
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
            {filtered.map((t) => (
              <div key={t.id} className="p-4">
                {/* Fila 1: nombre + acciones */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm text-gray-900 leading-tight">{t.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-blue-500 p-1.5 rounded-lg border border-blue-100 active:bg-blue-50"
                      title="Editar"
                    >
                      <FaEdit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50"
                      title="Eliminar"
                    >
                      <FaTrashAlt size={12} />
                    </button>
                  </div>
                </div>

                {/* Descripción */}
                {t.description && (
                  <p className="text-xs text-gray-500 mb-2">{t.description}</p>
                )}

                {/* Chips de colores PVC */}
                {t.pvcColors && t.pvcColors.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {t.pvcColors.map(c => (
                      <span key={c.id} className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Sin colores asociados</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">
          {filtered.length} de {windowTypes.length} tipos
        </p>
      )}

      {/* ── MODAL — bottom sheet móvil / centrado sm+ ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-auto max-h-[92dvh] sm:max-w-md overflow-hidden shadow-2xl border border-gray-100">

            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                {editingType ? "Editar Tipo de Ventana" : "Nuevo Tipo de Ventana"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Body scrollable */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-5 py-4 sm:px-6 sm:py-5 space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: VENTANA CORREDIZA 2 HOJAS 55 CM MARCO 45 CM"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  rows={2}
                  placeholder="Descripción breve del tipo de ventana..."
                />
              </div>

              {/* Colores PVC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colores PVC {!editingType && <span className="text-red-500">*</span>}
                </label>
                <select
                  multiple
                  value={formData.pvcColorIds}
                  onChange={handleColorChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
                >
                  {pvcColors.map(color => (
                    <option key={color.id} value={String(color.id)}>
                      {color.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Usa Ctrl (o Cmd) para seleccionar varios.
                  {formData.pvcColorIds.length > 0 && (
                    <span className="text-blue-600 font-medium ml-2">
                      {formData.pvcColorIds.length} seleccionado{formData.pvcColorIds.length !== 1 ? "s" : ""}
                    </span>
                  )}
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
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    editingType ? "Guardar Cambios" : "Crear Tipo"
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