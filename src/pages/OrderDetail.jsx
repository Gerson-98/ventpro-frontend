// RUTA: src/pages/OrderDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  FaMoneyBillWave, FaFilePdf, FaArrowLeft, FaFileAlt, FaChartBar,
  FaMagic, FaCalendarAlt,
  FaCamera, FaFileInvoice, FaPhoneAlt, FaUser, FaExternalLinkAlt, FaStickyNote,
} from 'react-icons/fa';
import AddWindowModal from '@/components/AddWindowModal';
import ProfilesReportModal from '@/components/ProfilesReportModal';
import CutOptimizationModal from '@/components/CutOptimizationModal';
import GlassCutModal from '@/components/GlassCutModal';
import RescheduleOrderModal from '@/components/RescheduleOrderModal';
import EditOrderWindowModal from '@/components/EditOrderWindowModal';
import { useAuth } from '@/context/AuthContext';
import { generateDocumentPDF } from '@/lib/generateDocumentPDF';
import ChecklistPanel from '@/components/ChecklistPanel';
import {
  ORDER_STATUS_LIST,
  getStatusStyle,
  getStatusLabel,
} from '@/config/orderStatuses';
import useOrderData from '@/hooks/useOrderData';
import useOrderReports from '@/hooks/useOrderReports';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

const formatCurrency = (n) =>
  `Q ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatInstallationDate = (start, end) => {
  if (!start) return 'No agendado';
  const s = formatDate(start);
  const e = formatDate(end);
  if (!e || s === e) return s;
  return `${s} — ${e}`;
};

export default function OrderDetail() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Hooks de datos y reportes ────────────────────────────────────────────────
  const { order, setOrder, loading, refetch } = useOrderData(id);
  const {
    handleGenerateReport,
    handleOptimizeCuts,
    showReportModal,
    setShowReportModal,
    reportData,
    isReportLoading,
    showOptimizationModal,
    setShowOptimizationModal,
    optimizationData,
    isOptimizationLoading,
  } = useOrderReports(id);

  const [glassColors, setGlassColors] = useState([]);
  const [includeIva, setIncludeIva] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modales de ventanas y agenda
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [windowToEdit, setWindowToEdit] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Modal de corte de vidrio (no cubierto por useOrderReports)
  const [showGlassModal, setShowGlassModal] = useState(false);
  const [glassCutData, setGlassCutData] = useState({});
  const [isGlassLoading, setIsGlassLoading] = useState(false);

  // Sincronizar includeIva desde los datos del pedido cuando carguen
  useEffect(() => {
    if (order?.include_iva !== undefined) setIncludeIva(!!order.include_iva);
  }, [order]);

  useEffect(() => {
    const fetchGlass = async () => {
      try {
        const res = await api.get('/glass-colors');
        setGlassColors(res.data || []);
      } catch { /* silencioso */ }
    };
    fetchGlass();
  }, []);

  // ── Handlers de acciones ─────────────────────────────────────────────────────
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      setOrder(prev => ({ ...prev, status: newStatus }));
    } catch {
      alert('No se pudo actualizar el estado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleIvaToggle = async () => {
    try {
      const nuevoEstado = !includeIva;
      await api.patch(`/orders/${order.id}`, { include_iva: nuevoEstado });
      setIncludeIva(nuevoEstado);
      await refetch();
    } catch {
      console.error('Error al cambiar IVA');
    }
  };

  const handleDelete = async (winId) => {
    if (!confirm('¿Eliminar esta ventana del pedido?')) return;
    try {
      await api.delete(`/windows/${winId}`);
      await refetch();
    } catch {
      alert('Error al eliminar la ventana.');
    }
  };

  const handleDuplicate = async (winId) => {
    try {
      await api.post(`/windows/${winId}/duplicate`);
      await refetch();
    } catch {
      alert('No se pudo duplicar la ventana.');
    }
  };

  const openEditModal = (win) => {
    setWindowToEdit(win);
    setShowEditModal(true);
  };

  const handleGlassCuts = async () => {
    setIsGlassLoading(true);
    setShowGlassModal(true);
    try {
      const res = await api.get(`/reports/order/${id}/glass-cuts`);
      setGlassCutData(res.data);
    } catch {
      alert('No se pudo generar el corte de vidrio.');
      setShowGlassModal(false);
    } finally {
      setIsGlassLoading(false);
    }
  };

  const handleGeneratePDF = () => generateDocumentPDF(order, 'order');

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center py-32 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Cargando pedido...
      </div>
    );
  }
  if (!order) {
    return (
      <div className="text-center py-32">
        <p className="text-red-500 font-medium">No se encontró el pedido.</p>
        <Link to="/orders" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
          ← Volver a Pedidos
        </Link>
      </div>
    );
  }

  const displayedTotal = includeIva ? (order.total || 0) * 1.12 : (order.total || 0);
  const windowCount = order.windows?.length || 0;
  const clientData = order.client;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">

      {/* ── Breadcrumb ── */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors group"
      >
        <FaArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver a Pedidos
      </Link>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-5">

        {/* Fila superior: info + acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

          {/* Columna izquierda */}
          <div className="flex-1 min-w-0 w-full">

            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                Pedido #{order.id}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusStyle(order.status).badgeFull}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(order.status).dot}`} />
                {getStatusLabel(order.status)}
              </span>
              {order.generatedFromQuotationId && (
                <Link
                  to={`/quotations/${order.generatedFromQuotationId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
                  title="Ver cotización original"
                >
                  <FaFileInvoice size={10} />
                  <span className="hidden sm:inline">Cotización #{order.generatedFromQuotationId}</span>
                  <span className="sm:hidden">Cot. #{order.generatedFromQuotationId}</span>
                  <FaExternalLinkAlt size={9} />
                </Link>
              )}
            </div>

            {/* Proyecto */}
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 leading-tight">{order.project}</h1>

            {/* Cliente */}
            {clientData && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1.5">
                  <FaUser size={11} className="text-gray-400" />
                  <span className="font-semibold text-gray-800">{clientData.name}</span>
                </span>
                {clientData.phone && (
                  <span className="flex items-center gap-1.5">
                    <FaPhoneAlt size={11} className="text-gray-400" />
                    {clientData.phone}
                  </span>
                )}
              </div>
            )}

            {/* Notas del pedido */}
            {order.notes && (
              <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FaStickyNote size={12} className="text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Notas</span>
                </div>
                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{order.notes}</p>
              </div>
            )}

            {/* Notas de la cotización origen */}
            {order.generatedFromQuotation?.notes && order.generatedFromQuotation.notes !== order.notes && (
              <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FaStickyNote size={12} className="text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Notas de cotización</span>
                </div>
                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{order.generatedFromQuotation.notes}</p>
              </div>
            )}

            {/* Total + IVA toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total</p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900">{formatCurrency(displayedTotal)}</p>
                {includeIva && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">IVA incluido (12%)</p>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={includeIva}
                    onChange={handleIvaToggle}
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  <span className="ml-2 text-xs font-semibold text-gray-600">Incluir IVA</span>
                </label>
              </div>
            </div>
          </div>

          {/* Columna derecha — estado + fecha */}
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3 w-full sm:w-auto flex-wrap">
            <select
              value={order.status || ''}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus || !isAdmin}
              className={`px-3 py-1.5 text-xs border rounded-full font-semibold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors outline-none focus:ring-2 focus:ring-blue-400 ${getStatusStyle(order.status).badgeFull}`}
            >
              {ORDER_STATUS_LIST.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {order.installationStartDate ? (
              <div className="sm:text-right">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <FaCalendarAlt size={12} className="text-indigo-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{formatInstallationDate(order.installationStartDate, order.installationEndDate)}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1 underline-offset-2 hover:underline"
                  >
                    Reprogramar
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Sin fecha de instalación</span>
            )}
          </div>
        </div>

        {/* ── Botones de acción ── */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 text-xs sm:text-sm"
              onClick={handleGenerateReport}
            >
              <FaChartBar size={11} />
              <span className="hidden sm:inline">Reporte Perfiles</span>
              <span className="sm:hidden">Perfiles</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 text-xs sm:text-sm"
              onClick={handleOptimizeCuts}
            >
              <FaMagic size={11} />
              <span className="hidden sm:inline">Optimizar Cortes</span>
              <span className="sm:hidden">Cortes</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 text-xs sm:text-sm"
              onClick={handleGlassCuts}
            >
              <FaFileAlt size={11} />
              <span className="hidden sm:inline">Corte Vidrio</span>
              <span className="sm:hidden">Vidrio</span>
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white ml-auto text-xs sm:text-sm"
              onClick={handleGeneratePDF}
            >
              <FaFilePdf size={11} />
              <span className="hidden sm:inline">PDF Pedido</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Tabla de ventanas (md+) / Cards (móvil) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-800">Detalle de Ventanas</h2>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
            {windowCount} ítem{windowCount !== 1 ? 's' : ''}
          </span>
        </div>

        {windowCount === 0 ? (
          <p className="py-12 text-center text-gray-400 text-sm">No hay ventanas en este pedido.</p>
        ) : (
          <>
            {/* ── TABLA — md+ ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <colgroup>
                  <col className="w-auto" />
                  <col className="w-16" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-16" />
                  <col className="w-28" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">#V</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Medidas (cm)</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Hoja (cm)</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Vidrio (cm)</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">PVC</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Vidrio</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant.</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...(order.windows || [])].sort((a, b) => a.id - b.id).map((win, winIdx) => {
                    const isVidrioYDuela = win.glassColor?.name?.toUpperCase() === 'VIDRIO Y DUELA';
                    const additionalGlass = isVidrioYDuela && win.options?.vidrio_adicional_id
                      ? glassColors.find(g => g.id === Number(win.options.vidrio_adicional_id))
                      : null;
                    return (
                      <tr key={win.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 block leading-tight">
                              {win.displayName || win.window_type?.name || 'Desconocido'}
                            </span>
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
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            V{winIdx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-700 font-semibold">
                          {win.width_cm} × {win.height_cm}
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-mono">
                          {win.hojaAncho ? `${win.hojaAncho}×${win.hojaAlto}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-mono">
                          {win.vidrioAncho ? `${win.vidrioAncho}×${win.vidrioAlto}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs text-gray-600">{win.pvcColor?.name || '—'}</td>
                        <td className="py-3.5 px-4 text-center text-xs">
                          {isVidrioYDuela && additionalGlass ? (
                            <div className="leading-tight">
                              <span className="text-gray-600 block">{win.glassColor.name}</span>
                              <span className="text-blue-600 font-bold block">/ {additionalGlass.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-600">{win.glassColor?.name || '—'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="w-7 h-7 inline-flex items-center justify-center bg-gray-100 text-gray-700 font-bold text-xs rounded-lg">
                            {win.quantity || 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-black text-gray-900">
                          {formatCurrency(win.price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50/70">
                  <tr>
                    <td colSpan={8} className="py-3 px-5 text-sm font-semibold text-gray-600 text-right">
                      {includeIva ? 'Total con IVA (12%)' : 'Total del pedido'}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-black text-gray-900 text-base">
                      {formatCurrency(displayedTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── CARDS — móvil (< md) ── */}
            <div className="md:hidden divide-y divide-gray-100">
              {[...(order.windows || [])].sort((a, b) => a.id - b.id).map((win, winIdx) => {
                const isVidrioYDuela = win.glassColor?.name?.toUpperCase() === 'VIDRIO Y DUELA';
                const additionalGlass = isVidrioYDuela && win.options?.vidrio_adicional_id
                  ? glassColors.find(g => g.id === Number(win.options.vidrio_adicional_id))
                  : null;
                return (
                  <div key={win.id} className="p-4">
                    {/* Fila: número + nombre */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex-shrink-0">
                          V{winIdx + 1}
                        </span>
                        <span className="font-semibold text-gray-800 text-sm truncate">
                          {win.displayName || win.window_type?.name || 'Desconocido'}
                        </span>
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
                      <span className="font-mono font-black text-gray-900 text-sm flex-shrink-0">
                        {formatCurrency(win.price)}
                      </span>
                    </div>
                    {/* Detalles en grid compacto */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Medidas: <span className="font-mono font-semibold text-gray-700">{win.width_cm}×{win.height_cm} cm</span></span>
                      <span>Cant: <span className="font-semibold text-gray-700">{win.quantity || 1}</span></span>
                      {win.hojaAncho && (
                        <span>Hoja: <span className="font-mono text-gray-600">{win.hojaAncho}×{win.hojaAlto}</span></span>
                      )}
                      {win.vidrioAncho && (
                        <span>Vidrio calc: <span className="font-mono text-gray-600">{win.vidrioAncho}×{win.vidrioAlto}</span></span>
                      )}
                      <span>PVC: <span className="text-gray-700">{win.pvcColor?.name || '—'}</span></span>
                      <span>
                        Vidrio:{' '}
                        <span className="text-gray-700">
                          {isVidrioYDuela && additionalGlass
                            ? `${win.glassColor.name} / ${additionalGlass.name}`
                            : win.glassColor?.name || '—'}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Footer total en móvil */}
              <div className="px-4 py-3 bg-gray-50/70 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">
                  {includeIva ? 'Total con IVA (12%)' : 'Total del pedido'}
                </span>
                <span className="font-mono font-black text-gray-900">{formatCurrency(displayedTotal)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Checklists ── */}
      {isAdmin && (
        <div className="mb-6">
          <ChecklistPanel orderId={Number(id)} isAdmin={isAdmin} />
        </div>
      )}

      {/* ── Modales ── */}
      {showAddModal && (
        <AddWindowModal
          orderId={Number(order.id)}
          onClose={() => setShowAddModal(false)}
          onSave={async () => { setShowAddModal(false); await refetch(); }}
        />
      )}

      <EditOrderWindowModal
        open={showEditModal}
        windowData={windowToEdit}
        onClose={() => { setShowEditModal(false); setWindowToEdit(null); }}
        onSave={async () => { setShowEditModal(false); setWindowToEdit(null); await refetch(); }}
      />

      {showReportModal && (
        <ProfilesReportModal
          data={reportData}
          isLoading={isReportLoading}
          onClose={() => setShowReportModal(false)}
          showPrices={false}
          projectName={order?.project}
          orderId={order?.id}
        />
      )}

      {showOptimizationModal && (
        <CutOptimizationModal
          isLoading={isOptimizationLoading}
          optimizationData={optimizationData}
          onClose={() => setShowOptimizationModal(false)}
          projectName={order?.project}
          orderId={order?.id}
          clientName={order?.client?.name}
          windows={order?.windows || []}
        />
      )}

      {showGlassModal && (
        <GlassCutModal
          isLoading={isGlassLoading}
          glassCutData={glassCutData}
          onClose={() => setShowGlassModal(false)}
          projectName={order?.project}
        />
      )}

      {showRescheduleModal && (
        <RescheduleOrderModal
          open={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          order={order}
          onRescheduleSuccess={() => { setShowRescheduleModal(false); refetch(); }}
        />
      )}

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
