// RUTA: src/pages/Admin/Tabs/ChecklistTemplateTab.jsx — RESPONSIVE

import { useEffect, useState } from 'react';
import api from '@/services/api';

// Antes el tipo de checklist era un enum fijo de 3 valores (cambiar la
// lista requería tocar código y migrar la base de datos). Ahora las
// categorías viven en la tabla checklist_categories — se pueden crear,
// renombrar o desactivar desde acá mismo.
const COLOR_CLASSES = [
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-green-50 border-green-200 text-green-700',
    'bg-purple-50 border-purple-200 text-purple-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-rose-50 border-rose-200 text-rose-700',
    'bg-cyan-50 border-cyan-200 text-cyan-700',
];

export default function ChecklistTemplateTab() {
    const [categories, setCategories] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSlug, setActiveSlug] = useState(null);
    const [newLabel, setNewLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');

    // Crear nueva categoría
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('📋');
    const [newCatDynamic, setNewCatDynamic] = useState(false);
    const [savingCategory, setSavingCategory] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [catsRes, tplRes] = await Promise.all([
                api.get('/checklists/categories'),
                api.get('/checklists/templates'),
            ]);
            const cats = catsRes.data || [];
            setCategories(cats);
            setTemplates(tplRes.data || []);
            setActiveSlug((prev) => prev && cats.some((c) => c.slug === prev) ? prev : (cats[0]?.slug ?? null));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const activeCategory = categories.find((c) => c.slug === activeSlug);
    const filtered = templates
        .filter((t) => t.category_id === activeCategory?.id)
        .sort((a, b) => a.sort_order - b.sort_order);
    const colorClass = COLOR_CLASSES[categories.findIndex((c) => c.slug === activeSlug) % COLOR_CLASSES.length] || COLOR_CLASSES[0];

    const handleAdd = async () => {
        if (!newLabel.trim() || !activeCategory) return;
        setSaving(true);
        try {
            await api.post('/checklists/templates', {
                categorySlug: activeCategory.slug,
                label: newLabel.trim(),
                sort_order: filtered.length,
            });
            setNewLabel('');
            fetchAll();
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (template) => {
        try {
            await api.patch(`/checklists/templates/${template.id}`, { active: !template.active });
            fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEdit = async (id) => {
        if (!editLabel.trim()) return;
        try {
            await api.patch(`/checklists/templates/${id}`, { label: editLabel.trim() });
            setEditingId(null);
            fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este ítem? Se borrará de los checklists existentes.')) return;
        try {
            await api.delete(`/checklists/templates/${id}`);
            fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCatLabel.trim()) return;
        setSavingCategory(true);
        try {
            const res = await api.post('/checklists/categories', {
                slug: newCatLabel.trim(),
                label: newCatLabel.trim(),
                icon: newCatIcon.trim() || '📋',
                dynamic: newCatDynamic,
            });
            setNewCatLabel('');
            setNewCatIcon('📋');
            setNewCatDynamic(false);
            setShowNewCategory(false);
            await fetchAll();
            setActiveSlug(res.data.slug);
        } catch (err) {
            alert(err?.response?.data?.message || 'No se pudo crear la categoría.');
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (category) => {
        if (!confirm(`¿Eliminar la categoría "${category.label}"? Se borran también sus ítems y el historial de checklists hechos con ella en todos los pedidos.`)) return;
        try {
            await api.delete(`/checklists/categories/${category.id}`);
            fetchAll();
        } catch (err) {
            alert(err?.response?.data?.message || 'No se pudo eliminar la categoría.');
        }
    };

    return (
        <div className="px-1">
            <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">Ítems de Checklists</h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                        Configura los ítems que aparecerán en cada checklist de los pedidos.
                    </p>
                </div>
                <button
                    onClick={() => setShowNewCategory((v) => !v)}
                    className="flex-shrink-0 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                    + Checklist
                </button>
            </div>

            {showNewCategory && (
                <div className="mb-4 p-3 sm:p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-blue-700">Nuevo checklist</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Emoji"
                            value={newCatIcon}
                            onChange={(e) => setNewCatIcon(e.target.value)}
                            className="w-full sm:w-16 text-sm border border-gray-300 rounded-lg px-3 py-2 text-center"
                        />
                        <input
                            type="text"
                            placeholder="Nombre del checklist (ej. Control de Calidad)"
                            value={newCatLabel}
                            onChange={(e) => setNewCatLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={newCatDynamic} onChange={(e) => setNewCatDynamic(e.target.checked)} />
                        Incluir automáticamente las ventanas y accesorios del pedido (como "Carga de Camión")
                    </label>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowNewCategory(false)} className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateCategory}
                            disabled={savingCategory || !newCatLabel.trim()}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {savingCategory ? 'Creando...' : 'Crear checklist'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tabs — scroll horizontal en móvil ── */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-1 px-1">
                {categories.map((c) => (
                    <button
                        key={c.slug}
                        onClick={() => setActiveSlug(c.slug)}
                        className={`flex-shrink-0 px-3 sm:px-4 py-2 -mb-px text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSlug === c.slug
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {c.icon} {c.label}
                        {c.dynamic && <span className="ml-1 text-[9px] text-gray-400">(dinámico)</span>}
                    </button>
                ))}
            </div>

            {activeCategory?.dynamic && (
                <div className="mb-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    Este checklist ya incluye automáticamente las ventanas y accesorios de cada pedido — los ítems de aquí abajo se SUMAN a esos (ej. herramientas generales).
                </div>
            )}

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
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-5 text-center flex-shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 text-sm text-gray-700 min-w-0">{template.label}</span>
                                        <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${template.active
                                                ? colorClass
                                                : 'bg-gray-100 text-gray-400 border-gray-200'
                                                }`}
                                        >
                                            {template.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => { setEditingId(template.id); setEditLabel(template.label); }}
                                                className="text-xs text-blue-600 border border-blue-200 rounded-md px-2.5 py-1 hover:bg-blue-50"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(template)}
                                                className="text-xs text-gray-500 border border-gray-200 rounded-md px-2.5 py-1 hover:bg-gray-50"
                                            >
                                                {template.active ? 'Desactivar' : 'Activar'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id)}
                                                className="text-xs text-red-500 border border-red-100 rounded-md px-2.5 py-1 hover:bg-red-50"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
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
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Agregar nuevo ítem */}
            {activeCategory && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <input
                        type="text"
                        placeholder={`Nuevo ítem para ${activeCategory.icon} ${activeCategory.label}...`}
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
            )}

            {activeCategory && (
                <div className="mt-3 text-right">
                    <button
                        onClick={() => handleDeleteCategory(activeCategory)}
                        className="text-[11px] text-red-400 hover:text-red-600"
                    >
                        Eliminar checklist "{activeCategory.label}"
                    </button>
                </div>
            )}
        </div>
    );
}
