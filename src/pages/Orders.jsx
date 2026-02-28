// RUTA: src/pages/Orders.jsx

import { useEffect, useState, useMemo } from "react";
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
  FaTrashAlt,
  FaEye,
} from "react-icons/fa";

const ORDER_STATUSES = [
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'en_fabricacion', label: 'En Fabricación' },
  { value: 'listo_para_instalar', label: 'Listo para Instalar' },
  { value: 'en_ruta', label: 'En Ruta' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const STATUS_STYLES = {
  en_proceso: { badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  en_fabricacion: { badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  listo_para_instalar: { badge: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  en_ruta: { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', dot: 'bg-cyan-500' },
  completado: { badge: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
  cancelado: { badge: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status] || { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };

const statusLabel = (status) => {
  const found = ORDER_STATUSES.find(s => s.value === status);
  return found ? found.label : status || 'Sin estado';
};

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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    project: '', clientId: '', total: '', status: 'en_proceso',
  });
  const [filters, setFilters] = useState({ status: 'all', month: 'all', search: '' });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('❌ Error al obtener pedidos:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

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
    fetchOrders();
    fetchClients();
  }, []);

  const createOrder = async () => {
    if (!formData.project || !formData.clientId) {
      alert('Completa el nombre del proyecto y el cliente.');
      return;
    }
    try {
      await api.post('/orders', formData);
      setFormData({ project: '', clientId: '', total: '', status: 'en_proceso' });
      setOpen(false);
      fetchOrders();
    } catch (err) {
      console.error('❌ Error al crear pedido:', err);
      alert('No se pudo crear el pedido.');
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm('¿Eliminar este pedido permanentemente?')) return;
    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
    } catch (err) {
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

  // ── Métricas rápidas ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const active = orders.filter(o => !['completado', 'cancelado'].includes(o.status)).length;
    const completed = orders.filter(o => o.status === 'completado').length;
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
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaBoxOpen className="text-blue-600" />
            Pedidos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de órdenes de producción e instalación</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <FaPlus size={12} /> Nuevo Pedido
          </Button>
        )}
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Activos</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{metrics.active}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completados</p>
          <p className="text-3xl font-black text-green-600 mt-1">{metrics.completed}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Facturado</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{formatCurrency(metrics.total)}</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Buscar por proyecto o cliente..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Mes */}
        <select
          value={filters.month}
          onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
          className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Todos los meses</option>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {/* Estado */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Todos los estados</option>
          {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <span className="ml-auto text-sm text-gray-400 font-medium">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Lista de pedidos ── */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <FaBoxOpen size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No hay pedidos que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const clientData = order.client || order.clients;
            const style = getStatusStyle(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                {/* Card body */}
                <div className="p-5 flex-1">
                  {/* Top: número + badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      #{order.id}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  {/* Proyecto */}
                  <h2 className="font-bold text-gray-900 text-base leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                    {order.project}
                  </h2>

                  {/* Cliente */}
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{clientData?.name || 'Sin cliente'}</span>
                  </p>
                  {clientData?.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                      <FaPhoneAlt size={10} />
                      <span>{clientData.phone}</span>
                    </div>
                  )}

                  {/* Fecha de instalación */}
                  {order.installationStartDate && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg w-fit mb-3">
                      <FaCalendarAlt size={10} />
                      <span>{formatDate(order.installationStartDate)}</span>
                      {order.installationEndDate && order.installationEndDate !== order.installationStartDate && (
                        <span className="text-indigo-400">→ {formatDate(order.installationEndDate)}</span>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <p className="text-lg font-black text-gray-900">
                    {formatCurrency(order.total)}
                  </p>
                </div>

                {/* Footer */}
                <div
                  className="px-5 py-3 border-t border-gray-100 flex justify-between items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <FaEye size={12} /> Ver detalles
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      onClick={() => deleteOrder(order.id)}
                    >
                      <FaTrashAlt size={12} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal crear pedido ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white p-6 rounded-2xl shadow-lg max-w-md" aria-describedby="add-order-desc">
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