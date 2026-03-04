// RUTA: src/pages/MaterialesConsolidado.jsx

import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { generateMaterialsPDF } from '@/lib/generateMaterialsPDF';
import { FaFilePdf, FaCheckSquare, FaSquare, FaLayerGroup } from 'react-icons/fa';

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

const formatCurrency = (amount) => `Q ${Number(amount || 0).toFixed(2)}`;

function consolidateReports(reports) {
    const map = {};
    reports.forEach(({ items }) => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
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
        profiles: items.filter(i => i.tipo?.trim().toUpperCase() === 'PERFIL'),
        accessories: items.filter(i => i.tipo?.trim().toUpperCase() === 'ACCESORIO'),
        glasses: items.filter(i => i.tipo?.trim().toUpperCase() === 'VIDRIO'),
    };
}

// ── Spinner reutilizable ──
function Spinner({ className = 'w-4 h-4' }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}

// ── Panel de selección de pedidos (contenido compartido drawer/sidebar) ──
function OrdersPanel({ orders, selectedIds, loadingOrders, calculating, toggleOrder, toggleAll, handleCalculate }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <FaLayerGroup size={13} className="text-blue-600" />
                    <p className="text-sm font-semibold text-gray-800">Pedidos</p>
                </div>
                <button
                    onClick={toggleAll}
                    className="text-xs text-blue-600 hover:underline font-medium"
                >
                    {selectedIds.size === orders.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
                {loadingOrders ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                        <Spinner /> Cargando...
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-10">No hay pedidos activos</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {orders.map(order => {
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

            {/* Footer: botón calcular */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
                <button
                    onClick={handleCalculate}
                    disabled={selectedIds.size === 0 || calculating}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                >
                    {calculating ? (
                        <><Spinner /> Calculando...</>
                    ) : (
                        <><FaLayerGroup size={12} /> Calcular {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</>
                    )}
                </button>
            </div>
        </div>
    );
}

// ── Tabla de materiales (desktop) ──
function MaterialTable({ items, accentColor, columns }) {
    return (
        <table className="min-w-full text-sm">
            <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                    {columns.map(col => (
                        <th
                            key={col.key}
                            className={`py-2.5 px-5 text-xs font-semibold text-gray-500 uppercase ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                            {col.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => (
                    <tr key={i} className={`hover:bg-${accentColor}-50/20`}>
                        {columns.map(col => (
                            <td
                                key={col.key}
                                className={`py-3 px-5 ${col.align === 'center' ? `text-center font-bold text-${accentColor}-600` : col.align === 'right' ? 'text-right' : ''} ${col.bold ? 'font-semibold text-gray-800' : col.muted ? 'text-gray-500' : 'text-gray-800'} ${col.medium ? 'font-medium' : ''}`}
                            >
                                {col.format ? col.format(item[col.key]) : item[col.key] || '—'}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── Cards de materiales (móvil) ──
function MaterialCards({ items, accentColor, renderCard }) {
    return (
        <div className="divide-y divide-gray-50">
            {items.map((item, i) => renderCard(item, i, accentColor))}
        </div>
    );
}

export default function MaterialesConsolidado() {
    const [orders, setOrders] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [consolidatedData, setConsolidatedData] = useState(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);

    useEffect(() => {
        api.get('/orders')
            .then(r => setOrders(Array.isArray(r.data) ? r.data.filter(o => o.status !== 'cancelado') : []))
            .catch(err => console.error('Error cargando pedidos:', err))
            .finally(() => setLoadingOrders(false));
    }, []);

    const toggleOrder = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        setConsolidatedData(null);
    };

    const toggleAll = () => {
        if (selectedIds.size === orders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(orders.map(o => o.id)));
        }
        setConsolidatedData(null);
    };

    const selectedOrders = useMemo(() => orders.filter(o => selectedIds.has(o.id)), [orders, selectedIds]);

    const handleCalculate = async () => {
        if (selectedIds.size === 0) return;
        setCalculating(true);
        setConsolidatedData(null);
        setShowOrdersDrawer(false); // cerrar drawer en móvil al calcular

        try {
            const results = await Promise.all(
                Array.from(selectedIds).map(async (orderId) => {
                    const res = await api.get(`/reports/order/${orderId}/profiles`);
                    return { orderId, items: res.data };
                })
            );
            const consolidated = consolidateReports(results);
            setConsolidatedData(consolidated);
        } catch (err) {
            console.error('Error al calcular consolidado:', err);
            alert('Error al calcular materiales. Verifica que los pedidos tengan ventanas.');
        } finally {
            setCalculating(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!consolidatedData) return;
        setGeneratingPDF(true);
        try {
            const projectNames = selectedOrders.map(o => o.project).join(', ');
            generateMaterialsPDF({
                reportData: consolidatedData,
                projectName: projectNames,
                isConsolidated: true,
            });
        } catch (err) {
            console.error('Error generando PDF:', err);
            alert('No se pudo generar el PDF.');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const { profiles, accessories, glasses } = consolidatedData
        ? groupByType(consolidatedData)
        : { profiles: [], accessories: [], glasses: [] };

    const grandTotal = consolidatedData
        ? consolidatedData.reduce((sum, i) => sum + (i.precioTotal || 0), 0)
        : 0;

    const panelProps = { orders, selectedIds, loadingOrders, calculating, toggleOrder, toggleAll, handleCalculate };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            Materiales Consolidados
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">
                            Selecciona uno o más pedidos para generar un listado unificado de materiales
                        </p>
                    </div>

                    {/* Botón abrir drawer pedidos — solo móvil */}
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

                {/* ── Drawer pedidos — móvil ── */}
                {showOrdersDrawer && (
                    <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setShowOrdersDrawer(false)}
                        />
                        <div className="relative z-10 w-80 max-w-[90vw] h-full bg-gray-50 overflow-y-auto p-4 shadow-2xl flex flex-col">
                            {/* Cabecera drawer */}
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                <p className="font-semibold text-gray-900 text-sm">Seleccionar Pedidos</p>
                                <button
                                    onClick={() => setShowOrdersDrawer(false)}
                                    className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex-1 min-h-0">
                                <OrdersPanel {...panelProps} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Layout principal ── */}
                <div className="flex gap-6 items-start">

                    {/* Panel izquierdo — solo desktop (lg+) */}
                    <div className="hidden lg:block w-80 flex-shrink-0 self-stretch">
                        <OrdersPanel {...panelProps} />
                    </div>

                    {/* Panel derecho: resultado */}
                    <div className="flex-1 min-w-0">

                        {/* Estado vacío */}
                        {!consolidatedData && !calculating && (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-16 sm:py-24 text-gray-400">
                                <FaLayerGroup size={36} className="mb-3 opacity-20" />
                                <p className="text-sm font-medium text-center px-4">
                                    Selecciona pedidos y presiona "Calcular"
                                </p>
                                <p className="text-xs mt-1">El listado consolidado aparecerá aquí</p>
                            </div>
                        )}

                        {/* Calculando */}
                        {calculating && (
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 sm:py-24 text-gray-400">
                                <Spinner className="w-6 h-6 mb-3" />
                                <p className="text-sm">
                                    Calculando materiales de {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''}...
                                </p>
                            </div>
                        )}

                        {/* Resultados */}
                        {consolidatedData && !calculating && (
                            <div className="space-y-4">

                                {/* Barra de acciones */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 sm:px-5 py-4">
                                    {/* Fila 1: título + proyectos */}
                                    <div className="mb-3">
                                        <p className="text-sm font-semibold text-gray-800">
                                            Consolidado de {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            {selectedOrders.map(o => o.project).join(' · ')}
                                        </p>
                                    </div>
                                    {/* Fila 2: total + botón PDF */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Costo total</p>
                                            <p className="text-lg sm:text-xl font-bold text-gray-900">
                                                {formatCurrency(grandTotal)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleDownloadPDF}
                                            disabled={generatingPDF}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 flex-shrink-0"
                                        >
                                            <FaFilePdf size={13} />
                                            {generatingPDF ? 'Generando...' : 'PDF'}
                                        </button>
                                    </div>
                                </div>

                                {/* ── Perfiles PVC ── */}
                                {profiles.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-blue-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Perfiles PVC</p>
                                            <span className="ml-auto text-xs text-gray-400">
                                                {profiles.length} ítem{profiles.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Tabla desktop */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50/70 border-b border-gray-100">
                                                        <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase">Color</th>
                                                        <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase">Perfil</th>
                                                        <th className="py-2.5 px-5 text-center text-xs font-semibold text-gray-500 uppercase">Cant. Barras</th>
                                                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {profiles.map((item, i) => (
                                                        <tr key={i} className="hover:bg-blue-50/30">
                                                            <td className="py-3 px-5 text-gray-600">{item.color || '—'}</td>
                                                            <td className="py-3 px-5 font-medium text-gray-800">{item.nombre}</td>
                                                            <td className="py-3 px-5 text-center font-bold text-blue-600">{item.cantidad}</td>
                                                            <td className="py-3 px-5 text-right text-gray-500">{formatCurrency(item.precioUnitario)}</td>
                                                            <td className="py-3 px-5 text-right font-semibold text-gray-800">{formatCurrency(item.precioTotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Cards móvil */}
                                        <div className="sm:hidden divide-y divide-gray-50">
                                            {profiles.map((item, i) => (
                                                <div key={i} className="px-4 py-3">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className="font-medium text-sm text-gray-800 leading-tight">{item.nombre}</p>
                                                        <span className="font-bold text-sm text-blue-600 flex-shrink-0">{item.cantidad} barras</span>
                                                    </div>
                                                    {item.color && (
                                                        <p className="text-xs text-gray-500 mb-1">{item.color}</p>
                                                    )}
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <span>Unit: {formatCurrency(item.precioUnitario)}</span>
                                                        <span className="font-semibold text-gray-800">{formatCurrency(item.precioTotal)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Accesorios ── */}
                                {accessories.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-red-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Accesorios</p>
                                            <span className="ml-auto text-xs text-gray-400">
                                                {accessories.length} ítem{accessories.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Tabla desktop */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50/70 border-b border-gray-100">
                                                        <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase">Accesorio</th>
                                                        <th className="py-2.5 px-5 text-center text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                                                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {accessories.map((item, i) => (
                                                        <tr key={i} className="hover:bg-red-50/20">
                                                            <td className="py-3 px-5 font-medium text-gray-800">{item.nombre}</td>
                                                            <td className="py-3 px-5 text-center font-bold text-red-600">{item.cantidad}</td>
                                                            <td className="py-3 px-5 text-right text-gray-500">{formatCurrency(item.precioUnitario)}</td>
                                                            <td className="py-3 px-5 text-right font-semibold text-gray-800">{formatCurrency(item.precioTotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Cards móvil */}
                                        <div className="sm:hidden divide-y divide-gray-50">
                                            {accessories.map((item, i) => (
                                                <div key={i} className="px-4 py-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-sm text-gray-800">{item.nombre}</p>
                                                        <span className="font-bold text-sm text-red-600 flex-shrink-0">{item.cantidad} uds</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                                        <span>Unit: {formatCurrency(item.precioUnitario)}</span>
                                                        <span className="font-semibold text-gray-800">{formatCurrency(item.precioTotal)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Vidrios ── */}
                                {glasses.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Vidrios</p>
                                            <span className="ml-auto text-xs text-gray-400">
                                                {glasses.length} ítem{glasses.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Tabla desktop */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50/70 border-b border-gray-100">
                                                        <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                                                        <th className="py-2.5 px-5 text-center text-xs font-semibold text-gray-500 uppercase">Planchas</th>
                                                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {glasses.map((item, i) => (
                                                        <tr key={i} className="hover:bg-emerald-50/20">
                                                            <td className="py-3 px-5 font-medium text-gray-800">{item.nombre}</td>
                                                            <td className="py-3 px-5 text-center font-bold text-emerald-600">{item.cantidad}</td>
                                                            <td className="py-3 px-5 text-right text-gray-500">{formatCurrency(item.precioUnitario)}</td>
                                                            <td className="py-3 px-5 text-right font-semibold text-gray-800">{formatCurrency(item.precioTotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Cards móvil */}
                                        <div className="sm:hidden divide-y divide-gray-50">
                                            {glasses.map((item, i) => (
                                                <div key={i} className="px-4 py-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-sm text-gray-800">{item.nombre}</p>
                                                        <span className="font-bold text-sm text-emerald-600 flex-shrink-0">{item.cantidad} planchas</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                                        <span>Unit: {formatCurrency(item.precioUnitario)}</span>
                                                        <span className="font-semibold text-gray-800">{formatCurrency(item.precioTotal)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}