// src/pages/Quotations.jsx

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { FaPlus, FaTrashAlt, FaSearch } from "react-icons/fa";
import AddQuotationModal from "@/components/AddQuotationModal";

const clientStatusStyles = {
    Potencial: 'bg-slate-100 text-slate-600',
    Contactado: 'bg-blue-100 text-blue-700',
    Interesado: 'bg-amber-100 text-amber-700',
    En_Seguimiento: 'bg-orange-100 text-orange-700',
    Cliente_Activo: 'bg-emerald-100 text-emerald-700',
    No_Interesado: 'bg-red-100 text-red-600',
    Importante: 'bg-purple-100 text-purple-700',
};

const clientStatusLabels = {
    Potencial: 'Potencial',
    Contactado: 'Contactado',
    Interesado: 'Interesado',
    En_Seguimiento: 'En Seguimiento',
    Cliente_Activo: 'Cliente Activo',
    No_Interesado: 'No Interesado',
    Importante: 'Importante',
};

export default function Quotations() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({ quotationStatus: 'all', clientStatus: 'all' });
    const navigate = useNavigate();

    const fetchQuotations = async () => {
        setLoading(true);
        try {
            const response = await api.get("/quotations");
            setQuotations(response.data);
        } catch (error) {
            console.error("Error al obtener cotizaciones:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQuotations(); }, []);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-GT', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const handleDelete = async (id) => {
        if (!confirm("¿Seguro que deseas eliminar esta cotización?")) return;
        try {
            await api.delete(`/quotations/${id}`);
            setQuotations(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            if (error.response?.status === 400) {
                alert(`Error: ${error.response.data.message}`);
            } else {
                alert("No se pudo eliminar la cotización.");
            }
        }
    };

    const filteredQuotations = useMemo(() => {
        return quotations
            .filter(q => filters.quotationStatus === 'all' || q.status === filters.quotationStatus)
            .filter(q => filters.clientStatus === 'all' || q.client?.status === filters.clientStatus)
            .filter(q => {
                if (!searchTerm) return true;
                const s = searchTerm.toLowerCase();
                return (
                    q.client?.name?.toLowerCase().includes(s) ||
                    q.project.toLowerCase().includes(s) ||
                    q.quotationNumber?.toLowerCase().includes(s)
                );
            });
    }, [quotations, searchTerm, filters]);

    const totals = useMemo(() => ({
        total: quotations.length,
        confirmadas: quotations.filter(q => q.status === 'confirmado').length,
        enProceso: quotations.filter(q => q.status !== 'confirmado').length,
    }), [quotations]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 py-8">

                {/* ── Header ── */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {totals.total} cotizaciones · {totals.confirmadas} confirmadas · {totals.enProceso} en proceso
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all text-sm"
                    >
                        <FaPlus size={12} /> Nueva Cotización
                    </button>
                </div>

                {/* ── Filtros ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-grow min-w-48">
                        <FaSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400" size={13} />
                        <input
                            type="text"
                            placeholder="Buscar por proyecto, cliente o #..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Estado cotización</span>
                        <select
                            value={filters.quotationStatus}
                            onChange={(e) => setFilters(p => ({ ...p, quotationStatus: e.target.value }))}
                            className="border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                        >
                            <option value="all">Todas</option>
                            <option value="en proceso">En Proceso</option>
                            <option value="confirmado">Confirmado</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Estado cliente</span>
                        <select
                            value={filters.clientStatus}
                            onChange={(e) => setFilters(p => ({ ...p, clientStatus: e.target.value }))}
                            className="border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                        >
                            <option value="all">Todos</option>
                            {Object.entries(clientStatusLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Tabla ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center py-20 text-gray-400">
                            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Cargando...
                        </div>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/70">
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                                    <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado Cliente</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                                    <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                                    <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                                    <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredQuotations.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-16 text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <FaSearch size={24} className="opacity-30" />
                                                <p className="font-medium">Sin resultados</p>
                                                <p className="text-xs">Intenta ajustar los filtros o la búsqueda</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuotations.map((quote) => (
                                        <tr
                                            key={quote.id}
                                            className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                                            onClick={() => navigate(`/quotations/${quote.id}`)}
                                        >
                                            <td className="py-3.5 px-5">
                                                <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                    {quote.quotationNumber}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 font-semibold text-gray-800">
                                                {quote.project}
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-600">
                                                {quote.client?.name || <span className="text-gray-300 italic">Sin cliente</span>}
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                {quote.client?.status && (
                                                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${clientStatusStyles[quote.client.status]}`}>
                                                        {clientStatusLabels[quote.client.status]}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-500 text-xs">
                                                {formatDate(quote.createdAt)}
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${quote.status === 'confirmado'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {quote.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-right font-mono font-semibold text-gray-800">
                                                Q {quote.total_price?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(quote.id); }}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar"
                                                >
                                                    <FaTrashAlt size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* Footer de tabla */}
                    {!loading && filteredQuotations.length > 0 && (
                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                                Mostrando {filteredQuotations.length} de {quotations.length} cotizaciones
                            </span>
                            <span className="text-xs font-semibold text-gray-600">
                                Total visible: Q {filteredQuotations.reduce((s, q) => s + (q.total_price || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <AddQuotationModal
                    open={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); fetchQuotations(); }}
                />
            )}
        </div>
    );
}