// src/pages/Quotations.jsx

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { FaPlus, FaSearch, FaChevronLeft, FaChevronRight, FaTrash } from "react-icons/fa";
import AddQuotationModal from "@/components/AddQuotationModal";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

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
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const [quotations, setQuotations] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState({ quotationStatus: 'all', clientStatus: 'all', search: '' });
    const [deleteModal, setDeleteModal] = useState({ open: false, quotation: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    // ── Debounce: actualiza filters.search 400ms después de que el usuario deja de escribir ──
    const debounceRef = useRef(null);
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchInput(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: value }));
        }, 400);
    };

    // ── Fetch paginado — envía filtros al backend ─────────────────────────────
    const fetchQuotations = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 50 };
            if (filters.search) params.search = filters.search;
            if (filters.quotationStatus !== 'all') params.status = filters.quotationStatus;
            if (filters.clientStatus !== 'all') params.clientStatus = filters.clientStatus;
            const response = await api.get("/quotations", { params });
            const { data, total, totalPages } = response.data;
            setQuotations(data);
            setPagination({ page, total, totalPages });
        } catch (error) {
            console.error("Error al obtener cotizaciones:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchQuotations(1); }, [fetchQuotations]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-GT', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const handleDelete = async () => {
        const id = deleteModal.quotation?.id;
        if (!id) return;
        setIsDeleting(true);
        const previous = quotations;
        setQuotations(prev => prev.filter(q => q.id !== id));
        setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        setDeleteModal({ open: false, quotation: null });
        try {
            await api.delete(`/quotations/${id}`);
        } catch (error) {
            setQuotations(previous);
            setPagination(prev => ({ ...prev, total: prev.total + 1 }));
            const msg = error.response?.data?.message || "No se pudo eliminar la cotización.";
            alert(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const totals = useMemo(() => ({
        total: pagination.total,
        confirmadas: quotations.filter(q => q.status === 'confirmado').length,
        enProceso: quotations.filter(q => q.status !== 'confirmado').length,
    }), [quotations, pagination.total]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

                {/* ── Header ── */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">
                            {totals.total} cotizaciones en total ·{' '}
                            {totals.confirmadas} confirmadas en esta página ·{' '}
                            {totals.enProceso} en proceso en esta página
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all text-sm flex-shrink-0"
                    >
                        <FaPlus size={12} />
                        <span className="hidden sm:inline">Nueva Cotización</span>
                        <span className="sm:hidden">Nueva</span>
                    </button>
                </div>

                {/* ── Filtros ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 mb-5 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                    <div className="relative flex-grow min-w-0">
                        <FaSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400" size={13} />
                        <input
                            type="text"
                            placeholder="Buscar por proyecto, cliente o #..."
                            value={searchInput}
                            onChange={handleSearchChange}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <select
                            value={filters.quotationStatus}
                            onChange={(e) => setFilters(p => ({ ...p, quotationStatus: e.target.value }))}
                            className="flex-1 sm:flex-none border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                        >
                            <option value="all">Todas</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="confirmado">Confirmado</option>
                        </select>
                        <select
                            value={filters.clientStatus}
                            onChange={(e) => setFilters(p => ({ ...p, clientStatus: e.target.value }))}
                            className="flex-1 sm:flex-none border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                        >
                            <option value="all">Todos los clientes</option>
                            {Object.entries(clientStatusLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Tabla (md+) / Cards (móvil) ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center py-20 text-gray-400">
                            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Cargando...
                        </div>
                    ) : quotations.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                                <FaSearch size={24} className="opacity-30" />
                                <p className="font-medium">Sin resultados</p>
                                <p className="text-xs">Intenta ajustar los filtros o la búsqueda</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ── TABLA — solo en md+ ── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/70">
                                            <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                                            <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                                            <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                                            <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado Cliente</th>
                                            <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                                            <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                                            <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                                            <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                                            {isAdmin && <th className="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acc.</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {quotations.map((quote) => (
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
                                                <td className="py-3.5 px-5 font-semibold text-gray-800">{quote.project}</td>
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
                                                <td className="py-3.5 px-5 text-gray-500 text-xs">{formatDate(quote.createdAt)}</td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${quote.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {quote.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-xs text-gray-500">
                                                    {quote.user?.name || <span className="text-gray-300 italic">—</span>}
                                                </td>
                                                <td className="py-3.5 px-5 text-right font-mono font-semibold text-gray-800">
                                                    Q {quote.total_price?.toFixed(2) || '0.00'}
                                                </td>
                                                {isAdmin && (
                                                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => setDeleteModal({ open: true, quotation: quote })}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar cotización"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── CARDS — solo en móvil (< md) ── */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {quotations.map((quote) => (
                                    <div
                                        key={quote.id}
                                        className="p-4 hover:bg-blue-50/30 active:bg-blue-50 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/quotations/${quote.id}`)}
                                    >
                                        {/* Fila 1: número + estado cotización + eliminar */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                {quote.quotationNumber}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${quote.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {quote.status.replace('_', ' ')}
                                                </span>
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, quotation: quote }); }}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <FaTrash size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Fila 2: proyecto */}
                                        <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{quote.project}</p>
                                        {/* Fila 3: cliente + estado cliente */}
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-xs text-gray-500">
                                                {quote.client?.name || <span className="italic text-gray-300">Sin cliente</span>}
                                            </span>
                                            {quote.client?.status && (
                                                <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${clientStatusStyles[quote.client.status]}`}>
                                                    {clientStatusLabels[quote.client.status]}
                                                </span>
                                            )}
                                        </div>
                                        {/* Fila 4: fecha + vendedor + total */}
                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                            <span>{formatDate(quote.createdAt)}</span>
                                            <span className="font-mono font-bold text-gray-800 text-sm">
                                                Q {quote.total_price?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                        {quote.user?.name && (
                                            <p className="text-[10px] text-gray-400 mt-1">Vendedor: {quote.user.name}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Footer con paginación */}
                            <div className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-2">
                                <span className="text-xs text-gray-400">
                                    {quotations.length} en página · {pagination.total} totales
                                </span>
                                {/* Controles de paginación */}
                                {pagination.totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => fetchQuotations(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <FaChevronLeft size={10} />
                                        </button>
                                        <span className="text-xs text-gray-600 px-2 font-medium">
                                            {pagination.page} / {pagination.totalPages}
                                        </span>
                                        <button
                                            onClick={() => fetchQuotations(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.totalPages}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <FaChevronRight size={10} />
                                        </button>
                                    </div>
                                )}
                                <span className="text-xs font-semibold text-gray-600">
                                    Q {quotations.reduce((s, q) => s + (q.total_price || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showModal && (
                <AddQuotationModal
                    open={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={(newQuotation) => {
                        setShowModal(false);
                        if (newQuotation) {
                            setQuotations(prev => [newQuotation, ...prev]);
                            setPagination(prev => ({ ...prev, total: prev.total + 1 }));
                        } else {
                            fetchQuotations(1);
                        }
                    }}
                />
            )}

            {/* ── Modal confirmar eliminación ── */}
            <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, quotation: null })}>
                <DialogContent className="bg-white p-6 rounded-2xl shadow-lg max-w-sm mx-4 sm:mx-auto" aria-describedby="delete-quote-desc">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Eliminar cotización</DialogTitle>
                        <DialogDescription id="delete-quote-desc" className="text-sm text-gray-500 mt-1">
                            {deleteModal.quotation?.generatedOrder
                                ? <>Esta cotización tiene un <strong>pedido asociado (#{deleteModal.quotation.generatedOrder.id})</strong>. Al eliminarla se eliminará también el pedido y todas sus ventanas.</>
                                : <>¿Seguro que deseas eliminar la cotización <strong>{deleteModal.quotation?.quotationNumber}</strong>? Esta acción no se puede deshacer.</>
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex gap-2">
                        <Button variant="ghost" onClick={() => setDeleteModal({ open: false, quotation: null })} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}