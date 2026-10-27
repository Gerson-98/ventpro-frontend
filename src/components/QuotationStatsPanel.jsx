// src/components/QuotationStatsPanel.jsx
//
// Panel de estadísticas de cotizaciones SOLO para el administrador: cuántas
// cotizaciones se hacen por día, valor promedio, ranking por vendedor, conversión
// y señales de alerta (bajo el mínimo sugerido, cotizaciones sin seguimiento).

import { useEffect, useMemo, useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FaChartBar, FaChevronDown, FaChevronUp, FaTrophy, FaExclamationTriangle } from 'react-icons/fa';
import api from '@/services/api';

const fmtQ = (n) => `Q ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtQ0 = (n) => `Q ${Math.round(Number(n || 0)).toLocaleString('en-US')}`;

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const PERIODS = [
    { id: 'hoy', label: 'Hoy' },
    { id: '7d', label: 'Últimos 7 días' },
    { id: 'mes', label: 'Este mes' },
    { id: 'mes_ant', label: 'Mes pasado' },
    { id: '30d', label: 'Últimos 30 días' },
    { id: 'custom', label: 'Personalizado' },
];

function rangeFor(period, custom) {
    const today = new Date();
    switch (period) {
        case 'hoy': return { from: toKey(today), to: toKey(today) };
        case '7d': return { from: toKey(addDays(today, -6)), to: toKey(today) };
        case '30d': return { from: toKey(addDays(today, -29)), to: toKey(today) };
        case 'mes_ant': {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: toKey(first), to: toKey(last) };
        }
        case 'custom': return { from: custom.from, to: custom.to };
        case 'mes':
        default:
            return { from: toKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: toKey(today) };
    }
}

const shortDate = (key) => {
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
};
const longDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('es-GT', {
    weekday: 'short', day: 'numeric', month: 'short',
});

function Kpi({ label, value, sub, tone = 'text-gray-900', onClick }) {
    return (
        <div
            onClick={onClick}
            title={onClick ? 'Ver estas cotizaciones en la lista' : undefined}
            className={`bg-white rounded-xl border border-gray-200 p-3 sm:p-4 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-200 transition' : ''}`}
        >
            <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-xl sm:text-2xl font-black mt-1 leading-tight ${tone}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

export default function QuotationStatsPanel({ onDrill }) {
    const [open, setOpen] = useState(true);
    const [period, setPeriod] = useState('mes');
    const todayKey = toKey(new Date());
    const [custom, setCustom] = useState({ from: todayKey, to: todayKey });
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const range = useMemo(() => rangeFor(period, custom), [period, custom]);

    useEffect(() => {
        if (!open) return;
        if (!range.from || !range.to) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get('/quotations/stats', { params: range });
                if (!cancelled) setStats(res.data);
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || 'No se pudieron cargar las estadísticas.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, range.from, range.to]);

    const t = stats?.totals;
    const maxCount = stats ? Math.max(0, ...stats.bySeller.map(s => s.count)) : 0;
    const manyDays = (stats?.byDay?.length || 0) > 45;

    // Al tocar una cifra se filtra la lista de abajo con las cotizaciones que la forman.
    const periodLabel = stats ? `${shortDate(stats.period.from)} → ${shortDate(stats.period.to)}` : '';
    const drill = (extra, label) => onDrill && onDrill({ from: stats.period.from, to: stats.period.to, ...extra, label });

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-gray-50 transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <FaChartBar className="text-blue-600" />
                    Actividad de cotizaciones
                    <span className="hidden sm:inline text-xs font-normal text-gray-400">· control de vendedores</span>
                </span>
                {open ? <FaChevronUp size={12} className="text-gray-400" /> : <FaChevronDown size={12} className="text-gray-400" />}
            </button>

            {open && (
                <div className="px-4 sm:px-5 pb-5 border-t border-gray-100">
                    {/* Período */}
                    <div className="flex flex-wrap items-center gap-2 py-3">
                        {PERIODS.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPeriod(p.id)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${period === p.id
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                        {period === 'custom' && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <input type="date" value={custom.from} max={custom.to}
                                    onChange={(e) => setCustom(c => ({ ...c, from: e.target.value }))}
                                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                                a
                                <input type="date" value={custom.to} min={custom.from} max={todayKey}
                                    onChange={(e) => setCustom(c => ({ ...c, to: e.target.value }))}
                                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                            </span>
                        )}
                        {stats && (
                            <span className="text-xs text-gray-400 sm:ml-auto">
                                {longDate(stats.period.from)} → {longDate(stats.period.to)} · {stats.period.days} día{stats.period.days !== 1 ? 's' : ''}
                                {loading && ' · actualizando…'}
                            </span>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-600 py-4">{error}</p>}
                    {!stats && loading && <p className="text-sm text-gray-400 py-6">Cargando estadísticas…</p>}

                    {stats && (
                        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                                <Kpi label="Cotizaciones" value={t.count}
                                    onClick={() => drill({}, `Todas las cotizaciones · ${periodLabel}`)}
                                    sub={`${t.perDay} por día${t.peakDay ? ` · máx. ${t.peakDay.count} el ${shortDate(t.peakDay.date)}` : ''}`} />
                                <Kpi label="Valor promedio" value={fmtQ(t.avg)} sub={`Total cotizado ${fmtQ0(t.value)}`} tone="text-blue-700" />
                                <Kpi label="Confirmadas" value={`${t.confirmed} (${t.conversion}%)`}
                                    onClick={() => drill({ status: 'confirmado' }, `Confirmadas · ${periodLabel}`)}
                                    sub={`${fmtQ0(t.confirmedValue)} vendido`} tone="text-emerald-600" />
                                <Kpi label="Bajo el mínimo sugerido" value={t.belowMin}
                                    onClick={t.belowMin > 0 ? () => drill({ belowMin: true }, `Bajo el mínimo sugerido · ${periodLabel}`) : undefined}
                                    sub="total menor al mínimo calculado" tone={t.belowMin > 0 ? 'text-amber-600' : 'text-gray-900'} />
                            </div>

                            {/* Gráfica por día */}
                            <div className="border border-gray-100 rounded-xl p-3 mb-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cotizaciones por día <span className="normal-case font-normal text-gray-400">· toca una barra para ver ese día</span></p>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={stats.byDay} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }}
                                            interval={manyDays ? 'preserveStartEnd' : 0} minTickGap={8} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            labelFormatter={longDate}
                                            formatter={(v, name, p) => [`${v} (${fmtQ0(p.payload.value)})`, 'Cotizaciones']}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="#2563eb"
                                            radius={[3, 3, 0, 0]}
                                            cursor="pointer"
                                            onClick={(d) => d?.count > 0 && onDrill && onDrill({ from: d.date, to: d.date, label: `Cotizaciones del ${longDate(d.date)}` })}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Alerta de seguimiento */}
                            {stats.followUp.count > 0 && (
                                <div
                                    onClick={() => onDrill && onDrill({ followUpDays: stats.followUp.days, label: `En proceso hace más de ${stats.followUp.days} días` })}
                                    title="Ver estas cotizaciones en la lista"
                                    className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-3 py-2 mb-4 text-xs sm:text-sm cursor-pointer hover:bg-amber-100 transition-colors"
                                >
                                    <FaExclamationTriangle className="mt-0.5 flex-shrink-0" size={12} />
                                    <span>
                                        <b>{stats.followUp.count}</b> cotizaciones llevan más de {stats.followUp.days} días en proceso sin confirmarse
                                        (<b>{fmtQ0(stats.followUp.value)}</b> en juego). <u>Ver cuáles</u>.
                                    </span>
                                </div>
                            )}

                            {/* Ranking de vendedores */}
                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2 bg-gray-50 border-b border-gray-100">
                                    Por vendedor
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">
                                                <th className="py-2 px-3 text-left font-semibold">Vendedor</th>
                                                <th className="py-2 px-3 text-right font-semibold">Cotizaciones</th>
                                                <th className="py-2 px-3 text-right font-semibold">Por día</th>
                                                <th className="py-2 px-3 text-right font-semibold">Promedio</th>
                                                <th className="py-2 px-3 text-right font-semibold">Total cotizado</th>
                                                <th className="py-2 px-3 text-right font-semibold">Confirmadas</th>
                                                <th className="py-2 px-3 text-right font-semibold" title="Total menor al mínimo sugerido">Bajo mín.</th>
                                                <th className="py-2 px-3 text-right font-semibold" title="En proceso hace más de 7 días">Sin seguimiento</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats.bySeller.map((s, i) => (
                                                <tr key={s.userId ?? 'none'} className="hover:bg-gray-50/60">
                                                    <td
                                                        className={`py-2 px-3 font-semibold text-gray-800 whitespace-nowrap ${s.userId && s.count > 0 ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}`}
                                                        title={s.userId && s.count > 0 ? 'Ver las cotizaciones de este vendedor' : undefined}
                                                        onClick={() => s.userId && s.count > 0 && drill({ userId: s.userId }, `${s.name} · ${periodLabel}`)}
                                                    >
                                                        {i === 0 && s.count > 0 && <FaTrophy size={11} className="inline text-amber-500 mr-1.5 -mt-0.5" title="Más cotizaciones del período" />}
                                                        {s.name}
                                                        {s.count === 0 && <span className="ml-2 text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">sin cotizar</span>}
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="hidden sm:block w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <span className="block h-full bg-blue-500 rounded-full" style={{ width: `${maxCount ? (s.count / maxCount) * 100 : 0}%` }} />
                                                            </span>
                                                            <b className="tabular-nums">{s.count}</b>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-right tabular-nums text-gray-600">{s.perDay}</td>
                                                    <td className="py-2 px-3 text-right tabular-nums text-gray-600">{s.count ? fmtQ0(s.avg) : '—'}</td>
                                                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-gray-800">{s.count ? fmtQ0(s.value) : '—'}</td>
                                                    <td className="py-2 px-3 text-right tabular-nums text-emerald-700">
                                                        {s.count ? `${s.confirmed} (${s.conversion}%)` : '—'}
                                                    </td>
                                                    <td
                                                        className={`py-2 px-3 text-right tabular-nums ${s.belowMin > 0 ? 'text-amber-600 font-bold cursor-pointer hover:underline' : 'text-gray-400'}`}
                                                        title={s.belowMin > 0 ? 'Ver estas cotizaciones' : undefined}
                                                        onClick={() => s.belowMin > 0 && s.userId && drill({ userId: s.userId, belowMin: true }, `${s.name} · bajo el mínimo sugerido · ${periodLabel}`)}
                                                    >{s.belowMin}</td>
                                                    <td
                                                        className={`py-2 px-3 text-right tabular-nums ${s.followUpCount > 0 ? 'text-gray-700 cursor-pointer hover:underline' : 'text-gray-400'}`}
                                                        title={s.followUpCount > 0 ? 'Ver estas cotizaciones' : undefined}
                                                        onClick={() => s.followUpCount > 0 && s.userId && onDrill && onDrill({ userId: s.userId, followUpDays: stats.followUp.days, label: `${s.name} · en proceso hace más de ${stats.followUp.days} días` })}
                                                    >
                                                        {s.followUpCount > 0 ? `${s.followUpCount} · ${fmtQ0(s.followUpValue)}` : '0'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {stats.bySeller.length === 0 && (
                                                <tr><td colSpan={8} className="py-6 text-center text-gray-400 text-sm">Sin actividad en este período.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2">
                                Fechas en hora de Guatemala. “Bajo mín.” cuenta cotizaciones cuyo total quedó por debajo del mínimo sugerido (costo ÷ margen) calculado al guardarlas.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
