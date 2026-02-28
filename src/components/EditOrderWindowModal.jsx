// RUTA: src/components/EditOrderWindowModal.jsx

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { FaUpload, FaCheckCircle, FaSave, FaTimes } from 'react-icons/fa';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ─── Constantes de mapeado (igual que AddWindowModal y OrderDetail) ────────────
const PUERTA_CORREDIZA_BASE_NAME = 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 45 CM';
const PUERTA_CORREDIZA_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 5 CM';
const PUERTA_ANDINA_BASE_NAME = 'PUERTA ANDINA';
const VENTANA_PROYECTABLE_BASE_NAME = 'VENTANA PROYECTABLE';
const PUERTA_3H_MARCO_45_BASE_NAME = 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 45 CM';
const PUERTA_3H_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 5 CM';
const VENTANA_3H_MARCO_45_BASE_NAME = 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 45 CM';
const VENTANA_3H_MARCO_5_BASE_NAME = 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 5 CM';
const PUERTA_4H_MARCO_45_BASE_NAME = 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 45 CM';
const PUERTA_4H_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 5 CM';
const PUERTA_LUJO_BASE_NAME = 'PUERTA DE LUJO';
const VENTANA_ABATIBLE_BASE_NAME = 'VENTANA ABATIBLE';

const TIPO_CIERRE_CORREDIZA_MAP = { chapa_ambas_hojas: 'CHAPA AMBAS HOJAS', chapa_una_hoja: 'CHAPA EN 1 HOJA', solo_cerrojo: 'SOLO CERROJO' };
const DISENO_ANDINA_MAP = { con_diseno: 'CON DISEÑO', lisa: 'LISA' };
const SEGURO_ANDINA_MAP = { chapa_bola: 'Chapa de bola', chapa_manecilla: 'CHAPA DE MANECILLA' };
const TIPO_APERTURA_PROYECTABLE_MAP = { afuera: 'AFUERA', adentro: 'ADENTRO' };
const TIPO_VARIANTE_3H_MAP = { tres_iguales: '3 IGUALES', laterales_ocultos: 'LATERALES OCULTOS' };
const TIPO_CIERRE_4H_MAP = { chapa_llave: 'CHAPA DE LLAVE', chapa_interna: 'CHAPA INTERNA', solo_cerrojo: 'SOLO CERROJO' };
const LUJO_CANTIDAD_HOJAS_MAP = { '1': '1 HOJA', '2': '2 HOJAS' };
const LUJO_ESTILO_MAP = { con_diseno: 'CON DISEÑO', lisa: 'LISA' };
const LUJO_TIPO_PERFIL_MAP = { adentro: 'HOJA DE LUJO ADENTRO', afuera: 'HOJA DE LUJO AFUERA' };
const ABATIBLE_CANTIDAD_MAP = { '1': '1 HOJA', '2': '2 HOJAS' };
const ABATIBLE_PERFIL_MAP = { adentro: 'HOJA ABATIBLE ADENTRO', afuera: 'HOJA ABATIBLE AFUERA' };

// ─── Reconstruye el displayName completo a partir del tipo y las options ───────
function buildDisplayName(typeName, options) {
    if (!typeName) return '';

    if (typeName === PUERTA_ANDINA_BASE_NAME) {
        return [PUERTA_ANDINA_BASE_NAME, DISENO_ANDINA_MAP[options.diseno], SEGURO_ANDINA_MAP[options.tipo_seguro]].filter(Boolean).join(' ');
    }
    if (typeName === VENTANA_PROYECTABLE_BASE_NAME) {
        return [VENTANA_PROYECTABLE_BASE_NAME, TIPO_APERTURA_PROYECTABLE_MAP[options.tipo_apertura]].filter(Boolean).join(' ');
    }
    if (typeName.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME)) {
        return `${PUERTA_CORREDIZA_MARCO_5_BASE_NAME} ${TIPO_CIERRE_CORREDIZA_MAP[options.tipo_cierre] || ''}`.trim();
    }
    if (typeName.startsWith(PUERTA_CORREDIZA_BASE_NAME)) {
        return `${PUERTA_CORREDIZA_BASE_NAME} ${TIPO_CIERRE_CORREDIZA_MAP[options.tipo_cierre] || ''}`.trim();
    }
    if (typeName.startsWith(PUERTA_3H_MARCO_45_BASE_NAME)) {
        const v = TIPO_VARIANTE_3H_MAP[options.tipo_apertura] || '';
        const finalName = `${PUERTA_3H_MARCO_45_BASE_NAME} ${v}`.trim();
        return finalName;
    }
    if (typeName.startsWith(PUERTA_3H_MARCO_5_BASE_NAME)) {
        const v = TIPO_VARIANTE_3H_MAP[options.tipo_apertura] || '';
        return `${PUERTA_3H_MARCO_5_BASE_NAME} ${v}`.trim();
    }
    if (typeName.startsWith(VENTANA_3H_MARCO_45_BASE_NAME)) {
        const v = TIPO_VARIANTE_3H_MAP[options.tipo_apertura] || '';
        return `${VENTANA_3H_MARCO_45_BASE_NAME} ${v}`.trim();
    }
    if (typeName.startsWith(VENTANA_3H_MARCO_5_BASE_NAME)) {
        const v = TIPO_VARIANTE_3H_MAP[options.tipo_apertura] || '';
        return `${VENTANA_3H_MARCO_5_BASE_NAME} ${v}`.trim();
    }
    if (typeName.startsWith(PUERTA_4H_MARCO_45_BASE_NAME)) {
        return `${PUERTA_4H_MARCO_45_BASE_NAME} ${TIPO_CIERRE_4H_MAP[options.tipo_cierre] || ''}`.trim();
    }
    if (typeName.startsWith(PUERTA_4H_MARCO_5_BASE_NAME)) {
        return `${PUERTA_4H_MARCO_5_BASE_NAME} ${TIPO_CIERRE_4H_MAP[options.tipo_cierre] || ''}`.trim();
    }
    if (typeName === PUERTA_LUJO_BASE_NAME) {
        return [PUERTA_LUJO_BASE_NAME, LUJO_CANTIDAD_HOJAS_MAP[options.cantidad_hojas], LUJO_ESTILO_MAP[options.diseno], LUJO_TIPO_PERFIL_MAP[options.tipo_perfil]].filter(Boolean).join(' ');
    }
    if (typeName === VENTANA_ABATIBLE_BASE_NAME) {
        return [VENTANA_ABATIBLE_BASE_NAME, ABATIBLE_CANTIDAD_MAP[options.cantidad_hojas], ABATIBLE_PERFIL_MAP[options.tipo_perfil]].filter(Boolean).join(' ');
    }
    return typeName;
}

// ─── Resuelve el window_type_id real para tipos 3H que tienen variante en el nombre ──
function resolveWindowTypeId(baseName, variantKey, windowTypes) {
    const variantLabel = TIPO_VARIANTE_3H_MAP[variantKey] || '';
    const targetName = `${baseName} ${variantLabel}`.trim();
    const found = windowTypes.find(wt => wt.name === targetName);
    return found?.id ?? null;
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function EditOrderWindowModal({ open, onClose, onSave, windowData }) {
    const [windowTypes, setWindowTypes] = useState([]);
    const [pvcColors, setPvcColors] = useState([]);
    const [glassColors, setGlassColors] = useState([]);
    const [realGlassTypes, setRealGlassTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fileToUpload, setFileToUpload] = useState(null);

    // Estado editable de la ventana
    const [form, setForm] = useState({
        window_type_id: '',
        color_id: '',
        glass_color_id: '',
        width_cm: '',
        height_cm: '',
        quantity: 1,
        price: '',
        options: {},
        displayName: '',
        design_image_url: null,
    });

    // ── Cargar catálogos ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                const [typesRes, pvcRes, glassRes] = await Promise.all([
                    api.get('/window-types'),
                    api.get('/pvc-colors'),
                    api.get('/glass-colors'),
                ]);
                setWindowTypes(typesRes.data || []);
                setPvcColors(pvcRes.data || []);
                setGlassColors(glassRes.data || []);
                setRealGlassTypes((glassRes.data || []).filter(g =>
                    g.name.toUpperCase() !== 'DUELA' && g.name.toUpperCase() !== 'VIDRIO Y DUELA'
                ));
            } catch (err) {
                console.error('❌ Error cargando catálogos:', err);
            }
        };
        fetchCatalogs();
    }, []);

    // ── Pre-poblar formulario cuando llega windowData ──────────────────────────
    useEffect(() => {
        if (!windowData) return;
        setForm({
            window_type_id: windowData.window_type?.id || windowData.window_type_id || '',
            color_id: windowData.pvcColor?.id || windowData.color_id || '',
            glass_color_id: windowData.glassColor?.id || windowData.glass_color_id || '',
            width_cm: windowData.width_cm || '',
            height_cm: windowData.height_cm || '',
            quantity: windowData.quantity || 1,
            price: windowData.price || '',
            options: windowData.options || {},
            displayName: windowData.displayName || windowData.window_type?.name || '',
            design_image_url: windowData.design_image_url || null,
        });
        setFileToUpload(null);
    }, [windowData]);

    // ── Derivados del tipo seleccionado ────────────────────────────────────────
    const selectedType = windowTypes.find(wt => wt.id === Number(form.window_type_id));
    const selectedTypeName = selectedType?.name || '';
    const selectedGlass = glassColors.find(g => g.id === Number(form.glass_color_id));
    const needsAdditionalGlass = selectedGlass?.name?.toUpperCase() === 'VIDRIO Y DUELA';

    const isPuertaCorrediza = selectedTypeName.startsWith(PUERTA_CORREDIZA_BASE_NAME) && !selectedTypeName.startsWith(PUERTA_3H_MARCO_45_BASE_NAME) && !selectedTypeName.startsWith(PUERTA_4H_MARCO_45_BASE_NAME);
    const isPuertaCorredizaMarco5 = selectedTypeName.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME) && !selectedTypeName.startsWith(PUERTA_3H_MARCO_5_BASE_NAME) && !selectedTypeName.startsWith(PUERTA_4H_MARCO_5_BASE_NAME);
    const isPuertaAndina = selectedTypeName.startsWith(PUERTA_ANDINA_BASE_NAME);
    const isVentanaProyectable = selectedTypeName.startsWith(VENTANA_PROYECTABLE_BASE_NAME);
    const isPuerta3H_Marco45 = selectedTypeName.startsWith(PUERTA_3H_MARCO_45_BASE_NAME);
    const isPuerta3H_Marco5 = selectedTypeName.startsWith(PUERTA_3H_MARCO_5_BASE_NAME);
    const isVentana3H_Marco45 = selectedTypeName.startsWith(VENTANA_3H_MARCO_45_BASE_NAME);
    const isVentana3H_Marco5 = selectedTypeName.startsWith(VENTANA_3H_MARCO_5_BASE_NAME);
    const isPuerta4H_Marco45 = selectedTypeName.startsWith(PUERTA_4H_MARCO_45_BASE_NAME);
    const isPuerta4H_Marco5 = selectedTypeName.startsWith(PUERTA_4H_MARCO_5_BASE_NAME);
    const isPuertaLujo = selectedTypeName.startsWith(PUERTA_LUJO_BASE_NAME);
    const isVentanaAbatible = selectedTypeName.startsWith(VENTANA_ABATIBLE_BASE_NAME);

    const needsDiseno = isPuertaAndina || isPuertaLujo;
    const needsSeguro = isPuertaAndina;
    const needsTipoCierreCorrediza = isPuertaCorrediza || isPuertaCorredizaMarco5;
    const needsTipoAperturaProyectable = isVentanaProyectable;
    const needsVariante3H = isPuerta3H_Marco45 || isPuerta3H_Marco5 || isVentana3H_Marco45 || isVentana3H_Marco5;
    const needsTipoCierre4H = isPuerta4H_Marco45 || isPuerta4H_Marco5;
    const needsCantidadHojas = isPuertaLujo || isVentanaAbatible;
    const needsTipoPerfil = isPuertaLujo || isVentanaAbatible;

    const showFileUpload = needsDiseno && form.options?.diseno === 'con_diseno';

    // ── Recalcula precio automáticamente si el tipo tiene base_price ───────────
    const recalcPrice = (newForm) => {
        const type = windowTypes.find(wt => wt.id === Number(newForm.window_type_id));
        const basePrice = type?.base_price || 0;
        if (basePrice > 0) {
            const area = (parseFloat(newForm.width_cm || 0) * parseFloat(newForm.height_cm || 0)) / 10000;
            return (area * basePrice).toFixed(2);
        }
        return newForm.price;
    };

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleTypeChange = (e) => {
        const typeId = e.target.value;
        const type = windowTypes.find(wt => wt.id === Number(typeId));
        const typeName = type?.name || '';
        const newOptions = {};

        // Auto-poblar opciones según el nombre del tipo (igual que AddWindowModal)
        if (typeName.startsWith(PUERTA_CORREDIZA_BASE_NAME) || typeName.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME)) {
            if (typeName.includes('CHAPA AMBAS HOJAS')) newOptions.tipo_cierre = 'chapa_ambas_hojas';
            else if (typeName.includes('CHAPA EN 1 HOJA')) newOptions.tipo_cierre = 'chapa_una_hoja';
            else if (typeName.includes('SOLO CERROJO')) newOptions.tipo_cierre = 'solo_cerrojo';
        }
        if (typeName.startsWith(PUERTA_3H_MARCO_45_BASE_NAME) || typeName.startsWith(PUERTA_3H_MARCO_5_BASE_NAME)) {
            if (typeName.includes('3 IGUALES')) newOptions.tipo_apertura = 'tres_iguales';
            else if (typeName.includes('LATERALES OCULTOS')) newOptions.tipo_apertura = 'laterales_ocultos';
        }

        const newForm = { ...form, window_type_id: typeId, options: newOptions, displayName: typeName };
        const newPrice = recalcPrice(newForm);
        setForm({ ...newForm, price: newPrice });
        setFileToUpload(null);
    };

    const handleOptionChange = (optName, optValue) => {
        const newOptions = { ...form.options, [optName]: optValue };
        let newDisplayName = buildDisplayName(selectedTypeName, newOptions);

        // Para variantes 3H necesitamos resolver el window_type_id real
        let newWindowTypeId = form.window_type_id;
        if (needsVariante3H && optName === 'tipo_apertura') {
            let baseName = '';
            if (isPuerta3H_Marco45) baseName = PUERTA_3H_MARCO_45_BASE_NAME;
            if (isPuerta3H_Marco5) baseName = PUERTA_3H_MARCO_5_BASE_NAME;
            if (isVentana3H_Marco45) baseName = VENTANA_3H_MARCO_45_BASE_NAME;
            if (isVentana3H_Marco5) baseName = VENTANA_3H_MARCO_5_BASE_NAME;
            const resolvedId = resolveWindowTypeId(baseName, optValue, windowTypes);
            if (resolvedId) newWindowTypeId = resolvedId;
        }

        // Si elige diseño LISA, eliminar archivo de diseño
        let newDesignUrl = form.design_image_url;
        if (optName === 'diseno' && optValue === 'lisa') {
            newDesignUrl = null;
            setFileToUpload(null);
        }

        const newForm = { ...form, window_type_id: newWindowTypeId, options: newOptions, displayName: newDisplayName, design_image_url: newDesignUrl };
        const newPrice = recalcPrice(newForm);
        setForm({ ...newForm, price: newPrice });
    };

    const handleDimChange = (field, value) => {
        const newForm = { ...form, [field]: value };
        const newPrice = recalcPrice(newForm);
        setForm({ ...newForm, price: newPrice });
    };

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!windowData?.id) return;
        setLoading(true);
        try {
            const payload = {
                displayName: form.displayName,
                options: form.options,
                width_cm: parseFloat(form.width_cm) || 0,
                height_cm: parseFloat(form.height_cm) || 0,
                quantity: parseInt(form.quantity, 10) || 1,
                price: Number(form.price) > 0 ? parseFloat(form.price) : undefined,
                window_type_id: form.window_type_id ? Number(form.window_type_id) : null,
                color_id: form.color_id ? Number(form.color_id) : null,
                glass_color_id: form.glass_color_id ? Number(form.glass_color_id) : null,
                design_image_url: form.design_image_url,
            };

            await api.put(`/windows/${windowData.id}`, payload);

            if (fileToUpload) {
                const fd = new FormData();
                fd.append('file', fileToUpload);
                await api.post(`/uploads/order-window-design/${windowData.id}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            onSave();
            onClose();
        } catch (err) {
            console.error('❌ Error al guardar ventana:', err);
            alert('No se pudieron guardar los cambios.');
        } finally {
            setLoading(false);
        }
    };

    if (!open || !windowData) return null;

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">

                    {/* Header */}
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">Editar Ventana</DialogTitle>
                                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                                    Cambio operativo — modifica medidas, colores o precio.
                                </DialogDescription>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

                        {/* Tipo de Ventana */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                Tipo de Ventana
                            </label>
                            <select
                                value={form.window_type_id}
                                onChange={handleTypeChange}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            >
                                <option value="">Seleccione tipo...</option>
                                {windowTypes.map(wt => (
                                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                                ))}
                            </select>
                            {form.displayName && (
                                <p className="text-xs text-blue-600 font-semibold mt-1.5 px-1 uppercase">
                                    → {form.displayName}
                                </p>
                            )}
                        </div>

                        {/* Opciones dinámicas */}
                        {needsTipoCierreCorrediza && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Tipo de Cierre</label>
                                <select
                                    value={form.options?.tipo_cierre || ''}
                                    onChange={(e) => handleOptionChange('tipo_cierre', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {Object.entries(TIPO_CIERRE_CORREDIZA_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        )}

                        {needsTipoAperturaProyectable && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Tipo de Apertura</label>
                                <select
                                    value={form.options?.tipo_apertura || ''}
                                    onChange={(e) => handleOptionChange('tipo_apertura', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {Object.entries(TIPO_APERTURA_PROYECTABLE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        )}

                        {needsVariante3H && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Variante 3 Hojas</label>
                                <select
                                    value={form.options?.tipo_apertura || ''}
                                    onChange={(e) => handleOptionChange('tipo_apertura', e.target.value)}
                                    className="w-full p-2.5 border border-blue-300 bg-blue-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {Object.entries(TIPO_VARIANTE_3H_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        )}

                        {isPuertaAndina && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Diseño</label>
                                    <select
                                        value={form.options?.diseno || ''}
                                        onChange={(e) => handleOptionChange('diseno', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccione...</option>
                                        {Object.entries(DISENO_ANDINA_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Seguro</label>
                                    <select
                                        value={form.options?.tipo_seguro || ''}
                                        onChange={(e) => handleOptionChange('tipo_seguro', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccione...</option>
                                        {Object.entries(SEGURO_ANDINA_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {needsTipoCierre4H && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Tipo de Cierre</label>
                                <select
                                    value={form.options?.tipo_cierre || ''}
                                    onChange={(e) => handleOptionChange('tipo_cierre', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {Object.entries(TIPO_CIERRE_4H_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        )}

                        {isPuertaLujo && (
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Hojas</label>
                                    <select value={form.options?.cantidad_hojas || ''} onChange={(e) => handleOptionChange('cantidad_hojas', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">...</option>
                                        {Object.entries(LUJO_CANTIDAD_HOJAS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Estilo</label>
                                    <select value={form.options?.diseno || ''} onChange={(e) => handleOptionChange('diseno', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">...</option>
                                        {Object.entries(LUJO_ESTILO_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Perfil</label>
                                    <select value={form.options?.tipo_perfil || ''} onChange={(e) => handleOptionChange('tipo_perfil', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">...</option>
                                        {Object.entries(LUJO_TIPO_PERFIL_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {isVentanaAbatible && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Hojas</label>
                                    <select value={form.options?.cantidad_hojas || ''} onChange={(e) => handleOptionChange('cantidad_hojas', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">...</option>
                                        {Object.entries(ABATIBLE_CANTIDAD_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Perfil</label>
                                    <select value={form.options?.tipo_perfil || ''} onChange={(e) => handleOptionChange('tipo_perfil', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">...</option>
                                        {Object.entries(ABATIBLE_PERFIL_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Medidas + Cantidad */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Ancho (cm)</label>
                                <input
                                    type="number"
                                    value={form.width_cm}
                                    onChange={(e) => handleDimChange('width_cm', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-center font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Alto (cm)</label>
                                <input
                                    type="number"
                                    value={form.height_cm}
                                    onChange={(e) => handleDimChange('height_cm', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-center font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Cantidad</label>
                                <input
                                    type="number"
                                    value={form.quantity}
                                    onChange={(e) => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* Colores */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Color PVC</label>
                                <select
                                    value={form.color_id}
                                    onChange={(e) => setForm(prev => ({ ...prev, color_id: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {pvcColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Color Vidrio</label>
                                <select
                                    value={form.glass_color_id}
                                    onChange={(e) => setForm(prev => ({ ...prev, glass_color_id: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {glassColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Vidrio adicional para VIDRIO Y DUELA */}
                        {needsAdditionalGlass && (
                            <div>
                                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">Vidrio Adicional</label>
                                <select
                                    value={form.options?.vidrio_adicional_id || ''}
                                    onChange={(e) => handleOptionChange('vidrio_adicional_id', e.target.value)}
                                    className="w-full p-2.5 border border-blue-400 bg-blue-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Seleccione vidrio...</option>
                                    {realGlassTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Upload diseño */}
                        {showFileUpload && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <label className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer hover:text-blue-800 font-medium">
                                    <FaUpload />
                                    <span>Adjuntar Diseño</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setFileToUpload(e.target.files[0] || null)}
                                    />
                                </label>
                                {fileToUpload && (
                                    <span className="text-xs text-gray-600 truncate">{fileToUpload.name}</span>
                                )}
                                {form.design_image_url && !fileToUpload && (
                                    <a
                                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${form.design_image_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-green-600 font-medium"
                                    >
                                        <FaCheckCircle /> Ver diseño actual
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Precio */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                Precio (Q) <span className="text-gray-400 normal-case font-normal">— se recalcula automáticamente si el tipo tiene precio base</span>
                            </label>
                            <input
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                                className="w-full p-2.5 border border-blue-300 bg-blue-50 rounded-lg text-sm font-bold text-blue-700 text-right outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                                min="0"
                            />
                        </div>

                        {/* Footer */}
                        <DialogFooter className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={onClose} className="px-6">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="px-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                            >
                                <FaSave size={13} />
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}