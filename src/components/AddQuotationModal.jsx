// RUTA: src/components/AddQuotationModal.jsx

import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/context/CatalogContext';
import { FaPlus, FaTrashAlt, FaClone, FaUpload, FaCamera } from 'react-icons/fa';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddClientModal from './AddClientModal';

// ─── Cache de módulo para el árbol Serie→Categoría→Tipo ──────────────────────
// Mismo patrón que catalogCache en CatalogContext: TTL 5 min,
// sobrevive a cierres/aperturas del modal sin volver a pegarle al backend.
const modalStructureCache = { data: null, timestamp: null };
const MODAL_CACHE_TTL = 5 * 60 * 1000;
const isModalCacheValid = () =>
    modalStructureCache.data !== null &&
    modalStructureCache.timestamp !== null &&
    Date.now() - modalStructureCache.timestamp < MODAL_CACHE_TTL;

// ─── findCascadeInfo ──────────────────────────────────────────────────────────
// Reverse lookup: dado un window_type_id, encuentra su seriesId y categoryId
// en el árbol de modalStructure. Sustituye a findGroupAndVariants del config.
function findCascadeInfo(windowTypeId, modalStructure) {
    if (!windowTypeId || !modalStructure) return null;
    const numId = Number(windowTypeId);
    for (const s of modalStructure.series || []) {
        for (const c of s.categories || []) {
            if ((c.windowTypes || []).some(wt => wt.id === numId)) {
                return { seriesId: String(s.id), categoryId: String(c.id) };
            }
        }
    }
    if ((modalStructure.unclassified?.windowTypes || []).some(wt => wt.id === numId)) {
        return { seriesId: '__unclassified__', categoryId: '' };
    }
    return null;
}

// ─── Checkboxes: grupos que se renderizan como checkbox, NO como select ───────
const CHECKBOX_GROUPS = new Set(['mosquitero', 'refuerzo_hojas', 'refuerzo_mosquitero']);

const CHECKBOX_ACTIVE_VALUE = {
    mosquitero: 'con_mosquitero',
    refuerzo_hojas: 'con_refuerzo',
    refuerzo_mosquitero: 'con_refuerzo',
};

const CHECKBOX_INACTIVE_VALUE = {
    mosquitero: 'sin_mosquitero',
    refuerzo_hojas: null,
    refuerzo_mosquitero: null,
};

const CHECKBOX_DEFAULTS = {
    mosquitero: 'con_mosquitero',
    refuerzo_hojas: null,
    refuerzo_mosquitero: null,
};

const MOSQUITERO_OFF_BY_DEFAULT = new Set([17]);

const applyCheckboxDefaults = (currentOptions, optionGroups, windowTypeId = null) => {
    const newOptions = { ...currentOptions };
    optionGroups.forEach(wto => {
        const groupKey = wto.group?.key;
        if (!groupKey || !CHECKBOX_GROUPS.has(groupKey)) return;
        if (!(groupKey in newOptions)) {
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
    _seriesId: '',
    _categoryId: '',
    _optionGroups: [],
});

function buildDisplayName(typeName, typeDisplayName, options, optionGroups) {
    const baseName = typeDisplayName || typeName;
    if (!baseName) return '';
    const parts = [baseName];
    optionGroups.forEach(wto => {
        const groupKey = wto.group.key;
        if (CHECKBOX_GROUPS.has(groupKey)) return;
        const chosenKey = options[groupKey];
        if (chosenKey) {
            const value = wto.group.values.find(v => v.key === chosenKey);
            if (value) parts.push(value.label);
        }
    });
    return parts.join(' ');
}

// ─── CascadeWindowTypeSelector ────────────────────────────────────────────────
// Selector en cascada: Serie → Categoría → Tipo de Ventana.
// Sustituye al antiguo WindowTypeSelector que dependía de windowTypesConfig.js.
// El window_type_id se resuelve directamente desde el árbol, sin lookup por nombre.
function CascadeWindowTypeSelector({ win, modalStructure, onChange }) {
    if (!modalStructure) {
        return <div className="text-xs text-gray-400 italic py-2">Cargando tipos...</div>;
    }

    const series = modalStructure.series || [];
    const hasUnclassified = (modalStructure.unclassified?.windowTypes || []).length > 0;

    const isUnclassified = win._seriesId === '__unclassified__';
    const selectedSeries = isUnclassified ? null : series.find(s => String(s.id) === win._seriesId);
    const categories = selectedSeries?.categories || [];
    const selectedCategory = categories.find(c => String(c.id) === win._categoryId);
    const types = isUnclassified
        ? (modalStructure.unclassified?.windowTypes || [])
        : (selectedCategory?.windowTypes || []);

    const handleSeriesChange = (e) => {
        onChange({
            _seriesId: e.target.value,
            _categoryId: '',
            window_type_id: '',
            displayName: '',
            _optionGroups: [],
            options: {},
            color_id: '',
            design_image_url: null,
            fileToUpload: null,
        });
    };

    const handleCategoryChange = (e) => {
        onChange({
            _categoryId: e.target.value,
            window_type_id: '',
            displayName: '',
            _optionGroups: [],
            options: {},
            color_id: '',
            design_image_url: null,
            fileToUpload: null,
        });
    };

    const handleTypeChange = (e) => {
        onChange({ window_type_id: e.target.value });
    };

    const showCategoryStep = win._seriesId && !isUnclassified;
    const showTypeStep = isUnclassified || (win._categoryId && selectedCategory);

    return (
        <div className="space-y-1.5">
            {/* Paso 1: Serie */}
            <select
                value={win._seriesId}
                onChange={handleSeriesChange}
                className="w-full p-2 border rounded text-sm"
                required
            >
                <option value="">Seleccione tipo...</option>
                {series.map(s => (
                    <option key={s.id} value={String(s.id)}>
                        {s.displayName || s.name}
                    </option>
                ))}
                {hasUnclassified && (
                    <option value="__unclassified__">Otros</option>
                )}
            </select>

            {/* Paso 2: Categoría */}
            {showCategoryStep && (
                <select
                    value={win._categoryId}
                    onChange={handleCategoryChange}
                    className="w-full p-2 border border-blue-300 rounded text-sm bg-blue-50"
                    required
                >
                    <option value="">— Categoría —</option>
                    {categories.map(c => (
                        <option key={c.id} value={String(c.id)}>
                            {c.displayName || c.name}
                        </option>
                    ))}
                </select>
            )}

            {/* Paso 3: Tipo de ventana */}
            {showTypeStep && types.length > 0 && (
                <select
                    value={win.window_type_id ? String(win.window_type_id) : ''}
                    onChange={handleTypeChange}
                    className="w-full p-2 border border-blue-300 rounded text-sm bg-blue-50"
                    required
                >
                    <option value="">— Tipo —</option>
                    {types.map(t => (
                        <option key={t.id} value={String(t.id)}>
                            {t.displayName || t.name}
                        </option>
                    ))}
                </select>
            )}

            {win.displayName && (
                <p className="text-xs text-gray-500 truncate" title={win.displayName}>
                    {win.displayName}
                </p>
            )}
        </div>
    );
}

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

    const {
        clients,
        windowTypes,
        pvcColors,
        glassColors,
        realGlassTypes,
        loadingCatalogs,
        addClient,
    } = useCatalog();

    // ── Modal structure (Serie→Categoría→Tipo) ────────────────────────────────
    const [modalStructure, setModalStructure] = useState(null);
    const [loadingStructure, setLoadingStructure] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (isModalCacheValid()) {
            setModalStructure(modalStructureCache.data);
            return;
        }
        setLoadingStructure(true);
        api.get('/window-types/modal-structure')
            .then(res => {
                modalStructureCache.data = res.data;
                modalStructureCache.timestamp = Date.now();
                setModalStructure(res.data);
            })
            .catch(err => {
                console.error('Error cargando estructura del modal:', err);
            })
            .finally(() => setLoadingStructure(false));
    }, [open]);

    const catalogsLoaded = !loadingCatalogs && !loadingStructure && windowTypes.length > 0 && modalStructure !== null;

    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showExtras, setShowExtras] = useState(false);

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
    const [totalOverride, setTotalOverride] = useState('');
    const [hasDraft, setHasDraft] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);
    const [ivaToggleLocked, setIvaToggleLocked] = useState(false);

    const DRAFT_KEY = 'quotation_draft';
    const autoSaveTimer = useRef(null);

    useEffect(() => {
        if (!open || isEditing || !catalogsLoaded) return;
        const hasData = quotation.windows.length > 0 &&
            (quotation.project || quotation.windows.some(w => w.window_type_id));
        if (!hasData) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            try {
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
            } catch { }
        }, 3000);

        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, [quotation, useCm, totalOverride, open, isEditing, catalogsLoaded]);

    useEffect(() => {
        if (!open || quotationToEdit || !catalogsLoaded || draftRestored) return;
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                if (draft._savedAt && Date.now() - draft._savedAt < 24 * 60 * 60 * 1000) {
                    setHasDraft(true);
                }
            }
        } catch { }
    }, [open, quotationToEdit, catalogsLoaded, draftRestored]);

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

    const abortControllers = useRef({});

    const calculateWindowCost = useCallback(async (win) => {
        if (!win.window_type_id || !win.width_m || !win.height_m || !win.color_id) return;
        const key = win.tempId || win.id;

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
            if (!controller.signal.aborted) {
                setWindowCosts(prev => ({
                    ...prev,
                    [key]: {
                        costo_total: response.data.costo_total,
                        precio_sugerido_minimo: response.data.precio_sugerido_minimo,
                    },
                }));

                setQuotation(prev => {
                    const windowsCompletas = prev.windows.filter(w =>
                        w.window_type_id && w.width_m && w.height_m && w.color_id
                    );
                    if (windowsCompletas.length > 0) {
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
                            .catch(() => { });
                    } else {
                        setQuotationPrecioSugerido(0);
                        setQuotationCostoTotal(0);
                    }
                    return prev;
                });
            }
        } catch (error) {
            if (error?.code === 'ERR_CANCELED' || error?.name === 'AbortError' || error?.name === 'CanceledError') return;
            console.error('Error calculando costo:', error);
        } finally {
            if (!controller.signal.aborted) {
                setCalculatingCost(prev => ({ ...prev, [key]: false }));
                delete abortControllers.current[key];
            }
        }
    }, []);

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

    const optionGroupsCache = useRef({});

    const loadOptionGroups = useCallback(async (windowTypeId) => {
        if (!windowTypeId) return [];
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

            // Pre-cargar option groups secuencialmente para evitar ráfaga de requests
            const uniqueTypeIds = [...new Set(
                (draft.windows || []).map(w => w.window_type_id).filter(Boolean)
            )];
            for (const typeId of uniqueTypeIds) {
                await loadOptionGroups(typeId);
            }

            const restoredWindows = await Promise.all(
                (draft.windows || []).map(async (win) => {
                    const optGroups = win.window_type_id
                        ? await loadOptionGroups(win.window_type_id)
                        : [];
                    // Reconstruir estado de cascada desde la estructura del backend.
                    // Borradores antiguos tienen _groupId/_variantValues (ignorados).
                    const cascade = findCascadeInfo(win.window_type_id, modalStructureCache.data);
                    return {
                        ...win,
                        _optionGroups: optGroups,
                        _seriesId: cascade?.seriesId ?? win._seriesId ?? '',
                        _categoryId: cascade?.categoryId ?? win._categoryId ?? '',
                    };
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
            for (const win of restoredWindows) {
                calculateWindowCost(win);
            }
        } catch { }
        setHasDraft(false);
        setDraftRestored(true);
    }, [loadOptionGroups, calculateWindowCost]);

    const discardDraft = useCallback(() => {
        try { localStorage.removeItem(DRAFT_KEY); } catch { }
        setHasDraft(false);
        setDraftRestored(true);
    }, []);

    useEffect(() => {
        if (!open) {
            setValidationErrors([]);
            setUseCm(false);
            setTotalOverride('');
            setWindowCosts({});
            setCalculatingCost({});
            setQuotationPrecioSugerido(0);
            setQuotationCostoTotal(0);
            optionGroupsCache.current = {};
        }
    }, [open]);

    useEffect(() => {
        if (!open || !catalogsLoaded) return;
        if (quotationToEdit) {
            setIsEditing(!!quotationToEdit.id);
            setWindowCosts({});
            setCalculatingCost({});

            const buildEditWindows = async () => {
                const sortedWins = [...(quotationToEdit.quotation_windows || [])]
                    .sort((a, b) => (a.id || 0) - (b.id || 0));

                // Pre-cargar option groups secuencialmente por tipo único para evitar
                // 429 en cascada cuando el backend recién despertó en Render.
                const uniqueTypeIds = [...new Set(
                    sortedWins.map(w => w.window_type_id).filter(Boolean)
                )];
                for (const typeId of uniqueTypeIds) {
                    await loadOptionGroups(typeId);
                }

                const windows = await Promise.all(
                    sortedWins.map(async (win) => {
                        // findCascadeInfo reemplaza a findGroupAndVariants del config hardcodeado.
                        // Reconstruye el estado de navegación (_seriesId, _categoryId) desde
                        // el árbol que devuelve el backend.
                        const cascade = findCascadeInfo(win.window_type_id, modalStructure);
                        const optionGroups = win.window_type_id
                            ? await loadOptionGroups(win.window_type_id)
                            : [];
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
                            _seriesId: cascade?.seriesId || '',
                            _categoryId: cascade?.categoryId || '',
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

                const hasStoredSnapshot =
                    quotationToEdit.id &&
                    quotationToEdit.precio_sugerido_minimo != null;

                const windowsParaCalculo = windows.filter(w =>
                    w.window_type_id && w.width_m && w.height_m && w.color_id
                );

                if (hasStoredSnapshot) {
                    setQuotationPrecioSugerido(Number(quotationToEdit.precio_sugerido_minimo) || 0);
                    setQuotationCostoTotal(Number(quotationToEdit.costo_total_proyecto) || 0);

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
                            setQuotationPrecioSugerido(res.data?.precio_sugerido_minimo || 0);
                            setQuotationCostoTotal(res.data?.costo_total_proyecto || 0);
                        } catch {
                            // FIX: NO disparar calculateWindowCost individual por cada ventana.
                            // Causaría N llamadas simultáneas → 429 cuando el backend recién despertó.
                            // Los costos se recalcularán cuando el usuario edite cualquier ventana.
                            console.warn('Costos no calculados al abrir (backend ocupado) — se recalcularán al editar.');
                        }
                    }
                } else if (windowsParaCalculo.length > 0) {
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
                        console.warn('Costos no calculados al abrir (backend ocupado) — se recalcularán al editar.');
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

    // ─── handleCascadeChange ──────────────────────────────────────────────────
    // Reemplaza handleGroupChange + handleVariantChange del sistema anterior.
    // patch puede contener: _seriesId, _categoryId, window_type_id, y campos
    // de reset (displayName, _optionGroups, options, color_id, design_image_url).
    // Cuando window_type_id cambia a un valor real, carga los option groups.
    const handleCascadeChange = async (index, patch) => {
        // Aplicar el patch inmediatamente para que la UI responda sin esperar
        setQuotation(prev => ({
            ...prev,
            windows: prev.windows.map((w, i) => i === index ? { ...w, ...patch } : w),
        }));

        // Si se está seleccionando un tipo concreto, cargar sus opciones
        if (patch.window_type_id) {
            const wtId = Number(patch.window_type_id);
            const optionGroups = await loadOptionGroups(wtId);
            const defaultOptions = applyCheckboxDefaults({}, optionGroups, wtId);
            const wt = windowTypes.find(w => w.id === wtId);
            const allowedColorIds = new Set((wt?.pvcLinks || []).map(l => l.pvcColor_id));

            setQuotation(prev => ({
                ...prev,
                windows: prev.windows.map((w, i) => {
                    if (i !== index) return w;
                    return {
                        ...w,
                        ...patch,
                        window_type_id: wtId,
                        displayName: wt?.displayName || wt?.name || '',
                        _optionGroups: optionGroups,
                        options: defaultOptions,
                        color_id: allowedColorIds.has(Number(w.color_id)) ? w.color_id : '',
                        design_image_url: null,
                        fileToUpload: null,
                    };
                }),
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
                const inactiveVal = CHECKBOX_INACTIVE_VALUE[optionName];
                if (inactiveVal !== null && inactiveVal !== undefined) {
                    newOptions[optionName] = inactiveVal;
                } else {
                    const { [optionName]: _removed, ...rest } = newOptions;
                    newOptions = rest;
                }
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
            quantity: 1,
            options: { ...src.options },
            _seriesId: src._seriesId,
            _categoryId: src._categoryId,
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
        const ivaTax = quotation.include_iva ? subTotal * 0.05 : 0;
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
    const totalPrecioSugerido = quotationPrecioSugerido > 0
        ? quotationPrecioSugerido
        : Object.values(windowCosts).reduce((s, c) => s + (c?.precio_sugerido_minimo || 0), 0);
    const isCalculatingAny = Object.values(calculatingCost).some(Boolean);

    const effectiveTotal = totalOverride !== '' ? parseFloat(totalOverride) || 0 : totalsInRealTime.total;

    const totalM2 = quotation.windows.reduce((acc, win) => {
        const w = parseFloat(win.width_m) || 0;
        const h = parseFloat(win.height_m) || 0;
        const q = parseInt(win.quantity) || 0;
        return acc + (w * h * q);
    }, 0);

    const handleTotalChange = (e) => {
        const val = e.target.value;
        setTotalOverride(val);
        if (val !== '' && totalM2 > 0) {
            const newPrice = (parseFloat(val) || 0) / totalM2;
            setQuotation(prev => ({ ...prev, price_per_m2: parseFloat(newPrice.toFixed(4)) }));
        }
    };

    const handleIgualMinimo = () => {
        if (totalPrecioSugerido <= 0 || totalM2 <= 0) return;
        const newPricePerM2 = totalPrecioSugerido / totalM2;
        setQuotation(prev => ({
            ...prev,
            price_per_m2: parseFloat(newPricePerM2.toFixed(4)),
            windows: prev.windows.map(win => ({ ...win, price_per_m2: '' })),
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
                if (groupKey && !CHECKBOX_GROUPS.has(groupKey) && !win.options?.[groupKey])
                    errors.push(`${label}: falta seleccionar "${groupLabel}".`);
            });
        });
        return errors;
    };

    const handleIvaToggle = (e) => {
        if (ivaToggleLocked) return;
        setIvaToggleLocked(true);
        setQuotation(p => ({ ...p, include_iva: e.target.checked }));
        setTimeout(() => setIvaToggleLocked(false), 500);
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
            const raw = error?.response?.data?.message;
            let msg;
            if (!raw) {
                msg = 'Hubo un error al guardar la cotización.';
            } else if (Array.isArray(raw)) {
                msg = raw.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join(' · ');
            } else if (typeof raw === 'object' && raw !== null) {
                msg = typeof raw.message === 'string'
                    ? raw.message
                    : Array.isArray(raw.message)
                        ? raw.message.join(' · ')
                        : JSON.stringify(raw);
            } else {
                msg = String(raw);
            }
            setValidationErrors([msg]);
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
                                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div>
                                        <DialogTitle className="text-base sm:text-lg">Cotización de Proyecto</DialogTitle>
                                        <DialogDescription className="text-xs sm:text-sm text-gray-500">
                                            Detalles y cálculo de precios para el cliente.
                                        </DialogDescription>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
                                        {totalM2 > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total m²</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {totalM2.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {totalM2 > 0 && totalPrecioSugerido > 0 && <div className="w-px h-8 bg-gray-200" />}

                                        {totalPrecioSugerido > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Mín. sugerido</span>
                                                <span className="text-sm font-bold text-amber-700">
                                                    Q {totalPrecioSugerido.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {totalPrecioSugerido > 0 && <div className="w-px h-8 bg-gray-200" />}

                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>Sub-total:</span>
                                                <span className="font-medium text-gray-700">
                                                    Q {totalsInRealTime.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {quotation.include_iva && (
                                                <div className="flex items-center gap-2 text-xs text-green-600">
                                                    <span>IVA (5%):</span>
                                                    <span className="font-medium">
                                                        Q {totalsInRealTime.ivaTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-px h-8 bg-gray-200" />

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
                                            ¿Incluir IVA (5%) en esta cotización?
                                        </label>
                                    </div>

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

                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-700">Ventanas</h3>
                                    </div>

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
                                                                    <CascadeWindowTypeSelector
                                                                        win={win}
                                                                        modalStructure={modalStructure}
                                                                        onChange={(patch) => handleCascadeChange(index, patch)}
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
                                                                    {optionGroups.filter(wto => CHECKBOX_GROUPS.has(wto.group.key)).length > 0 && (
                                                                        <div className="flex flex-col gap-1 pt-0.5">
                                                                            {optionGroups.filter(wto => CHECKBOX_GROUPS.has(wto.group.key)).map(wto => {
                                                                                const groupKey = wto.group.key;
                                                                                const activeValue = CHECKBOX_ACTIVE_VALUE[groupKey];
                                                                                const isChecked = win.options?.[groupKey] === activeValue;
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
                    addClient(newClient);
                    setQuotation(prev => ({ ...prev, clientId: newClient.id }));
                }}
            />
        </>
    );
}
