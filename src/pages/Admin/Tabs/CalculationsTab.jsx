// RUTA: src/pages/Admin/Tabs/CalculationsTab.jsx

import { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { FaEdit, FaSave, FaTimes, FaPlus, FaTrashAlt, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

// ─── Constantes ────────────────────────────────────────────────────────────────
// Lenguaje simple: "¿en cuántas hojas iguales se reparte el ancho?"
const HOJA_DIVISION_OPTIONS = [
    { value: 'Completo', label: '1 hoja (no se divide)' },
    { value: 'Mitad', label: '2 hojas iguales' },
    { value: 'Tercios', label: '3 hojas iguales' },
    { value: 'Cuartos', label: '4 hojas iguales' },
];
const DIVISOR_BY_VALUE = { Completo: 1, Mitad: 2, Tercios: 3, Cuartos: 4 };

const EMPTY_BASE = {
    hojaDivision: 'Completo',
    hojaMargen: 0,
    hojaDescuento: 0,
    vidrioDescuento: 0,
};

const EMPTY_OVERRIDE = {
    key: '',
    hojaDivision: '',
    hojaMargen: '',
    hojaDescuento: '',
    vidrioDescuento: '',
};

const SIN_SERIE = '__sin_serie__';

const overridesToArray = (json) => {
    if (!json || typeof json !== 'object') return [];
    return Object.entries(json).map(([key, val]) => ({
        key,
        hojaDivision: val.hojaDivision ?? '',
        hojaMargen: val.hojaMargen ?? '',
        hojaDescuento: val.hojaDescuento ?? '',
        vidrioDescuento: val.vidrioDescuento ?? '',
    }));
};

const arrayToOverrides = (arr) => {
    const result = {};
    arr.forEach(({ key, hojaDivision, hojaMargen, hojaDescuento, vidrioDescuento }) => {
        if (!key.trim()) return;
        const entry = {};
        if (hojaDivision) entry.hojaDivision = hojaDivision;
        if (hojaMargen !== '') entry.hojaMargen = Number(hojaMargen);
        if (hojaDescuento !== '') entry.hojaDescuento = Number(hojaDescuento);
        if (vidrioDescuento !== '') entry.vidrioDescuento = Number(vidrioDescuento);
        if (Object.keys(entry).length) result[key.trim()] = entry;
    });
    return Object.keys(result).length ? result : null;
};

// ── Misma fórmula que usa el backend (calcularMedidasHoja) — para la vista previa ──
function calcularEjemplo(anchoCm, altoCm, hojaDivision, hojaMargen, hojaDescuento, vidrioDescuento) {
    const divisor = DIVISOR_BY_VALUE[hojaDivision] ?? 1;
    const hojaAncho = (Number(anchoCm) + Number(hojaMargen || 0)) / divisor;
    const hojaAlto = Number(altoCm) - Number(hojaDescuento || 0);
    const vidrioAncho = hojaAncho - Number(vidrioDescuento || 0);
    const vidrioAlto = hojaAlto - Number(vidrioDescuento || 0);
    return { hojaAncho, hojaAlto, vidrioAncho, vidrioAlto };
}

const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0);

// ─── OverrideRow — stack vertical en móvil, fila en sm+ ──────────────────────
function OverrideRow({ override, index, onChange, onRemove, existingKeys }) {
    return (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
            {/* Fila superior: key + botón eliminar */}
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <label className="block text-xs text-blue-600 font-medium mb-1">Cuando el vendedor elige esta opción...</label>
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
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="mt-5 text-red-400 hover:text-red-600 transition flex-shrink-0 p-1"
                    title="Eliminar excepción"
                >
                    <FaTrashAlt size={13} />
                </button>
            </div>

            {/* Campos numéricos — grid 2×2 en móvil, fila en sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                    <label className="block text-xs text-blue-600 font-medium mb-1">Hojas</label>
                    <select
                        value={override.hojaDivision}
                        onChange={(e) => onChange(index, 'hojaDivision', e.target.value)}
                        className="w-full border border-blue-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    >
                        <option value="">Sin cambio</option>
                        {HOJA_DIVISION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-blue-600 font-medium mb-1">Ajuste Ancho</label>
                    <input
                        type="number" step="0.1" placeholder="—"
                        value={override.hojaMargen}
                        onChange={(e) => onChange(index, 'hojaMargen', e.target.value)}
                        className="w-full border border-blue-200 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-blue-600 font-medium mb-1">Desc. Alto</label>
                    <input
                        type="number" step="0.1" placeholder="—"
                        value={override.hojaDescuento}
                        onChange={(e) => onChange(index, 'hojaDescuento', e.target.value)}
                        className="w-full border border-blue-200 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-blue-600 font-medium mb-1">Desc. Vidrio</label>
                    <input
                        type="number" step="0.1" placeholder="—"
                        value={override.vidrioDescuento}
                        onChange={(e) => onChange(index, 'vidrioDescuento', e.target.value)}
                        className="w-full border border-blue-200 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function CalculationsTab() {
    const [windowTypes, setWindowTypes] = useState([]);
    const [calculations, setCalculations] = useState({});
    const [optionKeys, setOptionKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [activeSeries, setActiveSeries] = useState('todas');

    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [baseValues, setBaseValues] = useState({ ...EMPTY_BASE });
    const [overrides, setOverrides] = useState([]);
    const [formError, setFormError] = useState('');
    const [ejemploAncho, setEjemploAncho] = useState(100);
    const [ejemploAlto, setEjemploAlto] = useState(200);

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

            const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
            const keys = groups.flatMap(g => g.values.map(v => v.key)).sort();
            setOptionKeys([...new Set(keys)]);

        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('No se pudieron cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ── Agrupar por serie ────────────────────────────────────────────────────
    const seriesList = useMemo(() => {
        const map = new Map();
        windowTypes.forEach((wt) => {
            const key = wt.series?.name ?? SIN_SERIE;
            const label = wt.series?.displayName || wt.series?.name || 'Sin serie asignada';
            const sort = wt.series?.sort_order ?? 999;
            if (!map.has(key)) map.set(key, { key, label, sort, count: 0, missing: 0 });
            const entry = map.get(key);
            entry.count += 1;
            if (!calculations[wt.id]) entry.missing += 1;
        });
        return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
    }, [windowTypes, calculations]);

    const totalMissing = useMemo(
        () => windowTypes.filter((wt) => !calculations[wt.id]).length,
        [windowTypes, calculations],
    );

    const filteredTypes = useMemo(() => {
        if (activeSeries === 'todas') return windowTypes;
        return windowTypes.filter((wt) => (wt.series?.name ?? SIN_SERIE) === activeSeries);
    }, [windowTypes, activeSeries]);

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
        setEjemploAncho(100);
        setEjemploAlto(200);
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

        const keys = overrides.map((o) => o.key.trim()).filter(Boolean);
        if (new Set(keys).size !== keys.length) {
            setFormError('Hay dos excepciones con la misma opción. Cada una debe ser única.');
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

    const tieneCalc = (id) => !!calculations[id];

    const ejemplo = calcularEjemplo(
        ejemploAncho, ejemploAlto,
        baseValues.hojaDivision, baseValues.hojaMargen, baseValues.hojaDescuento, baseValues.vidrioDescuento,
    );
    const ejemploInvalido = ejemplo.hojaAncho <= 0 || ejemplo.hojaAlto <= 0 || ejemplo.vidrioAncho <= 0 || ejemplo.vidrioAlto <= 0;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">

            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Ajustes de Cálculo</h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                    Aquí defines cuánto se le resta a cada ventana para calcular la medida real de la hoja y el vidrio.
                    Al guardar un cambio aquí, se aplica <strong>automáticamente</strong> en todas las cotizaciones,
                    reportes de material y cortes de vidrio — no hay que hacer nada más.
                </p>
            </div>

            {/* Aviso de tipos sin configurar */}
            {!loading && totalMissing > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm flex items-center gap-2">
                    <FaExclamationTriangle className="flex-shrink-0" />
                    Hay <strong>{totalMissing}</strong> tipo{totalMissing !== 1 ? 's' : ''} de ventana sin configurar —
                    esos van a cortarse sin ningún descuento. Búscalos abajo (marcados en amarillo) y configúralos.
                </div>
            )}

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
                    {/* ── Filtro por serie ── */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setActiveSeries('todas')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeSeries === 'todas' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            Todas ({windowTypes.length})
                        </button>
                        {seriesList.map((s) => (
                            <button
                                key={s.key}
                                onClick={() => setActiveSeries(s.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${activeSeries === s.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {s.label} ({s.count})
                                {s.missing > 0 && (
                                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${activeSeries === s.key ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'}`}>
                                        {s.missing}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ── Tabla desktop (md+) ── */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="py-3 px-4 text-left">Tipo de Ventana</th>
                                    <th className="py-3 px-4 text-left">Hojas</th>
                                    <th className="py-3 px-4 text-right">Ajuste Ancho (cm)</th>
                                    <th className="py-3 px-4 text-right">Desc. Alto (cm)</th>
                                    <th className="py-3 px-4 text-right">Desc. Vidrio (cm)</th>
                                    <th className="py-3 px-4 text-center">Excepciones</th>
                                    <th className="py-3 px-4 text-center">Estado</th>
                                    <th className="py-3 px-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTypes.map((wt) => {
                                    const calc = calculations[wt.id];
                                    const overrideCount = calc?.calculationOverrides
                                        ? Object.keys(calc.calculationOverrides).length
                                        : 0;
                                    const divisionLabel = calc
                                        ? (HOJA_DIVISION_OPTIONS.find((o) => o.value === calc.hojaDivision)?.label ?? calc.hojaDivision)
                                        : null;
                                    return (
                                        <tr key={wt.id} className={`hover:bg-gray-50 transition-colors ${!calc ? 'bg-amber-50/50' : ''}`}>
                                            <td className="py-2.5 px-4 font-medium text-gray-900">{wt.name}</td>
                                            <td className="py-2.5 px-4">
                                                {calc ? (
                                                    <span className="font-medium text-blue-700">{divisionLabel}</span>
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
                                                        {overrideCount}
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

                    {/* ── Cards móvil (< md) ── */}
                    <div className="md:hidden border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                        {filteredTypes.map((wt) => {
                            const calc = calculations[wt.id];
                            const overrideCount = calc?.calculationOverrides
                                ? Object.keys(calc.calculationOverrides).length
                                : 0;
                            const divisionLabel = calc
                                ? (HOJA_DIVISION_OPTIONS.find((o) => o.value === calc.hojaDivision)?.label ?? calc.hojaDivision)
                                : null;
                            return (
                                <div key={wt.id} className={`p-3 ${!calc ? 'bg-amber-50/50' : ''}`}>
                                    {/* Fila 1: nombre + botón */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-gray-900 truncate">{wt.name}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {tieneCalc(wt.id) ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">
                                                        ✓ Configurado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                                                        ⚠ Sin configurar
                                                    </span>
                                                )}
                                                {overrideCount > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 text-purple-700">
                                                        {overrideCount} excepción{overrideCount > 1 ? 'es' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openModal(wt)}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md active:bg-blue-100"
                                        >
                                            <FaEdit size={11} />
                                            {tieneCalc(wt.id) ? 'Editar' : 'Configurar'}
                                        </button>
                                    </div>
                                    {/* Fila 2: valores en grid 2×2 */}
                                    {calc && (
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                            <div>
                                                <span className="text-gray-400">Hojas: </span>
                                                <span className="font-medium text-blue-700">{divisionLabel}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Ajuste ancho: </span>
                                                <span className="font-mono text-gray-700">{calc.hojaMargen} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Desc. Alto: </span>
                                                <span className="font-mono text-gray-700">{calc.hojaDescuento} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Desc. Vidrio: </span>
                                                <span className="font-mono text-gray-700">{calc.vidrioDescuento} cm</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <p className="mt-3 text-xs text-gray-400 text-right">
                        {Object.keys(calculations).length} de {windowTypes.length} tipos configurados
                    </p>
                </>
            )}

            {/* ── MODAL — bottom sheet móvil / centrado sm+ ── */}
            {showModal && editingType && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-[95dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-hidden shadow-2xl">

                        {/* Drag handle móvil */}
                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

                        {/* Header */}
                        <div className="flex justify-between items-start px-5 pt-4 pb-3 sm:p-6 sm:pb-4 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                    {calculations[editingType.id] ? 'Editar' : 'Configurar'} Descuentos
                                </h3>
                                <p className="text-sm text-blue-600 font-medium mt-0.5">{editingType.name}</p>
                                {editingType.series && (
                                    <p className="text-xs text-gray-400 mt-0.5">Serie: {editingType.series.displayName || editingType.series.name}</p>
                                )}
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body scrollable */}
                        <div className="overflow-y-auto flex-1 px-5 py-4 sm:p-6 space-y-6">

                            {/* Valores base */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Descuentos de esta ventana</h4>
                                <p className="text-xs text-gray-400 mb-3">
                                    Estos números se restan de la medida exterior del marco para calcular la hoja real que se corta.
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">¿En cuántas hojas iguales se reparte el ancho?</label>
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

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Ajuste de Ancho (cm)
                                            </label>
                                            <input
                                                type="number" step="0.1"
                                                value={baseValues.hojaMargen}
                                                onChange={(e) => setBaseValues((p) => ({ ...p, hojaMargen: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Se suma al ancho antes de repartir entre las hojas. Usa negativo para restar.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Descuento de Alto (cm)
                                            </label>
                                            <input
                                                type="number" step="0.1"
                                                value={baseValues.hojaDescuento}
                                                onChange={(e) => setBaseValues((p) => ({ ...p, hojaDescuento: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Se resta directo al alto de la ventana.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Descuento de Vidrio (cm)
                                            </label>
                                            <input
                                                type="number" step="0.1"
                                                value={baseValues.vidrioDescuento}
                                                onChange={(e) => setBaseValues((p) => ({ ...p, vidrioDescuento: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Se resta al ancho y al alto de la hoja para sacar la medida del vidrio.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Vista previa en vivo ── */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                        <FaInfoCircle className="text-blue-500" size={13} />
                                        Vista previa — pruébalo con una medida
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs">
                                        <label className="flex items-center gap-1">
                                            Ancho
                                            <input
                                                type="number"
                                                value={ejemploAncho}
                                                onChange={(e) => setEjemploAncho(e.target.value)}
                                                className="w-16 border border-gray-300 rounded p-1 font-mono text-center"
                                            />
                                            cm
                                        </label>
                                        <label className="flex items-center gap-1">
                                            Alto
                                            <input
                                                type="number"
                                                value={ejemploAlto}
                                                onChange={(e) => setEjemploAlto(e.target.value)}
                                                className="w-16 border border-gray-300 rounded p-1 font-mono text-center"
                                            />
                                            cm
                                        </label>
                                    </div>
                                </div>

                                {ejemploInvalido ? (
                                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2.5">
                                        <FaExclamationTriangle size={13} className="flex-shrink-0" />
                                        Con estos números, la medida da 0 o negativa. Revisa los descuentos.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Medida de cada hoja</p>
                                            <p className="font-mono font-bold text-gray-800">{round1(ejemplo.hojaAncho)} × {round1(ejemplo.hojaAlto)} cm</p>
                                        </div>
                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Medida del vidrio</p>
                                            <p className="font-mono font-bold text-emerald-700">{round1(ejemplo.vidrioAncho)} × {round1(ejemplo.vidrioAlto)} cm</p>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                                    <FaCheckCircle className="text-emerald-500 flex-shrink-0" size={10} />
                                    Este mismo cálculo se usa automáticamente al cotizar, en el reporte de materiales y en el plan de corte.
                                </p>
                            </div>

                            {/* Overrides */}
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 flex-wrap">
                                            Excepciones por opción del cotizador
                                            <span className="text-xs text-gray-400 flex items-center gap-1 font-normal">
                                                <FaInfoCircle size={11} />
                                                Solo si esta ventana necesita otro descuento según lo que elige el vendedor
                                            </span>
                                        </h4>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addOverride}
                                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                                    >
                                        <FaPlus size={10} /> Agregar
                                    </button>
                                </div>

                                {overrides.length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                                        Sin excepciones — los descuentos de arriba aplican siempre para esta ventana.
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

                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <FaExclamationTriangle size={13} /> {formError}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-5 py-4 sm:p-6 sm:pt-4 border-t border-gray-100 flex-shrink-0">
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
