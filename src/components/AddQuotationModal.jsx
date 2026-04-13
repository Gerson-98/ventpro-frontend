// RUTA: src/components/AddQuotationModal.jsx

import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { FaPlus, FaTrashAlt, FaClone, FaUpload, FaCamera } from 'react-icons/fa';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddClientModal from './AddClientModal';
import {
    buildSelectorList,
    resolveWindowTypeId,
    findGroupAndVariants,
    WINDOW_GROUPS,
} from '@/config/windowTypesConfig';

// ─── Checkboxes: grupos que se renderizan como checkbox, NO como select ───────
const CHECKBOX_GROUPS = new Set(['mosquitero', 'refuerzo_hojas', 'refuerzo_mosquitero']);

// Valor guardado cuando el checkbox está ACTIVO
const CHECKBOX_ACTIVE_VALUE = {
    mosquitero: 'con_mosquitero',
    refuerzo_hojas: 'con_refuerzo',
    refuerzo_mosquitero: 'con_refuerzo',
};

// Valor guardado cuando el checkbox está INACTIVO
// Para mosquitero: valor explícito 'sin_mosquitero' — nunca eliminar la key —
// así el backend siempre sabe el estado real sin ambigüedad.
// Para refuerzos: null = eliminar la key (OFF es ausencia de valor)
const CHECKBOX_INACTIVE_VALUE = {
    mosquitero: 'sin_mosquitero',
    refuerzo_hojas: null,
    refuerzo_mosquitero: null,
};

// Default al asignar el grupo por primera vez
const CHECKBOX_DEFAULTS = {
    mosquitero: 'con_mosquitero', // ON por defecto
    refuerzo_hojas: null,             // OFF por defecto
    refuerzo_mosquitero: null,             // OFF por defecto
};

// IDs de tipos de ventana donde mosquitero debe estar OFF por default
const MOSQUITERO_OFF_BY_DEFAULT = new Set([17]); // 17 = VENTANA PROYECTABLE

const applyCheckboxDefaults = (currentOptions, optionGroups, windowTypeId = null) => {
    const newOptions = { ...currentOptions };
    optionGroups.forEach(wto => {
        const groupKey = wto.group?.key;
        if (!groupKey || !CHECKBOX_GROUPS.has(groupKey)) return;
        if (!(groupKey in newOptions)) {
            // Para proyectable u otros tipos especiales, mosquitero OFF por default
            if (groupKey === 'mosquitero' && windowTypeId && MOSQUITERO_OFF_BY_DEFAULT.has(Number(windowTypeId))) {
                newOptions[groupKey] = 'sin_mosquitero';
            } else {
                const defaultValue = CHECKBOX_DEFAULTS[groupKey];
                if (defaultValue !== null) newOptions[groupKey] = defaultValue;
            }
        }
    });
    return newOptions;
};

// ─── Ventana vacía ────────────────────────────────────────────────────────────
const emptyWindow = () => ({
    displayName: '',
    width_m: '',
    height_m: '',
    quantity: 1,
    price_per_m2: '',
    window_type_id: '',
    color_id: '',
    glass_color_id: '',
    options: {},
    fileToUpload: null,
    design_image_url: null,
    tempId: `temp_${Date.now()}_${Math.random()}`,
    _groupId: '',
    _variantValues: {},
    _optionGroups: [],
});

function buildDisplayName(typeName, typeDisplayName, options, optionGroups) {
    // Usa el nombre comercial (displayName) como base; cae al técnico si no está configurado
    const baseName = typeDisplayName || typeName;
    if (!baseName) return '';
    const parts = [baseName];
    optionGroups.forEach(wto => {
        const groupKey = wto.group.key;
        if (CHECKBOX_GROUPS.has(groupKey)) return; // checkboxes no van en el nombre
        const chosenKey = options[groupKey];
        if (chosenKey) {
            const value = wto.group.values.find(v => v.key === chosenKey);
            if (value) parts.push(value.label);
        }
    });
    return parts.join(' ');
}

function WindowTypeSelector({ win, selectorList, onGroupChange, onVariantChange }) {
    const group = WINDOW_GROUPS.find(g => g.id === win._groupId);
    const firstSelectValue = win._groupId
        ? win._groupId
        : win.window_type_id
            ? `simple_${win.window_type_id}`
            : '';

    return (
        <div className="space-y-1.5">
            <select
                value={firstSelectValue}
                onChange={(e) => onGroupChange(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                required
            >
                <option value="">Seleccione tipo...</option>
                {selectorList.map(item => (
                    <option
                        key={item.id}
                        value={item.isGroup ? item.id : `simple_${item.windowTypeId}`}
                    >
                        {item.displayName}
                    </option>
                ))}
            </select>

            {group && group.steps.map((step) => (
                <select
                    key={step.key}
                    value={win._variantValues?.[step.key] || ''}
                    onChange={(e) => onVariantChange(step.key, e.target.value)}
                    className="w-full p-2 border border-blue-300 rounded text-sm bg-blue-50"
                    required
                >
                    <option value="">— {step.label} —</option>
                    {step.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ))}

            {win.displayName && (
                <p className="text-xs text-gray-500 truncate" title={win.displayName}>
                    {win.displayName}
                </p>
            )}
        </div>
    );
}

// ── Celda de precio con memo — evita recalcular en cada render global ─────────
function WindowTotalCell({ win, globalPricePerM2, onChange }) {
    const total = useMemo(() => {
        const w = parseFloat(win.width_m) || 0;
        const h = parseFloat(win.height_m) || 0;
        const q = parseInt(win.quantity) || 0;
        const p = parseFloat(win.price_per_m2) || parseFloat(globalPricePerM2) || 0;
        return w * h * q * p;
    }, [win.width_m, win.height_m, win.quantity, win.price_per_m2, globalPricePerM2]);

    return (
        <div className="flex flex-col gap-1">
            <input
                type="number"
                step="0.01"
                name="price_per_m2"
                value={win.price_per_m2}
                onChange={onChange}
                className="w-full p-1.5 border rounded text-center text-xs"
                placeholder={globalPricePerM2 || 'Global'}
            />
            {total > 0 && (
                <div className="text-center">
                    <span className="text-[11px] font-black text-green-700 whitespace-nowrap">
                        Q {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            )}
        </div>
    );
}

export default function AddQuotationModal({ open, onClose, onSave, quotationToEdit }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [clients, setClients] = useState([]);
    const [windowTypes, setWindowTypes] = useState([]);
    const [pvcColors, setPvcColors] = useState([]);
    const [glassColors, setGlassColors] = useState([]);
    const [realGlassTypes, setRealGlassTypes] = useState([]);
    const [selectorList, setSelectorList] = useState([]);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showExtras, setShowExtras] = useState(false);
    const [catalogsLoaded, setCatalogsLoaded] = useState(false);

    const [quotation, setQuotation] = useState({
        project: '',
        clientId: '',
        price_per_m2: '',
        include_iva: false,
        notes: '',
        reference_image_url: '',
        windows: [],
    });

    const [windowCosts, setWindowCosts] = useState({});
    const [calculatingCost, setCalculatingCost] = useState({});
    const [quotationPrecioSugerido, setQuotationPrecioSugerido] = useState(0);
    const [quotationCostoTotal, setQuotationCostoTotal] = useState(0);
    const [validationErrors, setValidationErrors] = useState([]);
    const [useCm, setUseCm] = useState(false);
    const [totalOverride, setTotalOverride] = useState(''); // total editable por el usuario
    const [hasDraft, setHasDraft] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);
    const [ivaToggleLocked, setIvaToggleLocked] = useState(false);

    // ── Auto-guardado en localStorage ──────────────────────────────────────────
    const DRAFT_KEY = 'quotation_draft';
    const autoSaveTimer = useRef(null);

    // Guardar borrador cada 3 segundos cuando hay cambios
    useEffect(() => {
        if (!open || isEditing || !catalogsLoaded) return;
        // Solo guardar si hay al menos 1 ventana con datos
        const hasData = quotation.windows.length > 0 &&
            (quotation.project || quotation.windows.some(w => w.window_type_id));
        if (!hasData) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            try {
                // Excluir datos no serializables (fileToUpload, _optionGroups)
                const draftWindows = quotation.windows.map(w => ({
                    ...w,
                    fileToUpload: null,
                    _optionGroups: [],
                }));
                const draft = {
                    ...quotation,
                    windows: draftWindows,
                    _savedAt: Date.now(),
                    _useCm: useCm,
                    _totalOverride: totalOverride,
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            } catch { /* localStorage lleno o no disponible — ignorar */ }
        }, 3000);

        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, [quotation, useCm, totalOverride, open, isEditing, catalogsLoaded]);

    // Verificar si existe un borrador al abrir (solo para cotización nueva)
    useEffect(() => {
        if (!open || quotationToEdit || !catalogsLoaded || draftRestored) return;
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                // Solo ofrecer restaurar si el draft tiene menos de 24h
                if (draft._savedAt && Date.now() - draft._savedAt < 24 * 60 * 60 * 1000) {
                    setHasDraft(true);
                }
            }
        } catch { /* corrupto — ignorar */ }
    }, [open, quotationToEdit, catalogsLoaded, draftRestored]);

    // Limpiar borrador al guardar exitosamente
    const clearDraft = () => {
        try { localStorage.removeItem(DRAFT_KEY); } catch { }
    };

    const toDisplay = (valueInMeters) => {
        if (valueInMeters === '' || valueInMeters === null || valueInMeters === undefined) return '';
        return useCm
            ? parseFloat((parseFloat(valueInMeters) * 100).toFixed(2))
            : parseFloat(parseFloat(valueInMeters).toFixed(4));
    };

    const fromDisplay = (displayValue) => {
        if (displayValue === '' || displayValue === null) return '';
        return useCm
            ? parseFloat(displayValue) / 100
            : parseFloat(displayValue);
    };

    // Guarda el AbortController activo por ventana para cancelar requests anteriores
    const abortControllers = useRef({});

    const calculateWindowCost = useCallback(async (win) => {
        if (!win.window_type_id || !win.width_m || !win.height_m || !win.color_id) return;
        const key = win.tempId || win.id;

        // Cancelar el request anterior de esta ventana si sigue en vuelo
        if (abortControllers.current[key]) {
            abortControllers.current[key].abort();
        }
        const controller = new AbortController();
        abortControllers.current[key] = controller;

        setCalculatingCost(prev => ({ ...prev, [key]: true }));
        try {
            const response = await api.post('/cost-calculator/window', {
                window_type_id: Number(win.window_type_id),
                width_cm: parseFloat(win.width_m) * 100,
                height_cm: parseFloat(win.height_m) * 100,
                color_id: Number(win.color_id),
                glass_color_id: win.glass_color_id ? Number(win.glass_color_id) : undefined,
                options: win.options || {},
                quantity: Number(win.quantity) || 1,
            }, { signal: controller.signal });
            // Solo actualizar si este request no fue cancelado
            if (!controller.signal.aborted) {
                setWindowCosts(prev => ({
                    ...prev,
                    [key]: {
                        costo_total: response.data.costo_total,
                        precio_sugerido_minimo: response.data.precio_sugerido_minimo,
                    },
                }));

                // Re-calcular precio sugerido global optimizado con TODAS las ventanas.
                // Con 1 ventana el precio individual == global, no hace falta batch.
                // Con N ventanas el bin-packing global puede ser menor que la suma individual.
                setQuotation(prev => {
                    const windowsCompletas = prev.windows.filter(w =>
                        w.window_type_id && w.width_m && w.height_m && w.color_id
                    );
                    if (windowsCompletas.length > 1) {
                        const batchPayload = windowsCompletas.map(w => ({
                            window_type_id: Number(w.window_type_id),
                            width_cm: parseFloat(w.width_m) * 100,
                            height_cm: parseFloat(w.height_m) * 100,
                            color_id: Number(w.color_id),
                            glass_color_id: w.glass_color_id ? Number(w.glass_color_id) : undefined,
                            options: w.options || {},
                            quantity: Number(w.quantity) || 1,
                        }));
                        api.post('/cost-calculator/quotation', { windows: batchPayload })
                            .then(res => {
                                setQuotationPrecioSugerido(res.data?.precio_sugerido_minimo || 0);
                                setQuotationCostoTotal(res.data?.costo_total_proyecto || 0);
                            })
                            .catch(() => { /* si falla el batch, el fallback suma individuales */ });
                    } else {
                        // Con 1 ventana limpiar para usar el precio individual como fallback
                        setQuotationPrecioSugerido(0);
                        setQuotationCostoTotal(0);
                    }
                    return prev; // no mutar el estado de windows
                });
            }
        } catch (error) {
            // Ignorar errores de requests cancelados
            if (error?.code === 'ERR_CANCELED' || error?.name === 'AbortError' || error?.name === 'CanceledError') return;
            console.error('Error calculando costo:', error);
        } finally {
            if (!controller.signal.aborted) {
                setCalculatingCost(prev => ({ ...prev, [key]: false }));
                delete abortControllers.current[key];
            }
        }
    }, []);

    // ── Debounce del cálculo de costos ────────────────────────────────────────
    // Sin debounce, cada pulsación en ancho/alto/cantidad dispara una llamada
    // al backend. Con 80 ventanas y 3 vendedores = ~1,400 llamadas simultáneas.
    // 700ms cubre la velocidad normal de escritura de números (ej: "1.20").
    const debounceTimers = useRef({});
    const debouncedCalculateCost = useCallback((win) => {
        const key = win.tempId || win.id;
        if (debounceTimers.current[key]) {
            clearTimeout(debounceTimers.current[key]);
        }
        debounceTimers.current[key] = setTimeout(() => {
            delete debounceTimers.current[key];
            calculateWindowCost(win);
        }, 700);
    }, [calculateWindowCost]);

    // Cache de option groups por window_type_id para evitar llamadas repetidas
    const optionGroupsCache = useRef({});

    const loadOptionGroups = useCallback(async (windowTypeId) => {
        if (!windowTypeId) return [];
        // Retornar del cache si ya se cargó
        if (optionGroupsCache.current[windowTypeId]) {
            return optionGroupsCache.current[windowTypeId];
        }
        try {
            const res = await api.get(`/window-type-options?windowTypeId=${windowTypeId}`);
            const data = Array.isArray(res.data) ? res.data : [];
            optionGroupsCache.current[windowTypeId] = data;
            return data;
        } catch {
            return [];
        }
    }, []);

    const restoreDraft = useCallback(async () => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);
            // Restaurar optionGroups para cada ventana
            const restoredWindows = await Promise.all(
                (draft.windows || []).map(async (win) => {
                    const optGroups = win.window_type_id
                        ? await loadOptionGroups(win.window_type_id)
                        : [];
                    return { ...win, _optionGroups: optGroups };
                })
            );
            setQuotation({
                project: draft.project || '',
                clientId: draft.clientId || '',
                price_per_m2: draft.price_per_m2 || '',
                include_iva: Boolean(draft.include_iva),
                notes: draft.notes || '',
                reference_image_url: draft.reference_image_url || '',
                windows: restoredWindows,
            });
            if (draft._useCm) setUseCm(draft._useCm);
            if (draft._totalOverride) setTotalOverride(draft._totalOverride);
            // Calcular costos de cada ventana restaurada
            for (const win of restoredWindows) {
                calculateWindowCost(win);
            }
        } catch { /* corrupto — ignorar */ }
        setHasDraft(false);
        setDraftRestored(true);
    }, [loadOptionGroups, calculateWindowCost]);

    const discardDraft = useCallback(() => {
        try { localStorage.removeItem(DRAFT_KEY); } catch { }
        setHasDraft(false);
        setDraftRestored(true);
    }, []);

    // ── Cache de catálogos entre aperturas del modal ──────────────────────────
    // Los catálogos no cambian durante la sesión — no tiene sentido recargarlos
    // cada vez que el usuario abre el modal. Se invalidan solo al cerrar sesión.
    const catalogsCache = useRef(null);

    useEffect(() => {
        if (!open) {
            setCatalogsLoaded(false);
            setValidationErrors([]);
            setUseCm(false);
            setTotalOverride('');
            setWindowCosts({});
            setCalculatingCost({});
            setQuotationPrecioSugerido(0);
            setQuotationCostoTotal(0);
            optionGroupsCache.current = {};
            return;
        }
        const fetchCatalogs = async () => {
            // Si ya están en cache, usarlos directamente — 0ms
            if (catalogsCache.current) {
                const c = catalogsCache.current;
                setClients(c.clients);
                setWindowTypes(c.windowTypes);
                setSelectorList(buildSelectorList(c.windowTypes));
                setPvcColors(c.pvcColors);
                setGlassColors(c.glassColors);
                setRealGlassTypes(c.realGlassTypes);
                setCatalogsLoaded(true);
                return;
            }
            setCatalogsLoaded(false);
            try {
                const [clientsRes, typesRes, pvcRes, glassRes] = await Promise.all([
                    api.get('/clients'),
                    api.get('/window-types'),
                    api.get('/pvc-colors'),
                    api.get('/glass-colors'),
                ]);
                const types = typesRes.data;
                const glassData = glassRes.data || [];
                const realGlass = glassData.filter(g =>
                    g.name.toUpperCase() !== 'DUELA' &&
                    g.name.toUpperCase() !== 'VIDRIO Y DUELA'
                );
                // Guardar en cache para la próxima apertura
                catalogsCache.current = {
                    clients: clientsRes.data,
                    windowTypes: types,
                    pvcColors: pvcRes.data,
                    glassColors: glassData,
                    realGlassTypes: realGlass,
                };
                setClients(clientsRes.data);
                setWindowTypes(types);
                setSelectorList(buildSelectorList(types));
                setPvcColors(pvcRes.data);
                setGlassColors(glassData);
                setRealGlassTypes(realGlass);
            } catch (error) {
                console.error("Error cargando catálogos:", error);
            } finally {
                setCatalogsLoaded(true);
            }
        };
        fetchCatalogs();
    }, [open]);

    useEffect(() => {
        if (!open || !catalogsLoaded) return;
        if (quotationToEdit) {
            setIsEditing(true);
            setWindowCosts({});
            setCalculatingCost({});
            const buildEditWindows = async () => {
                // ── Leer windowTypes directamente del estado actual via función ──
                // Evita el problema de closure con el valor viejo del estado
                const currentTypes = await new Promise(resolve => {
                    setWindowTypes(prev => { resolve(prev); return prev; });
                });

                const windows = await Promise.all(
                    [...(quotationToEdit.quotation_windows || [])].sort((a, b) => (a.id || 0) - (b.id || 0)).map(async (win) => {
                        const found = findGroupAndVariants(win.window_type_id, currentTypes);
                        const optionGroups = win.window_type_id
                            ? await loadOptionGroups(win.window_type_id)
                            : [];
                        // Aplicar defaults de checkboxes a las opciones guardadas
                        const options = applyCheckboxDefaults(win.options || {}, optionGroups, win.window_type_id);
                        return {
                            id: win.id,
                            displayName: buildDisplayName(
                                win.windowType?.name || '',
                                win.windowType?.displayName || '',
                                win.options || {},
                                optionGroups,
                            ),
                            width_m: win.width_cm / 100,
                            height_m: win.height_cm / 100,
                            quantity: win.quantity || 1,
                            price_per_m2: win.price_per_m2 || '',
                            window_type_id: win.window_type_id,
                            color_id: win.color_id,
                            glass_color_id: win.glass_color_id || '',
                            options,
                            design_image_url: win.design_image_url || null,
                            fileToUpload: null,
                            tempId: `existing_${win.id}`,
                            _groupId: found?.groupId || '',
                            _variantValues: found?.variantValues || {},
                            _optionGroups: optionGroups,
                        };
                    })
                );
                setQuotation({
                    project: quotationToEdit.project,
                    clientId: quotationToEdit.clientId || '',
                    price_per_m2: quotationToEdit.price_per_m2 || '',
                    include_iva: Boolean(quotationToEdit.include_iva),
                    notes: quotationToEdit.notes || '',
                    reference_image_url: quotationToEdit.reference_image_url || '',
                    windows,
                });

                // ── 1 sola llamada batch en vez de N llamadas individuales ──
                // Reduce de ~4s a ~700ms al abrir cotizaciones con muchas ventanas
                const windowsParaCalculo = windows.filter(w =>
                    w.window_type_id && w.width_m && w.height_m && w.color_id
                );
                if (windowsParaCalculo.length > 0) {
                    try {
                        const payload = windowsParaCalculo.map(w => ({
                            window_type_id: Number(w.window_type_id),
                            width_cm: parseFloat(w.width_m) * 100,
                            height_cm: parseFloat(w.height_m) * 100,
                            color_id: Number(w.color_id),
                            glass_color_id: w.glass_color_id ? Number(w.glass_color_id) : undefined,
                            options: w.options || {},
                            quantity: Number(w.quantity) || 1,
                        }));
                        const res = await api.post('/cost-calculator/quotation', { windows: payload });
                        const resultados = res.data?.por_ventana || [];
                        // Capturar el precio global optimizado (bin-packing de todas las ventanas juntas)
                        setQuotationPrecioSugerido(res.data?.precio_sugerido_minimo || 0);
                        setQuotationCostoTotal(res.data?.costo_total_proyecto || 0);
                        const newCosts = {};
                        windowsParaCalculo.forEach((w, i) => {
                            const key = w.tempId || w.id;
                            if (resultados[i]) {
                                newCosts[key] = {
                                    costo_total: resultados[i].costo_total,
                                    precio_sugerido_minimo: resultados[i].precio_sugerido_minimo,
                                };
                            }
                        });
                        setWindowCosts(newCosts);
                    } catch {
                        // Si falla el batch, calcular individualmente como fallback
                        for (const win of windows) calculateWindowCost(win);
                    }
                }
            };
            buildEditWindows();
        } else {
            setIsEditing(false);
            setWindowCosts({});
            setCalculatingCost({});
            setQuotationPrecioSugerido(0);
            setQuotationCostoTotal(0);
            setQuotation({
                project: '',
                clientId: '',
                price_per_m2: '',
                include_iva: false,
                notes: '',
                reference_image_url: '',
                windows: [],
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, catalogsLoaded]);

    const handleGroupChange = async (index, value) => {
        const isSimple = value.startsWith('simple_');
        let wtId = null;
        let wtName = '';
        let optionGroups = [];
        if (isSimple) {
            wtId = Number(value.replace('simple_', ''));
            const wt = windowTypes.find(w => w.id === wtId);
            wtName = wt?.name || '';
            optionGroups = await loadOptionGroups(wtId);
        }
        setQuotation(prev => {
            const updatedWindows = prev.windows.map((win, i) => {
                if (i !== index) return win;
                if (isSimple) {
                    const newType = windowTypes.find(w => w.id === wtId);
                    const allowedIds = new Set((newType?.pvcLinks || []).map(l => l.pvcColor_id));
                    // Aplicar defaults de checkboxes para los nuevos option groups
                    const defaultOptions = applyCheckboxDefaults({}, optionGroups, wtId);
                    return {
                        ...win,
                        window_type_id: wtId,
                        displayName: newType?.displayName || wtName,
                        options: defaultOptions,
                        color_id: allowedIds.has(Number(win.color_id)) ? win.color_id : '',
                        _groupId: '',
                        _variantValues: {},
                        _optionGroups: optionGroups,
                        design_image_url: null,
                        fileToUpload: null,
                    };
                }
                return {
                    ...win,
                    window_type_id: '',
                    displayName: '',
                    options: {},
                    color_id: '',
                    _groupId: value,
                    _variantValues: {},
                    _optionGroups: [],
                    design_image_url: null,
                    fileToUpload: null,
                };
            });
            return { ...prev, windows: updatedWindows };
        });
    };

    const handleVariantChange = async (index, stepKey, stepValue) => {
        let resolvedId = null;
        setQuotation(prev => {
            const win = prev.windows[index];
            const newVariants = { ...win._variantValues, [stepKey]: stepValue };
            resolvedId = resolveWindowTypeId(win._groupId, newVariants, windowTypes);
            const resolvedType = resolvedId ? windowTypes.find(wt => wt.id === resolvedId) : null;
            const updatedWindows = prev.windows.map((w, i) => {
                if (i !== index) return w;
                const allowedIds = new Set((resolvedType?.pvcLinks || []).map(l => l.pvcColor_id));
                return {
                    ...w,
                    _variantValues: newVariants,
                    window_type_id: resolvedId || '',
                    displayName: resolvedType?.displayName || resolvedType?.name || '',
                    options: {},
                    color_id: (resolvedId && allowedIds.has(Number(w.color_id))) ? w.color_id : '',
                    _optionGroups: [],
                    design_image_url: null,
                    fileToUpload: null,
                };
            });
            return { ...prev, windows: updatedWindows };
        });
        if (resolvedId) {
            const optionGroups = await loadOptionGroups(resolvedId);
            const defaultOptions = applyCheckboxDefaults({}, optionGroups, resolvedId);
            setQuotation(prev => ({
                ...prev,
                windows: prev.windows.map((w, i) =>
                    i === index ? { ...w, _optionGroups: optionGroups, options: defaultOptions } : w
                ),
            }));
        }
    };

    const handleWindowChange = (index, e) => {
        const { name, value } = e.target;
        const finalValue = ['width_m', 'height_m', 'quantity', 'price_per_m2'].includes(name)
            ? (value === '' ? '' : parseFloat(value))
            : value;
        const updatedWindows = quotation.windows.map((win, i) => {
            if (i !== index) return win;
            const updatedWindow = { ...win, [name]: finalValue };
            if (name === 'glass_color_id') {
                const { vidrio_adicional_id, ...restOptions } = updatedWindow.options || {};
                updatedWindow.options = restOptions;
            }
            return updatedWindow;
        });
        setQuotation(prev => ({ ...prev, windows: updatedWindows }));
        if (['width_m', 'height_m', 'color_id', 'glass_color_id', 'quantity'].includes(name)) {
            // Campos numéricos se debouncean — el usuario puede estar escribiendo "1.20"
            // color_id y glass_color_id son selects (cambio instantáneo), se calculan sin delay
            const isSelectField = ['color_id', 'glass_color_id'].includes(name);
            if (isSelectField) {
                calculateWindowCost(updatedWindows[index]);
            } else {
                debouncedCalculateCost(updatedWindows[index]);
            }
        }
    };

    const handleReferenceImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/uploads/reference-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setQuotation(prev => ({ ...prev, reference_image_url: res.data.url }));
        } catch {
            alert('No se pudo subir la imagen de referencia.');
        }
    };

    const handleOptionChange = (index, optionName, optionValue) => {
        const updatedWindows = quotation.windows.map((win, i) => {
            if (i !== index) return win;
            let newOptions = { ...win.options };

            if (optionValue === null) {
                // Checkbox desactivado
                const inactiveVal = CHECKBOX_INACTIVE_VALUE[optionName];
                if (inactiveVal !== null && inactiveVal !== undefined) {
                    // Guardar valor explícito (ej: 'sin_mosquitero')
                    newOptions[optionName] = inactiveVal;
                } else {
                    // Eliminar la key (refuerzos OFF = ausencia)
                    const { [optionName]: _removed, ...rest } = newOptions;
                    newOptions = rest;
                }
                // ── Regla de dependencia: sin mosquitero → sin refuerzo mosquitero ──
                if (optionName === 'mosquitero') {
                    const { refuerzo_mosquitero: _rm, ...rest } = newOptions;
                    newOptions = rest;
                }
            } else {
                newOptions[optionName] = optionValue;
            }

            const newWindow = { ...win, options: newOptions };
            if (optionName === 'diseno' && optionValue === 'lisa') {
                newWindow.design_image_url = null;
                newWindow.fileToUpload = null;
            }
            const selectedType = windowTypes.find(wt => wt.id === Number(newWindow.window_type_id));
            const typeName = selectedType?.name || '';
            newWindow.displayName = buildDisplayName(typeName, selectedType?.displayName || '', newWindow.options, newWindow._optionGroups);
            return newWindow;
        });
        setQuotation(prev => ({ ...prev, windows: updatedWindows }));
        calculateWindowCost(updatedWindows[index]);
    };

    const handleFileChange = (index, file) => {
        const updatedWindows = quotation.windows.map((win, i) =>
            i === index ? { ...win, fileToUpload: file, design_image_url: null } : win
        );
        setQuotation(prev => ({ ...prev, windows: updatedWindows }));
    };

    const addWindow = () => {
        setQuotation(prev => ({ ...prev, windows: [...prev.windows, emptyWindow()] }));
    };

    const removeWindow = (index) => {
        const key = quotation.windows[index].tempId || quotation.windows[index].id;
        setWindowCosts(prev => { const n = { ...prev }; delete n[key]; return n; });
        setCalculatingCost(prev => { const n = { ...prev }; delete n[key]; return n; });
        setQuotation(prev => ({ ...prev, windows: prev.windows.filter((_, i) => i !== index) }));
    };

    const duplicateWindow = (index) => {
        const src = quotation.windows[index];
        const newWin = {
            ...src,
            width_m: '',
            height_m: '',
            quantity: 1,   // siempre duplicar con cantidad 1
            options: { ...src.options },
            _variantValues: { ...src._variantValues },
            _optionGroups: [...(src._optionGroups || [])],
            tempId: `temp_${Date.now()}_${Math.random()}`,
        };
        delete newWin.id;
        const updatedWindows = [
            ...quotation.windows.slice(0, index + 1),
            newWin,
            ...quotation.windows.slice(index + 1),
        ];
        setQuotation(prev => ({ ...prev, windows: updatedWindows }));
    };

    const calculateGrandTotal = () => {
        if (!quotation.windows?.length) return { subTotal: 0, ivaTax: 0, total: 0 };
        const subTotal = quotation.windows.reduce((acc, win) => {
            const w = parseFloat(win.width_m) || 0;
            const h = parseFloat(win.height_m) || 0;
            const q = parseInt(win.quantity) || 0;
            const p = parseFloat(win.price_per_m2) || parseFloat(quotation.price_per_m2) || 0;
            return acc + (w * h * q * p);
        }, 0);
        const ivaTax = quotation.include_iva ? subTotal * 0.12 : 0;
        return {
            subTotal: Number(subTotal.toFixed(2)),
            ivaTax: Number(ivaTax.toFixed(2)),
            total: Number((subTotal + ivaTax).toFixed(2)),
        };
    };

    const totalsInRealTime = calculateGrandTotal();
    const totalMaterialCost = quotationCostoTotal > 0
        ? quotationCostoTotal
        : Object.values(windowCosts).reduce((s, c) => s + (c?.costo_total || 0), 0);
    // Usar precio global optimizado (bin-packing de todas las ventanas juntas) cuando esté disponible.
    // Fallback: suma de individuales (cuando hay 1 sola ventana o el batch aún no respondió).
    const totalPrecioSugerido = quotationPrecioSugerido > 0
        ? quotationPrecioSugerido
        : Object.values(windowCosts).reduce((s, c) => s + (c?.precio_sugerido_minimo || 0), 0);
    const isCalculatingAny = Object.values(calculatingCost).some(Boolean);

    // Total efectivo: el que el usuario haya escrito, o el calculado automáticamente
    const effectiveTotal = totalOverride !== '' ? parseFloat(totalOverride) || 0 : totalsInRealTime.total;

    // m² totales de todas las ventanas (para calcular precio/m² inverso)
    const totalM2 = quotation.windows.reduce((acc, win) => {
        const w = parseFloat(win.width_m) || 0;
        const h = parseFloat(win.height_m) || 0;
        const q = parseInt(win.quantity) || 0;
        return acc + (w * h * q);
    }, 0);

    // Cuando el usuario edita el total, recalculamos el precio global por m²
    const handleTotalChange = (e) => {
        const val = e.target.value;
        setTotalOverride(val);
        if (val !== '' && totalM2 > 0) {
            const newPrice = (parseFloat(val) || 0) / totalM2;
            setQuotation(prev => ({ ...prev, price_per_m2: parseFloat(newPrice.toFixed(4)) }));
        }
    };

    // Igualar al precio mínimo sugerido
    const handleIgualMinimo = () => {
        if (totalPrecioSugerido <= 0 || totalM2 <= 0) return;
        const newPricePerM2 = totalPrecioSugerido / totalM2;
        setQuotation(prev => ({
            ...prev,
            price_per_m2: parseFloat(newPricePerM2.toFixed(4)),
            windows: prev.windows.map(win => ({ ...win, price_per_m2: '' })), // limpiar overrides individuales
        }));
        setTotalOverride('');
    };

    const validateQuotation = () => {
        const errors = [];
        if (!quotation.project?.trim()) errors.push('El nombre del proyecto es obligatorio.');
        if (!quotation.clientId) errors.push('Debes seleccionar un cliente.');
        if (!quotation.price_per_m2 || Number(quotation.price_per_m2) <= 0)
            errors.push('El precio global por m² es obligatorio.');
        if (!quotation.windows?.length) {
            errors.push('Debes agregar al menos una ventana.');
            return errors;
        }
        quotation.windows.forEach((win, index) => {
            const label = win.displayName?.trim() || `Ventana ${index + 1}`;
            if (!win.window_type_id) errors.push(`${label}: falta seleccionar el tipo de ventana.`);
            if (!win.width_m || Number(win.width_m) <= 0) errors.push(`${label}: el ancho debe ser mayor a 0.`);
            if (!win.height_m || Number(win.height_m) <= 0) errors.push(`${label}: el alto debe ser mayor a 0.`);
            if (!win.quantity || Number(win.quantity) <= 0) errors.push(`${label}: la cantidad debe ser mayor a 0.`);
            if (!win.color_id) errors.push(`${label}: falta seleccionar el color PVC.`);
            if (!win.glass_color_id) errors.push(`${label}: falta seleccionar el color de vidrio.`);
            const optionGroups = win._optionGroups || [];
            optionGroups.forEach((wto) => {
                const groupKey = wto.group?.key;
                const groupLabel = wto.group?.label || groupKey;
                // Los checkboxes (mosquitero/refuerzo) son opcionales — no validar como obligatorios
                if (groupKey && !CHECKBOX_GROUPS.has(groupKey) && !win.options?.[groupKey])
                    errors.push(`${label}: falta seleccionar "${groupLabel}".`);
            });
        });
        return errors;
    };

    const handleIvaToggle = (e) => {
        if (ivaToggleLocked) return; // Ignora clicks dobles
        setIvaToggleLocked(true);
        setQuotation(p => ({ ...p, include_iva: e.target.checked }));
        setTimeout(() => setIvaToggleLocked(false), 500); // 500ms de bloqueo
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        const errors = validateQuotation();
        if (errors.length > 0) {
            setValidationErrors(errors);
            e.target.closest('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setValidationErrors([]);
        setLoading(true);
        const freshTotals = calculateGrandTotal();
        const finalTotal = totalOverride !== '' ? (parseFloat(totalOverride) || 0) : freshTotals.total;
        const windowsSnapshot = quotation.windows.map(win => ({
            existingId: win.id ?? null,
            fileToUpload: win.fileToUpload ?? null,
        }));
        const payload = {
            project: quotation.project,
            clientId: Number(quotation.clientId) || null,
            price_per_m2: quotation.price_per_m2 ? Number(quotation.price_per_m2) : null,
            include_iva: Boolean(quotation.include_iva),
            total_price: finalTotal,
            notes: quotation.notes || null,
            reference_image_url: quotation.reference_image_url || null,
            windows: quotation.windows.map(win => ({
                id: isEditing ? win.id : undefined,
                displayName: win.displayName,
                width_m: parseFloat(win.width_m) || 0,
                height_m: parseFloat(win.height_m) || 0,
                quantity: Number(win.quantity || 1),
                price_per_m2: win.price_per_m2 ? Number(win.price_per_m2) : null,
                window_type_id: Number(win.window_type_id),
                color_id: Number(win.color_id),
                glass_color_id: win.glass_color_id ? Number(win.glass_color_id) : null,
                options: win.options || {},
                design_image_url: win.design_image_url || null,
            })),
        };
        try {
            const response = isEditing
                ? await api.patch(`/quotations/${quotationToEdit.id}`, payload)
                : await api.post('/quotations', payload);
            const savedWindows = response.data?.quotation_windows || [];
            for (let i = 0; i < windowsSnapshot.length; i++) {
                const snap = windowsSnapshot[i];
                if (!snap.fileToUpload) continue;
                const savedId = savedWindows[i]?.id ?? snap.existingId;
                if (!savedId) {
                    console.warn(`Sin id para ventana #${i} — no se pudo subir el diseño`);
                    continue;
                }
                const fd = new FormData();
                fd.append('file', snap.fileToUpload);
                await api.post(`/uploads/design/${savedId}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            clearDraft();
            onSave();
        } catch (error) {
            console.error("Error guardando cotización:", error);
            const msg = error?.response?.data?.message || 'Hubo un error al guardar la cotización.';
            setValidationErrors([Array.isArray(msg) ? msg.join(', ') : msg]);
        } finally {
            setLoading(false);
        }
    };

    const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

    const resolveImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${API_BASE}${url}`;
    };

    return (
        <>
            <DialogPrimitive.Root open={open} onOpenChange={onClose}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                    {/*
                      ── Responsive modal container ──
                      • Móvil (<sm): fullscreen con scroll
                      • sm+: centrado, max-w-7xl, max-h-[90vh]
                    */}
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <DialogContent
                            aria-describedby={undefined}
                            className="
                                bg-white w-full flex flex-col
                                rounded-t-2xl sm:rounded-xl
                                shadow-2xl
                                h-[95dvh] sm:h-auto sm:max-h-[90vh]
                                sm:max-w-7xl
                                overflow-hidden
                            "
                        >
                            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b border-gray-100 flex-shrink-0">
                                {/* Drag handle visual en móvil */}
                                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div>
                                        <DialogTitle className="text-base sm:text-lg">Cotización de Proyecto</DialogTitle>
                                        <DialogDescription className="text-xs sm:text-sm text-gray-500">
                                            Detalles y cálculo de precios para el cliente.
                                        </DialogDescription>
                                    </div>

                                    {/* ── Totales sticky en el header ── */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
                                        {/* Total m² del proyecto */}
                                        {totalM2 > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total m²</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {totalM2.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Separador */}
                                        {totalM2 > 0 && totalPrecioSugerido > 0 && <div className="w-px h-8 bg-gray-200" />}

                                        {/* Precio sugerido mínimo */}
                                        {totalPrecioSugerido > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Mín. sugerido</span>
                                                <span className="text-sm font-bold text-amber-700">
                                                    Q {totalPrecioSugerido.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Separador */}
                                        {totalPrecioSugerido > 0 && <div className="w-px h-8 bg-gray-200" />}

                                        {/* Sub-total e IVA */}
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>Sub-total:</span>
                                                <span className="font-medium text-gray-700">
                                                    Q {totalsInRealTime.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {quotation.include_iva && (
                                                <div className="flex items-center gap-2 text-xs text-green-600">
                                                    <span>IVA (12%):</span>
                                                    <span className="font-medium">
                                                        Q {totalsInRealTime.ivaTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Separador */}
                                        <div className="w-px h-8 bg-gray-200" />

                                        {/* TOTAL editable */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Total</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-bold text-blue-700">Q</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={totalOverride !== '' ? totalOverride : totalsInRealTime.total}
                                                    onChange={handleTotalChange}
                                                    onFocus={(e) => { if (totalOverride === '') setTotalOverride(String(totalsInRealTime.total)); e.target.select(); }}
                                                    onBlur={(e) => { if (e.target.value === '' || parseFloat(e.target.value) === 0) setTotalOverride(''); }}
                                                    className="w-24 text-lg font-black text-blue-700 bg-transparent border-b-2 border-blue-300 focus:border-blue-600 focus:outline-none text-center"
                                                />
                                            </div>
                                        </div>

                                        {/* Botón igualar */}
                                        {totalPrecioSugerido > 0 && totalM2 > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleIgualMinimo}
                                                className="text-[10px] sm:text-xs font-semibold px-2 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 transition-colors whitespace-nowrap"
                                                title="Ajusta el precio/m² para que el total iguale el precio mínimo sugerido"
                                            >
                                                ↓ Igualar mínimo
                                            </button>
                                        )}

                                        {/* Indicador de override activo */}
                                        {totalOverride !== '' && (
                                            <button
                                                type="button"
                                                onClick={() => { setTotalOverride(''); setQuotation(prev => ({ ...prev })); }}
                                                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                                title="Restaurar cálculo automático"
                                            >
                                                ↺ auto
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
                                <div className="flex-grow overflow-y-auto px-4 sm:px-6 py-4 space-y-5">

                                    {/* ── Banner de borrador recuperable ── */}
                                    {hasDraft && !isEditing && (
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <span className="text-sm text-blue-700">
                                                Se encontró una cotización sin guardar. ¿Deseas recuperarla?
                                            </span>
                                            <div className="flex gap-2 ml-auto flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={restoreDraft}
                                                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                                >
                                                    Recuperar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={discardDraft}
                                                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    Descartar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Cabecera ── */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto</label>
                                            <input
                                                type="text"
                                                name="project"
                                                value={quotation.project}
                                                onChange={(e) => setQuotation(p => ({ ...p, project: e.target.value }))}
                                                className="block w-full p-2 border rounded-md text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    name="clientId"
                                                    value={quotation.clientId}
                                                    onChange={(e) => setQuotation(p => ({ ...p, clientId: e.target.value }))}
                                                    className="flex-1 min-w-0 p-2 border rounded-md text-sm"
                                                    required
                                                >
                                                    <option value="">Seleccione un cliente</option>
                                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <Button type="button" onClick={() => setShowAddClientModal(true)} className="h-9 w-9 p-0 flex-shrink-0">
                                                    <FaPlus size={12} />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Global por m²</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="price_per_m2"
                                                value={quotation.price_per_m2}
                                                onChange={(e) => setQuotation(p => ({ ...p, price_per_m2: e.target.value }))}
                                                className="block w-full p-2 border rounded-md text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* ── IVA ── */}
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <input
                                            type="checkbox"
                                            id="include_iva"
                                            checked={quotation.include_iva}
                                            onChange={handleIvaToggle}
                                            disabled={ivaToggleLocked}
                                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                        />
                                        <label htmlFor="include_iva" className="text-sm font-bold text-blue-800 cursor-pointer select-none">
                                            ¿Incluir IVA (12%) en esta cotización?
                                        </label>
                                    </div>

                                    {/* ── Notas y foto — colapsables ── */}
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setShowExtras(p => !p)}
                                            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors group"
                                        >
                                            <span className={`w-4 h-4 flex items-center justify-center rounded border border-gray-300 group-hover:border-blue-400 transition-colors text-xs ${showExtras ? 'bg-blue-50 border-blue-400 text-blue-600' : 'text-gray-400'}`}>
                                                {showExtras ? '−' : '+'}
                                            </span>
                                            Notas y foto de referencia
                                            {(quotation.notes || quotation.reference_image_url) && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                            )}
                                        </button>

                                        {showExtras && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Notas <span className="text-gray-400 font-normal">(opcional)</span>
                                                    </label>
                                                    <textarea
                                                        value={quotation.notes}
                                                        onChange={(e) => setQuotation(p => ({ ...p, notes: e.target.value }))}
                                                        placeholder="Observaciones, condiciones especiales, acuerdos con el cliente..."
                                                        rows={3}
                                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Foto de referencia <span className="text-gray-400 font-normal">(opcional)</span>
                                                    </label>
                                                    {quotation.reference_image_url ? (
                                                        <div className="flex flex-col gap-2">
                                                            <a
                                                                href={resolveImageUrl(quotation.reference_image_url)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block w-fit"
                                                            >
                                                                <img
                                                                    src={resolveImageUrl(quotation.reference_image_url)}
                                                                    alt="Foto de referencia"
                                                                    className="h-20 w-auto rounded-lg border border-gray-200 object-cover shadow-sm hover:opacity-90 transition-opacity"
                                                                />
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuotation(p => ({ ...p, reference_image_url: '' }))}
                                                                className="text-xs text-red-500 hover:text-red-700 w-fit"
                                                            >
                                                                Quitar imagen
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                                            <FaCamera size={13} />
                                                            <span>Subir foto de referencia</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={handleReferenceImageUpload}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Título ventanas + toggle CM/M ── */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-700">Ventanas</h3>

                                    </div>

                                    {/* ── Tabla de ventanas — scroll horizontal en todos los tamaños ── */}
                                    <div className="w-full border rounded-lg shadow-sm bg-white overflow-x-auto -mx-0">
                                        <table className="w-full text-sm table-auto border-collapse min-w-[920px]">
                                            <thead className="bg-gray-100 border-b sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-2 text-left w-52">Tipo</th>
                                                    <th className="p-2 text-center w-28">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span>Medidas</span>
                                                            <div className="flex items-center gap-0.5 bg-gray-200 rounded-md p-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setUseCm(false)}
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${!useCm ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                                                                >
                                                                    m
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setUseCm(true)}
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${useCm ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                                                                >
                                                                    cm
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </th>
                                                    <th className="p-2 text-center w-16">Cant.</th>
                                                    <th className="p-2 text-center w-36">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span>Precio m²</span>
                                                            <span className="text-[10px] font-normal text-gray-400">Total ventana</span>
                                                        </div>
                                                    </th>
                                                    <th className="p-2 text-left w-40">Opciones</th>
                                                    <th className="p-2 text-left w-32">Color PVC</th>
                                                    <th className="p-2 text-left w-32">Vidrio</th>
                                                    <th className="p-2 text-center w-16">Acc.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {quotation.windows.map((win, index) => {
                                                    const selectedGlass = glassColors.find(gc => gc.id === Number(win.glass_color_id));
                                                    const needsAddGlass = selectedGlass?.name.toUpperCase() === 'VIDRIO Y DUELA';
                                                    const optionGroups = win._optionGroups || [];
                                                    const showUpload = optionGroups.some(wto => wto.group.key === 'diseno')
                                                        && win.options?.diseno === 'con_diseno';

                                                    return (
                                                        <Fragment key={win.tempId || win.id}>
                                                            <tr className="border-b align-top hover:bg-gray-50">
                                                                <td className="p-2">
                                                                    <WindowTypeSelector
                                                                        win={win}
                                                                        selectorList={selectorList}
                                                                        onGroupChange={(val) => handleGroupChange(index, val)}
                                                                        onVariantChange={(key, val) => handleVariantChange(index, key, val)}
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            step={useCm ? "0.1" : "any"}
                                                                            name="width_m"
                                                                            value={toDisplay(win.width_m)}
                                                                            onChange={(e) => {
                                                                                const inMeters = fromDisplay(e.target.value);
                                                                                handleWindowChange(index, { target: { name: 'width_m', value: inMeters } });
                                                                            }}
                                                                            onWheel={(e) => e.target.blur()}
                                                                            className="w-20 p-2 border rounded text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            placeholder={useCm ? "cm" : "m"}
                                                                            required
                                                                        />
                                                                        <span className="text-gray-400">×</span>
                                                                        <input
                                                                            type="number"
                                                                            step={useCm ? "0.1" : "any"}
                                                                            name="height_m"
                                                                            value={toDisplay(win.height_m)}
                                                                            onChange={(e) => {
                                                                                const inMeters = fromDisplay(e.target.value);
                                                                                handleWindowChange(index, { target: { name: 'height_m', value: inMeters } });
                                                                            }}
                                                                            onWheel={(e) => e.target.blur()}
                                                                            className="w-20 p-2 border rounded text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            placeholder={useCm ? "cm" : "m"}
                                                                            required
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-2">
                                                                    <input
                                                                        type="number"
                                                                        name="quantity"
                                                                        value={win.quantity}
                                                                        onChange={(e) => handleWindowChange(index, e)}
                                                                        className="w-full p-2 border rounded text-center text-xs"
                                                                        required
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <WindowTotalCell
                                                                        win={win}
                                                                        globalPricePerM2={quotation.price_per_m2}
                                                                        onChange={(e) => handleWindowChange(index, e)}
                                                                    />
                                                                </td>
                                                                <td className="p-2 space-y-1.5">
                                                                    {/* Selects normales (excluye checkboxes) */}
                                                                    {optionGroups.filter(wto => !CHECKBOX_GROUPS.has(wto.group.key)).map(wto => (
                                                                        <select
                                                                            key={wto.group.key}
                                                                            value={win.options?.[wto.group.key] || ''}
                                                                            onChange={(e) => handleOptionChange(index, wto.group.key, e.target.value)}
                                                                            className="w-full p-2 border rounded text-xs"
                                                                            required
                                                                        >
                                                                            <option value="">{wto.group.label}...</option>
                                                                            {wto.group.values.map(v => (
                                                                                <option key={v.key} value={v.key}>{v.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    ))}
                                                                    {/* Checkboxes: mosquitero y refuerzos */}
                                                                    {optionGroups.filter(wto => CHECKBOX_GROUPS.has(wto.group.key)).length > 0 && (
                                                                        <div className="flex flex-col gap-1 pt-0.5">
                                                                            {optionGroups.filter(wto => CHECKBOX_GROUPS.has(wto.group.key)).map(wto => {
                                                                                const groupKey = wto.group.key;
                                                                                const activeValue = CHECKBOX_ACTIVE_VALUE[groupKey];
                                                                                const isChecked = win.options?.[groupKey] === activeValue;
                                                                                // refuerzo_mosquitero solo disponible si mosquitero está ON
                                                                                const isDisabled = groupKey === 'refuerzo_mosquitero' &&
                                                                                    win.options?.['mosquitero'] !== 'con_mosquitero';
                                                                                return (
                                                                                    <label
                                                                                        key={groupKey}
                                                                                        className={`flex items-center gap-1.5 select-none ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                                                                        title={isDisabled ? 'Activa el mosquitero primero' : ''}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isChecked}
                                                                                            disabled={isDisabled}
                                                                                            onChange={(e) => handleOptionChange(index, groupKey, e.target.checked ? activeValue : null)}
                                                                                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                                                                        />
                                                                                        <span className={`text-xs font-medium ${isDisabled ? 'text-gray-300' : isChecked ? 'text-blue-700' : 'text-gray-400'}`}>
                                                                                            {wto.group.label}
                                                                                        </span>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                    {showUpload && (
                                                                        <div className="mt-1">
                                                                            <label htmlFor={`file-upload-${index}`} className="flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                                                                <FaUpload size={11} /><span>Adjuntar Diseño</span>
                                                                            </label>
                                                                            <input
                                                                                id={`file-upload-${index}`}
                                                                                type="file"
                                                                                className="hidden"
                                                                                accept="image/*"
                                                                                onChange={(e) => handleFileChange(index, e.target.files[0])}
                                                                            />
                                                                            {win.fileToUpload && (
                                                                                <p className="text-xs text-gray-600 mt-1 truncate max-w-[120px]">
                                                                                    {win.fileToUpload.name}
                                                                                </p>
                                                                            )}
                                                                            {win.design_image_url && !win.fileToUpload && (
                                                                                <a
                                                                                    href={resolveImageUrl(win.design_image_url)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="block w-fit mt-1"
                                                                                >
                                                                                    <img
                                                                                        src={resolveImageUrl(win.design_image_url)}
                                                                                        alt="Diseño adjunto"
                                                                                        className="h-10 w-auto rounded-lg border border-blue-200 object-cover shadow-sm hover:opacity-80 transition-opacity"
                                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                                    />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-2">
                                                                    {(() => {
                                                                        const selectedType = windowTypes.find(wt => wt.id === Number(win.window_type_id));
                                                                        const availableColors = selectedType?.pvcLinks?.length
                                                                            ? pvcColors.filter(c => selectedType.pvcLinks.some(l => l.pvcColor_id === c.id))
                                                                            : pvcColors;
                                                                        return (
                                                                            <select
                                                                                name="color_id"
                                                                                value={win.color_id}
                                                                                onChange={(e) => handleWindowChange(index, e)}
                                                                                className="w-full p-2 border rounded text-xs"
                                                                                required
                                                                                disabled={!win.window_type_id}
                                                                            >
                                                                                <option value="">
                                                                                    {win.window_type_id ? 'Seleccione...' : 'Primero tipo'}
                                                                                </option>
                                                                                {availableColors.map(c => (
                                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="p-2">
                                                                    <select
                                                                        name="glass_color_id"
                                                                        value={win.glass_color_id}
                                                                        onChange={(e) => handleWindowChange(index, e)}
                                                                        className="w-full p-2 border rounded text-xs"
                                                                    >
                                                                        <option value="">Seleccione...</option>
                                                                        {glassColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                    </select>
                                                                    {needsAddGlass && (
                                                                        <select
                                                                            value={win.options?.vidrio_adicional_id || ''}
                                                                            onChange={(e) => handleOptionChange(index, 'vidrio_adicional_id', e.target.value)}
                                                                            className="w-full p-2 border border-blue-400 rounded mt-1.5 text-xs"
                                                                            required
                                                                        >
                                                                            <option value="">Seleccionar Vidrio...</option>
                                                                            {realGlassTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                        </select>
                                                                    )}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <div className="flex justify-center items-center gap-2 text-gray-500">
                                                                        <button type="button" onClick={() => duplicateWindow(index)} title="Duplicar" className="hover:text-blue-600 transition-colors">
                                                                            <FaClone size={13} />
                                                                        </button>
                                                                        <button type="button" onClick={() => removeWindow(index)} title="Eliminar" className="hover:text-red-600 transition-colors">
                                                                            <FaTrashAlt size={13} className="text-red-400" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <Button type="button" variant="outline" onClick={addWindow} className="self-start">
                                        <FaPlus className="mr-2" size={11} /> Añadir Ventana
                                    </Button>

                                    {/* ── Análisis de costos (solo visible cuando hay datos) ── */}
                                    {(totalMaterialCost > 0 || isCalculatingAny) && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm">
                                            {isCalculatingAny ? (
                                                <span className="text-xs text-gray-400 italic animate-pulse">⏳ Calculando costos...</span>
                                            ) : isAdmin ? (
                                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs items-center">
                                                    <span className="text-amber-700 font-semibold uppercase tracking-wide">Análisis de Costos</span>
                                                    <span className="text-gray-600">
                                                        Materiales: <span className="font-bold text-gray-800">Q {totalMaterialCost.toFixed(2)}</span>
                                                    </span>
                                                    <span className="text-green-700 font-bold">
                                                        Mín. sugerido: <span className="text-green-800">Q {totalPrecioSugerido.toFixed(2)}</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-amber-700 font-semibold">Precio mínimo sugerido:</span>
                                                    <span className="text-green-700 font-bold">Q {totalPrecioSugerido.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ── Errores de validación ── */}
                                {validationErrors.length > 0 && (
                                    <div className="mx-4 sm:mx-6 mt-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
                                        <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                            <span>⚠️</span>
                                            Por favor corrige los siguientes errores:
                                        </p>
                                        <ul className="space-y-1 max-h-32 overflow-y-auto">
                                            {validationErrors.map((err, i) => (
                                                <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                                    <span className="mt-0.5 shrink-0">•</span>
                                                    <span>{err}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* ── Footer ── */}
                                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex-shrink-0">
                                    <DialogFooter className="flex justify-end gap-2">
                                        <Button type="button" variant="ghost" onClick={onClose} className="px-4 sm:px-6">
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 sm:px-10 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {loading ? 'Guardando...' : 'Guardar Cotización'}
                                        </Button>
                                    </DialogFooter>
                                </div>
                            </form>
                        </DialogContent>
                    </div>
                </DialogPrimitive.Portal>
            </DialogPrimitive.Root>

            <AddClientModal
                open={showAddClientModal}
                onClose={() => setShowAddClientModal(false)}
                onSave={(newClient) => {
                    setShowAddClientModal(false);
                    setClients(prev => [...prev, newClient]);
                    setQuotation(prev => ({ ...prev, clientId: newClient.id }));
                }}
            />
        </>
    );
}