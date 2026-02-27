// RUTA: src/pages/Admin/Tabs/OptionConfigTab.jsx

import { useEffect, useState } from 'react';
import api from '@/services/api';

// ─── Iconos inline ────────────────────────────────────────────────────────────
const IconChevron = ({ open }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 5.625" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

// ─── Modal genérico ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <IconX />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function OptionConfigTab() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [error, setError] = useState('');

    // Estados de modales
    const [modalNewGroup, setModalNewGroup] = useState(false);
    const [modalEditGroup, setModalEditGroup] = useState(null); // group object
    const [modalNewValue, setModalNewValue] = useState(null); // group object
    const [modalEditValue, setModalEditValue] = useState(null); // value object

    // Forms
    const [newGroupForm, setNewGroupForm] = useState({ key: '', label: '' });
    const [editGroupForm, setEditGroupForm] = useState({ label: '' });
    const [newValueForm, setNewValueForm] = useState({ key: '', label: '' });
    const [editValueForm, setEditValueForm] = useState({ label: '' });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // ── Carga ────────────────────────────────────────────────────────────────────
    const loadGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/option-groups');
            setGroups(res.data);
            // Expandir todos por defecto
            const exp = {};
            res.data.forEach(g => { exp[g.id] = true; });
            setExpanded(exp);
        } catch {
            setError('No se pudieron cargar los grupos de opciones.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadGroups(); }, []);

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    // ── Crear grupo ───────────────────────────────────────────────────────────────
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            await api.post('/option-groups', newGroupForm);
            setModalNewGroup(false);
            setNewGroupForm({ key: '', label: '' });
            loadGroups();
        } catch (err) {
            const msg = err?.response?.data?.message;
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear grupo.');
        } finally {
            setSaving(false);
        }
    };

    // ── Editar grupo (solo label) ─────────────────────────────────────────────────
    const handleEditGroup = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            await api.patch(`/option-groups/${modalEditGroup.id}`, { label: editGroupForm.label });
            setModalEditGroup(null);
            loadGroups();
        } catch (err) {
            const msg = err?.response?.data?.message;
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al editar grupo.');
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar grupo ────────────────────────────────────────────────────────────
    const handleDeleteGroup = async (group) => {
        if (!confirm(`¿Eliminar el grupo "${group.label}"? Se eliminarán también todas sus opciones.`)) return;
        try {
            await api.delete(`/option-groups/${group.id}`);
            loadGroups();
        } catch {
            alert('No se pudo eliminar el grupo.');
        }
    };

    // ── Crear valor ───────────────────────────────────────────────────────────────
    const handleCreateValue = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            await api.post('/option-values', {
                group_id: modalNewValue.id,
                key: newValueForm.key,
                label: newValueForm.label,
            });
            setModalNewValue(null);
            setNewValueForm({ key: '', label: '' });
            loadGroups();
        } catch (err) {
            const msg = err?.response?.data?.message;
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear opción.');
        } finally {
            setSaving(false);
        }
    };

    // ── Editar valor (solo label) ─────────────────────────────────────────────────
    const handleEditValue = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            await api.patch(`/option-values/${modalEditValue.id}`, { label: editValueForm.label });
            setModalEditValue(null);
            loadGroups();
        } catch (err) {
            const msg = err?.response?.data?.message;
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al editar opción.');
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar valor ────────────────────────────────────────────────────────────
    const handleDeleteValue = async (value) => {
        if (!confirm(`¿Eliminar la opción "${value.label}"?`)) return;
        try {
            await api.delete(`/option-values/${value.id}`);
            loadGroups();
        } catch {
            alert('No se pudo eliminar la opción.');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────────
    if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>;
    if (error) return <p className="text-red-500 text-sm">{error}</p>;

    return (
        <div className="max-w-3xl">

            {/* Cabecera */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Opciones del Cotizador</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Define los grupos y valores que aparecen cuando el usuario cotiza una ventana.
                        Los <span className="font-mono text-xs bg-slate-100 px-1 rounded">keys</span> son
                        identificadores internos — no se pueden cambiar una vez creados.
                    </p>
                </div>
                <button
                    onClick={() => { setNewGroupForm({ key: '', label: '' }); setFormError(''); setModalNewGroup(true); }}
                    className="flex items-center gap-2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0 ml-4"
                >
                    <IconPlus /> Nuevo Grupo
                </button>
            </div>

            {/* Lista de grupos */}
            <div className="space-y-3">
                {groups.map(group => (
                    <div key={group.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">

                        {/* Cabecera del grupo */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <button
                                onClick={() => toggleExpand(group.id)}
                                className="text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <IconChevron open={expanded[group.id]} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <span className="font-semibold text-slate-800 text-sm">{group.label}</span>
                                <span className="ml-2 font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {group.key}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400 mr-2">
                                {group.values?.length || 0} opciones
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { setEditGroupForm({ label: group.label }); setFormError(''); setModalEditGroup(group); }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar nombre"
                                >
                                    <IconEdit />
                                </button>
                                <button
                                    onClick={() => handleDeleteGroup(group)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar grupo"
                                >
                                    <IconTrash />
                                </button>
                            </div>
                        </div>

                        {/* Valores del grupo */}
                        {expanded[group.id] && (
                            <div className="divide-y divide-slate-100">
                                {(group.values || []).map(value => (
                                    <div key={value.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-4" />
                                        <span className="text-sm text-slate-700 flex-1">{value.label}</span>
                                        <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {value.key}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setEditValueForm({ label: value.label }); setFormError(''); setModalEditValue(value); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar nombre"
                                            >
                                                <IconEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteValue(value)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar opción"
                                            >
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Botón agregar opción */}
                                <div className="px-4 py-2.5">
                                    <button
                                        onClick={() => { setNewValueForm({ key: '', label: '' }); setFormError(''); setModalNewValue(group); }}
                                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors ml-4"
                                    >
                                        <IconPlus /> Agregar opción
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {groups.length === 0 && (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-sm">No hay grupos configurados.</p>
                        <p className="text-xs mt-1">Crea el primer grupo con el botón "Nuevo Grupo".</p>
                    </div>
                )}
            </div>

            {/* ── MODAL: Nuevo Grupo ─────────────────────────────────────────────────── */}
            {modalNewGroup && (
                <Modal title="Nuevo Grupo de Opciones" onClose={() => setModalNewGroup(false)}>
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Key interno <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="ej: tipo_material"
                                value={newGroupForm.key}
                                onChange={e => setNewGroupForm(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Solo letras minúsculas y guiones bajos. No se puede cambiar después.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre visible <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="ej: Tipo de Material"
                                value={newGroupForm.label}
                                onChange={e => setNewGroupForm(p => ({ ...p, label: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModalNewGroup(false)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60">
                                {saving ? 'Guardando...' : 'Crear Grupo'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── MODAL: Editar Grupo ────────────────────────────────────────────────── */}
            {modalEditGroup && (
                <Modal title="Editar Grupo" onClose={() => setModalEditGroup(null)}>
                    <form onSubmit={handleEditGroup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Key interno</label>
                            <div className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono bg-slate-50 text-slate-400">
                                {modalEditGroup.key}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">El key no se puede modificar.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre visible <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={editGroupForm.label}
                                onChange={e => setEditGroupForm({ label: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditGroup(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60">
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── MODAL: Nueva Opción ────────────────────────────────────────────────── */}
            {modalNewValue && (
                <Modal title={`Nueva opción en "${modalNewValue.label}"`} onClose={() => setModalNewValue(null)}>
                    <form onSubmit={handleCreateValue} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Key interno <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="ej: con_madera"
                                value={newValueForm.key}
                                onChange={e => setNewValueForm(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Solo letras minúsculas y guiones bajos. No se puede cambiar después.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre visible <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="ej: Con Madera"
                                value={newValueForm.label}
                                onChange={e => setNewValueForm(p => ({ ...p, label: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModalNewValue(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60">
                                {saving ? 'Guardando...' : 'Crear Opción'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── MODAL: Editar Opción ───────────────────────────────────────────────── */}
            {modalEditValue && (
                <Modal title="Editar Opción" onClose={() => setModalEditValue(null)}>
                    <form onSubmit={handleEditValue} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Key interno</label>
                            <div className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono bg-slate-50 text-slate-400">
                                {modalEditValue.key}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">El key no se puede modificar.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre visible <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={editValueForm.label}
                                onChange={e => setEditValueForm({ label: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{formError}</p>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditValue(null)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60">
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}