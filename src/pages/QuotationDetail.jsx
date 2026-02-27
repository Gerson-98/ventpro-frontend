// src/pages/QuotationDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import {
    FaFilePdf, FaCheckCircle, FaEdit, FaWhatsapp,
    FaPhone, FaCamera, FaCalculator, FaArrowLeft,
    FaBoxOpen, FaStickyNote
} from 'react-icons/fa';
import AddQuotationModal from '@/components/AddQuotationModal';
import { generateDocumentPDF } from '@/lib/generateDocumentPDF';
import ConfirmQuotationModal from '@/components/ConfirmQuotationModal';
import ProfilesReportModal from '../components/ProfilesReportModal';

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
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [glassColors, setGlassColors] = useState([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [isReportLoading, setIsReportLoading] = useState(false);

    const fetchQuotation = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/quotations/${id}`);
            setQuotation(response.data);
        } catch (error) {
            console.error("Error al obtener la cotización:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchGlassColors = async () => {
            try {
                const res = await api.get('/glass-colors');
                setGlassColors(res.data);
            } catch { }
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
            alert("No se pudo actualizar el estado del cliente.");
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
            alert("No se pudo generar el reporte de materiales");
            setIsReportModalOpen(false);
        } finally {
            setIsReportLoading(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!quotation?.client?.phone) {
            alert("Este cliente no tiene un número de teléfono registrado.");
            return;
        }
        let phone = quotation.client.phone.replace(/[^0-9]/g, '');
        if (phone.length === 8) phone = `502${phone}`;
        const msg = encodeURIComponent(`¡Hola ${quotation.client.name}! Te comparto la cotización para el proyecto "${quotation.project}". Por favor, avísame si tienes alguna duda. Saludos.`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    // ── Loading / Error states ─────────────────────────────────────────────
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
    const windowCount = quotation.quotation_windows?.length || 0;

    return (
        <div className="max-w-5xl mx-auto px-4 py-6">

            {/* ── Breadcrumb ── */}
            <Link
                to="/quotations"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors group"
            >
                <FaArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
                Volver a Cotizaciones
            </Link>

            {/* ── Header card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">

                {/* Top: info + botones */}
                <div className="flex justify-between items-start gap-4">

                    {/* Info izquierda */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                #{quotation.quotationNumber}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${isConfirmado
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                {quotation.status.replace('_', ' ')}
                            </span>
                            {quotation.include_iva && (
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                                    IVA incluido
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
                            {quotation.project}
                        </h1>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                            {/* Cliente */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</span>
                                <span className="text-sm font-semibold text-gray-700">{quotation.client?.name || 'N/A'}</span>
                            </div>
                            {/* Teléfono */}
                            {quotation.client?.phone && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <FaPhone size={11} />
                                    <span>{quotation.client.phone}</span>
                                </div>
                            )}
                            {/* Estado cliente */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</span>
                                <select
                                    value={quotation.client?.status || ''}
                                    onChange={handleClientStatusChange}
                                    disabled={isUpdatingStatus}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors disabled:opacity-50 ${clientStatusStyles[quotation.client?.status] || 'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}
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

                    {/* Botones derecha */}
                    <div className="flex flex-wrap gap-2 justify-end flex-shrink-0">

                        {/* Editar */}
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            disabled={isConfirmado}
                            title={isConfirmado ? 'No se puede editar una cotización confirmada' : 'Editar cotización'}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <FaEdit size={13} /> Editar
                        </button>

                        {/* Materiales */}
                        <button
                            onClick={handleCalculateMaterial}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                            title="Ver reporte de materiales"
                        >
                            <FaCalculator size={13} /> Materiales
                        </button>

                        {/* PDF */}
                        <button
                            onClick={() => generateDocumentPDF(quotation)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                            title="Descargar PDF"
                        >
                            <FaFilePdf size={13} /> PDF
                        </button>

                        {/* WhatsApp */}
                        <button
                            onClick={handleShareWhatsApp}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-all"
                            title="Compartir por WhatsApp"
                        >
                            <FaWhatsapp size={13} /> WhatsApp
                        </button>

                        {/* Confirmar / Ver Pedido */}
                        {isConfirmado ? (
                            quotation.generatedOrder ? (
                                <Link
                                    to={`/orders/${quotation.generatedOrder.id}`}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                                >
                                    <FaBoxOpen size={13} /> Ver Pedido
                                </Link>
                            ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-xl border border-gray-100 bg-gray-50">
                                    <FaCheckCircle size={13} /> Confirmado
                                </span>
                            )
                        ) : (
                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                            >
                                <FaCheckCircle size={13} /> Confirmar
                            </button>
                        )}
                    </div>
                </div>

                {/* Divider + Totales */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">Precio por m²:</span>{' '}
                        {quotation.price_per_m2 ? formatCurrency(quotation.price_per_m2) : <span className="italic text-gray-400">Variable por ventana</span>}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 mb-0.5">Total de la Cotización</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">
                            {formatCurrency(quotation.total_price)}
                        </p>
                    </div>
                </div>

                {/* ✅ NUEVO — Notas y foto de referencia */}
                {(quotation.notes || quotation.reference_image_url) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4">

                        {/* Notas */}
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

                        {/* Foto de referencia */}
                        {quotation.reference_image_url && (
                            <div className="flex flex-col items-start gap-2">
                                <div className="flex items-center gap-1.5">
                                    <FaCamera size={12} className="text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Foto de referencia</span>
                                </div>

                                <a href={`http://localhost:3000${quotation.reference_image_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <img
                                        src={`http://localhost:3000${quotation.reference_image_url}`}
                                        alt="Foto de referencia"
                                        className="h-24 w-auto rounded-xl border border-gray-200 object-cover shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                                    />
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Tabla de ventanas ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-base font-bold text-gray-800">Detalle de Ventanas</h2>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {windowCount} ítem{windowCount !== 1 ? 's' : ''}
                    </span>
                </div>

                <table className="min-w-full text-sm table-fixed">
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
                                    {/* Cantidad */}
                                    <td className="py-3.5 px-5 text-center">
                                        <span className="w-7 h-7 inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs rounded-lg">
                                            {win.quantity}
                                        </span>
                                    </td>

                                    {/* Tipo */}
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800">{win.displayName}</span>
                                            {win.design_image_url && (
                                                <a
                                                    href={`http://localhost:3000${win.design_image_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Ver diseño adjunto"
                                                    className="text-blue-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <FaCamera size={13} />
                                                </a>
                                            )}
                                        </div>
                                    </td>

                                    {/* Dimensiones */}
                                    <td className="py-3.5 px-5 font-mono text-xs text-gray-600">
                                        {(win.width_cm / 100).toFixed(2)}m × {(win.height_cm / 100).toFixed(2)}m
                                        <span className="ml-1.5 text-gray-400 not-italic">
                                            ({((win.width_cm / 100) * (win.height_cm / 100)).toFixed(2)} m²)
                                        </span>
                                    </td>

                                    {/* Color PVC */}
                                    <td className="py-3.5 px-5 text-gray-600">{win.pvcColor?.name}</td>

                                    {/* Vidrio */}
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

                                    {/* Precio */}
                                    <td className="py-3.5 px-5 text-right font-mono font-semibold text-gray-800">
                                        {formatCurrency(win.price)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* Footer con total */}
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

            {/* ── Modales ── */}
            {
                isEditModalOpen && (
                    <AddQuotationModal
                        open={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        quotationToEdit={quotation}
                        onSave={() => { setIsEditModalOpen(false); fetchQuotation(); }}
                    />
                )
            }

            {
                isConfirmModalOpen && (
                    <ConfirmQuotationModal
                        open={isConfirmModalOpen}
                        onClose={() => setIsConfirmModalOpen(false)}
                        quotationId={quotation.id}
                        onConfirmSuccess={(newOrderId) => navigate(`/orders/${newOrderId}`)}
                    />
                )
            }

            {
                isReportModalOpen && (
                    <ProfilesReportModal
                        data={reportData}
                        isLoading={isReportLoading}
                        onClose={() => setIsReportModalOpen(false)}
                        showPrices={true}
                    />
                )
            }
        </div>
    );
}