// RUTA: src/components/AddQuotationModal.jsx

import { useState, useEffect, useCallback, Fragment } from 'react';
import api from '@/services/api';
import { FaPlus, FaTrashAlt, FaClone, FaUpload, FaCheckCircle, FaCamera } from 'react-icons/fa';
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

// ─── Helper: construir displayName desde grupos dinámicos ─────────────────────
function buildDisplayName(typeName, options, optionGroups) {
    if (!typeName) return '';
    const parts = [typeName];
    optionGroups.forEach(wto => {
        const groupKey = wto.group.key;
        const chosenKey = options[groupKey];
        if (chosenKey) {
            const value = wto.group.values.find(v => v.key === chosenKey);
            if (value) parts.push(value.label);
        }
    });
    return parts.join(' ');
}

// ─── Subcomponente: selector de tipo de ventana ───────────────────────────────
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AddQuotationModal({ open, onClose, onSave, quotationToEdit }) {
    const [clients, setClients] = useState([]);
    const [windowTypes, setWindowTypes] = useState([]);
    const [pvcColors, setPvcColors] = useState([]);
    const [glassColors, setGlassColors] = useState([]);
    const [realGlassTypes, setRealGlassTypes] = useState([]);
    const [selectorList, setSelectorList] = useState([]);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    // Flag: indica que los catálogos ya fueron cargados — necesario para
    // que el useEffect de edición pueda llamar findGroupAndVariants con datos.
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

    // ── Calcular costo de una ventana ──────────────────────────────────────────
    const calculateWindowCost = useCallback(async (win) => {
        if (!win.window_type_id || !win.width_m || !win.height_m || !win.color_id) return;
        const key = win.tempId || win.id;
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
            });
            setWindowCosts(prev => ({
                ...prev,
                [key]: {
                    costo_total: response.data.costo_total,
                    precio_sugerido_minimo: response.data.precio_sugerido_minimo,
                },
            }));
        } catch (error) {
            console.error('Error calculando costo:', error);
        } finally {
            setCalculatingCost(prev => ({ ...prev, [key]: false }));
        }
    }, []);

    // ── Cargar grupos dinámicos para un window_type_id ─────────────────────────
    const loadOptionGroups = useCallback(async (windowTypeId) => {
        if (!windowTypeId) return [];
        try {
            const res = await api.get(`/window-type-options?windowTypeId=${windowTypeId}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch {
            return [];
        }
    }, []);

    // ── PASO 1: Cargar catálogos al abrir el modal ─────────────────────────────
    // BUG CORREGIDO: antes ambos effectos corrían en paralelo. El de edición
    // llamaba findGroupAndVariants con windowTypes=[] porque el fetch aún no
    // había terminado → el selector aparecía vacío al editar.
    // Solución: separar en dos useEffects con el flag catalogsLoaded.
    useEffect(() => {
        if (!open) {
            setCatalogsLoaded(false);
            return;
        }

        const fetchCatalogs = async () => {
            setCatalogsLoaded(false);
            try {
                const [clientsRes, typesRes, pvcRes, glassRes] = await Promise.all([
                    api.get('/clients'),
                    api.get('/window-types'),
                    api.get('/pvc-colors'),
                    api.get('/glass-colors'),
                ]);
                setClients(clientsRes.data);
                const types = typesRes.data;
                setWindowTypes(types);
                setSelectorList(buildSelectorList(types));
                setPvcColors(pvcRes.data);
                setGlassColors(glassRes.data || []);
                setRealGlassTypes(
                    (glassRes.data || []).filter(g =>
                        g.name.toUpperCase() !== 'DUELA' &&
                        g.name.toUpperCase() !== 'VIDRIO Y DUELA'
                    )
                );
            } catch (error) {
                console.error("Error cargando catálogos:", error);
            } finally {
                // Marcar como listo SIEMPRE, incluso si falló, para no bloquear el modal
                setCatalogsLoaded(true);
            }
        };

        fetchCatalogs();
    }, [open]);

    // ── PASO 2: Poblar el formulario DESPUÉS de que los catálogos estén listos ─
    // BUG CORREGIDO: ahora esperamos catalogsLoaded=true y windowTypes poblado
    // antes de llamar findGroupAndVariants y loadOptionGroups.
    // BUG CORREGIDO: al editar, se disparan los cálculos de costo para que el
    // resumen global aparezca inmediatamente sin necesidad de cambiar nada.
    useEffect(() => {
        if (!open || !catalogsLoaded) return;

        if (quotationToEdit) {
            setIsEditing(true);
            setWindowCosts({});
            setCalculatingCost({});

            const buildEditWindows = async () => {
                const windows = await Promise.all(
                    (quotationToEdit.quotation_windows || []).map(async (win) => {
                        // windowTypes ya está poblado aquí — findGroupAndVariants funciona
                        const found = findGroupAndVariants(win.window_type_id, windowTypes);
                        // Cargar option groups para restaurar opciones dinámicas (abatible, etc.)
                        const optionGroups = win.window_type_id
                            ? await loadOptionGroups(win.window_type_id)
                            : [];

                        return {
                            id: win.id,
                            displayName: win.displayName || win.windowType?.name || '',
                            width_m: win.width_cm / 100,
                            height_m: win.height_cm / 100,
                            quantity: win.quantity || 1,
                            price_per_m2: win.price_per_m2 || '',
                            window_type_id: win.window_type_id,
                            color_id: win.color_id,
                            glass_color_id: win.glass_color_id || '',
                            options: win.options || {},
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

                // Recalcular costos de todas las ventanas para mostrar el resumen global
                for (const win of windows) {
                    calculateWindowCost(win);
                }
            };

            buildEditWindows();
        } else {
            setIsEditing(false);
            setWindowCosts({});
            setCalculatingCost({});
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

    // ── Cambio en el primer select (grupo o tipo simple) ──────────────────────
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
                    return {
                        ...win,
                        window_type_id: wtId,
                        displayName: wtName,
                        options: {},
                        _groupId: '',
                        _variantValues: {},
                        _optionGroups: optionGroups,
                    };
                }
                return {
                    ...win,
                    window_type_id: '',
                    displayName: '',
                    options: {},
                    _groupId: value,
                    _variantValues: {},
                    _optionGroups: [],
                };
            });
            return { ...prev, windows: updatedWindows };
        });
    };

    // ── Cambio en un step de variante (marco / hojas) ─────────────────────────
    const handleVariantChange = async (index, stepKey, stepValue) => {
        setQuotation(prev => {
            const win = prev.windows[index];
            const newVariants = { ...win._variantValues, [stepKey]: stepValue };
            const resolvedId = resolveWindowTypeId(win._groupId, newVariants, windowTypes);
            const resolvedType = resolvedId ? windowTypes.find(wt => wt.id === resolvedId) : null;
            const updatedWindows = prev.windows.map((w, i) => {
                if (i !== index) return w;
                return {
                    ...w,
                    _variantValues: newVariants,
                    window_type_id: resolvedId || '',
                    displayName: resolvedType?.name || '',
                    options: {},
                    _optionGroups: [],
                };
            });
            return { ...prev, windows: updatedWindows };
        });

        const win = quotation.windows[index];
        const newVariants = { ...win._variantValues, [stepKey]: stepValue };
        const resolvedId = resolveWindowTypeId(win._groupId, newVariants, windowTypes);
        if (resolvedId) {
            const optionGroups = await loadOptionGroups(resolvedId);
            setQuotation(prev => ({
                ...prev,
                windows: prev.windows.map((w, i) =>
                    i === index ? { ...w, _optionGroups: optionGroups } : w
                ),
            }));
        }
    };

    // ── Cambio en campos normales de ventana ──────────────────────────────────
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
            calculateWindowCost(updatedWindows[index]);
        }
    };

    // ── Upload foto de referencia de cotización ────────────────────────────────
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

    // ── Cambio en opciones dinámicas de ventana ───────────────────────────────
    const handleOptionChange = (index, optionName, optionValue) => {
        const updatedWindows = quotation.windows.map((win, i) => {
            if (i !== index) return win;

            const newWindow = { ...win, options: { ...win.options, [optionName]: optionValue } };

            if (optionName === 'diseno' && optionValue === 'lisa') {
                newWindow.design_image_url = null;
                newWindow.fileToUpload = null;
            }

            const selectedType = windowTypes.find(wt => wt.id === Number(newWindow.window_type_id));
            const typeName = selectedType?.name || '';
            newWindow.displayName = buildDisplayName(typeName, newWindow.options, newWindow._optionGroups);

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
        setWindowCosts(prev => { const n = { ...prev }; delete n[newWin.tempId]; return n; });
        setQuotation(prev => ({ ...prev, windows: updatedWindows }));
        calculateWindowCost(newWin);
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
    const totalMaterialCost = Object.values(windowCosts).reduce((s, c) => s + (c?.costo_total || 0), 0);
    const isCalculatingAny = Object.values(calculatingCost).some(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const freshTotals = calculateGrandTotal();
        const payload = {
            project: quotation.project,
            clientId: Number(quotation.clientId) || null,
            price_per_m2: quotation.price_per_m2 ? Number(quotation.price_per_m2) : null,
            include_iva: Boolean(quotation.include_iva),
            total_price: freshTotals.total,
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
            for (let i = 0; i < quotation.windows.length; i++) {
                const win = quotation.windows[i];
                if (!win.fileToUpload) continue;
                const savedId = win.id ?? savedWindows[i]?.id;
                if (!savedId) continue;
                const formData = new FormData();
                formData.append('file', win.fileToUpload);
                await api.post(`/quotation-windows/${savedId}/upload-design`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            onSave();
        } catch (error) {
            console.error("Error guardando cotización:", error);
            alert('Hubo un error al guardar.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
            <DialogPrimitive.Root open={open} onOpenChange={onClose}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                    <DialogContent
                        aria-describedby={undefined}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col z-50"
                    >
                        <DialogHeader>
                            <DialogTitle>Cotización de Proyecto</DialogTitle>
                            <DialogDescription>Detalles y cálculo de precios para el cliente.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="mt-4 flex-grow flex flex-col overflow-hidden">
                            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">

                                {/* ── CABECERA ── */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nombre del Proyecto</label>
                                        <input
                                            type="text"
                                            name="project"
                                            value={quotation.project}
                                            onChange={(e) => setQuotation(p => ({ ...p, project: e.target.value }))}
                                            className="mt-1 block w-full p-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                            <select
                                                name="clientId"
                                                value={quotation.clientId}
                                                onChange={(e) => setQuotation(p => ({ ...p, clientId: e.target.value }))}
                                                className="mt-1 block w-full p-2 border rounded-md"
                                                required
                                            >
                                                <option value="">Seleccione un cliente</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <Button type="button" onClick={() => setShowAddClientModal(true)} className="h-10"><FaPlus /></Button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Precio Global por m²</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="price_per_m2"
                                            value={quotation.price_per_m2}
                                            onChange={(e) => setQuotation(p => ({ ...p, price_per_m2: e.target.value }))}
                                            className="mt-1 block w-full p-2 border rounded-md"
                                        />
                                    </div>
                                </div>

                                {/* ── IVA ── */}
                                <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <input
                                        type="checkbox"
                                        id="include_iva"
                                        checked={quotation.include_iva}
                                        onChange={(e) => setQuotation(p => ({ ...p, include_iva: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                    />
                                    <label htmlFor="include_iva" className="text-sm font-bold text-blue-800 cursor-pointer select-none">
                                        ¿Incluir IVA (12%) en esta cotización?
                                    </label>
                                </div>

                                {/* ── NOTAS Y FOTO DE REFERENCIA ── */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                                                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${quotation.reference_image_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-fit"
                                                >
                                                    <img
                                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${quotation.reference_image_url}`}
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

                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Ventanas</h3>

                                {/* ── TABLA DE VENTANAS ── */}
                                <div className="w-full border rounded-lg shadow-sm bg-white mt-4 overflow-x-auto">
                                    <table className="w-full text-sm table-auto border-collapse min-w-[1000px]">
                                        <thead className="bg-gray-100 border-b sticky top-0 z-10">
                                            <tr>
                                                <th className="p-2 text-left w-64">Tipo</th>
                                                <th className="p-2 text-center w-32">Medidas (m)</th>
                                                <th className="p-2 text-center w-20">Cant.</th>
                                                <th className="p-2 text-center w-32">Precio m² (Ind.)</th>
                                                <th className="p-2 text-left w-48">Opciones</th>
                                                <th className="p-2 text-left w-36">Color PVC</th>
                                                <th className="p-2 text-left w-36">Color Vidrio</th>
                                                <th className="p-2 text-center w-24">Acciones</th>
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

                                                            {/* Tipo */}
                                                            <td className="p-2">
                                                                <WindowTypeSelector
                                                                    win={win}
                                                                    selectorList={selectorList}
                                                                    onGroupChange={(val) => handleGroupChange(index, val)}
                                                                    onVariantChange={(key, val) => handleVariantChange(index, key, val)}
                                                                />
                                                            </td>

                                                            {/* Medidas */}
                                                            <td className="p-2">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        name="width_m"
                                                                        value={win.width_m || ''}
                                                                        onChange={(e) => handleWindowChange(index, e)}
                                                                        className="w-16 p-2 border rounded text-center"
                                                                        placeholder="Ancho"
                                                                        required
                                                                    />
                                                                    <span>×</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        name="height_m"
                                                                        value={win.height_m || ''}
                                                                        onChange={(e) => handleWindowChange(index, e)}
                                                                        className="w-16 p-2 border rounded text-center"
                                                                        placeholder="Alto"
                                                                        required
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Cantidad */}
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    name="quantity"
                                                                    value={win.quantity}
                                                                    onChange={(e) => handleWindowChange(index, e)}
                                                                    className="w-full p-2 border rounded text-center"
                                                                    required
                                                                />
                                                            </td>

                                                            {/* Precio individual */}
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    name="price_per_m2"
                                                                    value={win.price_per_m2}
                                                                    onChange={(e) => handleWindowChange(index, e)}
                                                                    className="w-24 p-2 border rounded text-center"
                                                                    placeholder={quotation.price_per_m2 || 'Global'}
                                                                />
                                                            </td>

                                                            {/* Opciones dinámicas */}
                                                            <td className="p-2 space-y-1.5">
                                                                {optionGroups.map(wto => (
                                                                    <select
                                                                        key={wto.group.key}
                                                                        value={win.options?.[wto.group.key] || ''}
                                                                        onChange={(e) => handleOptionChange(index, wto.group.key, e.target.value)}
                                                                        className="w-full p-2 border rounded"
                                                                        required
                                                                    >
                                                                        <option value="">{wto.group.label}...</option>
                                                                        {wto.group.values.map(v => (
                                                                            <option key={v.key} value={v.key}>{v.label}</option>
                                                                        ))}
                                                                    </select>
                                                                ))}

                                                                {showUpload && (
                                                                    <div className="mt-1">
                                                                        <label htmlFor={`file-upload-${index}`} className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                                                                            <FaUpload /><span>Adjuntar Diseño</span>
                                                                        </label>
                                                                        <input
                                                                            id={`file-upload-${index}`}
                                                                            type="file"
                                                                            className="hidden"
                                                                            accept="image/*"
                                                                            onChange={(e) => handleFileChange(index, e.target.files[0])}
                                                                        />
                                                                        {win.fileToUpload && (
                                                                            <p className="text-xs text-gray-600 mt-1 truncate">
                                                                                Archivo: {win.fileToUpload.name}
                                                                            </p>
                                                                        )}
                                                                        {win.design_image_url && !win.fileToUpload && (
                                                                            <a
                                                                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${win.design_image_url}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1 text-xs text-green-600 mt-1"
                                                                            >
                                                                                <FaCheckCircle /> Ver Diseño Cargado
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Color PVC */}
                                                            <td className="p-2">
                                                                <select
                                                                    name="color_id"
                                                                    value={win.color_id}
                                                                    onChange={(e) => handleWindowChange(index, e)}
                                                                    className="w-full p-2 border rounded"
                                                                    required
                                                                >
                                                                    <option value="">Seleccione...</option>
                                                                    {pvcColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                </select>
                                                            </td>

                                                            {/* Color Vidrio */}
                                                            <td className="p-2">
                                                                <select
                                                                    name="glass_color_id"
                                                                    value={win.glass_color_id}
                                                                    onChange={(e) => handleWindowChange(index, e)}
                                                                    className="w-full p-2 border rounded"
                                                                >
                                                                    <option value="">Seleccione...</option>
                                                                    {glassColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                </select>
                                                                {needsAddGlass && (
                                                                    <select
                                                                        value={win.options?.vidrio_adicional_id || ''}
                                                                        onChange={(e) => handleOptionChange(index, 'vidrio_adicional_id', e.target.value)}
                                                                        className="w-full p-2 border border-blue-400 rounded mt-2"
                                                                        required
                                                                    >
                                                                        <option value="">Seleccionar Vidrio...</option>
                                                                        {realGlassTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                    </select>
                                                                )}
                                                            </td>

                                                            {/* Acciones */}
                                                            <td className="p-2 text-center">
                                                                <div className="flex justify-center items-center gap-2 text-gray-600">
                                                                    <button type="button" onClick={() => duplicateWindow(index)} title="Duplicar"><FaClone /></button>
                                                                    <button type="button" onClick={() => removeWindow(index)} title="Eliminar"><FaTrashAlt className="text-red-500" /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <Button type="button" variant="outline" onClick={addWindow} className="self-start mt-4">
                                    <FaPlus className="mr-2" /> Añadir Ventana
                                </Button>

                                {/* ── RESUMEN TOTALES ── */}
                                <div className="bg-gray-50 p-4 border rounded-lg mt-6 flex justify-between items-end gap-4">

                                    {/* Análisis de costos global del proyecto — eliminado por ventana */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm min-w-0 flex-1">
                                        <p className="text-xs text-amber-700 font-semibold uppercase mb-2 tracking-wide">
                                            Análisis de Costos del Proyecto
                                        </p>
                                        {isCalculatingAny ? (
                                            <span className="text-xs text-gray-400 italic animate-pulse">
                                                ⏳ Calculando costo de materiales...
                                            </span>
                                        ) : totalMaterialCost > 0 ? (
                                            <div className="flex flex-wrap gap-x-6 gap-y-1">
                                                <span className="text-gray-600">
                                                    Costo total materiales:{' '}
                                                    <span className="font-bold text-gray-800 ml-1">
                                                        Q {totalMaterialCost.toFixed(2)}
                                                    </span>
                                                </span>
                                                <span className="text-green-700 font-bold">
                                                    Precio mínimo sugerido:{' '}
                                                    <span className="ml-1 text-green-800">
                                                        Q {(totalMaterialCost / 0.40).toFixed(2)}
                                                    </span>
                                                </span>
                                                <span className="text-gray-400 italic text-xs self-center">
                                                    (margen del 60%)
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">
                                                Completa tipo, medidas y color PVC para ver el análisis.
                                            </span>
                                        )}
                                    </div>

                                    {/* Totales */}
                                    <div className="space-y-1 w-64 flex-shrink-0">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Sub-total:</span>
                                            <span>Q {totalsInRealTime.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {quotation.include_iva && (
                                            <div className="flex justify-between text-sm text-green-600 font-medium">
                                                <span>IVA (12%):</span>
                                                <span>Q {totalsInRealTime.ivaTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                            <span className="text-lg font-bold text-gray-800">TOTAL:</span>
                                            <span className="text-2xl font-black text-blue-700">
                                                Q {totalsInRealTime.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* ── FOOTER ── */}
                            <div className="pt-6 border-t mt-auto">
                                <DialogFooter className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={onClose} className="px-6">Cancelar</Button>
                                    <Button type="submit" disabled={loading} className="px-10 bg-blue-600 hover:bg-blue-700 text-white">
                                        {loading ? 'Guardando...' : 'Guardar Cotización'}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </form>
                    </DialogContent>
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