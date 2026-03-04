// RUTA: src/pages/Admin/Tabs/ClientsTab.jsx

import { useEffect, useState } from "react";
import { FaPlus, FaTrashAlt, FaEdit } from "react-icons/fa";
import AddClientModal from "@/components/AddClientModal";
import api from "@/services/api";

const statusStyles = {
  Potencial: 'bg-gray-200 text-gray-800',
  Contactado: 'bg-blue-200 text-blue-800',
  Interesado: 'bg-yellow-200 text-yellow-800',
  En_Seguimiento: 'bg-orange-200 text-orange-800',
  Cliente_Activo: 'bg-green-200 text-green-800',
  No_Interesado: 'bg-red-200 text-red-800',
  Importante: 'bg-purple-200 text-purple-800',
  default: 'bg-gray-200 text-gray-800',
};

const statusLabels = {
  Potencial: 'Potencial',
  Contactado: 'Contactado',
  Interesado: 'Interesado',
  En_Seguimiento: 'En Seguimiento',
  Cliente_Activo: 'Cliente Activo',
  No_Interesado: 'No Interesado',
  Importante: 'Importante',
};

// ── Iniciales para avatar ─────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name
    ?.split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') ?? '?';
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

export default function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await api.get("/clients");
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("❌ Error al obtener clientes:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este cliente?")) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (err) {
      console.error("❌ Error al eliminar cliente:", err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md transition">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Clientes</h2>
          <p className="text-gray-500 text-xs sm:text-sm">
            Administra los clientes registrados y sus datos de contacto.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 hover:shadow-md transition-all text-sm"
        >
          <FaPlus size={13} />
          <span className="hidden sm:inline">Añadir Cliente</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm py-4">Cargando...</p>
      ) : (
        <>
          {/* ── Tabla desktop (md+) ── */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Nombre</th>
                  <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Estado</th>
                  <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Teléfono</th>
                  <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Correo</th>
                  <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Dirección</th>
                  <th className="py-2.5 px-4 text-right font-semibold text-xs uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      No hay clientes registrados.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-gray-900">{client.name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusStyles[client.status] || statusStyles.default}`}>
                          {statusLabels[client.status] || client.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">{client.phone || "—"}</td>
                      <td className="py-2.5 px-4 text-gray-500">{client.email || "—"}</td>
                      <td className="py-2.5 px-4 text-gray-500 max-w-[180px] truncate">{client.address || "—"}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleEdit(client)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Editar"
                          >
                            <FaEdit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="Eliminar"
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Cards móvil (< md) — patrón Clientes establecido ── */}
          <div className="md:hidden border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {clients.length === 0 ? (
              <p className="text-center py-8 text-gray-500 text-sm">
                No hay clientes registrados.
              </p>
            ) : (
              clients.map((client) => (
                <div key={client.id} className="p-4">
                  {/* Fila 1: avatar + nombre + acciones */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={client.name} />
                      <span className="font-semibold text-sm text-gray-900 truncate">{client.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-blue-500 p-1.5 rounded-lg border border-blue-100 active:bg-blue-50"
                        title="Editar"
                      >
                        <FaEdit size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50"
                        title="Eliminar"
                      >
                        <FaTrashAlt size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Badge de estado */}
                  <span className={`inline-block mb-2 px-2 py-0.5 text-xs font-bold rounded-full ${statusStyles[client.status] || statusStyles.default}`}>
                    {statusLabels[client.status] || client.status}
                  </span>

                  {/* Datos de contacto */}
                  <div className="space-y-0.5 text-xs text-gray-500">
                    {client.phone && <p>📞 {client.phone}</p>}
                    {client.email && <p>✉️ {client.email}</p>}
                    {client.address && <p className="truncate">📍 {client.address}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showModal && (
        <AddClientModal
          open={showModal}
          onClose={closeModal}
          clientToEdit={editingClient}
          onSave={() => {
            fetchClients();
            closeModal();
          }}
        />
      )}
    </div>
  );
}