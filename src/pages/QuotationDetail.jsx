// src/pages/QuotationDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import {
    FaFilePdf, FaCheckCircle, FaEdit, FaWhatsapp,
    FaPhone, FaCamera, FaCalculator, FaArrowLeft,
    FaBoxOpen, FaStickyNote, FaUnlock, FaExclamationTriangle,
} from 'react-icons/fa';
import AddQuotationModal from '@/components/AddQuotationModal';
import { generateDocumentPDF } from '@/lib/generateDocumentPDF';
import ConfirmQuotationModal from '@/components/ConfirmQuotationModal';
import ProfilesReportModal from '../components/ProfilesReportModal';
import { useAuth } from '@/context/AuthContext';

const statusLabels = {
    Potencial: 'Potencial',
    Contactado: 'Contactado',
    Interesado: 'Interesado',
    En_Seguimiento: 'En Seguimiento',
    Cliente_Activo: 'Cliente Activo',
    No_Interesado: 'No Interesado',
    Importante: 'Importante',
};

const clientStatusStyles = {
    Potencial: 'bg-slate-100 text-slate-600 border-slate-200',
    Contactado: 'bg-blue-100 text-blue-700 border-blue-200',
    Interesado: 'bg-amber-100 text-amber-700 border-amber-200',
    En_Seguimiento: 'bg-orange-100 text-orange-700 border-orange-200',
    Cliente_Activo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    No_Interesado: 'bg-red-100 text-red-600 border-red-200',
    Importante: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function QuotationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [glassColors, setGlassColors] = useState([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState(null);

    const fetchQuotation = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/quotations/${id}`);
            setQuotation(response.data);
        } catch (error) {
            console.error('Error al obtener la cotización:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchGlassColors = async () => {
            try {
                const res = await api.get('/glass-colors');
                setGlassColors(res.data);
            } catch { /* silencioso */ }
        };
        fetchGlassColors();
        fetchQuotation();
    }, [id]);

    const formatDate = (d) => new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
    const formatCurrency = (n) => `Q ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const handleClientStatusChange = async (e) => {
        const newStatus = e.target.value;
        if (!quotation?.client?.id) return;
        setIsUpdatingStatus(true);
        try {
            await api.patch(`/clients/${quotation.client.id}/status`, { status: newStatus });
            setQuotation(prev => ({ ...prev, client: { ...prev.client, status: newStatus } }));
        } catch {
            alert('No se pudo actualizar el estado del cliente.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleCalculateMaterial = async (e) => {
        e.stopPropagation();
        setIsReportLoading(true);
        setIsReportModalOpen(true);
        try {
            const response = await api.get(`/reports/quotation/${quotation.id}/profiles`);
            setReportData(response.data);
        } catch {
            alert('No se pudo generar el reporte de materiales');
            setIsReportModalOpen(false);
        } finally {
            setIsReportLoading(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!quotation?.client?.phone) {
            alert('Este cliente no tiene un número de teléfono registrado.');
            return;
        }
        let phone = quotation.client.phone.replace(/[^0-9]/g, '');
        if (phone.length === 8) phone = `502${phone}`;
        const msg = encodeURIComponent(`¡Hola ${quotation.client.name}! Te comparto la cotización para el proyecto "${quotation.project}". Por favor, avísame si tienes alguna duda. Saludos.`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    const handleReopen = async () => {
        if (!confirm(
            '¿Reabrir esta cotización?\n\n' +
            'El pedido vinculado seguirá activo pero sus datos se actualizarán cuando vuelvas a confirmar. ' +
            'Cualquier cambio que hagas en la cotización se reflejará en el pedido al re-confirmar.'
        )) return;

        setIsReopening(true);
        try {
            await api.post(`/quotations/${id}/reopen`);
            await fetchQuotation();
        } catch (err) {
            const msg = err?.response?.data?.message || 'No se pudo reabrir la cotización.';
            alert(msg);
        } finally {
            setIsReopening(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32 text-gray-400">
                <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Cargando cotización...
            </div>
        );
    }
    if (!quotation) {
        return (
            <div className="text-center py-32">
                <p className="text-red-500 font-medium">No se pudo encontrar la cotización.</p>
                <Link to="/quotations" className="text-blue-600 text-sm mt-2 inline-block hover:underline">← Volver a la lista</Link>
            </div>
        );
    }

    const isConfirmado = quotation.status === 'confirmado';
    const isReopenada = !isConfirmado && !!quotation.generatedOrder;
    const windowCount = quotation.quotation_windows?.length || 0;
    const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

    const resolveImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${API_BASE}${url}`;
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6">

            {/* Breadcrumb */}
            <Link
                to="/quotations"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors group"
            >
                <FaArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
                Volver a Cotizaciones
            </Link>

            {/* Banner reabierta */}
            {isReopenada && (
                <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
                    <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={15} />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Cotización reabierta para edición</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            El Pedido #{quotation.generatedOrder.id} sigue activo. Al re-confirmar esta cotización,
                            el pedido se actualizará con las nuevas ventanas y el nuevo total.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Header card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-5">

                {/* Info + botones */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                    {/* Info izquierda */}
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                #{quotation.quotationNumber}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${isConfirmado
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isReopenada
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                {isConfirmado ? 'Confirmada' : isReopenada ? 'Reabierta — En Edición' : 'En Proceso'}
                            </span>
                            {quotation.include_iva && (
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                                    IVA incluido
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight break-words">
                            {quotation.project}
                        </h1>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</span>
                                <span className="text-sm font-semibold text-gray-700">{quotation.client?.name || 'N/A'}</span>
                            </div>
                            {quotation.client?.phone && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <FaPhone size={11} />
                                    <span>{quotation.client.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</span>
                                <select
                                    value={quotation.client?.status || ''}
                                    onChange={handleClientStatusChange}
                                    disabled={isUpdatingStatus}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors disabled:opacity-50 ${clientStatusStyles[quotation.client?.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                >
                                    {Object.entries(statusLabels).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 mt-3">
                            Creada el {formatDate(quotation.createdAt)} · {windowCount} ventana{windowCount !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Botones de acción — scroll horizontal en móvil si hay muchos */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            disabled={isConfirmado}
                            title={isConfirmado ? 'Usa "Reabrir" para editar una cotización confirmada' : 'Editar cotización'}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <FaEdit size={12} />
                            <span>Editar</span>
                        </button>

                        <button
                            onClick={handleCalculateMaterial}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                        >
                            <FaCalculator size={12} />
                            <span>Materiales</span>
                        </button>

                        <button
                            onClick={async () => { try { await generateDocumentPDF(quotation); } catch { alert('Error al generar PDF. Intenta de nuevo.'); } }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        >
                            <FaFilePdf size={12} />
                            <span>PDF</span>
                        </button>

                        <button
                            onClick={handleShareWhatsApp}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-all"
                        >
                            <FaWhatsapp size={12} />
                            <span className="hidden sm:inline">WhatsApp</span>
                            <span className="sm:hidden">WA</span>
                        </button>

                        {isConfirmado ? (
                            <>
                                {quotation.generatedOrder && (
                                    <Link
                                        to={`/orders/${quotation.generatedOrder.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                                    >
                                        <FaBoxOpen size={12} />
                                        <span>Ver Pedido</span>
                                    </Link>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={handleReopen}
                                        disabled={isReopening}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <FaUnlock size={12} />
                                        <span>{isReopening ? 'Reabriendo...' : 'Reabrir'}</span>
                                    </button>
                                )}
                            </>
                        ) : isReopenada ? (
                            <>
                                {quotation.generatedOrder && (
                                    <Link
                                        to={`/orders/${quotation.generatedOrder.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        <FaBoxOpen size={12} />
                                        <span>Ver Pedido</span>
                                    </Link>
                                )}
                                <button
                                    onClick={() => setIsConfirmModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                                >
                                    <FaCheckCircle size={12} />
                                    <span>Re-confirmar</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                            >
                                <FaCheckCircle size={12} />
                                <span>Confirmar</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Totales */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">Precio por m²:</span>{' '}
                        {quotation.price_per_m2
                            ? formatCurrency(quotation.price_per_m2)
                            : <span className="italic text-gray-400">Variable por ventana</span>
                        }
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xs text-gray-400 mb-0.5">Total de la Cotización</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                            {formatCurrency(quotation.total_price)}
                        </p>
                    </div>
                </div>

                {/* Notas y foto */}
                {(quotation.notes || quotation.reference_image_url) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                        {quotation.notes && (
                            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <FaStickyNote size={12} className="text-amber-500" />
                                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Notas</span>
                                </div>
                                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                                    {quotation.notes}
                                </p>
                            </div>
                        )}
                        {quotation.reference_image_url && (
                            <div className="flex flex-col items-start gap-2">
                                <div className="flex items-center gap-1.5">
                                    <FaCamera size={12} className="text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Foto de referencia</span>
                                </div>
                                <button
                                    onClick={() => setLightboxUrl(resolveImageUrl(quotation.reference_image_url))}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'zoom-in',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: '#3b82f6',
                                        fontSize: 12,
                                        fontWeight: 500,
                                    }}
                                >
                                    📷 Ver foto de referencia
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Tabla de ventanas (md+) / Cards (móvil) ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-base font-bold text-gray-800">Detalle de Ventanas</h2>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {windowCount} ítem{windowCount !== 1 ? 's' : ''}
                    </span>
                </div>

                {windowCount === 0 ? (
                    <p className="py-12 text-center text-gray-400 text-sm">No hay ventanas en esta cotización.</p>
                ) : (
                    <>
                        {/* ── TABLA — md+ ── */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <colgroup>
                                    <col className="w-16" />
                                    <col className="w-auto" />
                                    <col className="w-44" />
                                    <col className="w-36" />
                                    <col className="w-36" />
                                    <col className="w-32" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-gray-50/70 border-b border-gray-100">
                                        <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant.</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de Ventana</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dimensiones</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Color PVC</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vidrio</th>
                                        <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {quotation.quotation_windows?.map((win) => {
                                        const isVidrioYDuela = win.glassColor?.name?.toUpperCase() === 'VIDRIO Y DUELA';
                                        const additionalGlass = isVidrioYDuela && win.options?.vidrio_adicional_id
                                            ? glassColors.find(g => g.id === Number(win.options.vidrio_adicional_id))
                                            : null;
                                        return (
                                            <tr key={win.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-5 text-center">
                                                    <span className="w-7 h-7 inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs rounded-lg">
                                                        {win.quantity}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-800">{win.displayName}</span>
                                                            {win.design_image_url && (
                                                                <button
                                                                    onClick={() => setLightboxUrl(resolveImageUrl(win.design_image_url))}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        cursor: 'zoom-in',
                                                                        padding: 0,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 4,
                                                                        color: '#3b82f6',
                                                                        fontSize: 12,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    📷 Diseño
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5 font-mono text-xs text-gray-600">
                                                    {(win.width_cm / 100).toFixed(2)}m × {(win.height_cm / 100).toFixed(2)}m
                                                    <span className="ml-1.5 text-gray-400">
                                                        ({((win.width_cm / 100) * (win.height_cm / 100)).toFixed(2)} m²)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-gray-600">{win.pvcColor?.name}</td>
                                                <td className="py-3.5 px-5">
                                                    {isVidrioYDuela && additionalGlass ? (
                                                        <div className="text-xs">
                                                            <span className="text-gray-600">{win.glassColor.name}</span>
                                                            <span className="text-blue-600 font-semibold block">+ {additionalGlass.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600">{win.glassColor?.name || '—'}</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-5 text-right font-mono font-semibold text-gray-800">
                                                    {formatCurrency(win.price)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-200 bg-gray-50/70">
                                    <tr>
                                        <td colSpan={5} className="py-3 px-5 text-sm font-semibold text-gray-600 text-right">
                                            Total de la cotización
                                        </td>
                                        <td className="py-3 px-5 text-right font-mono font-black text-gray-900">
                                            {formatCurrency(quotation.total_price)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* ── CARDS — móvil (< md) ── */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {quotation.quotation_windows?.map((win) => {
                                const isVidrioYDuela = win.glassColor?.name?.toUpperCase() === 'VIDRIO Y DUELA';
                                const additionalGlass = isVidrioYDuela && win.options?.vidrio_adicional_id
                                    ? glassColors.find(g => g.id === Number(win.options.vidrio_adicional_id))
                                    : null;
                                return (
                                    <div key={win.id} className="p-4">
                                        {/* Nombre + cantidad + precio */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-6 h-6 inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs rounded-lg flex-shrink-0">
                                                    {win.quantity}
                                                </span>
                                                <span className="font-semibold text-gray-800 text-sm truncate">{win.displayName}</span>
                                            </div>
                                            <span className="font-mono font-semibold text-gray-800 text-sm flex-shrink-0">
                                                {formatCurrency(win.price)}
                                            </span>
                                        </div>

                                        {/* Imagen de diseño si existe */}
                                        {win.design_image_url && (
                                            <button
                                                onClick={() => setLightboxUrl(resolveImageUrl(win.design_image_url))}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'zoom-in',
                                                    padding: 0,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    color: '#3b82f6',
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                📷 Diseño
                                            </button>
                                        )}

                                        {/* Detalles en grid compacto */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span>
                                                Dim:{' '}
                                                <span className="font-mono text-gray-700">
                                                    {(win.width_cm / 100).toFixed(2)}m × {(win.height_cm / 100).toFixed(2)}m
                                                </span>
                                            </span>
                                            <span>
                                                Área:{' '}
                                                <span className="text-gray-700">
                                                    {((win.width_cm / 100) * (win.height_cm / 100)).toFixed(2)} m²
                                                </span>
                                            </span>
                                            <span>PVC: <span className="text-gray-700">{win.pvcColor?.name || '—'}</span></span>
                                            <span>
                                                Vidrio:{' '}
                                                <span className="text-gray-700">
                                                    {isVidrioYDuela && additionalGlass
                                                        ? `${win.glassColor.name} + ${additionalGlass.name}`
                                                        : win.glassColor?.name || '—'}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Footer total */}
                            <div className="px-4 py-3 bg-gray-50/70 border-t-2 border-gray-200 flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-600">Total de la cotización</span>
                                <span className="font-mono font-black text-gray-900">{formatCurrency(quotation.total_price)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modales */}
            {isEditModalOpen && (
                <AddQuotationModal
                    open={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    quotationToEdit={quotation}
                    onSave={() => { setIsEditModalOpen(false); fetchQuotation(); }}
                />
            )}

            {isConfirmModalOpen && (
                <ConfirmQuotationModal
                    open={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    quotationId={quotation.id}
                    isReconfirm={isReopenada}
                    excludeOrderId={isReopenada ? quotation.generatedOrder?.id : null}
                    initialDates={isReopenada && quotation.generatedOrder ? {
                        from: quotation.generatedOrder.installationStartDate,
                        to: quotation.generatedOrder.installationEndDate,
                    } : null}
                    onConfirmSuccess={(newOrderId) => {
                        const targetOrderId = newOrderId || quotation.generatedOrder?.id;
                        navigate(`/orders/${targetOrderId}`);
                    }}
                />
            )}

            {isReportModalOpen && (
                <ProfilesReportModal
                    data={reportData}
                    isLoading={isReportLoading}
                    onClose={() => setIsReportModalOpen(false)}
                    showPrices={true}
                    projectName={quotation?.project}
                />
            )}

            {/* ── Lightbox ── */}
            {lightboxUrl && (
                <div
                    onClick={() => setLightboxUrl(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'zoom-out',
                    }}
                >
                    <img
                        src={lightboxUrl}
                        alt="Diseño"
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            borderRadius: 8,
                            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setLightboxUrl(null)}
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 24,
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            color: '#fff',
                            fontSize: 20,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >×</button>
                </div>
            )}
        </div>
    );
}