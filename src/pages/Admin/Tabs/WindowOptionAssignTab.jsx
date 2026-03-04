// RUTA: src/pages/Admin/Tabs/WindowOptionAssignTab.jsx

import { useEffect, useState, useMemo } from "react";
import { FaPlus, FaTrashAlt, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";

export default function WindowOptionAssignTab() {
    const [windowTypes, setWindowTypes] = useState([]);
    const [optionGroups, setOptionGroups] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTypeId, setSelectedTypeId] = useState("");

    // Modal agregar
    const [showModal, setShowModal] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Drawer sidebar (móvil)
    const [showSidebar, setShowSidebar] = useState(false);

    // ── Carga ────────────────────────────────────────────────────────────────
    const fetchAll = async () => {
        setLoading(true);
        setError("");
        try {
            const [typesRes, groupsRes, assignRes] = await Promise.all([
                api.get("/window-types"),
                api.get("/option-groups"),
                api.get("/window-type-options"),
            ]);
            const types = Array.isArray(typesRes.data) ? typesRes.data : [];
            setWindowTypes(types);
            setOptionGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
            setAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);
            if (!selectedTypeId && types.length > 0) {
                setSelectedTypeId(String(types[0].id));
            }
        } catch {
            setError("No se pudieron cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Derivados ────────────────────────────────────────────────────────────
    const currentAssignments = useMemo(() =>
        assignments.filter(a => String(a.window_type_id) === selectedTypeId),
        [assignments, selectedTypeId]);

    const availableGroups = useMemo(() => {
        const assignedGroupIds = new Set(currentAssignments.map(a => a.group_id));
        return optionGroups.filter(g => !assignedGroupIds.has(g.id));
    }, [optionGroups, currentAssignments]);

    const countByType = useMemo(() => {
        const map = {};
        assignments.forEach(a => {
            map[a.window_type_id] = (map[a.window_type_id] || 0) + 1;
        });
        return map;
    }, [assignments]);

    const selectedTypeName = windowTypes.find(t => String(t.id) === selectedTypeId)?.name ?? "";

    // ── Asignar grupo ────────────────────────────────────────────────────────
    const handleAssign = async (e) => {
        e.preventDefault();
        setFormError("");
        if (!selectedGroupId) { setFormError("Selecciona un grupo."); return; }
        setSaving(true);
        try {
            await api.post("/window-type-options", {
                window_type_id: Number(selectedTypeId),
                group_id: Number(selectedGroupId),
                sort_order: currentAssignments.length + 1,
            });
            setShowModal(false);
            setSelectedGroupId("");
            fetchAll();
        } catch (err) {
            const msg = err?.response?.data?.message || "Error al asignar grupo.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Quitar grupo ─────────────────────────────────────────────────────────
    const handleRemove = async (assignmentId, groupLabel) => {
        if (!confirm(`¿Quitar el grupo "${groupLabel}" de este tipo de ventana?`)) return;
        try {
            await api.delete(`/window-type-options/${assignmentId}`);
            fetchAll();
        } catch {
            alert("No se pudo quitar el grupo.");
        }
    };

    // ── Contenido del sidebar (compartido entre drawer y panel estático) ──────
    const SidebarContent = () => (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {windowTypes.map((wt) => {
                const count = countByType[wt.id] || 0;
                const isSelected = String(wt.id) === selectedTypeId;
                return (
                    <button
                        key={wt.id}
                        onClick={() => {
                            setSelectedTypeId(String(wt.id));
                            setShowSidebar(false); // cerrar drawer en móvil
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 last:border-0 flex justify-between items-center transition-colors ${isSelected
                                ? "bg-blue-600 text-white"
                                : "hover:bg-gray-50 active:bg-gray-100 text-gray-700"
                            }`}
                    >
                        <span className="truncate pr-2">{wt.name}</span>
                        <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${isSelected
                                ? "bg-blue-500 text-white"
                                : count > 0
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-400"
                            }`}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

            {/* Encabezado */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Asignación de Opciones</h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                    Define qué grupos de opciones aparecen en el cotizador para cada tipo de ventana.
                </p>
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
            ) : (
                <div className="flex gap-6">

                    {/* ── Trigger drawer (< lg) ── */}
                    <div className="lg:hidden mb-4 w-full flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                            Tipo de Ventana
                        </p>
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm"
                        >
                            <span className="font-medium text-gray-800 truncate pr-2">
                                {selectedTypeName || "Seleccionar tipo..."}
                            </span>
                            <span className="flex items-center gap-2 flex-shrink-0">
                                {selectedTypeId && (
                                    <span className="text-xs font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                                        {countByType[Number(selectedTypeId)] || 0}
                                    </span>
                                )}
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </span>
                        </button>
                    </div>

                    {/* ── Drawer sidebar (< lg) ── */}
                    {showSidebar && (
                        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                            {/* overlay */}
                            <div
                                className="absolute inset-0 bg-black/40"
                                onClick={() => setShowSidebar(false)}
                            />
                            {/* panel */}
                            <div className="relative z-10 w-72 max-w-[85vw] h-full bg-white overflow-y-auto shadow-2xl flex flex-col">
                                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        Tipo de Ventana
                                    </p>
                                    <button
                                        onClick={() => setShowSidebar(false)}
                                        className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="p-4 flex-1">
                                    <SidebarContent />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Sidebar estático (lg+) ── */}
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                            Tipo de Ventana
                        </p>
                        <SidebarContent />
                    </div>

                    {/* ── Panel derecho ── */}
                    <div className="flex-1 min-w-0 w-full">
                        {selectedTypeId ? (
                            <>
                                {/* Sub-header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{selectedTypeName}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {currentAssignments.length === 0
                                                ? "Sin grupos asignados — no aparecerán opciones en el cotizador."
                                                : `${currentAssignments.length} grupo${currentAssignments.length !== 1 ? "s" : ""} asignado${currentAssignments.length !== 1 ? "s" : ""}`
                                            }
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedGroupId(""); setFormError(""); setShowModal(true); }}
                                        disabled={availableGroups.length === 0}
                                        className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={availableGroups.length === 0 ? "Todos los grupos ya están asignados" : ""}
                                    >
                                        <FaPlus size={11} />
                                        <span className="hidden sm:inline">Asignar Grupo</span>
                                        <span className="sm:hidden">Asignar</span>
                                    </button>
                                </div>

                                {/* Lista de grupos asignados */}
                                {currentAssignments.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                                        <p className="text-sm">Sin grupos asignados.</p>
                                        <p className="text-xs mt-1">Este tipo de ventana no mostrará opciones en el cotizador.</p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        {currentAssignments.map((a, idx) => (
                                            <div
                                                key={a.id}
                                                className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                                            >
                                                {/* Número */}
                                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                    {idx + 1}
                                                </span>

                                                {/* Info del grupo */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                                        {a.group?.label || "—"}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-mono">
                                                        {a.group?.key}
                                                        <span className="mx-1.5 not-italic text-gray-300">·</span>
                                                        <span className="not-italic">
                                                            {a.group?.values?.length || 0} opciones
                                                        </span>
                                                    </p>

                                                    {/* Preview chips — en móvil va debajo del info */}
                                                    {(a.group?.values?.length || 0) > 0 && (
                                                        <div className="flex gap-1 flex-wrap mt-1.5 sm:hidden">
                                                            {(a.group.values || []).slice(0, 3).map(v => (
                                                                <span key={v.key} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                                                                    {v.label}
                                                                </span>
                                                            ))}
                                                            {(a.group.values.length || 0) > 3 && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    +{a.group.values.length - 3} más
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Preview chips desktop (sm+) */}
                                                <div className="hidden sm:flex gap-1 flex-wrap max-w-[200px]">
                                                    {(a.group?.values || []).slice(0, 4).map(v => (
                                                        <span key={v.key} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                            {v.label}
                                                        </span>
                                                    ))}
                                                    {(a.group?.values?.length || 0) > 4 && (
                                                        <span className="text-xs text-gray-400">
                                                            +{a.group.values.length - 4} más
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quitar */}
                                                <button
                                                    onClick={() => handleRemove(a.id, a.group?.label)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                                    title="Quitar grupo"
                                                >
                                                    <FaTrashAlt size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-16 text-gray-400 text-sm">
                                Selecciona un tipo de ventana.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL: Asignar grupo — bottom sheet móvil / centrado sm+ ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl sm:max-w-sm shadow-2xl overflow-hidden">

                        {/* Drag handle */}
                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

                        {/* Header */}
                        <div className="flex items-start justify-between px-5 pt-4 pb-3 sm:px-5 sm:py-4 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Asignar Grupo</h3>
                                <p className="text-xs text-blue-600 mt-0.5">{selectedTypeName}</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg flex-shrink-0"
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleAssign} className="px-5 py-4 sm:py-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Grupo de opciones <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={e => setSelectedGroupId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">— Seleccionar grupo —</option>
                                    {availableGroups.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.label} ({g.values?.length || 0} opciones)
                                        </option>
                                    ))}
                                </select>
                                {availableGroups.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Todos los grupos ya están asignados a este tipo.
                                    </p>
                                )}
                            </div>

                            {formError && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>
                            )}

                            <div className="flex gap-2 pb-1">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !selectedGroupId}
                                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-60"
                                >
                                    {saving ? "Asignando..." : "Asignar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}