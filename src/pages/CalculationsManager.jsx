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
            fetchData(); // Recargar datos para ver los cambios
        } catch (error) {
            console.error("Error al guardar los cálculos:", error);
            alert('Hubo un error al guardar.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedValues(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div>Cargando reglas de cálculo...</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Gestor de Reglas de Cálculo</h1>
            <p className="text-gray-600 mb-6">
                Aquí puedes definir cómo se calculan las medidas de hoja y vidrio para cada tipo de ventana.
            </p>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
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
        </div>
    );
}