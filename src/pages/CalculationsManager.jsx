import { useState, useEffect } from 'react';
import api from '@/services/api';
import { FaEdit, FaSave } from 'react-icons/fa';

export default function CalculationsManager() {
    const [typesWithCalcs, setTypesWithCalcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRowId, setEditingRowId] = useState(null);
    const [editedValues, setEditedValues] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/window-calculations');
            setTypesWithCalcs(response.data);
        } catch (error) {
            console.error("Error al cargar los datos de cálculo:", error);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (type) => {
        setEditingRowId(type.id);
        setEditedValues({
            hojaDivision: type.calculation?.hojaDivision || 'Mitad',
            hojaMargen: type.calculation?.hojaMargen || 0,
            hojaDescuento: type.calculation?.hojaDescuento || 0,
            vidrioDescuento: type.calculation?.vidrioDescuento || 0,
        });
    };

    const handleCancel = () => {
        setEditingRowId(null);
        setEditedValues({});
    };

    const handleSave = async (windowTypeId) => {
        try {
            const payload = {
                window_type_id: windowTypeId,
                hojaDivision: editedValues.hojaDivision,
                hojaMargen: Number(editedValues.hojaMargen),
                hojaDescuento: Number(editedValues.hojaDescuento),
                vidrioDescuento: Number(editedValues.vidrioDescuento),
            };
            await api.post('/window-calculations', payload);
            setEditingRowId(null);
            fetchData();
        } catch (error) {
            console.error("Error al guardar los cálculos:", error);
            alert('Hubo un error al guardar.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedValues(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return (
        <div className="px-4 sm:px-6 py-8 text-sm text-gray-500">
            Cargando reglas de cálculo...
        </div>
    );

    return (
        <div className="px-4 sm:px-6 py-5 sm:py-8 space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Gestor de Reglas de Cálculo
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Aquí puedes definir cómo se calculan las medidas de hoja y vidrio para cada tipo de ventana.
                </p>
            </div>

            {/* ── TABLA DESKTOP (md+) ── */}
            <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Ventana</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">División Hoja</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margen Ancho (cm)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desc. Alto Hoja (cm)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desc. Vidrio (cm)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {typesWithCalcs.map((type) => (
                            <tr key={type.id}>
                                {editingRowId === type.id ? (
                                    <>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{type.name}</td>
                                        <td>
                                            <select name="hojaDivision" value={editedValues.hojaDivision} onChange={handleChange} className="w-full border p-1 rounded">
                                                <option value="Completo">Completo</option>
                                                <option value="Mitad">Mitad</option>
                                                <option value="Tercio">Tercio</option>
                                                <option value="Cuarto">Cuarto</option>
                                            </select>
                                        </td>
                                        <td><input type="number" name="hojaMargen" value={editedValues.hojaMargen} onChange={handleChange} className="w-24 border p-1 rounded" /></td>
                                        <td><input type="number" name="hojaDescuento" value={editedValues.hojaDescuento} onChange={handleChange} className="w-24 border p-1 rounded" /></td>
                                        <td><input type="number" name="vidrioDescuento" value={editedValues.vidrioDescuento} onChange={handleChange} className="w-24 border p-1 rounded" /></td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center items-center gap-4">
                                                <button onClick={() => handleSave(type.id)} className="text-green-600"><FaSave /></button>
                                                <button onClick={handleCancel} className="text-gray-600">✖</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{type.name}</td>
                                        <td className="px-6 py-4">{type.calculation?.hojaDivision || 'N/A'}</td>
                                        <td className="px-6 py-4">{type.calculation?.hojaMargen ?? 'N/A'}</td>
                                        <td className="px-6 py-4">{type.calculation?.hojaDescuento ?? 'N/A'}</td>
                                        <td className="px-6 py-4">{type.calculation?.vidrioDescuento ?? 'N/A'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => startEdit(type)} className="text-blue-600"><FaEdit /></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── CARDS MÓVIL (< md) ── */}
            <div className="md:hidden bg-white rounded-lg shadow divide-y divide-gray-100">
                {typesWithCalcs.map((type) => {
                    const isEditing = editingRowId === type.id;
                    return (
                        <div key={type.id} className="p-4">
                            {/* Cabecera de card: nombre + botón acción siempre visible */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="font-semibold text-sm text-gray-900">{type.name}</span>
                                {!isEditing ? (
                                    <button
                                        onClick={() => startEdit(type)}
                                        className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 active:bg-blue-50"
                                    >
                                        <FaEdit size={11} /> Editar
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSave(type.id)}
                                            className="flex items-center gap-1.5 text-xs text-white bg-green-600 rounded-lg px-3 py-1.5 active:bg-green-700"
                                        >
                                            <FaSave size={11} /> Guardar
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 active:bg-gray-50"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Campos: vista o edición */}
                            {!isEditing ? (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <div>
                                        <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium mb-0.5">División Hoja</p>
                                        <p className="text-gray-800 font-medium">{type.calculation?.hojaDivision || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium mb-0.5">Margen Ancho</p>
                                        <p className="text-gray-800 font-medium">{type.calculation?.hojaMargen ?? 'N/A'} cm</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium mb-0.5">Desc. Alto Hoja</p>
                                        <p className="text-gray-800 font-medium">{type.calculation?.hojaDescuento ?? 'N/A'} cm</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 uppercase tracking-wide text-[10px] font-medium mb-0.5">Desc. Vidrio</p>
                                        <p className="text-gray-800 font-medium">{type.calculation?.vidrioDescuento ?? 'N/A'} cm</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1">
                                            División Hoja
                                        </label>
                                        <select
                                            name="hojaDivision"
                                            value={editedValues.hojaDivision}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Completo">Completo</option>
                                            <option value="Mitad">Mitad</option>
                                            <option value="Tercio">Tercio</option>
                                            <option value="Cuarto">Cuarto</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1">
                                                Margen (cm)
                                            </label>
                                            <input
                                                type="number"
                                                name="hojaMargen"
                                                value={editedValues.hojaMargen}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1">
                                                Desc. Hoja
                                            </label>
                                            <input
                                                type="number"
                                                name="hojaDescuento"
                                                value={editedValues.hojaDescuento}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1">
                                                Desc. Vidrio
                                            </label>
                                            <input
                                                type="number"
                                                name="vidrioDescuento"
                                                value={editedValues.vidrioDescuento}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}