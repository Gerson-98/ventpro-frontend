// RUTA: src/components/ChecklistPanel.jsx

import { useEffect, useState } from 'react';
import api from '@/services/api';

const CHECKLIST_TYPES = [
    {
        type: 'carga_camion',
        label: 'Carga de Camión',
        description: 'Antes de salir a instalación',
        icon: '🚛',
        color: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700 border-blue-300', btn: 'bg-blue-600 hover:bg-blue-700', dot: 'bg-blue-500' },
    },
    {
        type: 'verificacion_instalacion',
        label: 'Verificación de Instalación',
        description: 'Al llegar al sitio',
        icon: '🔧',
        color: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700 border-green-300', btn: 'bg-green-600 hover:bg-green-700', dot: 'bg-green-500' },
    },
    {
        type: 'regreso',
        label: 'Regreso',
        description: 'Confirmar materiales devueltos',
        icon: '↩️',
        color: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700 border-purple-300', btn: 'bg-purple-600 hover:bg-purple-700', dot: 'bg-purple-500' },
    },
];

function ChecklistCard({ typeInfo, data, orderId, onUpdate, isAdmin }) {
    const { type, label, description, icon, color } = typeInfo;
    const { completed, templates } = data;

    const [open, setOpen] = useState(false);
    const [checkedItems, setCheckedItems] = useState({});
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    // Inicializar todos los ítems como checked al abrir
    useEffect(() => {
        if (open && !completed) {
            const initial = {};
            templates.forEach((t) => { initial[t.id] = true; });
            setCheckedItems(initial);
        }
    }, [open, completed, templates]);

    const checkedCount = completed
        ? completed.items.filter((i) => i.checked).length
        : 0;
    const totalCount = completed ? completed.items.length : templates.length;

    const handleSubmit = async () => {
        setSaving(true);
        try {
            await api.post(`/checklists/order/${orderId}/${type}`, {
                notes: notes.trim() || undefined,
                items: templates.map((t) => ({
                    templateId: t.id,
                    label: t.label,
                    checked: checkedItems[t.id] ?? false,
                })),
            });
            setOpen(false);
            onUpdate();
        } catch (err) {
            alert(err?.response?.data?.message || 'Error al guardar checklist');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('¿Deshacer este checklist? Se perderán los datos registrados.')) return;
        setResetting(true);
        try {
            await api.delete(`/checklists/order/${orderId}/${type}`);
            onUpdate();
        } catch (err) {
            alert('Error al resetear checklist');
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className={`rounded-xl border ${color.border} overflow-hidden`}>
            {/* Header */}
            <div className={`${color.bg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {completed ? (
                        <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color.badge}`}>
                                ✓ Completado
                            </span>
                            <span className="text-xs text-gray-500">
                                {checkedCount}/{totalCount} ítems
                            </span>
                            <button
                                onClick={() => setOpen((o) => !o)}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/60 transition-colors"
                            >
                                {open ? 'Ocultar' : 'Ver detalle'}
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={handleReset}
                                    disabled={resetting}
                                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                    {resetting ? '...' : 'Rehacer'}
                                </button>
                            )}
                        </>
                    ) : templates.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Sin ítems configurados</span>
                    ) : (
                        <button
                            onClick={() => setOpen((o) => !o)}
                            className={`text-xs text-white px-3 py-1.5 rounded-lg font-medium ${color.btn} transition-colors`}
                        >
                            {open ? 'Cancelar' : 'Completar'}
                        </button>
                    )}
                </div>
            </div>

            {/* Body expandible */}
            {open && (
                <div className="px-4 py-4 bg-white border-t border-gray-100">
                    {completed ? (
                        // MODO VISTA
                        <div className="space-y-1">
                            {completed.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 py-1">
                                    <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${item.checked ? color.dot : 'bg-gray-200'}`}>
                                        {item.checked && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`text-sm ${item.checked ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                            {completed.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Notas:</p>
                                    <p className="text-sm text-gray-600">{completed.notes}</p>
                                </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                                <span>Completado por</span>
                                <span className="font-medium text-gray-600">{completed.completedBy?.name}</span>
                                <span>—</span>
                                <span>
                                    {new Date(completed.completedAt).toLocaleDateString('es-GT', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        // MODO COMPLETAR
                        <div className="space-y-2">
                            {templates.map((template) => (
                                <label
                                    key={template.id}
                                    className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checkedItems[template.id] ?? false}
                                        onChange={(e) =>
                                            setCheckedItems((prev) => ({
                                                ...prev,
                                                [template.id]: e.target.checked,
                                            }))
                                        }
                                        className="w-4 h-4 rounded accent-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">{template.label}</span>
                                </label>
                            ))}

                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Notas (opcional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Observaciones, incidencias, etc."
                                    rows={2}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className={`text-sm px-4 py-1.5 text-white rounded-lg font-medium ${color.btn} disabled:opacity-50 transition-colors`}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Checklist'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ChecklistPanel({ orderId, isAdmin }) {
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChecklists = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/checklists/order/${orderId}`);
            setChecklists(res.data);
        } catch (err) {
            console.error('Error cargando checklists:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) fetchChecklists();
    }, [orderId]);

    // Contar cuántos están completados
    const completedCount = checklists.filter((c) => c.completed).length;

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">Checklists de Instalación</h3>
                    <p className="text-xs text-gray-400">
                        {loading ? '...' : `${completedCount} de ${checklists.length} completados`}
                    </p>
                </div>
                {/* Barra de progreso */}
                {!loading && checklists.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${(completedCount / checklists.length) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500">
                            {Math.round((completedCount / checklists.length) * 100)}%
                        </span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {CHECKLIST_TYPES.map((typeInfo) => {
                        const data = checklists.find((c) => c.type === typeInfo.type) || {
                            type: typeInfo.type,
                            completed: null,
                            templates: [],
                        };
                        return (
                            <ChecklistCard
                                key={typeInfo.type}
                                typeInfo={typeInfo}
                                data={data}
                                orderId={orderId}
                                onUpdate={fetchChecklists}
                                isAdmin={isAdmin}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}