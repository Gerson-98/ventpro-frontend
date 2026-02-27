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

export default function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // ✨ FUNCIÓN fetchClients RESTAURADA ✨
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

  useEffect(() => {
    fetchClients();
  }, []);

  // ✨ FUNCIÓN handleEdit RESTAURADA ✨
  const handleEdit = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  // ✨ FUNCIÓN handleDelete RESTAURADA ✨
  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este cliente?")) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (err) {
      console.error("❌ Error al eliminar cliente:", err);
    }
  };

  // ✨ FUNCIÓN closeModal RESTAURADA ✨
  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md transition">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Clientes</h2>
          <p className="text-gray-500 text-sm">
            Administra los clientes registrados y sus datos de contacto.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
        >
          <FaPlus /> Añadir Cliente
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Cargando...</p>
      ) : (
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="py-2 px-4 text-left font-semibold">Nombre</th>
              <th className="py-2 px-4 text-left font-semibold">Estado</th>
              <th className="py-2 px-4 text-left font-semibold">Teléfono</th>
              <th className="py-2 px-4 text-left font-semibold">Correo</th>
              <th className="py-2 px-4 text-left font-semibold">Dirección</th>
              <th className="py-2 px-4 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4 font-medium">{client.name}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusStyles[client.status] || statusStyles.default}`}>
                      {statusLabels[client.status] || client.status}
                    </span>
                  </td>
                  <td className="py-2 px-4">{client.phone || "—"}</td>
                  <td className="py-2 px-4">{client.email || "—"}</td>
                  <td className="py-2 px-4">{client.address || "—"}</td>
                  <td className="py-2 px-4 text-right space-x-3">
                    <button onClick={() => handleEdit(client)} className="text-blue-600 hover:text-blue-800 transition" title="Editar">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-800 transition" title="Eliminar">
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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