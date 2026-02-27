import React from 'react';

// Pequeño componente auxiliar para la barra de progreso visual
const ProgressBar = ({ used, total }) => {
    const percentage = (used / total) * 100;
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

export default function CutOptimizationModal({ optimizationData, isLoading, onClose }) {
    const profiles = Object.keys(optimizationData);

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]">

                {/* Encabezado */}
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Plan de Corte Optimizado</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold text-2xl">&times;</button>
                </div>

                {/* Cuerpo del Modal con Scroll */}
                <div className="p-6 overflow-y-auto bg-gray-50">
                    {isLoading ? (
                        <p className="text-center text-gray-600 py-10">Optimizando cortes, por favor espera...</p>
                    ) : profiles.length === 0 ? (
                        <p className="text-center text-gray-600 py-10">No hay perfiles para optimizar en este pedido.</p>
                    ) : (
                        <div className="space-y-6">
                            {/* Iteramos sobre cada TIPO DE PERFIL (ej: "MARCO CORREDIZO") */}
                            {profiles.map(profileName => (
                                <div key={profileName}>
                                    {optimizationData[profileName].map((profileGroup, index) => (
                                        <div key={index} className="bg-white p-4 rounded-lg shadow border">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{profileName}</h3>
                                            <p className="text-sm text-gray-500 mb-4">Color: <span className="font-medium">{profileGroup.color}</span> - Total de Barras: <span className="font-bold">{profileGroup.totalBars}</span></p>

                                            <div className="space-y-4">
                                                {/* Iteramos sobre cada BARRA a cortar */}
                                                {profileGroup.bars.map(bar => (
                                                    <div key={bar.barNumber} className="border rounded-md p-3">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <p className="font-bold text-blue-700">Barra #{bar.barNumber}</p>
                                                            <div className="text-xs space-x-3">
                                                                <span>Uso: <span className="font-semibold">{bar.totalUsed} cm</span></span>
                                                                <span>Desperdicio: <span className="font-semibold text-red-600">{bar.waste} cm</span></span>
                                                                <span>Eficiencia: <span className="font-semibold text-green-700">{bar.efficiency}%</span></span>
                                                            </div>
                                                        </div>
                                                        <ProgressBar used={bar.totalUsed} total={580} />
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="text-sm font-semibold">Cortes:</span>
                                                            {bar.cuts.map((cut, i) => (
                                                                <span key={i} className="bg-gray-200 text-gray-800 text-xs font-mono px-2 py-1 rounded">
                                                                    {cut} cm
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pie del Modal */}
                <div className="p-4 border-t bg-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}