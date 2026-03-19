// RUTA: src/components/ProfilesReportModal.jsx

import React, { useState, useEffect } from 'react';
import { generateMaterialsPDF } from '@/lib/generateMaterialsPDF';
import { FaFilePdf, FaSave } from 'react-icons/fa';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const groupReportByType = (reportData) => {
    if (!Array.isArray(reportData)) {
        return { profilesReport: [], accessoriesReport: [], glassReport: [] };
    }
    return {
        profilesReport: reportData.filter(item => item.tipo?.trim().toUpperCase() === 'PERFIL'),
        accessoriesReport: reportData.filter(item => item.tipo?.trim().toUpperCase() === 'ACCESORIO'),
        glassReport: reportData.filter(item => item.tipo?.trim().toUpperCase() === 'VIDRIO'),
    };
};

export default function ProfilesReportModal({ data, isLoading, onClose, showPrices, projectName, orderId }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const reportData = data || [];
    const { profilesReport, glassReport, accessoriesReport } = groupReportByType(reportData);

    const [profitMargin, setProfitMargin] = useState(60);
    const [savingMargin, setSavingMargin] = useState(false);
    const [marginSaved, setMarginSaved] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    // ── Cargar margen desde la API al abrir ──────────────────────────────────
    useEffect(() => {
        const fetchMargin = async () => {
            try {
                const res = await api.get('/app-settings/profit-margin');
                if (res.data?.profit_margin) {
                    setProfitMargin(Number(res.data.profit_margin));
                }
            } catch {
                // Si falla, queda el default de 60
            }
        };
        fetchMargin();
    }, []);

    // ── Guardar margen (solo admin) ──────────────────────────────────────────
    const handleSaveMargin = async () => {
        if (!isAdmin) return;
        setSavingMargin(true);
        setMarginSaved(false);
        try {
            await api.patch('/app-settings/profit-margin', { profit_margin: profitMargin });
            setMarginSaved(true);
            setTimeout(() => setMarginSaved(false), 2500);
        } catch {
            alert('No se pudo guardar el margen.');
        } finally {
            setSavingMargin(false);
        }
    };

    const formatCurrency = (amount) => `Q${Number(amount || 0).toFixed(2)}`;

    const costTotal = Array.isArray(reportData)
        ? reportData.reduce((sum, item) => sum + (item.precioTotal || 0), 0)
        : 0;

    // ✅ FIX: fórmula correcta — precio / (1 - margen)
    // Con margen 60%: 2941 / 0.40 = 7352  ✓
    // La fórmula anterior  2941 * 1.60 = 4705 era markup, no margen
    const marginDecimal = Math.max(0.01, Math.min(0.99, profitMargin / 100));
    const finalTotal = costTotal / (1 - marginDecimal);

    const handleDownloadPDF = async () => {
        setGeneratingPDF(true);
        try {
            generateMaterialsPDF({ reportData, projectName, orderId, isConsolidated: false, showPrices: false });
        } catch (err) {
            console.error('Error generando PDF:', err);
            alert('No se pudo generar el PDF.');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const emptyRow = (cols, msg) => (
        <tr>
            <td colSpan={cols} className="px-4 py-6 text-center text-xs text-gray-400 italic">{msg}</td>
        </tr>
    );

    const SectionHeader = ({ color, title }) => (
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className={`w-1 h-5 ${color} rounded-full inline-block`} />
            {title}
        </h3>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92dvh]">

                {/* Encabezado */}
                <div className="p-4 border-b flex justify-between items-start gap-3 bg-gray-50 rounded-t-2xl flex-shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800">
                            {showPrices ? "Presupuesto y Cotización" : "Reporte de Materiales"}
                        </h2>
                        {projectName && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {projectName}{orderId ? ` · Pedido #${orderId}` : ''}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none flex-shrink-0"
                    >
                        &times;
                    </button>
                </div>

                {/* Cuerpo */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 sm:space-y-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Calculando materiales...
                        </div>
                    ) : (
                        <>
                            {/* PERFILES */}
                            <div>
                                <SectionHeader color="bg-blue-500" title="Perfiles" />
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Color</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {profilesReport.length === 0
                                                ? emptyRow(5, 'Sin perfiles calculados')
                                                : profilesReport.map((item, i) => (
                                                    <tr key={`p-${i}`} className="hover:bg-gray-50">
                                                        <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">{item.color}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 font-medium">{item.nombre}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-center font-bold text-blue-600">{item.cantidad}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-right text-gray-500 whitespace-nowrap">{formatCurrency(item.precioUnitario)}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-right font-semibold whitespace-nowrap">{formatCurrency(item.precioTotal)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ACCESORIOS */}
                            <div>
                                <SectionHeader color="bg-red-500" title="Accesorios" />
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {accessoriesReport.length === 0
                                                ? emptyRow(4, 'Sin accesorios calculados')
                                                : accessoriesReport.map((item, i) => (
                                                    <tr key={`a-${i}`} className="hover:bg-gray-50">
                                                        <td className="px-3 sm:px-4 py-2.5 font-medium">{item.nombre}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-center font-bold text-red-600">{item.cantidad}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-right text-gray-500 whitespace-nowrap">{formatCurrency(item.precioUnitario)}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-right font-semibold whitespace-nowrap">{formatCurrency(item.precioTotal)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* VIDRIOS */}
                            <div>
                                <SectionHeader color="bg-emerald-500" title="Vidrios" />
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Planchas</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {glassReport.length === 0
                                                ? emptyRow(4, 'Sin vidrios calculados')
                                                : glassReport.map((item, i) => (
                                                    <tr key={`g-${i}`} className="hover:bg-gray-50">
                                                        <td className="px-3 sm:px-4 py-2.5 font-medium">{item.nombre}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-center font-bold text-emerald-600">{item.cantidad}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-right text-gray-500 whitespace-nowrap">{formatCurrency(item.precioUnitario)}</td>
                                                        <td className="px-3 sm:px-4 py-2.5 text-right font-semibold whitespace-nowrap">{formatCurrency(item.precioTotal)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Pie */}
                <div className="p-4 sm:p-5 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                    <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">

                        {/* Totales / margen */}
                        {showPrices ? (
                            <div className="flex flex-wrap items-end gap-3 sm:gap-4 bg-white p-3 rounded-xl border shadow-sm">

                                {/* Input margen — solo admin puede editarlo y guardarlo */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        Margen de ganancia
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                step="1"
                                                value={profitMargin}
                                                onChange={(e) => setProfitMargin(Number(e.target.value))}
                                                disabled={!isAdmin}
                                                className="w-16 px-2 py-1.5 font-bold text-blue-600 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 text-center"
                                            />
                                            <span className="px-2 text-gray-400 text-sm bg-gray-50 border-l h-full flex items-center py-1.5">%</span>
                                        </div>

                                        {/* Botón guardar — solo admin */}
                                        {isAdmin && (
                                            <button
                                                onClick={handleSaveMargin}
                                                disabled={savingMargin}
                                                title="Guardar margen como predeterminado"
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${marginSaved
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                                    } disabled:opacity-60`}
                                            >
                                                <FaSave size={11} />
                                                {savingMargin ? 'Guardando...' : marginSaved ? '¡Guardado!' : 'Guardar'}
                                            </button>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <p className="text-[10px] text-gray-400">
                                            Aplica a todas las cotizaciones
                                        </p>
                                    )}
                                </div>

                                <div className="h-10 w-px bg-gray-200 hidden sm:block self-center" />

                                {/* Costo base — solo admin lo ve */}
                                {isAdmin && (
                                    <>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Costo Base</span>
                                            <span className="text-base sm:text-lg font-semibold text-gray-700">{formatCurrency(costTotal)}</span>
                                        </div>
                                        <div className="h-10 w-px bg-gray-200 hidden sm:block self-center" />
                                    </>
                                )}

                                {/* Precio sugerido — visible para todos */}
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Precio Sugerido</span>
                                    <span className="text-xl sm:text-2xl font-black text-blue-700">{formatCurrency(finalTotal)}</span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">
                                        Costo ÷ (1 − {profitMargin}%)
                                    </span>
                                </div>
                            </div>
                        ) : (
                            // Modo pedido — solo muestra costo total (solo admin)
                            isAdmin ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total de Costos:</span>
                                    <span className="text-lg sm:text-xl font-bold text-gray-800 bg-gray-200 px-3 sm:px-4 py-1.5 rounded-xl">
                                        {formatCurrency(costTotal)}
                                    </span>
                                </div>
                            ) : (
                                // Vendedor en modo pedido: no ve costos
                                <div />
                            )
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-2 sm:gap-3 flex-wrap">
                            {!isLoading && reportData.length > 0 && (
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white px-4 sm:px-5 py-2 rounded-xl font-medium text-sm transition-all"
                                >
                                    <FaFilePdf size={13} />
                                    {generatingPDF ? 'Generando...' : 'Descargar PDF'}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 sm:px-5 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium rounded-xl text-sm transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}