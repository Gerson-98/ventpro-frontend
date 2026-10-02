// RUTA: src/components/ChecklistPanel.jsx

import { useEffect, useState } from 'react';
import api from '@/services/api';

// Antes esto era un array fijo (3 tipos hardcodeados, hacían falta cambios
// de código para agregar un checklist nuevo). Ahora las categorías vienen
// del backend (tabla checklist_categories, configurable en Admin → Ítems
// de Checklists) — este array es solo la paleta de colores, asignada por
// posición a lo que venga del servidor.
const COLOR_PALETTE = [
    { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700 border-blue-300', btn: 'bg-blue-600 hover:bg-blue-700', dot: 'bg-blue-500' },
    { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700 border-green-300', btn: 'bg-green-600 hover:bg-green-700', dot: 'bg-green-500' },
    { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700 border-purple-300', btn: 'bg-purple-600 hover:bg-purple-700', dot: 'bg-purple-500' },
    { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700 border-amber-300', btn: 'bg-amber-600 hover:bg-amber-700', dot: 'bg-amber-500' },
    { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700 border-rose-300', btn: 'bg-rose-600 hover:bg-rose-700', dot: 'bg-rose-500' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700 border-cyan-300', btn: 'bg-cyan-600 hover:bg-cyan-700', dot: 'bg-cyan-500' },
];

function ChecklistCard({ typeInfo, data, orderId, onUpdate, isAdmin, order }) {
    const { type, label, description, icon, color } = typeInfo;
    const { completed, templates } = data;

    const [open, setOpen] = useState(false);
    const [checkedItems, setCheckedItems] = useState({});
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (open && !completed) {
            const initial = {};
            templates.forEach((t) => { initial[t.id] = true; });
            setCheckedItems(initial);
        }
    }, [open, completed, templates]);

    const checkedCount = completed ? completed.items.filter((i) => i.checked).length : 0;
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

            {/* ── Header ── */}
            <div className={`${color.bg} px-3 sm:px-4 py-3`}>
                {/* Fila 1: icono + título */}
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                    </div>
                </div>

                {/* Fila 2 (móvil) / inline (sm+): acciones */}
                <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0 sm:hidden">
                    <ActionButtons
                        completed={completed}
                        templates={templates}
                        open={open}
                        setOpen={setOpen}
                        checkedCount={checkedCount}
                        totalCount={totalCount}
                        color={color}
                        isAdmin={isAdmin}
                        resetting={resetting}
                        handleReset={handleReset}
                        typeInfo={typeInfo}
                        order={order}
                    />
                </div>

                {/* sm+: todo en una sola fila */}
                <div className="hidden sm:flex items-center justify-between">
                    <div /> {/* spacer — el título ya está arriba pero en sm va inline */}
                    <div className="flex items-center gap-2">
                        <ActionButtons
                            completed={completed}
                            templates={templates}
                            open={open}
                            setOpen={setOpen}
                            checkedCount={checkedCount}
                            totalCount={totalCount}
                            color={color}
                            isAdmin={isAdmin}
                            resetting={resetting}
                            handleReset={handleReset}
                            typeInfo={typeInfo}
                            order={order}
                        />
                    </div>
                </div>
            </div>

            {/* ── Body expandible ── */}
            {open && (
                <div className="px-3 sm:px-4 py-4 bg-white border-t border-gray-100">
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
                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                                <span>Completado por</span>
                                <span className="font-medium text-gray-600">{completed.completedBy?.name}</span>
                                <span>—</span>
                                <span>
                                    {new Date(completed.completedAt).toLocaleDateString('es-GT', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
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
                                    className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checkedItems[template.id] ?? false}
                                        onChange={(e) =>
                                            setCheckedItems((prev) => ({ ...prev, [template.id]: e.target.checked }))
                                        }
                                        className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
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
                                    className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200"
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

// Botones de acción extraídos para no duplicar JSX entre móvil y desktop
function ActionButtons({ completed, templates, open, setOpen, checkedCount, totalCount, color, isAdmin, resetting, handleReset, typeInfo, order }) {
    const printBtn = templates.length > 0 && (
        <button
            onClick={() => printChecklists([{ label: typeInfo.label, icon: typeInfo.icon, templates }], order, typeInfo.label)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/60 active:bg-white/80 transition-colors"
            title="Imprimir hoja en blanco para marcar a mano"
        >
            🖨️ Imprimir
        </button>
    );

    if (completed) {
        return (
            <>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color.badge}`}>
                    ✓ Completado
                </span>
                <span className="text-xs text-gray-500">{checkedCount}/{totalCount}</span>
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/60 active:bg-white/80 transition-colors"
                >
                    {open ? 'Ocultar' : 'Ver detalle'}
                </button>
                {printBtn}
                {isAdmin && (
                    <button
                        onClick={handleReset}
                        disabled={resetting}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 active:bg-red-100 transition-colors"
                    >
                        {resetting ? '...' : 'Rehacer'}
                    </button>
                )}
            </>
        );
    }

    if (templates.length === 0) {
        return <span className="text-xs text-gray-400 italic">Sin ítems configurados</span>;
    }

    return (
        <>
            <button
                onClick={() => setOpen((o) => !o)}
                className={`text-xs text-white px-3 py-1.5 rounded-lg font-medium ${color.btn} transition-colors active:opacity-80`}
            >
                {open ? 'Cancelar' : 'Completar'}
            </button>
            {printBtn}
        </>
    );
}

// ── Impresión de checklists: una hoja ordenada por SECCIONES (Ventanas,
// Accesorios, Herramientas, Limpieza…) con casillas vacías para marcar a
// mano. Cada ítem trae `group` (los dinámicos: Ventanas/Accesorios); los
// fijos se agrupan bajo el nombre de su checklist.
function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSections(categories) {
    const sections = [];
    categories.forEach((cat) => {
        const byGroup = new Map();
        (cat.templates || []).forEach((t) => {
            const g = t.group || `${cat.icon || ''} ${cat.label}`.trim();
            if (!byGroup.has(g)) byGroup.set(g, []);
            byGroup.get(g).push(t.label);
        });
        byGroup.forEach((items, title) => sections.push({ title, items }));
    });
    return sections;
}

function printChecklists(categories, order, docTitle) {
    const date = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
    const sections = buildSections(categories).filter((s) => s.items.length > 0);

    const sectionsHtml = sections.map((s) => `
      <section>
        <h2>${escapeHtml(s.title)} <span class="cnt">${s.items.length}</span></h2>
        <ul>${s.items.map((l) => `<li><span class="box"></span><span class="lbl">${escapeHtml(l)}</span></li>`).join('')}</ul>
      </section>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(docTitle)} — ${escapeHtml(order?.project || '')}</title>
<style>
  @page{size:letter;margin:14mm}
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:11.5px;margin:0}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:14px}
  h1{font-size:18px;margin:0;text-transform:uppercase;letter-spacing:.5px}
  .meta{font-size:11px;color:#444;margin-top:3px}
  .date{font-size:11px;color:#666;white-space:nowrap}
  section{margin-bottom:14px;break-inside:avoid;page-break-inside:avoid}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.6px;background:#f1f5f9;border-left:5px solid #2563eb;padding:5px 8px;margin:0 0 6px;display:flex;justify-content:space-between}
  h2 .cnt{font-weight:400;color:#64748b}
  ul{list-style:none;margin:0;padding:0;columns:2;column-gap:18px}
  li{display:flex;align-items:flex-start;gap:8px;padding:4px 0;border-bottom:1px dotted #cbd5e1;break-inside:avoid}
  .box{width:14px;height:14px;border:1.8px solid #111;border-radius:2px;flex-shrink:0;margin-top:1px}
  .lbl{line-height:1.3}
  .obs{margin-top:10px;border:1px solid #cbd5e1;border-radius:4px;padding:8px;min-height:70px}
  .obs b{font-size:11px;text-transform:uppercase;color:#475569}
  .sign{display:flex;gap:30px;margin-top:22px}
  .sign div{flex:1;border-top:1px solid #111;padding-top:4px;font-size:10px;color:#475569;text-align:center}
</style></head><body>
<header>
  <div>
    <h1>${escapeHtml(docTitle)}</h1>
    <div class="meta"><b>${escapeHtml(order?.project || 'Pedido')}</b>${order?.id ? ` · Pedido #${order.id}` : ''}${order?.client?.name ? ` · Cliente: ${escapeHtml(order.client.name)}` : ''}</div>
  </div>
  <div class="date">${date}</div>
</header>
${sectionsHtml || '<p>Este checklist no tiene ítems.</p>'}
<div class="obs"><b>Observaciones</b></div>
<div class="sign"><div>Responsable de carga</div><div>Instalador</div><div>Revisó</div></div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=1000');
    w.document.write(html);
    w.document.close();
}

export default function ChecklistPanel({ orderId, isAdmin, order }) {
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

    const completedCount = checklists.filter((c) => c.completed).length;

    return (
        <div className="mt-6">
            {/* Header con barra de progreso */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">Checklists de Instalación</h3>
                    <p className="text-xs text-gray-400">
                        {loading ? '...' : `${completedCount} de ${checklists.length} completados`}
                    </p>
                </div>
                {!loading && checklists.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => printChecklists(
                                checklists.map((c) => ({
                                    label: c.label || c.type,
                                    icon: c.icon,
                                    templates: c.completed
                                        ? c.completed.items.map((i) => ({ label: i.label }))
                                        : c.templates,
                                })),
                                order,
                                'Checklist de instalación',
                            )}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                            title="Imprimir todos los checklists en una sola hoja, ordenados por sección"
                        >
                            🖨️ Imprimir todo
                        </button>
                        <div className="w-20 sm:w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                    {checklists.map((data, idx) => {
                        const typeInfo = {
                            type: data.type,
                            label: data.label || data.type,
                            description: '',
                            icon: data.icon || '📋',
                            color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                        };
                        return (
                            <ChecklistCard
                                key={typeInfo.type}
                                typeInfo={typeInfo}
                                data={data}
                                orderId={orderId}
                                onUpdate={fetchChecklists}
                                isAdmin={isAdmin}
                                order={order}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}