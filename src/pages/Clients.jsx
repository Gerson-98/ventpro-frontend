// RUTA: src/pages/Clients.jsx

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { FaPlus, FaEdit, FaTrashAlt, FaSearch, FaUser, FaTimes, FaCheck } from "react-icons/fa";

const STATUS_CONFIG = {
  Potencial: { label: 'Potencial', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  Contactado: { label: 'Contactado', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Interesado: { label: 'Interesado', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  En_Seguimiento: { label: 'En Seguimiento', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  Cliente_Activo: { label: 'Cliente Activo', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  No_Interesado: { label: 'No Interesado', dot: 'bg-red-400', badge: 'bg-red-50 text-red-600 border-red-200' },
  Importante: { label: 'Importante', dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const EMPTY_FORM = { name: "", phone: "", address: "", email: "", status: "Potencial" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Potencial;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// Genera iniciales y color de avatar determinístico
function Avatar({ name }) {
  const initials = name ? name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?";
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-slate-500';
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("❌ Error al obtener clientes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/clients/${editingId}`, formData);
      } else {
        await api.post("/clients", formData);
      }
      setFormData(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      fetchClients();
    } catch (e) {
      console.error("❌ Error al guardar cliente:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      phone: client.phone || "",
      address: client.address || "",
      email: client.email || "",
      status: client.status || "Potencial",
    });
    setEditingId(client.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (e) {
      console.error("❌ Error al eliminar cliente:", e);
    }
  };

  const cancelForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clientes</h1>
            <p className="text-gray-500 text-sm mt-1">
              {clients.length} registrados · {clients.filter(c => c.status === 'Cliente_Activo').length} activos
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
            >
              <FaPlus size={11} /> Nuevo Cliente
            </button>
          )}
        </div>

        {/* ── Formulario ── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header del form */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FaUser size={13} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </p>
                  <p className="text-xs text-gray-400">Completa los datos del cliente</p>
                </div>
              </div>
              <button onClick={cancelForm} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimes size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre *</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Estado</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 5555-1234"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Correo</label>
                  <input
                    type="email"
                    placeholder="Ej: juan@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Dirección</label>
                  <input
                    type="text"
                    placeholder="Ej: Zona 10, Guatemala"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                >
                  <FaCheck size={11} />
                  {saving ? 'Guardando...' : editingId ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-grow min-w-48">
            <FaSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16 text-gray-400 text-sm gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Cargando clientes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <FaUser size={20} className="opacity-40" />
              </div>
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="text-xs">Intenta ajustar los filtros o agrega un nuevo cliente</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
                  <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Correo</th>
                  <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                  <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} />
                        <span className="font-semibold text-gray-800">{client.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="py-3.5 px-5 text-gray-500">{client.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3.5 px-5 text-gray-500">{client.email || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3.5 px-5 text-gray-500 max-w-[200px] truncate">{client.address || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-400">
                Mostrando {filtered.length} de {clients.length} clientes
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}