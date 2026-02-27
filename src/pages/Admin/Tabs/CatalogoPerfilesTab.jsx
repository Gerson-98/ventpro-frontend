// RUTA: src/pages/Admin/Tabs/CatalogoPerfilesTab.jsx

import { useEffect, useState, useMemo } from "react";
import { FaEdit, FaSave, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";

// ─── Constantes ──────────────────────────────────────────────────────────────

// Los 5 slots de perfiles del catálogo
const SLOTS = [
    { key: "perfil_marco_id", reglaKey: "regla_marco", label: "Marco", usaHoja: false },
    { key: "perfil_hoja_id", reglaKey: "regla_hoja", label: "Hoja", usaHoja: true },
    { key: "perfil_mosquitero_id", reglaKey: "regla_mosquitero", label: "Mosquitero", usaHoja: true },
    { key: "perfil_batiente_id", reglaKey: "regla_batiente", label: "Batiente", usaHoja: true },
    { key: "perfil_tapajamba_id", reglaKey: "regla_tapajamba", label: "Tapajamba", usaHoja: false },
];

// Fórmulas disponibles — el multiplicador se combina en el texto final
const FORMULAS = [
    { value: "SUMAR ANCHO Y ALTO", label: "Ancho + Alto  ×  N" },
    { value: "SUMAR ANCHO Y MULTIPLICAR ALTO", label: "Ancho + (Alto × N)" },
    { value: "SUMAR ALTO", label: "Solo Alto  ×  N" },
];

// Construye el texto de regla para guardar: "SUMAR ANCHO Y ALTO *2"
const buildRegla = (formula, mult) =>
    formula && mult ? `${formula} *${mult}` : "";

// Parsea el texto de regla de vuelta a { formula, mult }
const parseRegla = (regla) => {
    if (!regla) return { formula: "", mult: 2 };
    const match = regla.match(/^(.+?)\s*\*\s*(\d+)$/);
    if (!match) return { formula: regla.trim(), mult: 2 };
    return { formula: match[1].trim(), mult: parseInt(match[2], 10) };
};

// Estado inicial del formulario del modal
const buildEmptyForm = (windowTypeId) => {
    const form = { window_type_id: windowTypeId, cant_vidrios: 0 };
    SLOTS.forEach(({ key, reglaKey }) => {
        form[key] = "";   // id del material (string para el select, se convierte a Int al enviar)
        form[reglaKey] = { formula: FORMULAS[0].value, mult: 2 };
    });
    return form;
};

// Rellena el formulario con datos existentes del catálogo
const catalogToForm = (catalogo, windowTypeId) => {
    const form = { window_type_id: windowTypeId, cant_vidrios: catalogo?.cant_vidrios ?? 0 };
    SLOTS.forEach(({ key, reglaKey }) => {
        form[key] = catalogo?.[key] ?? "";
        form[reglaKey] = parseRegla(catalogo?.[reglaKey] ?? "");
    });
    return form;
};

// ─── Subcomponente: fila de slot de perfil ────────────────────────────────────
function PerfilSlotRow({ slot, formData, perfiles, onChange }) {
    const { key, reglaKey, label, usaHoja } = slot;
    const regla = formData[reglaKey] || { formula: FORMULAS[0].value, mult: 2 };

    return (
        <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-100 last:border-0">
            {/* Etiqueta */}
            <div className="col-span-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${usaHoja ? "bg-blue-400" : "bg-gray-400"}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>

            {/* Select material */}
            <div className="col-span-4">
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

            {/* Select fórmula */}
            <div className="col-span-4">
                <select
                    value={regla.formula}
                    onChange={(e) => onChange(reglaKey, { ...regla, formula: e.target.value })}
                    disabled={!formData[key]}
                    className="w-full border border-gray-300 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                >
                    {FORMULAS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
            </div>

            {/* Input multiplicador */}
            <div className="col-span-2">
                <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-sm">×</span>
                    <input
                        type="number"
                        min="1"
                        max="10"
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CatalogoPerfilesTab() {
    const [windowTypes, setWindowTypes] = useState([]);
    const [perfilesMaterials, setPerfilesMaterials] = useState([]);
    const [catalogos, setCatalogos] = useState({});   // { [window_type_id]: catalogo }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({});
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

            setWindowTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
            setPerfilesMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : []);

            // Indexar catálogos por window_type_id para acceso O(1)
            const map = {};
            (Array.isArray(catalogosRes.data) ? catalogosRes.data : []).forEach((c) => {
                map[c.window_type_id] = c;
            });
            setCatalogos(map);
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
        setFormError("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingType(null);
        setFormData({});
        setFormError("");
    };

    // ── Cambios en el form ───────────────────────────────────────────────────
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // ── Guardar ──────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setFormError("");
        setSaving(true);

        // Construir payload convirtiendo reglas a texto y IDs a Int
        const payload = {
            window_type_id: formData.window_type_id,
            cant_vidrios: Number(formData.cant_vidrios) || 0,
        };

        SLOTS.forEach(({ key, reglaKey }) => {
            const matId = formData[key];
            payload[key] = matId !== "" && matId != null ? Number(matId) : null;

            const regla = formData[reglaKey];
            if (matId && regla?.formula) {
                payload[reglaKey] = buildRegla(regla.formula, regla.mult);
            } else {
                payload[reglaKey] = null;
            }
        });

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

    // ── Helpers UI ───────────────────────────────────────────────────────────
    const getPerfilName = (id) =>
        perfilesMaterials.find((p) => p.id === id)?.name ?? "—";

    const tieneConfig = (windowTypeId) => !!catalogos[windowTypeId];

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">

            {/* Encabezado */}
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Catálogo de Perfiles</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                    Configura qué perfiles usa cada tipo de ventana y cómo se calculan sus medidas.
                </p>
            </div>

            {/* Leyenda */}
            <div className="flex gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Usa medidas de hoja</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Usa medidas originales de ventana</span>
            </div>

            {/* Error global */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <FaExclamationTriangle /> {error}
                </div>
            )}

            {/* Tabla */}
            {loading ? (
                <div className="flex justify-center items-center py-16 text-gray-400">
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Cargando...
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="py-3 px-4 text-left">Tipo de Ventana</th>
                                <th className="py-3 px-4 text-left">Marco</th>
                                <th className="py-3 px-4 text-left">Hoja</th>
                                <th className="py-3 px-4 text-left">Mosquitero</th>
                                <th className="py-3 px-4 text-left">Vidrios</th>
                                <th className="py-3 px-4 text-center">Estado</th>
                                <th className="py-3 px-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {windowTypes.map((wt) => {
                                const cat = catalogos[wt.id];
                                const configurado = tieneConfig(wt.id);
                                return (
                                    <tr key={wt.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-2.5 px-4 font-medium text-gray-900">{wt.name}</td>
                                        <td className="py-2.5 px-4 text-gray-500 text-xs">
                                            {cat ? getPerfilName(cat.perfil_marco_id) : "—"}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-500 text-xs">
                                            {cat ? getPerfilName(cat.perfil_hoja_id) : "—"}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-500 text-xs">
                                            {cat ? getPerfilName(cat.perfil_mosquitero_id) : "—"}
                                        </td>
                                        <td className="py-2.5 px-4 text-center text-gray-500">
                                            {cat?.cant_vidrios ?? "—"}
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            {configurado ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                                    ✓ Configurado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                                                    ⚠ Sin configurar
                                                </span>
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
            )}

            {/* Contador */}
            {!loading && (
                <p className="mt-3 text-xs text-gray-400 text-right">
                    {Object.keys(catalogos).length} de {windowTypes.length} tipos configurados
                </p>
            )}

            {/* ── MODAL ── */}
            {showModal && editingType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">

                        {/* Header del modal */}
                        <div className="flex justify-between items-start p-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {catalogos[editingType.id] ? "Editar" : "Configurar"} Catálogo de Perfiles
                                </h3>
                                <p className="text-sm text-blue-600 font-medium mt-0.5">{editingType.name}</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 transition w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body scrollable */}
                        <div className="overflow-y-auto flex-1 p-6">

                            {/* Cabecera de columnas */}
                            <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide px-0">
                                <div className="col-span-2">Perfil</div>
                                <div className="col-span-4">Material</div>
                                <div className="col-span-4">Fórmula de cálculo</div>
                                <div className="col-span-2 text-center">Mult.</div>
                            </div>

                            {/* Filas de slots */}
                            <div className="mb-6">
                                {SLOTS.map((slot) => (
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
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Cantidad de vidrios por ventana
                                    </label>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        0 = no lleva vidrio (ej: puerta de PVC sólido)
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={formData.cant_vidrios ?? 0}
                                    onChange={(e) => handleChange("cant_vidrios", e.target.value)}
                                    className="w-20 border border-gray-300 rounded-lg p-2 text-center text-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Resumen de reglas generadas */}
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                                    Vista previa de reglas que se guardarán
                                </p>
                                <div className="space-y-1">
                                    {SLOTS.map(({ key, reglaKey, label }) => {
                                        const matId = formData[key];
                                        const regla = formData[reglaKey];
                                        const texto = matId && regla?.formula
                                            ? buildRegla(regla.formula, regla.mult)
                                            : null;
                                        return (
                                            <div key={key} className="flex items-center gap-2 text-xs">
                                                <span className="text-blue-500 w-24 font-medium">{label}:</span>
                                                {texto
                                                    ? <code className="font-mono text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">{texto}</code>
                                                    : <span className="text-gray-400 italic">sin perfil</span>
                                                }
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Error del form */}
                            {formError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <FaExclamationTriangle /> {formError}
                                </div>
                            )}
                        </div>

                        {/* Footer del modal */}
                        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
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