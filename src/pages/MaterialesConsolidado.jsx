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

// Agrupa y suma los materiales de múltiples reportes
function consolidateReports(reports) {
    const map = {};

    reports.forEach(({ items }) => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
            // Key única por tipo + nombre + color (para perfiles)
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

export default function MaterialesConsolidado() {
    const [orders, setOrders] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [consolidatedData, setConsolidatedData] = useState(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);

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
        // Limpiar resultado anterior al cambiar selección
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

        try {
            // Fetching reporte de cada pedido seleccionado en paralelo
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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

                {/* ── Header ── */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Materiales Consolidados</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Selecciona uno o más pedidos para generar un listado unificado de materiales
                    </p>
                </div>

                <div className="flex gap-6 items-start">

                    {/* ── Panel izquierdo: selección de pedidos ── */}
                    <div className="w-80 flex-shrink-0 space-y-3">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Header del panel */}
                            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
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

                            {loadingOrders ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Cargando...
                                </div>
                            ) : orders.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-10">No hay pedidos activos</p>
                            ) : (
                                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                                    {orders.map(order => {
                                        const selected = selectedIds.has(order.id);
                                        return (
                                            <button
                                                key={order.id}
                                                onClick={() => toggleOrder(order.id)}
                                                className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3 ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
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

                            {/* Footer del panel */}
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60">
                                <button
                                    onClick={handleCalculate}
                                    disabled={selectedIds.size === 0 || calculating}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                                >
                                    {calculating ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Calculando...
                                        </>
                                    ) : (
                                        <>
                                            <FaLayerGroup size={12} />
                                            Calcular {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Panel derecho: resultado consolidado ── */}
                    <div className="flex-1 min-w-0">
                        {!consolidatedData && !calculating && (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-24 text-gray-400">
                                <FaLayerGroup size={36} className="mb-3 opacity-20" />
                                <p className="text-sm font-medium">Selecciona pedidos y presiona "Calcular"</p>
                                <p className="text-xs mt-1">El listado consolidado aparecerá aquí</p>
                            </div>
                        )}

                        {calculating && (
                            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-24 text-gray-400">
                                <svg className="animate-spin w-6 h-6 mb-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <p className="text-sm">Calculando materiales de {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''}...</p>
                            </div>
                        )}

                        {consolidatedData && !calculating && (
                            <div className="space-y-4">

                                {/* Barra de acciones */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            Consolidado de {selectedIds.size} pedido{selectedIds.size !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {selectedOrders.map(o => o.project).join(' · ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Costo total</p>
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(grandTotal)}</p>
                                        </div>
                                        <button
                                            onClick={handleDownloadPDF}
                                            disabled={generatingPDF}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                                        >
                                            <FaFilePdf size={13} />
                                            {generatingPDF ? 'Generando...' : 'Descargar PDF'}
                                        </button>
                                    </div>
                                </div>

                                {/* Tabla Perfiles */}
                                {profiles.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-blue-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Perfiles PVC</p>
                                            <span className="ml-auto text-xs text-gray-400">{profiles.length} ítem{profiles.length !== 1 ? 's' : ''}</span>
                                        </div>
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
                                )}

                                {/* Tabla Accesorios */}
                                {accessories.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-red-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Accesorios</p>
                                            <span className="ml-auto text-xs text-gray-400">{accessories.length} ítem{accessories.length !== 1 ? 's' : ''}</span>
                                        </div>
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
                                )}

                                {/* Tabla Vidrios */}
                                {glasses.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                                            <p className="text-sm font-semibold text-gray-800">Vidrios</p>
                                            <span className="ml-auto text-xs text-gray-400">{glasses.length} ítem{glasses.length !== 1 ? 's' : ''}</span>
                                        </div>
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
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}