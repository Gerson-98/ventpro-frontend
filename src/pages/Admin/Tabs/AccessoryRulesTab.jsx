// RUTA: src/pages/Admin/Tabs/AccessoryRulesTab.jsx

import { useEffect, useState, useMemo } from "react";
import { FaPlus, FaTrashAlt, FaEdit, FaSave, FaTimes, FaExclamationTriangle, FaLock, FaUnlock } from "react-icons/fa";
import api from "@/services/api";

// ─── Constantes ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
    window_type_id: "",
    material_id: "",
    quantity: 1,
    isFija: true,
    option_group: "",
    option_key: "",
};

// ─── Subcomponente: badge de tipo de regla ────────────────────────────────────
function RuleBadge({ rule }) {
    if (!rule.option_group) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                <FaLock size={9} /> Fija
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            <FaUnlock size={9} /> Condicional
        </span>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AccessoryRulesTab() {
    const [windowTypes, setWindowTypes] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [allRules, setAllRules] = useState([]);
    const [optionGroups, setOptionGroups] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [selectedTypeId, setSelectedTypeId] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");

    // ── Carga inicial ──────────────────────────────────────────────────────────
    const fetchAll = async () => {
        setLoading(true);
        setError("");
        try {
            const [typesRes, matsRes, rulesRes, groupsRes] = await Promise.all([
                api.get("/window-types"),
                api.get("/materials?type=ACCESORIO"),
                api.get("/accessory-rules"),
                api.get("/option-groups"),
            ]);
            const types = Array.isArray(typesRes.data) ? typesRes.data : [];
            const mats = Array.isArray(matsRes.data) ? matsRes.data : [];
            const rules = Array.isArray(rulesRes.data) ? rulesRes.data : [];
            const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];

            setWindowTypes(types);
            setAccessories(mats);
            setAllRules(rules);
            setOptionGroups(groups);

            if (!selectedTypeId && types.length > 0) {
                setSelectedTypeId(String(types[0].id));
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            setError("No se pudieron cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Valores del grupo seleccionado en el form ─────────────────────────────
    const selectedGroupValues = useMemo(() => {
        if (!formData.option_group) return [];
        const group = optionGroups.find(g => g.key === formData.option_group);
        return group?.values || [];
    }, [optionGroups, formData.option_group]);

    // ── Reglas filtradas por tipo seleccionado ────────────────────────────────
    const filteredRules = useMemo(() => {
        if (!selectedTypeId) return [];
        return allRules.filter((r) => String(r.window_type_id) === selectedTypeId);
    }, [allRules, selectedTypeId]);

    // ── Conteo de reglas por tipo ─────────────────────────────────────────────
    const countByType = useMemo(() => {
        const map = {};
        allRules.forEach((r) => {
            map[r.window_type_id] = (map[r.window_type_id] || 0) + 1;
        });
        return map;
    }, [allRules]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getMatName = (id) => accessories.find((a) => a.id === id)?.name ?? `#${id}`;

    const getGroupLabel = (key) => {
        const group = optionGroups.find(g => g.key === key);
        return group?.label || key;
    };

    const getValueLabel = (groupKey, valueKey) => {
        const group = optionGroups.find(g => g.key === groupKey);
        const value = group?.values?.find(v => v.key === valueKey);
        return value?.label || valueKey;
    };

    // ── Abrir modal ───────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingRule(null);
        setFormData({ ...EMPTY_FORM, window_type_id: selectedTypeId });
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            window_type_id: String(rule.window_type_id),
            material_id: String(rule.material_id),
            quantity: rule.quantity,
            isFija: !rule.option_group,
            option_group: rule.option_group ?? "",
            option_key: rule.option_key ?? "",
        });
        setFormError("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRule(null);
        setFormData(EMPTY_FORM);
        setFormError("");
    };

    const setField = (field, value) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    // ── Guardar ───────────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!formData.material_id) {
            setFormError("Debes seleccionar un accesorio.");
            return;
        }
        if (!formData.isFija && (!formData.option_group || !formData.option_key)) {
            setFormError("Para reglas condicionales debes seleccionar el grupo y el valor.");
            return;
        }

        const payload = {
            window_type_id: Number(formData.window_type_id),
            material_id: Number(formData.material_id),
            quantity: Number(formData.quantity) || 1,
            option_group: formData.isFija ? null : formData.option_group,
            option_key: formData.isFija ? null : formData.option_key,
        };

        setSaving(true);
        try {
            if (editingRule) {
                await api.patch(`/accessory-rules/${editingRule.id}`, payload);
            } else {
                await api.post("/accessory-rules", payload);
            }
            closeModal();
            fetchAll();
        } catch (err) {
            const msg = err?.response?.data?.message || "Error al guardar la regla.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar ──────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar esta regla de accesorio?")) return;
        try {
            await api.delete(`/accessory-rules/${id}`);
            fetchAll();
        } catch {
            alert("Error al eliminar la regla.");
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">

            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Reglas de Accesorios</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                    Define qué accesorios lleva cada tipo de ventana — fijos siempre, o condicionales según las opciones elegidas.
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

                    {/* Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                            Tipo de Ventana
                        </p>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {windowTypes.map((wt) => {
                                const count = countByType[wt.id] || 0;
                                const isSelected = String(wt.id) === selectedTypeId;
                                return (
                                    <button
                                        key={wt.id}
                                        onClick={() => setSelectedTypeId(String(wt.id))}
                                        className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 last:border-0 flex justify-between items-center transition-colors ${isSelected
                                                ? "bg-blue-600 text-white"
                                                : "hover:bg-gray-50 text-gray-700"
                                            }`}
                                    >
                                        <span className="truncate pr-2">{wt.name}</span>
                                        <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                                            }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Panel derecho */}
                    <div className="flex-1 min-w-0">
                        {selectedTypeId ? (
                            <>
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <p className="font-semibold text-gray-800">
                                            {windowTypes.find((t) => String(t.id) === selectedTypeId)?.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {filteredRules.length} regla{filteredRules.length !== 1 ? "s" : ""} configurada{filteredRules.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <button
                                        onClick={openCreate}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                                    >
                                        <FaPlus size={11} /> Añadir Regla
                                    </button>
                                </div>

                                {filteredRules.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                                        <p>Sin reglas configuradas.</p>
                                        <p className="text-xs mt-1">Haz clic en "Añadir Regla" para comenzar.</p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                                <tr>
                                                    <th className="py-2.5 px-3 text-left">Accesorio</th>
                                                    <th className="py-2.5 px-3 text-center">Cant.</th>
                                                    <th className="py-2.5 px-3 text-left">Tipo</th>
                                                    <th className="py-2.5 px-3 text-left">Condición</th>
                                                    <th className="py-2.5 px-3 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredRules.map((rule) => (
                                                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="py-2 px-3 font-medium text-gray-800">
                                                            {rule.material?.name ?? getMatName(rule.material_id)}
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono font-bold text-gray-700">
                                                            {rule.quantity}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <RuleBadge rule={rule} />
                                                        </td>
                                                        <td className="py-2 px-3 text-xs text-gray-500">
                                                            {rule.option_group ? (
                                                                <span>
                                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                                        {getGroupLabel(rule.option_group)}
                                                                    </span>
                                                                    {" = "}
                                                                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                                                        {getValueLabel(rule.option_group, rule.option_key)}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 italic">Siempre aplica</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <div className="flex justify-center gap-3">
                                                                <button onClick={() => openEdit(rule)} className="text-blue-500 hover:text-blue-700 transition" title="Editar">
                                                                    <FaEdit size={14} />
                                                                </button>
                                                                <button onClick={() => handleDelete(rule.id)} className="text-red-400 hover:text-red-600 transition" title="Eliminar">
                                                                    <FaTrashAlt size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-16 text-gray-400">
                                Selecciona un tipo de ventana para ver sus reglas.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-100 relative">

                        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {editingRule ? "Editar Regla" : "Nueva Regla de Accesorio"}
                                </h3>
                                <p className="text-xs text-blue-600 mt-0.5">
                                    {windowTypes.find((t) => String(t.id) === selectedTypeId)?.name}
                                </p>
                            </div>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">

                            {/* Accesorio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Accesorio <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.material_id}
                                    onChange={(e) => setField("material_id", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">— Seleccionar accesorio —</option>
                                    {accessories.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cantidad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setField("quantity", e.target.value)}
                                    className="w-24 border border-gray-300 rounded-lg p-2.5 text-sm text-center font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Toggle fija/condicional */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de regla</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setField("isFija", true)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${formData.isFija
                                                ? "bg-green-50 border-green-400 text-green-700"
                                                : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                                            }`}
                                    >
                                        <FaLock size={12} /> Fija — siempre aplica
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setField("isFija", false)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${!formData.isFija
                                                ? "bg-blue-50 border-blue-400 text-blue-700"
                                                : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                                            }`}
                                    >
                                        <FaUnlock size={12} /> Condicional
                                    </button>
                                </div>
                            </div>

                            {/* Campos condicionales — desde BD */}
                            {!formData.isFija && (
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                                    <p className="text-xs text-blue-600 font-medium">
                                        Solo aplica cuando la opción del cotizador coincida con:
                                    </p>

                                    {/* Grupo */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Grupo de opción <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.option_group}
                                            onChange={(e) => setFormData(p => ({
                                                ...p,
                                                option_group: e.target.value,
                                                option_key: "",
                                            }))}
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required={!formData.isFija}
                                        >
                                            <option value="">— Seleccionar grupo —</option>
                                            {optionGroups.map(g => (
                                                <option key={g.id} value={g.key}>
                                                    {g.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Valor */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Valor <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.option_key}
                                            onChange={(e) => setField("option_key", e.target.value)}
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                            required={!formData.isFija}
                                            disabled={!formData.option_group}
                                        >
                                            <option value="">— Seleccionar valor —</option>
                                            {selectedGroupValues.map(v => (
                                                <option key={v.id} value={v.key}>
                                                    {v.label}
                                                </option>
                                            ))}
                                        </select>
                                        {!formData.option_group && (
                                            <p className="text-xs text-gray-400 mt-1">Selecciona primero un grupo.</p>
                                        )}
                                    </div>

                                    {/* Preview */}
                                    {formData.option_group && formData.option_key && (
                                        <div className="text-xs text-blue-700 bg-blue-100 rounded p-2 font-mono">
                                            {`options["${formData.option_group}"] === "${formData.option_key}"`}
                                        </div>
                                    )}
                                </div>
                            )}

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
                                    className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2"
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
                                        <><FaSave size={12} /> {editingRule ? "Guardar Cambios" : "Crear Regla"}</>
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