// RUTA: src/pages/MaterialesConsolidado.jsx

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { generateMaterialsPDF } from '@/lib/generateMaterialsPDF';
import { generateCutOptimizationPDF } from '@/lib/generateCutOptimizationPDF';
import { FaFilePdf, FaCheckSquare, FaSquare, FaLayerGroup, FaCut, FaBoxes } from 'react-icons/fa';

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
    en_ruta: 'bg-cyan-100 text-cyan-800',
    completado: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-red-100 text-red-800',
};

const BAR_LENGTH = 580;
const formatCurrency = (amount) => `Q ${Number(amount || 0).toFixed(2)}`;

// ── Consolida múltiples reportes de perfiles (sumando cantidades y totales) ──
function consolidateReports(reports) {
    const map = {};
    reports.forEach(({ items }) => {
        if (!Array.isArray(items)) return;
        items.forEach((item) => {
            const key = `${item.tipo}__${item.nombre}__${item.color || ''}`;
            if (!map[key]) {
                map[key] = { ...item, cantidad: 0, precioTotal: 0 };
            }
            map[key].cantidad += item.cantidad || 0;
            map[key].precioTotal += item.precioTotal || 0;
        });
    });
    return Object.values(map).sort((a, b) => {
        const tipoOrder = { PERFIL: 0, ACCESORIO: 1, VIDRIO: 2 };
        return (tipoOrder[a.tipo?.toUpperCase()] ?? 9) - (tipoOrder[b.tipo?.toUpperCase()] ?? 9);
    });
}

function groupByType(items) {
    return {
        profiles: items.filter((i) => i.tipo?.trim().toUpperCase() === 'PERFIL'),
        accessories: items.filter((i) => i.tipo?.trim().toUpperCase() === 'ACCESORIO'),
        glasses: items.filter((i) => i.tipo?.trim().toUpperCase() === 'VIDRIO'),
    };
}

function Spinner({ className = 'w-4 h-4' }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}

// ── Panel de selección de pedidos ──
function OrdersPanel({ orders, selectedIds, loadingOrders, running, toggleOrder, toggleAll, onProfiles, onCuts, mode }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <FaLayerGroup size={13} className="text-blue-600" />
                    <p className="text-sm font-semibold text-gray-800">Pedidos</p>
                </div>
                <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline font-medium">
                    {selectedIds.size === orders.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loadingOrders ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                        <Spinner /> Cargando...
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-10">No hay pedidos activos</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {orders.map((order) => {
                            const selected = selectedIds.has(order.id);
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => toggleOrder(order.id)}
                                    className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3 ${selected ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                                >
                                    <span className={`mt-0.5 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-gray-300'}`}>
                                        {selected ? <FaCheckSquare size={15} /> : <FaSquare size={15} />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${selected ? 'text-blue-800' : 'text-gray-800'}`}>
                                            {order.project}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{order.client?.name || '—'}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${ORDER_STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {ORDER_STATUS_LABELS[order.status] || order.status}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer: dos acciones */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex-shrink-0 grid grid-cols-1 gap-2">
                <button
                    onClick={onProfiles}
                    disabled={selectedIds.size === 0 || running}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                >
                    {running && mode === 'profiles' ? (
                        <><Spinner /> Calculando...</>
                    ) : (
                        <><FaBoxes size={12} /> Reporte Perfiles {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</>
                    )}
                </button>
                <button
                    onClick={onCuts}
                    disabled={selectedIds.size === 0 || running}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                >
                    {running && mode === 'cuts' ? (
                        <><Spinner /> Optimizando...</>
                    ) : (
                        <><FaCut size={12} /> Optimizar Cortes {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function MaterialesConsolidado() {
    const [orders, setOrders] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [running, setRunning] = useState(false);
    const [mode, setMode] = useState(null); // 'profiles' | 'cuts' | null

    // Datos perfiles
    const [consolidatedData, setConsolidatedData] = useState(null);
    const [perProjectReports, setPerProjectReports] = useState([]); // [{orderId, project, items}]

    // Datos cortes
    const [cutsData, setCutsData] = useState(null); // { optimization, windows, orders }

    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);

    useEffect(() => {
        api.get('/orders')
            .then((r) => setOrders(Array.isArray(r.data) ? r.data.filter((o) => o.status !== 'cancelado') : []))
            .catch((err) => console.error('Error cargando pedidos:', err))
            .finally(() => setLoadingOrders(false));
    }, []);

    const resetResults = () => {
        setConsolidatedData(null);
        setPerProjectReports([]);
        setCutsData(null);
        setMode(null);
    };

    const toggleOrder = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        resetResults();
    };

    const toggleAll = () => {
        setSelectedIds(selectedIds.size === orders.length ? new Set() : new Set(orders.map((o) => o.id)));
        resetResults();
    };

    const selectedOrders = useMemo(() => orders.filter((o) => selectedIds.has(o.id)), [orders, selectedIds]);
    const orderById = useMemo(() => Object.fromEntries(orders.map((o) => [o.id, o])), [orders]);

    // ── Reporte Perfiles (con desglose por proyecto) ──
    const handleProfiles = async () => {
        if (selectedIds.size === 0) return;
        setRunning(true);
        setMode('profiles');
        setCutsData(null);
        setConsolidatedData(null);
        setPerProjectReports([]);
        setShowOrdersDrawer(false);

        try {
            const ids = Array.from(selectedIds);
            const results = await Promise.all(
                ids.map(async (orderId) => {
                    const res = await api.get(`/reports/order/${orderId}/profiles`);
                    return {
                        orderId,
                        project: orderById[orderId]?.project || `Pedido #${orderId}`,
                        items: res.data,
                    };
                }),
            );
            setPerProjectReports(results);
            setConsolidatedData(consolidateReports(results));
        } catch (err) {
            console.error('Error al calcular consolidado:', err);
            alert('Error al calcular materiales. Verifica que los pedidos tengan ventanas.');
        } finally {
            setRunning(false);
        }
    };

    // ── Optimización de Cortes global ──
    const handleCuts = async () => {
        if (selectedIds.size === 0) return;
        setRunning(true);
        setMode('cuts');
        setConsolidatedData(null);
        setPerProjectReports([]);
        setCutsData(null);
        setShowOrdersDrawer(false);

        try {
            const res = await api.post('/reports/orders/optimize-cuts', {
                orderIds: Array.from(selectedIds),
            });
            setCutsData(res.data);
        } catch (err) {
            console.error('Error al optimizar cortes:', err);
            alert('No se pudo optimizar cortes. Verifica que los pedidos tengan ventanas.');
        } finally {
            setRunning(false);
        }
    };

    // ── PDFs ──
    const handleDownloadProfilesPDF = async () => {
        if (!consolidatedData) return;
        setGeneratingPDF(true);
        try {
            const projectNames = selectedOrders.map((o) => o.project).join(', ');
            await generateMaterialsPDF({
                reportData: consolidatedData,
                projectName: projectNames,
                isConsolidated: true,
                perProjectBreakdown: perProjectReports.map((r) => ({ project: r.project, items: r.items })),
            });
        } catch (err) {
            console.error('Error generando PDF:', err);
        } finally {
            setGeneratingPDF(false);
        }
    };

    const handleDownloadCutsPDF = async () => {
        if (!cutsData) return;
        setGeneratingPDF(true);
        try {
            await generateCutOptimizationPDF({
                optimization: cutsData.optimization,
                windows: cutsData.windows,
                orders: cutsData.orders,
            });
        } catch (err) {
            console.error('Error generando PDF cortes:', err);
        } finally {
            setGeneratingPDF(false);
        }
    };

    const { profiles, accessories, glasses } = consolidatedData
        ? groupByType(consolidatedData)
        : { profiles: [], accessories: [], glasses: [] };

    const grandTotal = consolidatedData ? consolidatedData.reduce((sum, i) => sum + (i.precioTotal || 0), 0) : 0;

    const panelProps = {
        orders, selectedIds, loadingOrders, running,
        toggleOrder, toggleAll,
        onProfiles: handleProfiles, onCuts: handleCuts, mode,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            Materiales Consolidados
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">
                            Selecciona pedidos para generar reporte de perfiles u optimización global de cortes
                        </p>
                    </div>

                    <button
                        onClick={() => setShowOrdersDrawer(true)}
                        className="lg:hidden flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-xl active:bg-blue-700"
                    >
                        <FaLayerGroup size={13} />
                        <span>Pedidos</span>
                        {selectedIds.size > 0 && (
                            <span className="bg-white text-blue-600 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {selectedIds.size}
                            </span>
                        )}
                    </button>
                </div>

                {/* Drawer móvil */}
                {showOrdersDrawer && (
                    <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowOrdersDrawer(false)} />
                        <div className="relative z-10 w-80 max-w-[90vw] h-full bg-gray-50 overflow-y-auto p-4 shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                <p className="font-semibold text-gray-900 text-sm">Seleccionar Pedidos</p>
                                <button onClick={() => setShowOrdersDrawer(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                            </div>
                            <div className="flex-1 min-h-0">
                                <OrdersPanel {...panelProps} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Layout */}
                <div className="flex gap-6 items-start">
                    <div className="hidden lg:block w-80 flex-shrink-0 self-stretch">
                        <OrdersPanel {...panelProps} />
                    </div>

                    <div className="flex-1 min-w-0">

                        {/* Estado vacío */}
                        {!running && !consolidatedData && !cutsData && (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-16 sm:py-24 text-gray-400">
                                <FaLayerGroup size={36} className="mb-3 opacity-20" />
                                <p className="text-sm font-medium text-center px-4">
                                    Selecciona pedidos y elige una acción
                                </p>
                                <p className="text-xs mt-1">Reporte Perfiles · Optimizar Cortes</p>
                            </div>
                        )}

                        {/* Loader */}
                        {running && (
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 sm:py-24 text-gray-400">
                                <Spinner className="w-6 h-6 mb-3" />
                                <p className="text-sm">
                                    {mode === 'cuts' ? 'Optimizando cortes globalmente' : 'Calculando perfiles'} de {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''}...
                                </p>
                            </div>
                        )}

                        {/* ── Resultados: Perfiles ── */}
                        {consolidatedData && !running && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 sm:px-5 py-4">
                                    <div className="mb-3">
                                        <p className="text-sm font-semibold text-gray-800">
                                            Consolidado de {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            {selectedOrders.map((o) => o.project).join(' · ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Costo total</p>
                                            <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(grandTotal)}</p>
                                        </div>
                                        <button
                                            onClick={handleDownloadProfilesPDF}
                                            disabled={generatingPDF}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 flex-shrink-0"
                                        >
                                            <FaFilePdf size={13} />
                                            {generatingPDF ? 'Generando...' : 'Descargar PDF'}
                                        </button>
                                    </div>
                                </div>

                                {profiles.length > 0 && (
                                    <SectionTable
                                        title="Perfiles PVC" accent="blue" itemCountSuffix="ítem"
                                        columns={[
                                            { key: 'color', label: 'Color' },
                                            { key: 'nombre', label: 'Perfil', bold: true },
                                            { key: 'cantidad', label: 'Cant. Barras', align: 'center', accent: true },
                                            { key: 'precioUnitario', label: 'Unitario', align: 'right', money: true, muted: true },
                                            { key: 'precioTotal', label: 'Total', align: 'right', money: true, bold: true },
                                        ]}
                                        rows={profiles}
                                    />
                                )}
                                {accessories.length > 0 && (
                                    <SectionTable
                                        title="Accesorios" accent="red" itemCountSuffix="ítem"
                                        columns={[
                                            { key: 'nombre', label: 'Accesorio', bold: true },
                                            { key: 'cantidad', label: 'Cantidad', align: 'center', accent: true },
                                            { key: 'precioUnitario', label: 'Unitario', align: 'right', money: true, muted: true },
                                            { key: 'precioTotal', label: 'Total', align: 'right', money: true, bold: true },
                                        ]}
                                        rows={accessories}
                                    />
                                )}
                                {glasses.length > 0 && (
                                    <SectionTable
                                        title="Vidrios" accent="emerald" itemCountSuffix="ítem"
                                        columns={[
                                            { key: 'nombre', label: 'Tipo', bold: true },
                                            { key: 'cantidad', label: 'Planchas', align: 'center', accent: true },
                                            { key: 'precioUnitario', label: 'Unitario', align: 'right', money: true, muted: true },
                                            { key: 'precioTotal', label: 'Total', align: 'right', money: true, bold: true },
                                        ]}
                                        rows={glasses}
                                    />
                                )}

                                {/* Desglose por proyecto */}
                                {perProjectReports.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Desglose por proyecto</p>
                                            <span className="ml-auto text-xs text-gray-400">
                                                {perProjectReports.length} proyecto{perProjectReports.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {perProjectReports.map((r) => {
                                                const subtotal = (r.items || []).reduce((s, i) => s + (i.precioTotal || 0), 0);
                                                return (
                                                    <details key={r.orderId} className="group">
                                                        <summary className="px-4 sm:px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 list-none">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <span className="text-gray-400 group-open:rotate-90 transition-transform">▸</span>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-800 truncate">{r.project}</p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {r.items?.length || 0} materiales
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-900 flex-shrink-0 ml-3">
                                                                {formatCurrency(subtotal)}
                                                            </p>
                                                        </summary>
                                                        <div className="px-4 sm:px-5 pb-4 bg-gray-50/50">
                                                            <table className="min-w-full text-xs mt-2">
                                                                <thead>
                                                                    <tr className="text-gray-500">
                                                                        <th className="text-left py-1.5 pr-3">Material</th>
                                                                        <th className="text-left py-1.5 pr-3">Color</th>
                                                                        <th className="text-center py-1.5 px-2">Cant.</th>
                                                                        <th className="text-right py-1.5 pl-3">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {(r.items || []).map((it, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="py-1.5 pr-3 text-gray-700">{it.nombre}</td>
                                                                            <td className="py-1.5 pr-3 text-gray-500">{it.color || '—'}</td>
                                                                            <td className="py-1.5 px-2 text-center font-semibold text-gray-800">{it.cantidad}</td>
                                                                            <td className="py-1.5 pl-3 text-right font-semibold text-gray-800">{formatCurrency(it.precioTotal)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </details>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Resultados: Cortes ── */}
                        {cutsData && !running && (
                            <CutsResultView
                                data={cutsData}
                                generatingPDF={generatingPDF}
                                onDownload={handleDownloadCutsPDF}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Tabla reutilizable genérica ──
function SectionTable({ title, accent, columns, rows, itemCountSuffix }) {
    const accentBar = {
        blue: 'bg-blue-500', red: 'bg-red-500', emerald: 'bg-emerald-500',
    }[accent] || 'bg-gray-400';
    const accentTextCol = {
        blue: 'text-blue-600', red: 'text-red-600', emerald: 'text-emerald-600',
    }[accent] || 'text-gray-700';
    const fmt = (v, col) => col.money ? formatCurrency(v) : (v ?? '—');
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <span className={`w-1 h-5 rounded-full ${accentBar}`} />
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <span className="ml-auto text-xs text-gray-400">
                    {rows.length} {itemCountSuffix}{rows.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100">
                            {columns.map((c) => (
                                <th key={c.key} className={`py-2.5 px-5 text-xs font-semibold text-gray-500 uppercase ${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`}>
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rows.map((item, i) => (
                            <tr key={i}>
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={`py-3 px-5 ${c.align === 'center' ? `text-center ${c.accent ? `font-bold ${accentTextCol}` : ''}` : c.align === 'right' ? 'text-right' : ''} ${c.bold ? 'font-semibold text-gray-800' : c.muted ? 'text-gray-500' : 'text-gray-800'}`}
                                    >
                                        {fmt(item[c.key], c)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Vista de resultados de optimización de cortes ──
function CutsResultView({ data, generatingPDF, onDownload }) {
    const { optimization, windows, orders } = data || {};
    const totalBars = useMemo(() => {
        if (!optimization) return 0;
        let sum = 0;
        Object.values(optimization).forEach((variants) => {
            (variants || []).forEach((v) => { sum += v.totalBars || 0; });
        });
        return sum;
    }, [optimization]);

    return (
        <div className="space-y-4">
            {/* Barra superior */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 sm:px-5 py-4">
                <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-800">
                        Plan de Corte Consolidado ({orders?.length || 0} pedido{orders?.length !== 1 ? 's' : ''})
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {(orders || []).map((o) => o.project).join(' · ')}
                    </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-gray-500">Barras totales</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-900">{totalBars}</p>
                    </div>
                    <button
                        onClick={onDownload}
                        disabled={generatingPDF}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 flex-shrink-0"
                    >
                        <FaFilePdf size={13} />
                        {generatingPDF ? 'Generando...' : 'Descargar PDF'}
                    </button>
                </div>
            </div>

            {/* Tabla de ventanas con proyecto */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-500 rounded-full" />
                    <p className="text-sm font-semibold text-gray-800">Ventanas incluidas</p>
                    <span className="ml-auto text-xs text-gray-400">
                        {(windows || []).length} ventana{(windows || []).length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                                <th className="py-2.5 px-4 text-center">Ref</th>
                                <th className="py-2.5 px-4 text-left">Proyecto</th>
                                <th className="py-2.5 px-4 text-left">Tipo</th>
                                <th className="py-2.5 px-4 text-left">Color PVC</th>
                                <th className="py-2.5 px-4 text-left">Vidrio</th>
                                <th className="py-2.5 px-4 text-center">Dimensiones</th>
                                <th className="py-2.5 px-4 text-center">Cant</th>
                                <th className="py-2.5 px-4 text-center">Mosq.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(windows || []).map((w) => (
                                <tr key={w.index}>
                                    <td className="py-2.5 px-4 text-center font-bold text-blue-600">{w.label}</td>
                                    <td className="py-2.5 px-4 text-gray-800 font-medium">{w.project}</td>
                                    <td className="py-2.5 px-4 text-gray-700">{w.windowTypeName}</td>
                                    <td className="py-2.5 px-4 text-gray-600">{w.pvcColor}</td>
                                    <td className="py-2.5 px-4 text-gray-600">{w.glassColor}</td>
                                    <td className="py-2.5 px-4 text-center text-gray-700">
                                        {Number(w.width_cm).toFixed(1)} × {Number(w.height_cm).toFixed(1)} cm
                                    </td>
                                    <td className="py-2.5 px-4 text-center font-semibold text-gray-800">{w.quantity}</td>
                                    <td className={`py-2.5 px-4 text-center font-bold ${w.hasMosquitero ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {w.hasMosquitero ? '✓' : '✗'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Optimización por perfil */}
            <div className="space-y-4">
                {Object.entries(optimization || {}).map(([profileName, variants]) => (
                    <div key={profileName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                            <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                            <p className="text-sm font-semibold text-gray-800">{profileName}</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {(variants || []).map((variant, vi) => (
                                <div key={vi} className="px-4 sm:px-5 py-3">
                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                        <p className="text-sm font-semibold text-gray-700">{variant.color}</p>
                                        <p className="text-xs text-gray-500">
                                            {variant.machineSeries
                                                ? `${variant.series?.length || 0} series máquina · ${variant.totalBars} barras`
                                                : `${variant.totalBars} barras`}
                                        </p>
                                    </div>
                                    {variant.machineSeries && Array.isArray(variant.series) ? (
                                        <div className="space-y-1.5">
                                            {variant.series.map((s) => (
                                                <div key={s.serieIndex} className="bg-indigo-50/60 rounded-lg px-3 py-2 text-xs">
                                                    <p className="font-semibold text-indigo-800 mb-0.5">
                                                        Serie {s.serieIndex} · Uso {s.totalUsed}/{BAR_LENGTH}cm · Eficiencia {Number(s.efficiency ?? 0).toFixed(1)}%
                                                    </p>
                                                    <p className="text-gray-600 break-words">
                                                        {(s.cuts || []).map((c) => `${c.length}cm (${c.windowLabel})`).join(' · ')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {(variant.bars || []).map((bar, bi) => {
                                                const used = bar.totalUsed ?? bar.used ?? 0;
                                                const waste = bar.waste ?? (BAR_LENGTH - used);
                                                return (
                                                    <div key={bi} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                                        <p className="font-semibold text-gray-700 mb-0.5">
                                                            Barra {bi + 1} · Uso {used}/{BAR_LENGTH}cm · Desperdicio {waste}cm
                                                        </p>
                                                        <p className="text-gray-600 break-words">
                                                            {(bar.cuts || []).map((c) => `${c.length}cm (${c.windowLabel})`).join(' · ')}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
