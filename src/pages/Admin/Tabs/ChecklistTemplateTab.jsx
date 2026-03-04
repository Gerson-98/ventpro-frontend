// RUTA: src/pages/Admin/Tabs/ChecklistTemplateTab.jsx — RESPONSIVE

import { useEffect, useState } from 'react';
import api from '@/services/api';

const TYPES = [
    { value: 'carga_camion', label: '🚛 Carga de Camión', labelShort: '🚛 Carga', color: 'blue' },
    { value: 'verificacion_instalacion', label: '🔧 Verificación de Instalación', labelShort: '🔧 Verificación', color: 'green' },
    { value: 'regreso', label: '↩️ Regreso', labelShort: '↩️ Regreso', color: 'purple' },
];

const COLOR_CLASSES = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
};

export default function ChecklistTemplateTab() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('carga_camion');
    const [newLabel, setNewLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/checklists/templates');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const filtered = templates
        .filter((t) => t.type === activeType)
        .sort((a, b) => a.sort_order - b.sort_order);

    const handleAdd = async () => {
        if (!newLabel.trim()) return;
        setSaving(true);
        try {
            await api.post('/checklists/templates', {
                type: activeType,
                label: newLabel.trim(),
                sort_order: filtered.length,
            });
            setNewLabel('');
            fetchTemplates();
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (template) => {
        try {
            await api.patch(`/checklists/templates/${template.id}`, {
                active: !template.active,
            });
            fetchTemplates();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEdit = async (id) => {
        if (!editLabel.trim()) return;
        try {
            await api.patch(`/checklists/templates/${id}`, { label: editLabel.trim() });
            setEditingId(null);
            fetchTemplates();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este ítem? Se borrará de los checklists existentes.')) return;
        try {
            await api.delete(`/checklists/templates/${id}`);
            fetchTemplates();
        } catch (err) {
            console.error(err);
        }
    };

    const activeTypeInfo = TYPES.find((t) => t.value === activeType);

    return (
        <div className="px-1">
            <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">Ítems de Checklists</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                    Configura los ítems que aparecerán en cada checklist de los pedidos.
                </p>
            </div>

            {/* ── Tabs — scroll horizontal en móvil ── */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-1 px-1">
                {TYPES.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => setActiveType(t.value)}
                        className={`flex-shrink-0 px-3 sm:px-4 py-2 -mb-px text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeType === t.value
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {/* Etiqueta corta en móvil, completa en sm+ */}
                        <span className="sm:hidden">{t.labelShort}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No hay ítems para este checklist. Agrega el primero abajo.
                        </div>
                    )}

                    {filtered.map((template, idx) => (
                        <div
                            key={template.id}
                            className={`rounded-lg border transition-opacity ${template.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                        >
                            {/* Modo edición */}
                            {editingId === template.id ? (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 sm:px-4 py-3">
                                    <span className="hidden sm:block text-xs font-bold text-gray-400 w-5 text-center flex-shrink-0">
                                        {idx + 1}
                                    </span>
                                    <input
                                        autoFocus
                                        value={editLabel}
                                        onChange={(e) => setEditLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(template.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        className="flex-1 text-sm border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    />
                                    <div className="flex gap-2 sm:flex-shrink-0">
                                        <button
                                            onClick={() => handleSaveEdit(template.id)}
                                            className="flex-1 sm:flex-none text-xs px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="flex-1 sm:flex-none text-xs px-3 py-2 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 active:bg-gray-100"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Modo vista */
                                <div className="px-3 sm:px-4 py-3">
                                    {/* Fila 1 (móvil): número + label + badge */}
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-5 text-center flex-shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 text-sm text-gray-700 min-w-0">{template.label}</span>
                                        <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${template.active
                                                ? COLOR_CLASSES[activeTypeInfo.color]
                                                : 'bg-gray-100 text-gray-400 border-gray-200'
                                                }`}
                                        >
                                            {template.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>

                                    {/* Fila 2 (móvil): acciones — siempre visibles */}
                                    <div className="flex items-center gap-1 mt-2 sm:mt-0 ml-7 sm:hidden">
                                        <button
                                            onClick={() => { setEditingId(template.id); setEditLabel(template.label); }}
                                            className="flex-1 text-xs text-blue-600 border border-blue-200 rounded-md py-1.5 active:bg-blue-50"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(template)}
                                            className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-md py-1.5 active:bg-gray-50"
                                        >
                                            {template.active ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="flex-1 text-xs text-red-500 border border-red-100 rounded-md py-1.5 active:bg-red-50"
                                        >
                                            Eliminar
                                        </button>
                                    </div>

                                    {/* Acciones desktop — inline en la fila */}
                                </div>
                            )}

                            {/* Acciones desktop pegadas a la derecha — solo sm+ */}
                            {editingId !== template.id && (
                                <div className="hidden sm:flex items-center gap-1 absolute right-0 top-0 bottom-0 pr-4" style={{ display: 'none' }}>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Esto reemplaza el layout anterior para desktop de acciones inline */}
                    {/* Reestructuramos el map para sm+ con flex en una sola fila */}
                </div>
            )}

            {/* Agregar nuevo ítem */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <input
                    type="text"
                    placeholder={`Nuevo ítem para ${activeTypeInfo?.labelShort ?? activeTypeInfo?.label}...`}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                    onClick={handleAdd}
                    disabled={saving || !newLabel.trim()}
                    className="flex-shrink-0 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {saving ? '...' : '+ Agregar'}
                </button>
            </div>
        </div>
    );
}