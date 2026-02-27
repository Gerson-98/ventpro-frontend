// RUTA: src/pages/Orders.jsx

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { FaPhoneAlt, FaCalendarAlt } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddClientModal from "@/components/AddClientModal";

// ✅ CORREGIDO: Claves con guión bajo, igual que OrderDetail.jsx y el backend
const ORDER_STATUSES = [
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'en_fabricacion', label: 'En Fabricación' },
  { value: 'listo_para_instalar', label: 'Listo para Instalar' },
  { value: 'en_ruta', label: 'En Ruta' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const orderStatusStyles = {
  'en_proceso': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'en_fabricacion': 'bg-blue-100 text-blue-800 border-blue-300',
  'listo_para_instalar': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'en_ruta': 'bg-purple-100 text-purple-800 border-purple-300',
  'completado': 'bg-green-100 text-green-800 border-green-300',
  'cancelado': 'bg-red-100 text-red-800 border-red-300',
};

// Etiquetas legibles para mostrar en la tarjeta
const statusLabel = (status) => {
  const found = ORDER_STATUSES.find(s => s.value === status);
  return found ? found.label : status || 'Sin estado';
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('es-GT', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [formData, setFormData] = useState({
    project: "",
    clientId: "",
    total: "",
    status: "en_proceso",
  });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    status: "all",
    month: "all",
  });

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders");
      const data = res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error al obtener pedidos:", err);
      setOrders([]);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      const data = res.data;
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error al obtener clientes:", err);
      setClients([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchClients();
  }, []);

  const createOrder = async () => {
    try {
      await api.post("/orders", formData);
      setFormData({ project: "", clientId: "", total: "", status: "en_proceso" });
      setOpen(false);
      fetchOrders();
    } catch (err) {
      console.error("❌ Error al crear pedido:", err);
      alert("No se pudo crear el pedido.");
    }
  };

  const deleteOrder = async (id) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
    } catch (err) {
      console.error("❌ Error al eliminar pedido:", err);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const matchesStatus = filters.status === 'all' || order.status === filters.status;
      const matchesMonth = filters.month === 'all' || (orderDate.getMonth() + 1) === parseInt(filters.month);
      return matchesStatus && matchesMonth;
    });
  }, [orders, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const months = [
    { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
    { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
  ];

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>📦</span> Pedidos
        </h1>
        {user?.role === 'ADMIN' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Agregar Pedido</Button>
            </DialogTrigger>
            <DialogContent
              className="bg-white p-6 rounded-xl shadow-lg max-w-md"
              aria-describedby="add-order-description"
            >
              <DialogHeader>
                <DialogTitle>Nuevo Pedido</DialogTitle>
                <p id="add-order-description" className="text-sm text-gray-500 mt-1">
                  Llena los datos para crear un nuevo pedido.
                </p>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Nombre del Proyecto</Label>
                  <Input
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    placeholder="Ej: Proyecto Santa Rosa"
                    required
                  />
                </div>
                <div>
                  <Label>Cliente</Label>
                  <div className="flex gap-2">
                    <select
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="flex-1 border rounded p-2"
                      required
                    >
                      <option value="">Seleccione cliente...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={() => setShowAddClient(true)}
                      className="bg-green-600 hover:bg-green-700"
                      type="button"
                    >
                      ➕
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Total (Q)</Label>
                  <Input
                    type="number"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    placeholder="Ej: 2500"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createOrder}>Guardar Pedido</Button>
              </DialogFooter>
              <AddClientModal
                open={showAddClient}
                onClose={() => setShowAddClient(false)}
                onSave={(newClient) => {
                  setClients((prev) => [...prev, newClient]);
                  setFormData((prev) => ({ ...prev, clientId: newClient.id }));
                  setShowAddClient(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* FILTROS */}
      <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-month" className="text-sm font-medium">Mes:</Label>
          <select
            id="filter-month"
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            className="border rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">Todos</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-status" className="text-sm font-medium">Estado:</Label>
          <select
            id="filter-status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="border rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">Todos</option>
            {ORDER_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {/* Contador de resultados */}
        <span className="ml-auto text-sm text-gray-400">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay pedidos que coincidan con los filtros seleccionados.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            // ✅ CORREGIDO: Soporta tanto 'client' como 'clients' según lo que devuelva el backend
            const clientData = order.client || order.clients;

            return (
              <Card
                key={order.id}
                className="p-4 shadow-md hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent className="space-y-3 p-0">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{order.project}</h2>
                    <p className="text-sm text-gray-500">
                      Cliente: <span className="font-medium text-gray-700">{clientData?.name || "Desconocido"}</span>
                    </p>
                    {clientData?.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <FaPhoneAlt size={11} />
                        <span>{clientData.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Fecha de instalación si existe */}
                  {order.installationStartDate && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                      <FaCalendarAlt size={10} />
                      <span>{formatDate(order.installationStartDate)}</span>
                      {order.installationEndDate && order.installationEndDate !== order.installationStartDate && (
                        <span>→ {formatDate(order.installationEndDate)}</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Total:{" "}
                      <span className="font-bold text-gray-800">
                        Q{Number(order.total || 0).toFixed(2)}
                      </span>
                    </p>
                    {/* ✅ CORREGIDO: Usa las claves con guión bajo */}
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full border ${orderStatusStyles[order.status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                </CardContent>

                <div className="flex justify-between pt-3 border-t mt-3" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    Ver Detalles
                  </Button>
                  {user?.role === 'ADMIN' && (
                    <Button
                      variant="destructive"
                      onClick={() => deleteOrder(order.id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}