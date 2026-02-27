// RUTA: src/components/ProfilesReportModal.jsx

import React, { useState } from 'react';
import { generateMaterialsPDF } from '@/lib/generateMaterialsPDF';
import { FaFilePdf } from 'react-icons/fa';

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
    const reportData = data || [];
    const { profilesReport, glassReport, accessoriesReport } = groupReportByType(reportData);
    const [profitMargin, setProfitMargin] = useState(60);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    const formatCurrency = (amount) => `Q${Number(amount || 0).toFixed(2)}`;

    const costTotal = Array.isArray(reportData)
        ? reportData.reduce((sum, item) => sum + (item.precioTotal || 0), 0)
        : 0;

    const finalTotal = costTotal * (1 + profitMargin / 100);

    const handleDownloadPDF = async () => {
        setGeneratingPDF(true);
        try {
            generateMaterialsPDF({
                reportData,
                projectName,
                orderId,
                isConsolidated: false,
            });
        } catch (err) {
            console.error('Error generando PDF:', err);
            alert('No se pudo generar el PDF.');
        } finally {
            setGeneratingPDF(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">

                {/* Encabezado */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {showPrices ? "Presupuesto y Cotización" : "Reporte de Materiales"}
                        </h2>
                        {projectName && (
                            <p className="text-xs text-gray-500 mt-0.5">{projectName}{orderId ? ` · Pedido #${orderId}` : ''}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
                </div>

                {/* Cuerpo */}
                <div className="p-6 overflow-y-auto space-y-8">
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
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
                                    Perfiles
                                </h3>
                                <table className="min-w-full divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Color</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {profilesReport.map((item, i) => (
                                            <tr key={`p-${i}`} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5">{item.color}</td>
                                                <td className="px-4 py-2.5 font-medium">{item.nombre}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-blue-600">{item.cantidad}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(item.precioUnitario)}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(item.precioTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ACCESORIOS */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-red-500 rounded-full inline-block" />
                                    Accesorios
                                </h3>
                                <table className="min-w-full divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {accessoriesReport.map((item, i) => (
                                            <tr key={`a-${i}`} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5 font-medium">{item.nombre}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-red-600">{item.cantidad}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(item.precioUnitario)}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(item.precioTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* VIDRIOS */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block" />
                                    Vidrios
                                </h3>
                                <table className="min-w-full divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Planchas</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {glassReport.map((item, i) => (
                                            <tr key={`g-${i}`} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5 font-medium">{item.nombre}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{item.cantidad}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(item.precioUnitario)}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(item.precioTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Pie */}
                <div className="p-5 border-t bg-gray-50 rounded-b-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">

                        {showPrices ? (
                            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border shadow-sm">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Margen de Ganancia (%)</label>
                                    <input
                                        type="number"
                                        value={profitMargin}
                                        onChange={(e) => setProfitMargin(Number(e.target.value))}
                                        className="w-24 px-2 py-1 border rounded-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="h-10 w-px bg-gray-200" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Costo Base</span>
                                    <span className="text-lg font-semibold text-gray-700">{formatCurrency(costTotal)}</span>
                                </div>
                                <div className="flex flex-col ml-4">
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Precio Sugerido</span>
                                    <span className="text-2xl font-black text-blue-700">{formatCurrency(finalTotal)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total de Costos:</span>
                                <span className="text-xl font-bold text-gray-800 bg-gray-200 px-4 py-1.5 rounded-xl">
                                    {formatCurrency(costTotal)}
                                </span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {/* Botón PDF materiales — visible en modo pedido (showPrices=false) */}
                            {!showPrices && !isLoading && reportData.length > 0 && (
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl font-medium text-sm transition-all active:scale-95"
                                >
                                    <FaFilePdf size={13} />
                                    {generatingPDF ? 'Generando...' : 'Descargar PDF'}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl text-sm transition-all"
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