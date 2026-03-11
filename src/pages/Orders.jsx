// RUTA: src/pages/Orders.jsx

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import AddClientModal from "@/components/AddClientModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FaPhoneAlt,
  FaCalendarAlt,
  FaBoxOpen,
  FaSearch,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import {
  ORDER_STATUS,
  ORDER_STATUS_LIST,
  getStatusStyle,
  getStatusLabel,
} from '@/config/orderStatuses';

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCurrency = (n) =>
  `Q ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const months = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export default function Orders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    project: '', clientId: '', total: '', status: ORDER_STATUS.EN_PROCESO,
  });
  const [filters, setFilters] = useState({ status: 'all', month: 'all', search: '' });

  // ── Fetch paginado ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/orders', { params: { page, limit: 50 } });
      const { data, total, totalPages } = res.data;
      setOrders(Array.isArray(data) ? data : []);
      setPagination({ page, total, totalPages });
    } catch (err) {
      console.error('❌ Error al obtener pedidos:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('❌ Error al obtener clientes:', err);
      setClients([]);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    fetchClients();
  }, [fetchOrders]);

  const createOrder = async () => {
    if (!formData.project || !formData.clientId) {
      alert('Completa el nombre del proyecto y el cliente.');
      return;
    }
    try {
      const res = await api.post('/orders', formData);
      setFormData({ project: '', clientId: '', total: '', status: ORDER_STATUS.EN_PROCESO });
      setOpen(false);
      // ── Actualización optimista: insertar al inicio sin refetch ───────────
      setOrders(prev => [res.data, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
    } catch (err) {
      console.error('❌ Error al crear pedido:', err);
      alert('No se pudo crear el pedido.');
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm('¿Eliminar este pedido permanentemente?')) return;
    // ── Actualización optimista ───────────────────────────────────────────
    const previous = orders;
    setOrders(prev => prev.filter(o => o.id !== id));
    setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    try {
      await api.delete(`/orders/${id}`);
    } catch (err) {
      // Revertir en caso de error
      setOrders(previous);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      console.error('❌ Error al eliminar pedido:', err);
      alert('No se pudo eliminar el pedido.');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const clientData = order.client || order.clients;
      const orderDate = new Date(order.createdAt);
      const matchesStatus = filters.status === 'all' || order.status === filters.status;
      const matchesMonth = filters.month === 'all' || (orderDate.getMonth() + 1) === parseInt(filters.month);
      const searchTerm = filters.search.toLowerCase().trim();
      const matchesSearch = !searchTerm
        || order.project?.toLowerCase().includes(searchTerm)
        || clientData?.name?.toLowerCase().includes(searchTerm)
        || clientData?.phone?.includes(searchTerm);
      return matchesStatus && matchesMonth && matchesSearch;
    });
  }, [orders, filters]);

  const metrics = useMemo(() => {
    const active = orders.filter(o => ![ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO].includes(o.status)).length;
    const completed = orders.filter(o => o.status === ORDER_STATUS.COMPLETADO).length;
    const total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    return { active, completed, total };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Cargando pedidos...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaBoxOpen className="text-blue-600" />
            Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Gestión de órdenes de producción e instalación</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 flex-shrink-0"
          >
            <FaPlus size={12} />
            <span className="hidden sm:inline">Nuevo Pedido</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        )}
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5 sm:mb-6">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Activos</p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{metrics.active}</p>
          <p className="text-[9px] text-gray-300 mt-0.5">esta página</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Completados</p>
          <p className="text-2xl sm:text-3xl font-black text-green-600 mt-1">{metrics.completed}</p>
          <p className="text-[9px] text-gray-300 mt-0.5">esta página</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Facturado</p>
          <p className="text-base sm:text-2xl font-black text-blue-700 mt-1 truncate">{formatCurrency(metrics.total)}</p>
          <p className="text-[9px] text-gray-300 mt-0.5">esta página</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 mb-5 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Buscar por proyecto o cliente..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filters.month}
            onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
            className="flex-1 sm:flex-none border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Todos los meses</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="flex-1 sm:flex-none border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Todos los estados</option>
            {ORDER_STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <span className="text-xs text-gray-400 font-medium sm:ml-auto">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tabla (md+) / Cards (móvil) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FaBoxOpen size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay pedidos que coincidan con los filtros.</p>
          </div>
        ) : (
          <>
            {/* ── TABLA — md+ ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                    <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Instalación</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => {
                    const clientData = order.client || order.clients;
                    const style = getStatusStyle(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="py-3.5 px-5">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            #{order.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-gray-800">{order.project}</td>
                        <td className="py-3.5 px-5 text-gray-600">
                          <div>{clientData?.name || <span className="text-gray-300 italic">Sin cliente</span>}</div>
                          {clientData?.phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <FaPhoneAlt size={9} />{clientData.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-gray-500">
                          {order.generatedFromQuotation?.user?.name || <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-indigo-600">
                          {order.installationStartDate ? (
                            <div className="flex items-center gap-1.5">
                              <FaCalendarAlt size={10} />
                              <span>{formatDate(order.installationStartDate)}</span>
                              {order.installationEndDate && order.installationEndDate !== order.installationStartDate && (
                                <span className="text-indigo-400">→ {formatDate(order.installationEndDate)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold text-gray-800">
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── CARDS — móvil (< md) ── */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const clientData = order.client || order.clients;
                const style = getStatusStyle(order.status);
                return (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-blue-50/30 active:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    {/* Fila 1: ID + estado */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        #{order.id}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    {/* Proyecto */}
                    <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{order.project}</p>
                    {/* Cliente */}
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <span>{clientData?.name || <span className="italic text-gray-300">Sin cliente</span>}</span>
                      {clientData?.phone && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <FaPhoneAlt size={9} />{clientData.phone}
                        </span>
                      )}
                    </div>
                    {/* Fila final: fecha instalación + total */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-500 flex items-center gap-1">
                        {order.installationStartDate ? (
                          <><FaCalendarAlt size={9} />{formatDate(order.installationStartDate)}</>
                        ) : (
                          <span className="text-gray-300">Sin fecha</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-sm">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                    {order.generatedFromQuotation?.user?.name && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Vendedor: {order.generatedFromQuotation.user.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer con paginación */}
            <div className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs text-gray-400">
                {filteredOrders.length} en página · {pagination.total} totales
              </span>
              {/* Controles de paginación */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchOrders(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  <span className="text-xs text-gray-600 px-2 font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchOrders(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              )}
              <span className="text-xs font-semibold text-gray-600">
                Q {filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Modal crear pedido ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white p-6 rounded-2xl shadow-lg max-w-md mx-4 sm:mx-auto" aria-describedby="add-order-desc">
          <DialogHeader>
            <DialogTitle>Nuevo Pedido</DialogTitle>
            <DialogDescription id="add-order-desc" className="text-sm text-gray-500">
              Completa los datos para crear un pedido manualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nombre del Proyecto</Label>
              <Input
                value={formData.project}
                onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                placeholder="Ej: Proyecto Santa Rosa"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cliente</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Seleccione cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button
                  type="button"
                  onClick={() => setShowAddClient(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                >
                  <FaPlus size={12} />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total (Q) — opcional</Label>
              <Input
                type="number"
                value={formData.total}
                onChange={(e) => setFormData(prev => ({ ...prev, total: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
              Guardar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddClientModal
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onSave={(newClient) => {
          setClients(prev => [...prev, newClient]);
          setFormData(prev => ({ ...prev, clientId: newClient.id }));
          setShowAddClient(false);
        }}
      />
    </div>
  );
}