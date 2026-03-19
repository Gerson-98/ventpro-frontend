// RUTA: src/pages/Admin/Tabs/CatalogoPerfilesTab.jsx

import { useEffect, useState } from "react";
import { FaEdit, FaSave, FaTimes, FaExclamationTriangle, FaPlus, FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";
import api from "@/services/api";

// ─── Constantes ──────────────────────────────────────────────────────────────

const SLOTS = [
    { key: "perfil_marco_id", reglaKey: "regla_marco", label: "Marco", usaHoja: false },
    { key: "perfil_hoja_id", reglaKey: "regla_hoja", label: "Hoja", usaHoja: true },
    { key: "perfil_mosquitero_id", reglaKey: "regla_mosquitero", label: "Mosquitero", usaHoja: true },
    { key: "perfil_batiente_id", reglaKey: "regla_batiente", label: "Batiente", usaHoja: true },
    { key: "perfil_tapajamba_id", reglaKey: "regla_tapajamba", label: "Tapajamba", usaHoja: false },
];

// Slots de refuerzo — solo selector de material, sin fórmula (heredan la de hoja/mosquitero)
const REFUERZO_SLOTS = [
    { key: "refuerzo_hoja_id", label: "Refuerzo Hoja", hint: "Mismo corte que Hoja — ej: REFUERZO HOJA 5,5 CM" },
    { key: "refuerzo_mosquitero_id", label: "Refuerzo Mosquitero", hint: "Mismo corte que Mosquitero — ej: REFUERZO CEDAZO" },
];

const FORMULAS = [
    { value: "SUMAR ANCHO Y ALTO", label: "Ancho + Alto  ×  N" },
    { value: "SUMAR ANCHO Y MULTIPLICAR ALTO", label: "Ancho + (Alto × N)" },
    { value: "SUMAR ALTO", label: "Solo Alto  ×  N" },
];

const OVERRIDE_FIELDS = [
    { key: "perfil_marco_id", label: "Marco (perfil)", type: "perfil" },
    { key: "perfil_hoja_id", label: "Hoja (perfil)", type: "perfil" },
    { key: "perfil_mosquitero_id", label: "Mosquitero (perfil)", type: "perfil" },
    { key: "perfil_batiente_id", label: "Batiente (perfil)", type: "perfil" },
    { key: "perfil_tapajamba_id", label: "Tapajamba (perfil)", type: "perfil" },
    { key: "regla_marco", label: "Fórmula Marco", type: "regla" },
    { key: "regla_hoja", label: "Fórmula Hoja", type: "regla" },
    { key: "regla_mosquitero", label: "Fórmula Mosquitero", type: "regla" },
    { key: "regla_batiente", label: "Fórmula Batiente", type: "regla" },
    { key: "regla_tapajamba", label: "Fórmula Tapajamba", type: "regla" },
    { key: "cant_vidrios", label: "Cantidad de vidrios", type: "number" },
];

const buildRegla = (formula, mult) =>
    formula && mult ? `${formula} *${mult}` : "";

const parseRegla = (regla) => {
    if (!regla) return { formula: "", mult: 2 };
    const match = regla.match(/^(.+?)\s*\*\s*(\d+)$/);
    if (!match) return { formula: regla.trim(), mult: 2 };
    return { formula: match[1].trim(), mult: parseInt(match[2], 10) };
};

const buildEmptyForm = (windowTypeId) => {
    const form = { window_type_id: windowTypeId, cant_vidrios: 0, refuerzo_hoja_id: "", refuerzo_mosquitero_id: "" };
    SLOTS.forEach(({ key, reglaKey }) => {
        form[key] = "";
        form[reglaKey] = { formula: FORMULAS[0].value, mult: 2 };
    });
    return form;
};

const catalogToForm = (catalogo, windowTypeId) => {
    const form = {
        window_type_id: windowTypeId,
        cant_vidrios: catalogo?.cant_vidrios ?? 0,
        // ✅ FIX: leer ID desde campo directo o desde objeto anidado (refuerzoHoja.id)
        refuerzo_hoja_id: catalogo?.refuerzo_hoja_id ?? catalogo?.refuerzoHoja?.id ?? "",
        refuerzo_mosquitero_id: catalogo?.refuerzo_mosquitero_id ?? catalogo?.refuerzoMosquitero?.id ?? "",
    };
    SLOTS.forEach(({ key, reglaKey }) => {
        form[key] = catalogo?.[key] ?? "";
        form[reglaKey] = parseRegla(catalogo?.[reglaKey] ?? "");
    });
    return form;
};

const ruleOverridesToRows = (ruleOverrides) => {
    if (!ruleOverrides || typeof ruleOverrides !== "object") return [];
    return Object.entries(ruleOverrides).map(([optionKey, fields]) => ({
        optionKey,
        fields: { ...fields },
    }));
};

const rowsToRuleOverrides = (rows) => {
    if (!rows || rows.length === 0) return null;
    const result = {};
    rows.forEach(({ optionKey, fields }) => {
        if (optionKey.trim()) result[optionKey.trim()] = { ...fields };
    });
    return Object.keys(result).length > 0 ? result : null;
};

// ─── PerfilSlotRow ────────────────────────────────────────────────────────────
function PerfilSlotRow({ slot, formData, perfiles, onChange }) {
    const { key, reglaKey, label, usaHoja } = slot;
    const regla = formData[reglaKey] || { formula: FORMULAS[0].value, mult: 2 };

    return (
        <div className="py-3 border-b border-gray-100 last:border-0 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center">
            <div className="sm:col-span-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${usaHoja ? "bg-blue-400" : "bg-gray-400"}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <div className="sm:col-span-4">
                <select
                    value={formData[key] ?? ""}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="">— Sin perfil —</option>
                    {perfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            <div className="sm:col-span-4 flex gap-2">
                <select
                    value={regla.formula}
                    onChange={(e) => onChange(reglaKey, { ...regla, formula: e.target.value })}
                    disabled={!formData[key]}
                    className="flex-1 border border-gray-300 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                >
                    {FORMULAS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
                <div className="flex items-center gap-1 sm:hidden">
                    <span className="text-gray-400 text-sm">×</span>
                    <input
                        type="number" min="1" max="10"
                        value={regla.mult}
                        onChange={(e) => onChange(reglaKey, { ...regla, mult: parseInt(e.target.value) || 1 })}
                        disabled={!formData[key]}
                        className="w-14 border border-gray-300 rounded-md p-1.5 text-sm text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                </div>
            </div>
            <div className="hidden sm:block sm:col-span-2">
                <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-sm">×</span>
                    <input
                        type="number" min="1" max="10"
                        value={regla.mult}
                        onChange={(e) => onChange(reglaKey, { ...regla, mult: parseInt(e.target.value) || 1 })}
                        disabled={!formData[key]}
                        className="w-full border border-gray-300 rounded-md p-1.5 text-sm text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── OverrideRow ──────────────────────────────────────────────────────────────
function OverrideRow({ row, index, perfiles, optionValues, onChange, onRemove }) {
    const { optionKey, fields } = row;

    const updateField = (fieldKey, value) => {
        onChange(index, { ...row, fields: { ...fields, [fieldKey]: value } });
    };

    const removeField = (fieldKey) => {
        const newFields = { ...fields };
        delete newFields[fieldKey];
        onChange(index, { ...row, fields: newFields });
    };

    const addField = (fieldKey) => {
        if (fieldKey in fields) return;
        const fieldDef = OVERRIDE_FIELDS.find(f => f.key === fieldKey);
        let defaultVal = "";
        if (fieldDef?.type === "regla") defaultVal = "SUMAR ANCHO Y ALTO *2";
        if (fieldDef?.type === "number") defaultVal = 1;
        onChange(index, { ...row, fields: { ...fields, [fieldKey]: defaultVal } });
    };

    const availableToAdd = OVERRIDE_FIELDS.filter(f => !(f.key in fields));

    return (
        <div className="border border-orange-200 rounded-lg bg-orange-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <label className="text-xs font-semibold text-orange-700 uppercase tracking-wide block mb-1">
                        Cuando el usuario elige:
                    </label>
                    {optionValues.length > 0 ? (
                        <select
                            value={optionKey}
                            onChange={(e) => onChange(index, { ...row, optionKey: e.target.value })}
                            className="w-full border border-orange-300 rounded-md p-1.5 text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none font-mono"
                        >
                            <option value="">— Selecciona opción —</option>
                            {optionValues.map(ov => (
                                <option key={ov.key} value={ov.key}>{ov.label} ({ov.key})</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={optionKey}
                            onChange={(e) => onChange(index, { ...row, optionKey: e.target.value })}
                            placeholder="ej: afuera, adentro, 1, 2..."
                            className="w-full border border-orange-300 rounded-md p-1.5 text-sm font-mono bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                        />
                    )}
                </div>
                <button
                    onClick={() => onRemove(index)}
                    className="mt-5 text-red-400 hover:text-red-600 transition p-1 rounded flex-shrink-0"
                    title="Eliminar este override"
                >
                    <FaTrash size={12} />
                </button>
            </div>

            {Object.entries(fields).map(([fieldKey, fieldVal]) => {
                const fieldDef = OVERRIDE_FIELDS.find(f => f.key === fieldKey);
                if (!fieldDef) return null;
                return (
                    <div key={fieldKey} className="flex items-center gap-2 bg-white rounded-md px-2 py-1.5 border border-orange-100">
                        <span className="text-xs text-orange-600 font-medium w-28 sm:w-32 flex-shrink-0 truncate">
                            {fieldDef.label}:
                        </span>
                        {fieldDef.type === "perfil" && (
                            <select
                                value={fieldVal ?? ""}
                                onChange={(e) => updateField(fieldKey, e.target.value === "" ? null : Number(e.target.value))}
                                className="flex-1 border border-gray-200 rounded p-1 text-xs focus:ring-1 focus:ring-orange-400 focus:outline-none"
                            >
                                <option value="">— Sin cambio —</option>
                                {perfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                        {fieldDef.type === "regla" && (() => {
                            const parsed = parseRegla(fieldVal);
                            return (
                                <div className="flex-1 flex gap-1">
                                    <select
                                        value={parsed.formula}
                                        onChange={(e) => updateField(fieldKey, buildRegla(e.target.value, parsed.mult))}
                                        className="flex-1 border border-gray-200 rounded p-1 text-xs focus:ring-1 focus:ring-orange-400 focus:outline-none min-w-0"
                                    >
                                        {FORMULAS.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                    <span className="text-gray-400 text-xs self-center flex-shrink-0">×</span>
                                    <input
                                        type="number" min="1" max="10"
                                        value={parsed.mult}
                                        onChange={(e) => updateField(fieldKey, buildRegla(parsed.formula, parseInt(e.target.value) || 1))}
                                        className="w-12 border border-gray-200 rounded p-1 text-xs text-center font-mono focus:ring-1 focus:ring-orange-400 focus:outline-none flex-shrink-0"
                                    />
                                </div>
                            );
                        })()}
                        {fieldDef.type === "number" && (
                            <input
                                type="number" min="0" max="10"
                                value={fieldVal ?? 0}
                                onChange={(e) => updateField(fieldKey, Number(e.target.value))}
                                className="w-20 border border-gray-200 rounded p-1 text-xs text-center font-mono focus:ring-1 focus:ring-orange-400 focus:outline-none"
                            />
                        )}
                        <button
                            onClick={() => removeField(fieldKey)}
                            className="text-gray-300 hover:text-red-400 transition flex-shrink-0"
                            title="Quitar este campo del override"
                        >
                            <FaTimes size={10} />
                        </button>
                    </div>
                );
            })}

            {availableToAdd.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                    <select
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) { addField(e.target.value); e.target.value = ""; } }}
                        className="flex-1 border border-dashed border-orange-300 rounded-md p-1.5 text-xs text-orange-600 bg-white focus:ring-1 focus:ring-orange-400 focus:outline-none"
                    >
                        <option value="">+ Agregar campo al override...</option>
                        {availableToAdd.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CatalogoPerfilesTab() {
    const [windowTypes, setWindowTypes] = useState([]);
    const [perfilesMaterials, setPerfilesMaterials] = useState([]);
    const [catalogos, setCatalogos] = useState({});
    const [optionValuesByType, setOptionValuesByType] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({});
    const [overrideRows, setOverrideRows] = useState([]);
    const [showOverrides, setShowOverrides] = useState(false);
    const [formError, setFormError] = useState("");

    // ── Carga inicial ────────────────────────────────────────────────────────
    const fetchAll = async () => {
        setLoading(true);
        setError("");
        try {
            const [typesRes, materialsRes, catalogosRes] = await Promise.all([
                api.get("/window-types"),
                api.get("/materials?type=PERFIL"),
                api.get("/catalogo-perfiles"),
            ]);

            const types = Array.isArray(typesRes.data) ? typesRes.data : [];
            setWindowTypes(types);
            setPerfilesMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : []);

            const map = {};
            (Array.isArray(catalogosRes.data) ? catalogosRes.data : []).forEach(c => {
                map[c.window_type_id] = c;
            });
            setCatalogos(map);

            try {
                const optRes = await api.get("/window-type-options");
                const optMap = {};
                (Array.isArray(optRes.data) ? optRes.data : []).forEach(wto => {
                    if (!optMap[wto.window_type_id]) optMap[wto.window_type_id] = [];
                    if (wto.group?.values) {
                        wto.group.values.forEach(v => {
                            optMap[wto.window_type_id].push({ key: v.key, label: v.label });
                        });
                    }
                });
                setOptionValuesByType(optMap);
            } catch {
                setOptionValuesByType({});
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            setError("No se pudieron cargar los datos. Verifica que el servidor esté activo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Abrir modal ──────────────────────────────────────────────────────────
    const openModal = (windowType) => {
        setEditingType(windowType);
        const existing = catalogos[windowType.id] ?? null;
        setFormData(catalogToForm(existing, windowType.id));
        setOverrideRows(ruleOverridesToRows(existing?.ruleOverrides ?? null));
        setShowOverrides(false);
        setFormError("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingType(null);
        setFormData({});
        setOverrideRows([]);
        setFormError("");
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addOverrideRow = () => {
        setOverrideRows(prev => [...prev, { optionKey: "", fields: {} }]);
        setShowOverrides(true);
    };

    const updateOverrideRow = (index, newRow) => {
        setOverrideRows(prev => prev.map((r, i) => i === index ? newRow : r));
    };

    const removeOverrideRow = (index) => {
        setOverrideRows(prev => prev.filter((_, i) => i !== index));
    };

    // ── Guardar ──────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setFormError("");
        setSaving(true);

        const payload = {
            window_type_id: formData.window_type_id,
            cant_vidrios: Number(formData.cant_vidrios) || 0,
            // ── Refuerzos ──────────────────────────────────────────────────
            refuerzo_hoja_id: formData.refuerzo_hoja_id !== "" && formData.refuerzo_hoja_id != null ? Number(formData.refuerzo_hoja_id) : null,
            refuerzo_mosquitero_id: formData.refuerzo_mosquitero_id !== "" && formData.refuerzo_mosquitero_id != null ? Number(formData.refuerzo_mosquitero_id) : null,
        };

        SLOTS.forEach(({ key, reglaKey }) => {
            const matId = formData[key];
            payload[key] = matId !== "" && matId != null ? Number(matId) : null;
            const regla = formData[reglaKey];
            payload[reglaKey] = matId && regla?.formula ? buildRegla(regla.formula, regla.mult) : null;
        });

        payload.ruleOverrides = rowsToRuleOverrides(overrideRows);

        try {
            const existing = catalogos[formData.window_type_id];
            if (existing) {
                await api.patch(`/catalogo-perfiles/${existing.id}`, payload);
            } else {
                await api.post("/catalogo-perfiles", payload);
            }
            closeModal();
            fetchAll();
        } catch (err) {
            const msg = err?.response?.data?.message || "Error al guardar el catálogo.";
            setFormError(Array.isArray(msg) ? msg.join(", ") : msg);
            console.error("Error guardando catálogo:", err);
        } finally {
            setSaving(false);
        }
    };

    const getPerfilName = (id) =>
        perfilesMaterials.find(p => p.id === id)?.name ?? "—";

    const tieneConfig = (wid) => !!catalogos[wid];
    const tieneOverrides = (wid) => {
        const cat = catalogos[wid];
        return cat?.ruleOverrides && Object.keys(cat.ruleOverrides).length > 0;
    };
    const tieneRefuerzo = (wid) => {
        const cat = catalogos[wid];
        return (cat?.refuerzo_hoja_id ?? cat?.refuerzoHoja?.id) ||
            (cat?.refuerzo_mosquitero_id ?? cat?.refuerzoMosquitero?.id);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

            <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Catálogo de Perfiles</h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                    Configura qué perfiles usa cada tipo de ventana, sus fórmulas de cálculo, overrides y refuerzos de metal.
                </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Usa medidas de hoja</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Usa medidas originales</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Tiene overrides</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Tiene refuerzo configurado</span>
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
                <>
                    {/* Tabla desktop */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="py-3 px-4 text-left">Tipo de Ventana</th>
                                    <th className="py-3 px-4 text-left">Marco</th>
                                    <th className="py-3 px-4 text-left">Hoja</th>
                                    <th className="py-3 px-4 text-left">Mosquitero</th>
                                    <th className="py-3 px-4 text-left">Refuerzo</th>
                                    <th className="py-3 px-4 text-center">Vidrios</th>
                                    <th className="py-3 px-4 text-center">Estado</th>
                                    <th className="py-3 px-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {windowTypes.map(wt => {
                                    const cat = catalogos[wt.id];
                                    const configurado = tieneConfig(wt.id);
                                    const conOverrides = tieneOverrides(wt.id);
                                    const conRefuerzo = tieneRefuerzo(wt.id);
                                    return (
                                        <tr key={wt.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-2.5 px-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-gray-900">{wt.name}</span>
                                                    {conOverrides && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-600 font-medium">overrides</span>
                                                    )}
                                                    {conRefuerzo && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-600 font-medium">refuerzo</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4 text-gray-500 text-xs">{cat ? getPerfilName(cat.perfil_marco_id) : "—"}</td>
                                            <td className="py-2.5 px-4 text-gray-500 text-xs">{cat ? getPerfilName(cat.perfil_hoja_id) : "—"}</td>
                                            <td className="py-2.5 px-4 text-gray-500 text-xs">{cat ? getPerfilName(cat.perfil_mosquitero_id) : "—"}</td>
                                            <td className="py-2.5 px-4 text-xs">
                                                {(() => {
                                                    const refHojaId = cat?.refuerzo_hoja_id ?? cat?.refuerzoHoja?.id;
                                                    const refMosqId = cat?.refuerzo_mosquitero_id ?? cat?.refuerzoMosquitero?.id;
                                                    const nombres = [
                                                        refHojaId ? getPerfilName(refHojaId) : null,
                                                        refMosqId ? getPerfilName(refMosqId) : null,
                                                    ].filter(Boolean);
                                                    return nombres.length > 0
                                                        ? <span className="text-purple-600 font-medium">{nombres.join(", ")}</span>
                                                        : "—";
                                                })()}
                                            </td>
                                            <td className="py-2.5 px-4 text-center text-gray-500">{cat?.cant_vidrios ?? "—"}</td>
                                            <td className="py-2.5 px-4 text-center">
                                                {configurado ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">✓ Configurado</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">⚠ Sin configurar</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <button
                                                    onClick={() => openModal(wt)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                                >
                                                    <FaEdit size={11} />
                                                    {configurado ? "Editar" : "Configurar"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Cards móvil */}
                    <div className="md:hidden border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                        {windowTypes.map(wt => {
                            const cat = catalogos[wt.id];
                            const configurado = tieneConfig(wt.id);
                            const conOverrides = tieneOverrides(wt.id);
                            const conRefuerzo = tieneRefuerzo(wt.id);
                            return (
                                <div key={wt.id} className="p-3">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-sm text-gray-900">{wt.name}</p>
                                                {conOverrides && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full bg-orange-100 text-orange-600 font-medium">overrides</span>}
                                                {conRefuerzo && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-600 font-medium">refuerzo</span>}
                                            </div>
                                            <div className="mt-1">
                                                {configurado ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">✓ Configurado</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">⚠ Sin configurar</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openModal(wt)}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md active:bg-blue-100"
                                        >
                                            <FaEdit size={11} />
                                            {configurado ? "Editar" : "Configurar"}
                                        </button>
                                    </div>
                                    {cat && (
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                            <div><span className="text-gray-400">Marco: </span><span className="text-gray-700">{getPerfilName(cat.perfil_marco_id)}</span></div>
                                            <div><span className="text-gray-400">Hoja: </span><span className="text-gray-700">{getPerfilName(cat.perfil_hoja_id)}</span></div>
                                            <div><span className="text-gray-400">Mosquitero: </span><span className="text-gray-700">{getPerfilName(cat.perfil_mosquitero_id)}</span></div>
                                            <div><span className="text-gray-400">Vidrios: </span><span className="font-mono text-gray-700">{cat.cant_vidrios ?? "—"}</span></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {!loading && (
                        <p className="mt-3 text-xs text-gray-400 text-right">
                            {Object.keys(catalogos).length} de {windowTypes.length} tipos configurados
                        </p>
                    )}
                </>
            )}

            {/* ── MODAL ── */}
            {showModal && editingType && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-[95dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-hidden shadow-2xl">

                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

                        <div className="flex justify-between items-start px-5 pt-4 pb-3 sm:p-6 sm:pb-4 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                    {catalogos[editingType.id] ? "Editar" : "Configurar"} Catálogo de Perfiles
                                </h3>
                                <p className="text-sm text-blue-600 font-medium mt-0.5">{editingType.name}</p>
                            </div>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-5 py-4 sm:p-6 space-y-6">

                            {/* Sección 1: Perfiles base */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 flex-wrap">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                    Perfiles y fórmulas base
                                    <span className="text-xs text-gray-400 font-normal">— Sin override activo</span>
                                </h4>

                                <div className="hidden sm:grid grid-cols-12 gap-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    <div className="col-span-2">Perfil</div>
                                    <div className="col-span-4">Material</div>
                                    <div className="col-span-4">Fórmula</div>
                                    <div className="col-span-2 text-center">Mult.</div>
                                </div>

                                <div className="mb-4">
                                    {SLOTS.map(slot => (
                                        <PerfilSlotRow
                                            key={slot.key}
                                            slot={slot}
                                            formData={formData}
                                            perfiles={perfilesMaterials}
                                            onChange={handleChange}
                                        />
                                    ))}
                                </div>

                                {/* Cantidad de vidrios */}
                                <div className="flex items-center gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Cantidad de vidrios por ventana
                                        </label>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            0 = no lleva vidrio · Se puede sobrescribir con override
                                        </p>
                                    </div>
                                    <input
                                        type="number" min="0" max="10"
                                        value={formData.cant_vidrios ?? 0}
                                        onChange={(e) => handleChange("cant_vidrios", e.target.value)}
                                        className="w-16 sm:w-20 border border-gray-300 rounded-lg p-2 text-center text-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* ── Sección 2: Refuerzos de metal (NUEVO) ── */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                    Refuerzos de Metal
                                </h4>
                                <p className="text-xs text-gray-400 mb-3 ml-7">
                                    Si el vendedor activa "Refuerzo Hojas" o "Refuerzo Mosquitero" en el cotizador,
                                    se añade la misma cantidad de barras del material seleccionado aquí.
                                </p>

                                <div className="space-y-3">
                                    {REFUERZO_SLOTS.map(slot => (
                                        <div key={slot.key} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold text-purple-700 mb-1">{slot.label}</label>
                                                    <select
                                                        value={formData[slot.key] ?? ""}
                                                        onChange={(e) => handleChange(slot.key, e.target.value)}
                                                        className="w-full border border-purple-200 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white"
                                                    >
                                                        <option value="">— Sin refuerzo —</option>
                                                        {perfilesMaterials
                                                            .filter(p => p.name.toUpperCase().includes('REFUERZO'))
                                                            .map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    <p className="text-xs text-purple-500 mt-1">{slot.hint}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sección 3: Overrides */}
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 flex-wrap">
                                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                            Overrides por opción
                                            {overrideRows.length > 0 && (
                                                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                                    {overrideRows.length}
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-0.5 ml-7">
                                            Si el usuario elige cierta opción, estos campos reemplazan a los base.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {overrideRows.length > 0 && (
                                            <button
                                                onClick={() => setShowOverrides(v => !v)}
                                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                            >
                                                {showOverrides ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                {showOverrides ? "Ocultar" : "Ver"}
                                            </button>
                                        )}
                                        <button
                                            onClick={addOverrideRow}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition border border-orange-200"
                                        >
                                            <FaPlus size={10} /> Agregar
                                        </button>
                                    </div>
                                </div>

                                {overrideRows.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <p className="text-sm text-gray-400">Sin overrides configurados</p>
                                    </div>
                                ) : showOverrides ? (
                                    <div className="space-y-3">
                                        {overrideRows.map((row, i) => (
                                            <OverrideRow
                                                key={i}
                                                row={row}
                                                index={i}
                                                perfiles={perfilesMaterials}
                                                optionValues={optionValuesByType[editingType?.id] ?? []}
                                                onChange={updateOverrideRow}
                                                onRemove={removeOverrideRow}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        className="p-3 bg-orange-50 rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-100 transition"
                                        onClick={() => setShowOverrides(true)}
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {overrideRows.map((row, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-mono">
                                                    {row.optionKey || "—"}
                                                    <span className="text-orange-500">→</span>
                                                    {Object.keys(row.fields).join(", ") || "sin campos"}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-orange-500 mt-1">Clic para editar</p>
                                    </div>
                                )}
                            </div>

                            {/* Vista previa reglas base */}
                            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                                    Vista previa de reglas base
                                </p>
                                <div className="space-y-1">
                                    {SLOTS.map(({ key, reglaKey, label }) => {
                                        const matId = formData[key];
                                        const regla = formData[reglaKey];
                                        const texto = matId && regla?.formula ? buildRegla(regla.formula, regla.mult) : null;
                                        return (
                                            <div key={key} className="flex items-center gap-2 text-xs flex-wrap">
                                                <span className="text-blue-500 w-20 sm:w-24 font-medium flex-shrink-0">{label}:</span>
                                                {texto
                                                    ? <code className="font-mono text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] sm:text-xs">{texto}</code>
                                                    : <span className="text-gray-400 italic">sin perfil</span>
                                                }
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <FaExclamationTriangle /> {formError}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-5 py-4 sm:p-6 sm:pt-4 border-t border-gray-100 flex-shrink-0">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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
                                    <><FaSave size={13} /> Guardar Catálogo</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}