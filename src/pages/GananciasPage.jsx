// RUTA: src/pages/GananciasPage.jsx

import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
    new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
    }).format(n || 0);

const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

const STATUS_LABELS = {
    en_proceso: 'En Proceso',
    en_fabricacion: 'En Fabricación',
    listo_para_instalar: 'Listo p/ Instalar',
    en_ruta: 'En Ruta',
    completado: 'Completado',
};

const STATUS_COLORS = {
    en_proceso: 'bg-blue-100 text-blue-800 border-blue-300',
    en_fabricacion: 'bg-orange-100 text-orange-800 border-orange-300',
    listo_para_instalar: 'bg-purple-100 text-purple-800 border-purple-300',
    en_ruta: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    completado: 'bg-green-100 text-green-800 border-green-300',
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'blue', icon }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        slate: 'bg-slate-50 border-slate-200 text-slate-700',
    };
    return (
        <div className={`rounded-xl border p-5 ${colors[color]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">
                        {label}
                    </p>
                    <p className="text-2xl font-bold">{value}</p>
                    {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
                </div>
                {icon && <div className="opacity-40 text-2xl">{icon}</div>}
            </div>
        </div>
    );
}

// ─── Tooltip personalizado para la gráfica ───────────────────────────────────

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
            <p className="font-semibold text-slate-800 mb-2">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 mb-0.5">
                    <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-500 capitalize">{entry.name}:</span>
                    <span className="font-medium text-slate-800">{fmt(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────

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

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);
            if (status && status !== 'todos') params.append('status', status);

            const res = await api.get(`/reports/dashboard/profits?${params.toString()}`);
            setData(res.data);
        } catch (err) {
            setError('Error cargando datos. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Ordenar y filtrar tabla
    const filteredOrders = (data?.orders || [])
        .filter((o) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
                o.project?.toLowerCase().includes(q) ||
                o.client?.toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            let va = a[sortField];
            let vb = b[sortField];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
        return (
            <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
        );
    };

    return (
        <div className="space-y-6">

            {/* ── Filtros ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Desde
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Estado
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        >
                            <option value="todos">Todos (excl. cancelados)</option>
                            <option value="completado">Completado</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="en_fabricacion">En Fabricación</option>
                            <option value="listo_para_instalar">Listo p/ Instalar</option>
                            <option value="en_ruta">En Ruta</option>
                        </select>
                    </div>
                    {(fromDate || toDate || status !== 'todos') && (
                        <button
                            onClick={() => {
                                setFromDate('');
                                setToDate('');
                                setStatus('todos');
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* ── Stat Cards ── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                    {error}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Ventas totales"
                            value={fmt(data?.totals?.totalSales)}
                            sub={`${data?.totals?.orderCount} pedidos`}
                            color="blue"
                            icon="💰"
                        />
                        <StatCard
                            label="Costo materiales"
                            value={fmt(data?.totals?.totalMaterialCost)}
                            sub="Perfiles + accesorios + vidrios"
                            color="red"
                            icon="🏗️"
                        />
                        <StatCard
                            label="Ganancia neta"
                            value={fmt(data?.totals?.totalProfit)}
                            sub={`Margen promedio: ${fmtPct(data?.totals?.avgMargin)}`}
                            color="green"
                            icon="📈"
                        />
                        <StatCard
                            label="Margen promedio"
                            value={fmtPct(data?.totals?.avgMargin)}
                            sub="Ganancia / Venta"
                            color="purple"
                            icon="📊"
                        />
                    </div>

                    {/* ── Gráfica por mes ── */}
                    {data?.monthlyData?.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4">
                                Ventas vs Costo vs Ganancia por Mes
                            </h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={data.monthlyData}
                                    margin={{ top: 0, right: 16, left: 16, bottom: 0 }}
                                    barGap={2}
                                    barCategoryGap="30%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                                        formatter={(val) =>
                                            val === 'sales'
                                                ? 'Ventas'
                                                : val === 'cost'
                                                    ? 'Costo materiales'
                                                    : 'Ganancia'
                                        }
                                    />
                                    <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" fill="#f87171" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* ── Tabla de pedidos ── */}
                    <div className="bg-white rounded-xl border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-700">
                                Detalle por Pedido
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                    ({filteredOrders.length} pedidos)
                                </span>
                            </h3>
                            <input
                                type="text"
                                placeholder="Buscar proyecto o cliente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        <th
                                            className="px-4 py-3 text-left cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('project')}
                                        >
                                            Proyecto <SortIcon field="project" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('client')}
                                        >
                                            Cliente <SortIcon field="client" />
                                        </th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('salePrice')}
                                        >
                                            Venta <SortIcon field="salePrice" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('materialCost')}
                                        >
                                            Costo Mat. <SortIcon field="materialCost" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('profit')}
                                        >
                                            Ganancia <SortIcon field="profit" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('profitMargin')}
                                        >
                                            Margen <SortIcon field="profitMargin" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort('createdAt')}
                                        >
                                            Fecha <SortIcon field="createdAt" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-slate-400">
                                                No hay pedidos para los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <tr
                                                key={order.orderId}
                                                className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    <a
                                                        href={`/orders/${order.orderId}`}
                                                        className="hover:text-blue-600 hover:underline"
                                                    >
                                                        {order.project}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{order.client}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ||
                                                            'bg-gray-100 text-gray-700 border-gray-300'
                                                            }`}
                                                    >
                                                        {STATUS_LABELS[order.status] || order.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-blue-700 font-medium">
                                                    {fmt(order.salePrice)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-600">
                                                    {fmt(order.materialCost)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right font-semibold ${order.profit >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}
                                                >
                                                    {fmt(order.profit)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span
                                                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.profitMargin >= 30
                                                                ? 'bg-green-100 text-green-700'
                                                                : order.profitMargin >= 15
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}
                                                    >
                                                        {fmtPct(order.profitMargin)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                                    {new Date(order.createdAt).toLocaleDateString('es-GT', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}