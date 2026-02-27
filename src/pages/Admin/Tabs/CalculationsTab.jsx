// RUTA: src/pages/Admin/Tabs/CalculationsTab.jsx

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { FaEdit, FaSave, FaTimes, FaPlus, FaTrashAlt, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

// ─── Constantes ────────────────────────────────────────────────────────────────

// CORRECCIÓN: valores exactos que usa el cost-calculator.service.ts
const HOJA_DIVISION_OPTIONS = [
    { value: 'Completo', label: 'Completo — ancho + margen' },
    { value: 'Mitad', label: 'Mitad — (ancho + margen) / 2' },
    { value: 'Tercios', label: 'Tercios — (ancho + margen) / 3' },
    { value: 'Cuartos', label: 'Cuartos — (ancho + margen) / 4' },
];

const EMPTY_BASE = {
    hojaDivision: 'Completo',
    hojaMargen: 0,
    hojaDescuento: 0,
    vidrioDescuento: 0,
};

// Un override vacío listo para agregar
const EMPTY_OVERRIDE = {
    key: '',   // la option_key que lo activa, ej: "chapa_ambas_hojas"
    hojaDivision: '',   // vacío = no sobreescribe
    hojaMargen: '',
    hojaDescuento: '',
};

// Convierte el JSON de calculationOverrides a array editable
const overridesToArray = (json) => {
    if (!json || typeof json !== 'object') return [];
    return Object.entries(json).map(([key, val]) => ({
        key,
        hojaDivision: val.hojaDivision ?? '',
        hojaMargen: val.hojaMargen ?? '',
        hojaDescuento: val.hojaDescuento ?? '',
    }));
};

// Convierte el array editable de vuelta a JSON
const arrayToOverrides = (arr) => {
    const result = {};
    arr.forEach(({ key, hojaDivision, hojaMargen, hojaDescuento }) => {
        if (!key.trim()) return;
        const entry = {};
        if (hojaDivision) entry.hojaDivision = hojaDivision;
        if (hojaMargen !== '') entry.hojaMargen = Number(hojaMargen);
        if (hojaDescuento !== '') entry.hojaDescuento = Number(hojaDescuento);
        if (Object.keys(entry).length) result[key.trim()] = entry;
    });
    return Object.keys(result).length ? result : null;
};

// ─── Subcomponente: editor de un override ─────────────────────────────────────
function OverrideRow({ override, index, onChange, onRemove, existingKeys }) {
    return (
        <div className="flex gap-2 items-start p-3 bg-blue-50 rounded-lg border border-blue-100">
            {/* Key */}
            <div className="flex-1 min-w-0">
                <label className="block text-xs text-blue-600 font-medium mb-1">option_key</label>
                {existingKeys.length > 0 ? (
                    <select
                        value={override.key}
                        onChange={(e) => onChange(index, 'key', e.target.value)}
                        className="w-full border border-blue-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    >
                        <option value="">— Seleccionar —</option>
                        {existingKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                        <option value="__custom__">✏ Escribir nuevo...</option>
                    </select>
                ) : (
                    <input
                        type="text"
                        placeholder="ej: chapa_ambas_hojas"
                        value={override.key}
                        onChange={(e) => onChange(index, 'key', e.target.value)}
                        className="w-full border border-blue-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                )}
                {override.key === '__custom__' && (
                    <input
                        type="text"
                        placeholder="Escribe el valor exacto..."
                        className="w-full mt-1 border border-blue-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                        onChange={(e) => onChange(index, 'key', e.target.value)}
                    />
                )}
            </div>

            {/* hojaDivision override */}
            <div className="w-28">
                <label className="block text-xs text-blue-600 font-medium mb-1">División</label>
                <select
                    value={override.hojaDivision}
                    onChange={(e) => onChange(index, 'hojaDivision', e.target.value)}
                    className="w-full border border-blue-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                >
                    <option value="">Sin cambio</option>
                    {HOJA_DIVISION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.value}</option>
                    ))}
                </select>
            </div>

            {/* hojaMargen override */}
            <div className="w-20">
                <label className="block text-xs text-blue-600 font-medium mb-1">Margen</label>
                <input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={override.hojaMargen}
                    onChange={(e) => onChange(index, 'hojaMargen', e.target.value)}
                    className="w-full border border-blue-200 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
                />
            </div>

            {/* hojaDescuento override */}
            <div className="w-20">
                <label className="block text-xs text-blue-600 font-medium mb-1">Desc. Alto</label>
                <input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={override.hojaDescuento}
                    onChange={(e) => onChange(index, 'hojaDescuento', e.target.value)}
                    className="w-full border border-blue-200 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
                />
            </div>

            {/* Eliminar */}
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="mt-5 text-red-400 hover:text-red-600 transition flex-shrink-0"
                title="Eliminar override"
            >
                <FaTrashAlt size={13} />
            </button>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function CalculationsTab() {
    const [windowTypes, setWindowTypes] = useState([]);
    const [calculations, setCalculations] = useState({});  // { [window_type_id]: calculation }
    const [optionKeys, setOptionKeys] = useState([]);  // keys únicas de AccessoryRules para los overrides
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [baseValues, setBaseValues] = useState({ ...EMPTY_BASE });
    const [overrides, setOverrides] = useState([]);
    const [formError, setFormError] = useState('');

    // ── Carga inicial ────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [calcsRes, groupsRes] = await Promise.all([
                api.get('/window-calculations'),
                api.get('/option-groups'),
            ]);

            const data = Array.isArray(calcsRes.data) ? calcsRes.data : [];
            setWindowTypes(data);

            const map = {};
            data.forEach((wt) => {
                if (wt.calculation) {
                    map[wt.id] = wt.calculation;
                }
            });
            setCalculations(map);

            // Extraer keys desde option_values — fuente única de verdad
            const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
            const keys = groups
                .flatMap(g => g.values.map(v => v.key))
                .sort();
            setOptionKeys([...new Set(keys)]);

        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('No se pudieron cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ── Abrir modal ──────────────────────────────────────────────────────────
    const openModal = (windowType) => {
        setEditingType(windowType);
        const calc = calculations[windowType.id];
        setBaseValues({
            hojaDivision: calc?.hojaDivision ?? 'Completo',
            hojaMargen: calc?.hojaMargen ?? 0,
            hojaDescuento: calc?.hojaDescuento ?? 0,
            vidrioDescuento: calc?.vidrioDescuento ?? 0,
        });
        setOverrides(overridesToArray(calc?.calculationOverrides));
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingType(null);
        setBaseValues({ ...EMPTY_BASE });
        setOverrides([]);
        setFormError('');
    };

    // ── Manejo de overrides ──────────────────────────────────────────────────
    const addOverride = () => setOverrides((prev) => [...prev, { ...EMPTY_OVERRIDE }]);

    const updateOverride = (index, field, value) => {
        setOverrides((prev) => prev.map((o, i) => i === index ? { ...o, [field]: value } : o));
    };

    const removeOverride = (index) => {
        setOverrides((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Guardar ──────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setFormError('');

        // Validar overrides: no puede haber dos con la misma key
        const keys = overrides.map((o) => o.key.trim()).filter(Boolean);
        if (new Set(keys).size !== keys.length) {
            setFormError('Hay dos overrides con la misma clave. Cada clave debe ser única.');
            return;
        }

        const payload = {
            window_type_id: editingType.id,
            hojaDivision: baseValues.hojaDivision,
            hojaMargen: Number(baseValues.hojaMargen),
            hojaDescuento: Number(baseValues.hojaDescuento),
            vidrioDescuento: Number(baseValues.vidrioDescuento),
            calculationOverrides: arrayToOverrides(overrides),
        };

        setSaving(true);
        try {
            // Siempre POST — el backend hace upsert (crea o actualiza según window_type_id)
            await api.post('/window-calculations', payload);
            closeModal();
            fetchData();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error al guardar.';
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
            console.error('Error guardando cálculo:', err);
        } finally {
            setSaving(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const tieneCalc = (id) => !!calculations[id];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">

            {/* Encabezado */}
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Ajustes de Cálculo</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                    Define cómo se calculan las medidas de hoja y vidrio para cada tipo de ventana, incluyendo overrides por opción.
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
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="py-3 px-4 text-left">Tipo de Ventana</th>
                                    <th className="py-3 px-4 text-left">División Hoja</th>
                                    <th className="py-3 px-4 text-right">Margen (cm)</th>
                                    <th className="py-3 px-4 text-right">Desc. Alto (cm)</th>
                                    <th className="py-3 px-4 text-right">Desc. Vidrio (cm)</th>
                                    <th className="py-3 px-4 text-center">Overrides</th>
                                    <th className="py-3 px-4 text-center">Estado</th>
                                    <th className="py-3 px-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {windowTypes.map((wt) => {
                                    const calc = calculations[wt.id];
                                    const overrideCount = calc?.calculationOverrides
                                        ? Object.keys(calc.calculationOverrides).length
                                        : 0;
                                    return (
                                        <tr key={wt.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-2.5 px-4 font-medium text-gray-900">{wt.name}</td>
                                            <td className="py-2.5 px-4">
                                                {calc ? (
                                                    <span className="font-medium text-blue-700">{calc.hojaDivision}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-gray-600">
                                                {calc ? calc.hojaMargen : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-gray-600">
                                                {calc ? calc.hojaDescuento : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-gray-600">
                                                {calc ? calc.vidrioDescuento : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                {overrideCount > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                                                        {overrideCount} override{overrideCount > 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                {tieneCalc(wt.id) ? (
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
                                                    {tieneCalc(wt.id) ? 'Editar' : 'Configurar'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-xs text-gray-400 text-right">
                        {Object.keys(calculations).length} de {windowTypes.length} tipos configurados
                    </p>
                </>
            )}

            {/* ── MODAL ── */}
            {showModal && editingType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">

                        {/* Header */}
                        <div className="flex justify-between items-start p-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {calculations[editingType.id] ? 'Editar' : 'Configurar'} Cálculo
                                </h3>
                                <p className="text-sm text-blue-600 font-medium mt-0.5">{editingType.name}</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-6">

                            {/* ── Valores base ── */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Valores base</h4>
                                <div className="grid grid-cols-2 gap-4">

                                    {/* hojaDivision */}
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            División de Hoja
                                        </label>
                                        <select
                                            value={baseValues.hojaDivision}
                                            onChange={(e) => setBaseValues((p) => ({ ...p, hojaDivision: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            {HOJA_DIVISION_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* hojaMargen */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Margen de Ancho (cm)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseValues.hojaMargen}
                                            onChange={(e) => setBaseValues((p) => ({ ...p, hojaMargen: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* hojaDescuento */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Descuento de Alto (cm)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseValues.hojaDescuento}
                                            onChange={(e) => setBaseValues((p) => ({ ...p, hojaDescuento: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* vidrioDescuento */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Descuento de Vidrio (cm)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseValues.vidrioDescuento}
                                            onChange={(e) => setBaseValues((p) => ({ ...p, vidrioDescuento: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Overrides ── */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-gray-700">
                                            Overrides por opción
                                        </h4>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <FaInfoCircle size={11} />
                                            Sobreescriben los valores base según la opción elegida en el cotizador
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addOverride}
                                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                                    >
                                        <FaPlus size={10} /> Agregar override
                                    </button>
                                </div>

                                {overrides.length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                                        Sin overrides — los valores base aplican para todas las opciones.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {overrides.map((ov, i) => (
                                            <OverrideRow
                                                key={i}
                                                override={ov}
                                                index={i}
                                                onChange={updateOverride}
                                                onRemove={removeOverride}
                                                existingKeys={optionKeys}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Error */}
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <FaExclamationTriangle size={13} /> {formError}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
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
                                    <><FaSave size={13} /> Guardar Cálculo</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}