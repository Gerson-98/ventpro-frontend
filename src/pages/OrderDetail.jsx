// RUTA: src/pages/OrderDetail.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  FaMoneyBillWave, FaFilePdf, FaArrowLeft, FaFileAlt, FaChartBar,
  FaPlus, FaTrashAlt, FaEdit, FaClone, FaMagic, FaCalendarAlt,
  FaCamera, FaFileInvoice, FaPhoneAlt, FaUser, FaExternalLinkAlt,
} from 'react-icons/fa';
import AddWindowModal from '@/components/AddWindowModal';
import ProfilesReportModal from '@/components/ProfilesReportModal';
import CutOptimizationModal from '@/components/CutOptimizationModal';
import RescheduleOrderModal from '@/components/RescheduleOrderModal';
import EditOrderWindowModal from '@/components/EditOrderWindowModal';
import { useAuth } from '@/context/AuthContext';
import { generateDocumentPDF } from '@/lib/generateDocumentPDF';
import ChecklistPanel from '@/components/ChecklistPanel';

// ─── Constantes de estado ──────────────────────────────────────────────────────
const ORDER_STATUSES = [
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'en_fabricacion', label: 'En Fabricación' },
  { value: 'listo_para_instalar', label: 'Listo para Instalar' },
  { value: 'en_ruta', label: 'En Ruta' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const STATUS_STYLES = {
  en_proceso: 'bg-blue-100 text-blue-800 border-blue-300',
  en_fabricacion: 'bg-orange-100 text-orange-800 border-orange-300',
  listo_para_instalar: 'bg-purple-100 text-purple-800 border-purple-300',
  en_ruta: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  completado: 'bg-green-100 text-green-800 border-green-300',
  cancelado: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_DOT = {
  en_proceso: 'bg-blue-500',
  en_fabricacion: 'bg-orange-500',
  listo_para_instalar: 'bg-purple-500',
  en_ruta: 'bg-cyan-500',
  completado: 'bg-green-500',
  cancelado: 'bg-red-500',
};

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

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

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [glassColors, setGlassColors] = useState([]);
  const [includeIva, setIncludeIva] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [windowToEdit, setWindowToEdit] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({});
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [showOptModal, setShowOptModal] = useState(false);
  const [optimizationData, setOptimizationData] = useState({});
  const [isOptLoading, setIsOptLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // ── Fetch order ─────────────────────────────────────────────────────────────
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
      if (res.data.include_iva !== undefined) setIncludeIva(!!res.data.include_iva);
    } catch (err) {
      console.error('❌ Error al obtener pedido:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  // ── Glass colors (para resolver VIDRIO Y DUELA en la tabla) ─────────────────
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
      await fetchOrder();
    } catch {
      console.error('Error al cambiar IVA');
    }
  };

  const handleDelete = async (winId) => {
    if (!confirm('¿Eliminar esta ventana del pedido?')) return;
    try {
      await api.delete(`/windows/${winId}`);
      await fetchOrder();
    } catch {
      alert('Error al eliminar la ventana.');
    }
  };

  const handleDuplicate = async (winId) => {
    try {
      await api.post(`/windows/${winId}/duplicate`);
      await fetchOrder();
    } catch {
      alert('No se pudo duplicar la ventana.');
    }
  };

  const openEditModal = (win) => {
    setWindowToEdit(win);
    setShowEditModal(true);
  };

  const handleGenerateReport = async () => {
    setIsReportLoading(true);
    setShowReportModal(true);
    try {
      const res = await api.get(`/reports/order/${id}/profiles`);
      setReportData(res.data);
    } catch {
      alert('No se pudo generar el reporte.');
      setShowReportModal(false);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleOptimizeCuts = async () => {
    setIsOptLoading(true);
    setShowOptModal(true);
    try {
      const res = await api.get(`/reports/order/${id}/optimize-cuts`);
      setOptimizationData(res.data);
    } catch {
      alert('No se pudo generar el plan de corte.');
      setShowOptModal(false);
    } finally {
      setIsOptLoading(false);
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
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Breadcrumb ── */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors group"
      >
        <FaArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver a Pedidos
      </Link>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex justify-between items-start gap-6 flex-wrap">

          {/* Columna izquierda — info principal */}
          <div className="flex-1 min-w-0">

            {/* Número + estado */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                Pedido #{order.id}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] || 'bg-gray-400'}`} />
                {ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
              </span>
              {order.generatedFromQuotationId && (
                <Link
                  to={`/quotations/${order.generatedFromQuotationId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
                  title="Ver cotización original"
                >
                  <FaFileInvoice size={10} />
                  Cotización #{order.generatedFromQuotationId}
                  <FaExternalLinkAlt size={9} />
                </Link>
              )}
            </div>

            {/* Proyecto */}
            <h1 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{order.project}</h1>

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

            {/* Total */}
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total</p>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(displayedTotal)}</p>
                {includeIva && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">IVA incluido (12%)</p>
                )}
              </div>

              {/* Toggle IVA */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 ml-2">
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

          {/* Columna derecha — estado + fecha + acciones */}
          <div className="flex flex-col items-end gap-3 shrink-0">

            {/* Selector de estado */}
            <select
              value={order.status || ''}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus || !isAdmin}
              className={`px-3 py-1.5 text-xs border rounded-full font-semibold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors outline-none focus:ring-2 focus:ring-blue-400 ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}
            >
              {ORDER_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Fecha instalación */}
            {order.installationStartDate ? (
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <FaCalendarAlt size={12} className="text-indigo-500" />
                  <span>{formatInstallationDate(order.installationStartDate, order.installationEndDate)}</span>
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
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowAddModal(true)}
            >
              <FaPlus size={11} /> Añadir Ventana
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5"
              onClick={handleGenerateReport}
            >
              <FaChartBar size={11} /> Reporte Perfiles
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5"
              onClick={handleOptimizeCuts}
            >
              <FaMagic size={11} /> Optimizar Cortes
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white ml-auto"
              onClick={handleGeneratePDF}
            >
              <FaFilePdf size={11} /> PDF Pedido
            </Button>
          </div>
        )}
      </div>

      {/* ── Tabla de ventanas ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-800">Detalle de Ventanas</h2>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
            {windowCount} ítem{windowCount !== 1 ? 's' : ''}
          </span>
        </div>

        <table className="min-w-full text-sm">
          <colgroup>
            <col className="w-auto" />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-28" />
            {isAdmin && <col className="w-32" />}
          </colgroup>
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Medidas (cm)</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Hoja (cm)</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Vidrio (cm)</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">PVC</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Vidrio</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant.</th>
              <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
              {isAdmin && (
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(order.windows || []).map((win) => {
              const isVidrioYDuela = win.glassColor?.name?.toUpperCase() === 'VIDRIO Y DUELA';
              const additionalGlass = isVidrioYDuela && win.options?.vidrio_adicional_id
                ? glassColors.find(g => g.id === Number(win.options.vidrio_adicional_id))
                : null;

              return (
                <tr key={win.id} className="hover:bg-slate-50/60 transition-colors">

                  {/* Tipo */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="font-semibold text-gray-800 block leading-tight">
                          {win.displayName || win.window_type?.name || 'Desconocido'}
                        </span>
                      </div>
                      {win.design_image_url && (
                        <a
                          href={`${API_BASE}${win.design_image_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver diseño adjunto"
                          className="text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                        >
                          <FaCamera size={12} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Medidas */}
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-700 font-semibold">
                    {win.width_cm} × {win.height_cm}
                  </td>

                  {/* Hoja */}
                  <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-mono">
                    {win.hojaAncho ? `${win.hojaAncho.toFixed(1)}×${win.hojaAlto.toFixed(1)}` : '—'}
                  </td>

                  {/* Vidrio calc */}
                  <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-mono">
                    {win.vidrioAncho ? `${win.vidrioAncho.toFixed(1)}×${win.vidrioAlto.toFixed(1)}` : '—'}
                  </td>

                  {/* Color PVC */}
                  <td className="py-3.5 px-4 text-center text-xs text-gray-600">
                    {win.pvcColor?.name || '—'}
                  </td>

                  {/* Color Vidrio */}
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

                  {/* Cantidad */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="w-7 h-7 inline-flex items-center justify-center bg-gray-100 text-gray-700 font-bold text-xs rounded-lg">
                      {win.quantity || 1}
                    </span>
                  </td>

                  {/* Precio */}
                  <td className="py-3.5 px-5 text-right font-mono font-black text-gray-900">
                    {formatCurrency(win.price)}
                  </td>

                  {/* Acciones */}
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => openEditModal(win)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(win.id)}
                          title="Duplicar"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <FaClone size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(win.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {windowCount === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-gray-400 text-sm">
                  No hay ventanas en este pedido.
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer total */}
          <tfoot className="border-t-2 border-gray-200 bg-gray-50/70">
            <tr>
              <td colSpan={isAdmin ? 7 : 6} className="py-3 px-5 text-sm font-semibold text-gray-600 text-right">
                {includeIva ? 'Total con IVA (12%)' : 'Total del pedido'}
              </td>
              <td className="py-3 px-5 text-right font-mono font-black text-gray-900 text-base">
                {formatCurrency(displayedTotal)}
              </td>
              {isAdmin && <td />}
            </tr>
          </tfoot>
        </table>
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
          onSave={async () => { setShowAddModal(false); await fetchOrder(); }}
        />
      )}

      <EditOrderWindowModal
        open={showEditModal}
        windowData={windowToEdit}
        onClose={() => { setShowEditModal(false); setWindowToEdit(null); }}
        onSave={async () => { setShowEditModal(false); setWindowToEdit(null); await fetchOrder(); }}
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

      {showOptModal && (
        <CutOptimizationModal
          isLoading={isOptLoading}
          optimizationData={optimizationData}
          onClose={() => setShowOptModal(false)}
          projectName={order?.project}
        />
      )}

      {showRescheduleModal && (
        <RescheduleOrderModal
          open={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          order={order}
          onRescheduleSuccess={() => { setShowRescheduleModal(false); fetchOrder(); }}
        />
      )}
    </div>
  );
}