// RUTA: src/pages/Admin/Tabs/ConfiguracionTab.jsx

import { useState, useEffect } from 'react';
import { FaSave, FaCog } from 'react-icons/fa';
import api from '@/services/api';

export default function ConfiguracionTab() {
    const [profitMargin, setProfitMargin] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/app-settings/profit-margin');
                setProfitMargin(String(res.data.profit_margin ?? 60));
            } catch {
                setError('No se pudo cargar la configuración.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleSave = async () => {
        setError('');
        const val = parseFloat(profitMargin);
        if (!Number.isFinite(val) || val <= 0 || val >= 100) {
            setError('El margen debe ser un número entre 1 y 99.');
            return;
        }
        setSaving(true);
        try {
            await api.patch('/app-settings/profit-margin', { profit_margin: val });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setError('No se pudo guardar. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    // Ejemplo visual de la fórmula con el margen actual
    const exampleCost = 1000;
    const marginVal = parseFloat(profitMargin) || 60;
    const divisor = (1 - marginVal / 100).toFixed(2);
    const exampleResult = marginVal > 0 && marginVal < 100
        ? (exampleCost / (1 - marginVal / 100)).toFixed(2)
        : '—';

    return (
        <div className="max-w-2xl space-y-6">

            <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaCog className="text-gray-400" size={16} />
                    Configuración del Sistema
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Parámetros globales que afectan los cálculos de cotización.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Cargando configuración...
                </div>
            ) : (
                <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50">

                    {/* Título de la sección */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700">Margen de Ganancia</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Define qué porcentaje de la venta corresponde a ganancia.
                            Se usa para calcular el precio sugerido al vendedor.
                        </p>
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 w-32">
                            <input
                                type="number"
                                min="1"
                                max="99"
                                step="1"
                                value={profitMargin}
                                onChange={(e) => { setProfitMargin(e.target.value); setSaved(false); }}
                                className="w-full px-3 py-2 text-lg font-bold text-blue-700 focus:outline-none text-center"
                                placeholder="60"
                            />
                            <span className="px-3 text-gray-400 font-semibold border-l bg-gray-50 py-2">%</span>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${saved
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                                }`}
                        >
                            <FaSave size={12} />
                            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    {/* Ejemplo visual de la fórmula */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Ejemplo con este margen
                        </p>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-gray-500">Costo materiales:</span>
                            <span className="font-mono font-bold text-gray-700">Q {exampleCost.toFixed(2)}</span>
                            <span className="text-gray-300">→</span>
                            <span className="text-gray-500">Precio sugerido:</span>
                            <span className="font-mono font-bold text-blue-700 text-base">Q {exampleResult}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                            Q{exampleCost} ÷ (1 − {marginVal}%) = Q{exampleCost} ÷ {divisor} = Q{exampleResult}
                        </p>
                    </div>

                    <p className="text-xs text-gray-400">
                        Este valor se aplica globalmente a todas las cotizaciones y pedidos.
                        Solo los administradores pueden modificarlo.
                    </p>
                </div>
            )}
        </div>
    );
}