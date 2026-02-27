// src/pages/MyDashboard.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { FaSearch, FaCalendarAlt, FaClipboardList, FaCheckCircle, FaClock } from "react-icons/fa";

const ORDER_STATUS_LABELS = {
    en_proceso: 'En Proceso',
    en_fabricacion: 'En Fabricación',
    listo_para_instalar: 'Listo para Instalar',
    en_ruta: 'En Ruta',
    completado: 'Completado',
    cancelado: 'Cancelado',
};

const ORDER_STATUS_STYLES = {
    en_proceso: 'bg-yellow-100 text-yellow-800',
    en_fabricacion: 'bg-blue-100 text-blue-800',
    listo_para_instalar: 'bg-indigo-100 text-indigo-800',
    en_ruta: 'bg-purple-100 text-purple-800',
    completado: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-red-100 text-red-800',
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
};

function StatCard({ icon, label, value, sub, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-700',
        indigo: 'bg-indigo-50 text-indigo-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function MyDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loadingQ, setLoadingQ] = useState(true);
    const [loadingO, setLoadingO] = useState(true);
    const [searchQ, setSearchQ] = useState('');
    const [searchO, setSearchO] = useState('');
    const [qStatusFilter, setQStatusFilter] = useState('all');

    useEffect(() => {
        api.get('/quotations')
            .then(r => setQuotations(r.data))
            .catch(err => console.error('Error cotizaciones:', err))
            .finally(() => setLoadingQ(false));

        api.get('/orders')
            .then(r => setOrders(r.data))
            .catch(err => console.error('Error pedidos:', err))
            .finally(() => setLoadingO(false));
    }, []);

    const filteredQuotations = useMemo(() => {
        return quotations
            .filter(q => qStatusFilter === 'all' || q.status === qStatusFilter)
            .filter(q => {
                if (!searchQ) return true;
                const s = searchQ.toLowerCase();
                return (
                    q.project?.toLowerCase().includes(s) ||
                    q.client?.name?.toLowerCase().includes(s) ||
                    q.quotationNumber?.toLowerCase().includes(s)
                );
            });
    }, [quotations, searchQ, qStatusFilter]);

    // Pedidos que vienen de cotizaciones del vendedor (ya filtradas por backend) + buscador
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (!searchO) return true;
            const s = searchO.toLowerCase();
            return (
                o.project?.toLowerCase().includes(s) ||
                o.client?.name?.toLowerCase().includes(s)
            );
        });
    }, [orders, searchO]);

    const stats = useMemo(() => {
        const totalVentasCotizaciones = quotations
            .filter(q => q.status === 'confirmado')
            .reduce((sum, q) => sum + (q.total_price || 0), 0);

        return {
            totalCotizaciones: quotations.length,
            confirmadas: quotations.filter(q => q.status === 'confirmado').length,
            pendientes: quotations.filter(q => q.status !== 'confirmado').length,
            totalVentas: totalVentasCotizaciones,
        };
    }, [quotations]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* ── Header ── */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Mi Resumen
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Bienvenido, <span className="font-medium text-gray-700">{user?.name?.split(' ')[0]}</span> — aquí está tu actividad reciente
                    </p>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<FaClipboardList size={18} />}
                        label="Total Cotizaciones"
                        value={stats.totalCotizaciones}
                        color="blue"
                    />
                    <StatCard
                        icon={<FaCheckCircle size={18} />}
                        label="Confirmadas"
                        value={stats.confirmadas}
                        color="emerald"
                    />
                    <StatCard
                        icon={<FaClock size={18} />}
                        label="En Proceso"
                        value={stats.pendientes}
                        color="amber"
                    />
                    <StatCard
                        icon={<FaCalendarAlt size={18} />}
                        label="Ventas Confirmadas"
                        value={`Q ${stats.totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        sub="suma de cotizaciones confirmadas"
                        color="indigo"
                    />
                </div>

                {/* ── Sección Cotizaciones ── */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-800">Mis Cotizaciones</h2>
                        <button
                            onClick={() => navigate('/quotations')}
                            className="text-sm text-blue-600 hover:underline font-medium"
                        >
                            Ver todas →
                        </button>
                    </div>

                    {/* Filtros cotizaciones */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 mb-3 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-grow min-w-48">
                            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                                type="text"
                                placeholder="Buscar por proyecto, cliente o #..."
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                        <select
                            value={qStatusFilter}
                            onChange={e => setQStatusFilter(e.target.value)}
                            className="border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="en proceso">En Proceso</option>
                            <option value="confirmado">Confirmado</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {loadingQ ? (
                            <div className="flex justify-center items-center py-12 text-gray-400 text-sm gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Cargando cotizaciones...
                            </div>
                        ) : filteredQuotations.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                                <FaSearch size={22} className="opacity-30" />
                                <p className="text-sm font-medium">Sin resultados</p>
                            </div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/70">
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                                        <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                                        <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredQuotations.slice(0, 10).map(q => (
                                        <tr
                                            key={q.id}
                                            onClick={() => navigate(`/quotations/${q.id}`)}
                                            className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                                        >
                                            <td className="py-3 px-5">
                                                <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                    {q.quotationNumber}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 font-semibold text-gray-800">{q.project}</td>
                                            <td className="py-3 px-5 text-gray-600">{q.client?.name || <span className="text-gray-300 italic">Sin cliente</span>}</td>
                                            <td className="py-3 px-5 text-gray-500 text-xs">{formatDate(q.createdAt)}</td>
                                            <td className="py-3 px-5 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${q.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {q.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-right font-mono font-semibold text-gray-800">
                                                Q {(q.total_price || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {!loadingQ && filteredQuotations.length > 10 && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-center">
                                <button onClick={() => navigate('/quotations')} className="text-xs text-blue-600 hover:underline">
                                    Ver las {filteredQuotations.length - 10} cotizaciones restantes →
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Sección Pedidos Confirmados ── */}
                <section className="pb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-800">Mis Pedidos Confirmados</h2>
                    </div>

                    {/* Buscador pedidos */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 mb-3">
                        <div className="relative max-w-sm">
                            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                                type="text"
                                placeholder="Buscar por proyecto o cliente..."
                                value={searchO}
                                onChange={e => setSearchO(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {loadingO ? (
                            <div className="flex justify-center items-center py-12 text-gray-400 text-sm gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Cargando pedidos...
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                                <FaClipboardList size={22} className="opacity-30" />
                                <p className="text-sm font-medium">No hay pedidos confirmados aún</p>
                                <p className="text-xs">Confirma una cotización para verla aquí</p>
                            </div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/70">
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                                        <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Instalación</th>
                                        <th className="py-3 px-5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                                        <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.map(o => (
                                        <tr key={o.id} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="py-3 px-5 font-semibold text-gray-800">{o.project}</td>
                                            <td className="py-3 px-5 text-gray-600">{o.client?.name || '—'}</td>
                                            <td className="py-3 px-5 text-xs text-gray-500">
                                                {o.installationStartDate ? (
                                                    <span className="flex items-center gap-1.5 text-indigo-600">
                                                        <FaCalendarAlt size={10} />
                                                        {formatDate(o.installationStartDate)}
                                                        {o.installationEndDate && o.installationEndDate !== o.installationStartDate && (
                                                            <span className="text-gray-400">→ {formatDate(o.installationEndDate)}</span>
                                                        )}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="py-3 px-5 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${ORDER_STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {ORDER_STATUS_LABELS[o.status] || o.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-right font-mono font-semibold text-gray-800">
                                                Q {Number(o.total || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
}