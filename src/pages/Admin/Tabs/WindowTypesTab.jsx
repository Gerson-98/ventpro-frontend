import { useEffect, useState } from "react";
import { FaPlus, FaTrashAlt, FaEdit } from "react-icons/fa";
import api from "@/services/api"; // ✨ Usaremos Axios para simplificar las llamadas

export default function WindowTypesTab() {
  const [windowTypes, setWindowTypes] = useState([]);
  const [pvcColors, setPvcColors] = useState([]); // ✨ Nuevo estado para los colores de PVC
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);

  // ✨ Unificamos el estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pvcColorIds: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // ✨ Cargamos tipos y colores en paralelo
      const [typesRes, colorsRes] = await Promise.all([
        api.get("/window-types"),
        api.get("/pvc-colors"),
      ]);
      setWindowTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      setPvcColors(Array.isArray(colorsRes.data) ? colorsRes.data : []);
    } catch (err) {
      console.error("Error al obtener los datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    // ✨ Preparamos el payload con los datos correctos
    const payload = {
      name: formData.name,
      description: formData.description,
      pvcColorIds: formData.pvcColorIds.map(Number), // Aseguramos que los IDs sean números
    };

    // La lógica de edición solo actualiza nombre/descripción
    if (editingType) {
      // (Esta parte no la modificamos, solo maneja la edición simple)
      try {
        await api.put(`/window-types/${editingType.id}`, { name: payload.name, description: payload.description });
        fetchData();
        closeModal();
      } catch (error) {
        console.error("Error al actualizar:", error);
      }
    } else {
      // Lógica para crear un nuevo tipo con sus asociaciones
      try {
        await api.post("/window-types", payload);
        fetchData();
        closeModal();
      } catch (error) {
        console.error("Error al crear:", error);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de ventana?")) return;
    try {
      await api.delete(`/window-types/${id}`);
      fetchData();
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    // ✨ Al editar no manejamos asociaciones, solo nombre y desc.
    setFormData({ name: type.name, description: type.description || "", pvcColorIds: [] });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    // ✨ Reseteamos el formulario completo
    setFormData({ name: "", description: "", pvcColorIds: [] });
  };

  // ✨ Nuevo manejador para el select múltiple
  const handleColorChange = (e) => {
    const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, pvcColorIds: selectedIds }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md transition">
      {/* ... (la cabecera y la tabla no cambian, se quedan igual) ... */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Tipos de Ventana</h2>
          <p className="text-gray-500 text-sm">
            Administra los diferentes tipos de ventanas y sus asociaciones de color.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaPlus /> Añadir Tipo
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          {/* ... (el thead y tbody de la tabla no cambian) ... */}
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
              <th className="py-3 px-4 text-left">Nombre</th>
              <th className="py-3 px-4 text-left">Descripción</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {windowTypes.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{t.name}</td>
                <td className="py-2 px-4">{t.description || "—"}</td>
                <td className="py-2 px-4 text-right space-x-3">
                  <button onClick={() => handleEdit(t)} className="text-blue-600"><FaEdit /></button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600"><FaTrashAlt /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- MODAL MODIFICADO --- */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-300/60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border relative">
            <button onClick={closeModal} className="absolute top-3 right-3 text-gray-400">✕</button>
            <h3 className="text-lg font-semibold mb-4">{editingType ? "Editar Tipo" : "Nuevo Tipo de Ventana"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-md p-2"
                  rows={2}
                />
              </div>

              {/* ✨ NUEVO CAMPO DE SELECCIÓN DE COLORES (solo para creación) ✨ */}
              {!editingType && (
                <div>
                  <label className="block text-sm font-medium">Asociar con Colores PVC</label>
                  <select
                    multiple
                    required
                    value={formData.pvcColorIds}
                    onChange={handleColorChange}
                    className="w-full border rounded-md p-2 h-32"
                  >
                    {pvcColors.map(color => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Usa Ctrl (o Cmd) para seleccionar varios.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingType ? "Guardar Cambios" : "Crear"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}