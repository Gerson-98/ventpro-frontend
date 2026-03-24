// RUTA: src/pages/GananciasPage.jsx

import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const fmt = (n) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 }).format(n || 0);
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

const STATUS_LABELS = {
    en_proceso: 'En Proceso', en_fabricacion: 'En Fabricación',
    listo_para_instalar: 'Listo p/ Instalar', en_ruta: 'En Ruta', completado: 'Completado',
};
const STATUS_COLORS = {
    en_proceso: 'bg-blue-100 text-blue-800 border-blue-300',
    en_fabricacion: 'bg-orange-100 text-orange-800 border-orange-300',
    listo_para_instalar: 'bg-purple-100 text-purple-800 border-purple-300',
    en_ruta: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    completado: 'bg-green-100 text-green-800 border-green-300',
};
const Q_STATUS_COLORS = {
    en_proceso: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmado: 'bg-green-100 text-green-800 border-green-300',
};
const Q_STATUS_LABELS = { en_proceso: 'En Proceso', confirmado: 'Confirmado' };

function StatCard({ label, value, sub, color = 'blue', icon }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        slate: 'bg-slate-50 border-slate-200 text-slate-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1 truncate">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
                    {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
                </div>
                {icon && <div className="opacity-40 text-2xl ml-2 flex-shrink-0">{icon}</div>}
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
            <p className="font-semibold text-slate-800 mb-2">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 mb-0.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-medium text-slate-800">{fmt(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}

export default function GananciasPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [status, setStatus] = useState('todos');
    const [sortField, setSortField] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');
    const [search, setSearch] = useState('');
    const [vendedorId, setVendedorId] = useState('todos');
    const [vendedores, setVendedores] = useState([]);
    const [activeTab, setActiveTab] = useState('pedidos');

    useEffect(() => {
        api.get('/users').then(res => setVendedores(res.data || [])).catch(() => { });
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);
            if (status && status !== 'todos') params.append('status', status);
            if (vendedorId && vendedorId !== 'todos') params.append('userId', vendedorId);
            const res = await api.get(`/reports/dashboard/profits?${params.toString()}`);
            setData(res.data);
        } catch { setError('Error cargando datos.'); }
        finally { setLoading(false); }
    }, [fromDate, toDate, status, vendedorId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredOrders = (data?.orders || [])
        .filter(o => !search || [o.project, o.client, o.seller].some(f => f?.toLowerCase().includes(search.toLowerCase())))
        .sort((a, b) => {
            let va = a[sortField], vb = b[sortField];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            return va < vb ? (sortDir === 'asc' ? -1 : 1) : va > vb ? (sortDir === 'asc' ? 1 : -1) : 0;
        });

    const filteredQuotations = (data?.quotations || [])
        .filter(q => !search || [q.project, q.client, q.seller].some(f => f?.toLowerCase().includes(search.toLowerCase())));

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }) => sortField !== field
        ? <span className="text-slate-300 ml-1">↕</span>
        : <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;

    const hasActiveFilters = fromDate || toDate || status !== 'todos' || vendedorId !== 'todos';
    const totals = data?.totals || {};
    const conversionRate = totals.quotationCount > 0
        ? ((totals.quotationsConverted / totals.quotationCount) * 100).toFixed(1) : 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Dashboard de Ganancias</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Pedidos, cotizaciones y comisiones por vendedor</p>
                    </div>
                    <button onClick={fetchData} className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                        🔄 Actualizar
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</label>
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hasta</label>
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado pedido</label>
                            <select value={status} onChange={e => setStatus(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                <option value="todos">Todos</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        {vendedores.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendedor</label>
                                <select value={vendedorId} onChange={e => setVendedorId(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    <option value="todos">Todos los vendedores</option>
                                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.name}{v.role === 'ADMIN' ? ' (Admin)' : ''}</option>)}
                                </select>
                            </div>
                        )}
                        {hasActiveFilters && (
                            <button onClick={() => { setFromDate(''); setToDate(''); setStatus('todos'); setVendedorId('todos'); }}
                                className="self-end px-3 py-1.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                × Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                        ⚠️ {error} <button onClick={fetchData} className="underline ml-1">Reintentar</button>
                    </div>
                )}

                {/* Stat cards */}
                {!loading && !error && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard label="Ventas totales" value={fmt(totals.totalSales)} sub={`${totals.orderCount || 0} pedidos`} color="blue" icon="💰" />
                        <StatCard label="Costo materiales" value={fmt(totals.totalMaterialCost)} color="red" icon="🔧" />
                        <StatCard label="Ganancia neta" value={fmt(totals.totalProfit)} sub={`Margen ${fmtPct(totals.avgMargin)}`} color="green" icon="📈" />
                        <StatCard label="Margen promedio" value={fmtPct(totals.avgMargin)} color="purple" icon="%" />
                        <StatCard label="Cotizaciones" value={totals.quotationCount || 0} sub={`${totals.quotationsConverted || 0} confirmadas`} color="amber" icon="📋" />
                        <StatCard label="Conversión" value={`${conversionRate}%`} sub="Cotiz. → Pedido" color="slate" icon="🎯" />
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Cargando datos...
                    </div>
                )}

                {/* Gráfica mensual */}
                {!loading && !error && data?.monthlyData?.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Resumen Mensual</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="sales" name="Ventas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="cost" name="Costo" fill="#f87171" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="profit" name="Ganancia" fill="#4ade80" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                {!loading && !error && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex border-b border-slate-200">
                            <button onClick={() => setActiveTab('pedidos')}
                                className={`px-5 py-3 text-sm font-semibold transition-colors ${activeTab === 'pedidos' ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                📦 Pedidos ({filteredOrders.length})
                            </button>
                            <button onClick={() => setActiveTab('cotizaciones')}
                                className={`px-5 py-3 text-sm font-semibold transition-colors ${activeTab === 'cotizaciones' ? 'border-b-2 border-amber-500 text-amber-700 bg-amber-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                📋 Cotizaciones ({filteredQuotations.length})
                            </button>
                            <div className="ml-auto flex items-center px-4">
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar proyecto, cliente, vendedor..."
                                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                        </div>

                        {activeTab === 'pedidos' && (
                            <div className="overflow-x-auto">
                                {filteredOrders.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-sm">
                                        {hasActiveFilters ? 'Sin pedidos para los filtros seleccionados.' : 'No hay pedidos registrados.'}
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                {[['orderId', '#'], ['project', 'Proyecto'], ['client', 'Cliente']].map(([f, l]) => (
                                                    <th key={f} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort(f)}>
                                                        {l} <SortIcon field={f} />
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                                {[['salePrice', 'Venta'], ['materialCost', 'Costo'], ['profit', 'Ganancia'], ['profitMargin', 'Margen']].map(([f, l]) => (
                                                    <th key={f} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort(f)}>
                                                        {l} <SortIcon field={f} />
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort('seller')}>
                                                    Vendedor <SortIcon field="seller" />
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => handleSort('createdAt')}>
                                                    Fecha <SortIcon field="createdAt" />
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredOrders.map((order) => (
                                                <tr key={order.orderId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">#{order.orderId}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">{order.project}</td>
                                                    <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{order.client}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                                            {STATUS_LABELS[order.status] || order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-700 font-medium whitespace-nowrap">{fmt(order.salePrice)}</td>
                                                    <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">{fmt(order.materialCost)}</td>
                                                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${order.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(order.profit)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.profitMargin >= 30 ? 'bg-green-100 text-green-700' : order.profitMargin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                            {fmtPct(order.profitMargin)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                        {order.seller && order.seller !== '—'
                                                            ? <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">{order.seller}</span>
                                                            : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                                                        {new Date(order.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {activeTab === 'cotizaciones' && (
                            <div className="overflow-x-auto">
                                {filteredQuotations.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-sm">
                                        {hasActiveFilters ? 'Sin cotizaciones para los filtros seleccionados.' : 'No hay cotizaciones registradas.'}
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Proyecto</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total cotizado</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">¿Convertida?</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendedor</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredQuotations.map((q) => (
                                                <tr key={q.quotationId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{q.quotationNumber || `#${q.quotationId}`}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">{q.project}</td>
                                                    <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{q.client}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${Q_STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                                            {Q_STATUS_LABELS[q.status] || q.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-700 font-medium whitespace-nowrap">
                                                        {q.totalPrice > 0 ? fmt(q.totalPrice) : <span className="text-slate-300 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {q.convertedToOrder
                                                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">✓ Pedido #{q.orderId}</span>
                                                            : <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Pendiente</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                        {q.seller && q.seller !== '—'
                                                            ? <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">{q.seller}</span>
                                                            : <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                                                        {new Date(q.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        <div className="border-t border-slate-100 px-4 py-2 bg-slate-50 text-xs text-slate-400 flex justify-between">
                            <span>
                                {activeTab === 'pedidos'
                                    ? `${filteredOrders.length} pedido${filteredOrders.length !== 1 ? 's' : ''}`
                                    : `${filteredQuotations.length} cotización${filteredQuotations.length !== 1 ? 'es' : ''} · ${filteredQuotations.filter(q => q.convertedToOrder).length} convertidas`}
                            </span>
                            {activeTab === 'pedidos' && filteredOrders.length > 0 && (
                                <span className="font-semibold text-slate-600">
                                    Ganancia filtrada: {fmt(filteredOrders.reduce((s, o) => s + o.profit, 0))}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}