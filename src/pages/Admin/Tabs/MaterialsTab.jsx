// RUTA: src/pages/Admin/Tabs/MaterialsTab.jsx

import { useEffect, useState, useMemo } from "react";
import { FaPlus, FaTrashAlt, FaEdit, FaSearch, FaFilter } from "react-icons/fa";
import api from "@/services/api";

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS = ["PERFIL", "VIDRIO", "ACCESORIO"];

const TIPO_STYLES = {
    PERFIL: { badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
    VIDRIO: { badge: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500" },
    ACCESORIO: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
    default: { badge: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
};

const UNIDADES = ["barra", "plancha", "unidad", "metro", "par", "juego", "kg"];

const EMPTY_FORM = {
    name: "",
    type: "PERFIL",
    price_white: "",
    price_color: "",
    unit: "barra",
};

// ─── Helper: badge de tipo ────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
    const style = TIPO_STYLES[tipo] || TIPO_STYLES.default;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${style.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {tipo}
        </span>
    );
}

// ─── Helper: spinner reutilizable ─────────────────────────────────────────────
function Spinner({ className = "w-4 h-4" }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MaterialsTab() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingMat, setEditingMat] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");

    const [filterType, setFilterType] = useState("TODOS");
    const [search, setSearch] = useState("");

    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
    const [deleteError, setDeleteError] = useState("");
    const [deleting, setDeleting] = useState(false);

    // ── Carga de datos ────────────────────────────────────────────────────────
    const fetchMaterials = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/materials");
            setMaterials(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error al obtener materiales:", err);
            setError("No se pudieron cargar los materiales. Verifica que el servidor esté activo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMaterials(); }, []);

    // ── Filtrado ──────────────────────────────────────────────────────────────
    const filtered = useMemo(() =>
        materials.filter((m) => {
            const matchType = filterType === "TODOS" || m.type === filterType;
            const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
            return matchType && matchSearch;
        }),
        [materials, filterType, search]);

    const counts = useMemo(() => {
        const c = { TODOS: materials.length };
        TIPOS.forEach((t) => { c[t] = materials.filter((m) => m.type === t).length; });
        return c;
    }, [materials]);

    // ── Modal crear / editar ──────────────────────────────────────────────────
    const openCreate = () => {
        setEditingMat(null);
        setFormData(EMPTY_FORM);
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (mat) => {
        setEditingMat(mat);
        setFormData({
            name: mat.name,
            type: mat.type,
            price_white: mat.price_white ?? "",
            price_color: mat.price_color ?? "",
            unit: mat.unit ?? "barra",
        });
        setFormError("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingMat(null);
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
        if (formData.price_white === "" || isNaN(Number(formData.price_white))) {
            setFormError("El precio blanco debe ser un número válido.");
            return;
        }

        const payload = {
            name: formData.name.trim(),
            type: formData.type,
            price_white: Number(formData.price_white),
            price_color: formData.price_color !== "" ? Number(formData.price_color) : null,
            unit: formData.unit,
        };

        setSaving(true);
        try {
            if (editingMat) {
                await api.patch(`/materials/${editingMat.id}`, payload);
            } else {
                await api.post("/materials", payload);
            }
            closeModal();
            fetchMaterials();
        } catch (err) {
            const msg = err?.response?.data?.message || "Error al guardar el material.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar ──────────────────────────────────────────────────────────────
    const openDeleteConfirm = (mat) => {
        setDeleteTarget({ id: mat.id, name: mat.name });
        setDeleteError("");
    };

    const closeDeleteConfirm = () => {
        if (deleting) return;
        setDeleteTarget(null);
        setDeleteError("");
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError("");
        try {
            await api.delete(`/materials/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchMaterials();
        } catch (err) {
            const msg = err?.response?.data?.message || "Error al eliminar el material.";
            setDeleteError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    };

    const formatPrice = (val) =>
        val != null && val !== ""
            ? `Q ${Number(val).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`
            : "—";

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

            {/* ── Encabezado ── */}
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Materiales</h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                        Gestiona perfiles de PVC, vidrios y accesorios con sus precios actualizados.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm"
                >
                    <FaPlus size={13} />
                    <span className="hidden sm:inline">Añadir Material</span>
                    <span className="sm:hidden">Añadir</span>
                </button>
            </div>

            {/* ── Barra de búsqueda + filtros ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-5">
                {/* Search */}
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                {/* Chips de filtro — scroll horizontal en móvil */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                    <FaFilter size={12} className="text-gray-400 flex-shrink-0" />
                    {["TODOS", ...TIPOS].map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${filterType === t
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50"
                                }`}
                        >
                            {t} <span className="opacity-70">({counts[t] ?? 0})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Error de carga ── */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* ── Contenido principal ── */}
            {loading ? (
                <div className="flex justify-center items-center py-16 text-gray-400">
                    <Spinner className="w-6 h-6 mr-2" />
                    Cargando materiales...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-base sm:text-lg">No se encontraron materiales</p>
                    {search && <p className="text-sm mt-1">Intenta con otro término de búsqueda.</p>}
                </div>
            ) : (
                <>
                    {/* ── Tabla desktop (sm+) ── */}
                    <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="py-3 px-4 text-left">Nombre</th>
                                    <th className="py-3 px-4 text-left">Tipo</th>
                                    <th className="py-3 px-4 text-left">Unidad</th>
                                    <th className="py-3 px-4 text-right">Precio Blanco</th>
                                    <th className="py-3 px-4 text-right">Precio Color</th>
                                    <th className="py-3 px-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((mat) => (
                                    <tr key={mat.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-2.5 px-4 font-medium text-gray-900">{mat.name}</td>
                                        <td className="py-2.5 px-4"><TipoBadge tipo={mat.type} /></td>
                                        <td className="py-2.5 px-4 text-gray-500">{mat.unit ?? "—"}</td>
                                        <td className="py-2.5 px-4 text-right font-mono text-gray-700">
                                            {formatPrice(mat.price_white)}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono text-gray-500">
                                            {formatPrice(mat.price_color)}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => openEdit(mat)}
                                                    className="text-blue-500 hover:text-blue-700 transition-colors"
                                                    title="Editar"
                                                >
                                                    <FaEdit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteConfirm(mat)}
                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                    title="Eliminar"
                                                >
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
                        {filtered.map((mat) => (
                            <div key={mat.id} className="p-4">
                                {/* Fila 1: nombre + acciones */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="font-semibold text-sm text-gray-900 leading-tight">{mat.name}</p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                            onClick={() => openEdit(mat)}
                                            className="text-blue-500 p-1.5 rounded-lg border border-blue-100 active:bg-blue-50"
                                            title="Editar"
                                        >
                                            <FaEdit size={13} />
                                        </button>
                                        <button
                                            onClick={() => openDeleteConfirm(mat)}
                                            className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50"
                                            title="Eliminar"
                                        >
                                            <FaTrashAlt size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Fila 2: badge tipo + unidad */}
                                <div className="flex items-center gap-2 mb-2">
                                    <TipoBadge tipo={mat.type} />
                                    <span className="text-xs text-gray-400">{mat.unit ?? "—"}</span>
                                </div>

                                {/* Fila 3: precios en 2 columnas */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-gray-50 rounded-md px-2.5 py-1.5">
                                        <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold mb-0.5">Blanco</p>
                                        <p className="font-mono font-semibold text-gray-800">{formatPrice(mat.price_white)}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-md px-2.5 py-1.5">
                                        <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold mb-0.5">Color</p>
                                        <p className="font-mono text-gray-500">{formatPrice(mat.price_color)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Contador */}
            {!loading && filtered.length > 0 && (
                <p className="mt-3 text-xs text-gray-400 text-right">
                    Mostrando {filtered.length} de {materials.length} materiales
                </p>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — CONFIRMAR ELIMINACIÓN
                Bottom sheet en móvil, centrado en sm+
            ══════════════════════════════════════════════════════════════════ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl sm:max-w-md shadow-2xl overflow-hidden">

                        {/* Drag handle móvil */}
                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

                        <div className="px-5 pt-5 pb-6 sm:p-6">
                            {/* Ícono */}
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <FaTrashAlt className="text-red-500" size={20} />
                                </div>
                            </div>

                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 text-center mb-1">
                                ¿Eliminar material?
                            </h3>
                            <p className="text-sm text-gray-500 text-center mb-5">
                                Estás a punto de eliminar{" "}
                                <span className="font-semibold text-gray-700">"{deleteTarget.name}"</span>.
                                Esta acción no se puede deshacer.
                            </p>

                            {deleteError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm leading-relaxed">
                                    <p className="font-semibold mb-1">No se puede eliminar</p>
                                    <p>{deleteError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={closeDeleteConfirm}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                {!deleteError && (
                                    <button
                                        onClick={handleConfirmDelete}
                                        disabled={deleting}
                                        className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {deleting ? (
                                            <><Spinner /> Eliminando...</>
                                        ) : (
                                            "Sí, eliminar"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL — CREAR / EDITAR MATERIAL
                Bottom sheet en móvil, centrado en sm+
            ══════════════════════════════════════════════════════════════════ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-auto max-h-[92dvh] sm:max-w-md overflow-hidden shadow-2xl">

                        {/* Drag handle móvil */}
                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 flex-shrink-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                {editingMat ? "Editar Material" : "Nuevo Material"}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
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
                                    placeholder="Ej: PERFIL 60MM BLANCO"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Tipo + Unidad */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {TIPOS.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {UNIDADES.map((u) => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Precios */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Precio Blanco (Q) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0" required
                                        placeholder="0.00"
                                        value={formData.price_white}
                                        onChange={(e) => setFormData({ ...formData, price_white: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Precio Color (Q)
                                        <span className="text-gray-400 text-xs ml-1">(opcional)</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        placeholder="0.00"
                                        value={formData.price_color}
                                        onChange={(e) => setFormData({ ...formData, price_color: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                                        Si se deja vacío, se usará el precio blanco.
                                    </p>
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            {/* Botones */}
                            <div className="flex justify-end gap-3 pt-2 pb-2">
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
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? (
                                        <><Spinner /> Guardando...</>
                                    ) : (
                                        editingMat ? "Guardar Cambios" : "Crear Material"
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