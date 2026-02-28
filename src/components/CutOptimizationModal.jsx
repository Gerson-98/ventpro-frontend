// RUTA: src/components/CutOptimizationModal.jsx

import { useRef } from 'react';
import { FaPrint, FaTimes, FaRuler, FaLayerGroup } from 'react-icons/fa';

// ─── Paleta de colores por ventana ───────────────────────────────────────────
const WINDOW_PALETTE = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', hex: '#dbeafe', hexText: '#1e40af' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', hex: '#d1fae5', hexText: '#065f46' },
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', hex: '#ede9fe', hexText: '#5b21b6' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', hex: '#fef3c7', hexText: '#92400e' },
    { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', hex: '#ffe4e6', hexText: '#9f1239' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', hex: '#cffafe', hexText: '#164e63' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', hex: '#ffedd5', hexText: '#9a3412' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', hex: '#ccfbf1', hexText: '#0f766e' },
];

function getColorForLabel(label) {
    const match = label.match(/V(\d+)/);
    const idx = match ? (parseInt(match[1]) - 1) % WINDOW_PALETTE.length : 0;
    return WINDOW_PALETTE[idx];
}

// ─── Visualización gráfica de una barra ──────────────────────────────────────
function BarViz({ cuts, totalUsed, barLength = 580 }) {
    const wastePct = ((barLength - totalUsed) / barLength) * 100;
    return (
        <>
            <div className="w-full h-7 flex rounded overflow-hidden border border-gray-300 my-2">
                {cuts.map((cut, i) => {
                    const c = getColorForLabel(cut.windowLabel);
                    return (
                        <div
                            key={i}
                            className={`${c.bg} border-r border-white/50 flex items-center justify-center overflow-hidden flex-shrink-0`}
                            style={{ width: `${(cut.length / barLength) * 100}%` }}
                            title={`${cut.length} cm — ${cut.windowLabel}`}
                        >
                            <span className={`text-[9px] font-bold ${c.text} leading-none px-0.5 truncate`}>
                                {cut.length}
                            </span>
                        </div>
                    );
                })}
                {wastePct > 0.5 && (
                    <div
                        className="bg-gray-200 flex items-center justify-center flex-shrink-0"
                        style={{ width: `${wastePct}%` }}
                        title={`Desperdicio: ${(barLength - totalUsed).toFixed(1)} cm`}
                    >
                        <span className="text-[9px] text-gray-500 truncate px-0.5">
                            {(barLength - totalUsed).toFixed(0)}
                        </span>
                    </div>
                )}
            </div>
            {/* Regla de escala */}
            <div className="flex justify-between text-[10px] text-gray-400 mb-3 px-0.5">
                <span>0</span><span>{Math.round(barLength / 2)} cm</span><span>{barLength} cm</span>
            </div>
        </>
    );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function CutOptimizationModal({
    optimizationData = {},
    isLoading,
    onClose,
    projectName,
}) {
    const profiles = Object.keys(optimizationData);

    // ── Estadísticas globales ──────────────────────────────────────────────────
    let totalBarsAll = 0, totalWasteAll = 0, totalUsedAll = 0;
    const allWindowLabels = new Set();

    for (const groups of Object.values(optimizationData)) {
        for (const group of groups) {
            totalBarsAll += group.totalBars;
            for (const bar of group.bars) {
                totalWasteAll += bar.waste;
                totalUsedAll += bar.totalUsed;
                for (const cut of bar.cuts) {
                    // Quitar sufijo de cantidad "(1/3)" para la leyenda
                    allWindowLabels.add(cut.windowLabel.replace(/\s*\(\d+\/\d+\)$/, ''));
                }
            }
        }
    }

    const globalEff = totalUsedAll > 0
        ? ((totalUsedAll / (totalUsedAll + totalWasteAll)) * 100).toFixed(1)
        : '0';

    const windowLabels = Array.from(allWindowLabels).sort((a, b) => {
        const na = parseInt(a.match(/V(\d+)/)?.[1] || '0');
        const nb = parseInt(b.match(/V(\d+)/)?.[1] || '0');
        return na - nb;
    });

    // ── Imprimir / Exportar PDF ────────────────────────────────────────────────
    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT', {
            day: 'numeric', month: 'long', year: 'numeric',
        });

        const buildHTML = () => {
            let body = '';

            // Leyenda de ventanas
            body += `<div class="legend">`;
            for (const lbl of windowLabels) {
                const c = getColorForLabel(lbl);
                body += `<div class="chip" style="background:${c.hex};border:1px solid ${c.hexText}40;color:${c.hexText}">
          <span class="dot" style="background:${c.hexText}"></span>${lbl}
        </div>`;
            }
            body += `</div>`;

            for (const profileName of profiles) {
                body += `<div class="section">
          <div class="section-title">${profileName}</div>`;

                for (const group of optimizationData[profileName]) {
                    body += `<div class="group-header">Color: <b>${group.color}</b> &nbsp;·&nbsp; ${group.totalBars} barra${group.totalBars !== 1 ? 's' : ''} × 580 cm</div>`;

                    for (const bar of group.bars) {
                        const effColor = bar.efficiency >= 85 ? '#16a34a' : bar.efficiency >= 70 ? '#d97706' : '#dc2626';
                        body += `<div class="bar-card">
              <div class="bar-hdr">
                <span class="bar-num">Barra #${bar.barNumber}</span>
                <span>Uso: <b>${bar.totalUsed} cm</b></span>
                <span>Desperdicio: <b style="color:#dc2626">${bar.waste} cm</b></span>
                <span>Eficiencia: <b style="color:${effColor}">${bar.efficiency}%</b></span>
              </div>`;

                        // Visualización gráfica
                        body += `<div class="viz">`;
                        for (const cut of bar.cuts) {
                            const c = getColorForLabel(cut.windowLabel);
                            const pct = (cut.length / 580) * 100;
                            body += `<div class="vseg" style="width:${pct}%;background:${c.hex};color:${c.hexText}">${cut.length}</div>`;
                        }
                        const wastePct = (bar.waste / 580) * 100;
                        if (wastePct > 0.5) {
                            body += `<div class="vwaste" style="width:${wastePct}%">${bar.waste}cm</div>`;
                        }
                        body += `</div>`;
                        body += `<div class="scale"><span>0</span><span>290 cm</span><span>580 cm</span></div>`;

                        // Lista de cortes
                        body += `<div class="cuts">`;
                        for (const cut of bar.cuts) {
                            const c = getColorForLabel(cut.windowLabel);
                            body += `<div class="cut" style="background:${c.hex};border:1px solid ${c.hexText}40;color:${c.hexText}">
                <b>${cut.length} cm</b>
                <span class="cut-lbl">${cut.windowLabel.split(' - ')[0]}</span>
              </div>`;
                        }
                        body += `</div></div>`;
                    }
                }
                body += `</div>`;
            }
            return body;
        };

        const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Plan de Corte — ${projectName || 'Pedido'}</title>
<style>
* { box-sizing: border-box; margin:0; padding:0; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
h1 { font-size: 18px; font-weight: 900; }
.sub { color: #777; font-size: 11px; margin: 4px 0 14px; }
.stats { display:flex; gap:20px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:10px 16px; margin-bottom:16px; }
.stat { display:flex; flex-direction:column; gap:2px; }
.stat-v { font-size:18px; font-weight:900; }
.stat-l { font-size:9px; color:#777; text-transform:uppercase; letter-spacing:.5px; }
.legend { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
.chip { display:flex; align-items:center; gap:5px; padding:3px 9px; border-radius:4px; font-size:10px; font-weight:600; }
.dot { width:8px; height:8px; border-radius:50%; }
.section { margin-bottom:18px; break-inside:avoid; }
.section-title { background:#1e3a8a; color:#fff; font-size:13px; font-weight:700; padding:6px 12px; border-radius:4px 4px 0 0; }
.group-header { background:#f9fafb; border:1px solid #e5e7eb; border-top:none; font-size:10px; color:#555; padding:5px 12px 8px; }
.bar-card { border:1px solid #e5e7eb; border-radius:4px; padding:10px; margin:6px 0; break-inside:avoid; }
.bar-hdr { display:flex; gap:14px; align-items:center; margin-bottom:6px; font-size:10px; color:#555; }
.bar-num { font-size:12px; font-weight:700; color:#1e3a8a; margin-right:4px; }
.viz { display:flex; height:22px; border:1px solid #d1d5db; border-radius:3px; overflow:hidden; margin-bottom:4px; }
.vseg { display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:700; border-right:1px solid rgba(255,255,255,0.4); overflow:hidden; }
.vwaste { background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:8px; color:#9ca3af; }
.scale { display:flex; justify-content:space-between; font-size:8px; color:#aaa; margin-bottom:8px; }
.cuts { display:flex; flex-wrap:wrap; gap:5px; }
.cut { display:flex; align-items:center; gap:5px; padding:3px 8px; border-radius:3px; font-size:10px; }
.cut-lbl { font-size:9px; opacity:.75; }
@media print { body{padding:8px} .section,.bar-card{break-inside:avoid;page-break-inside:avoid} }
</style></head><body>
<h1>Plan de Corte — ${projectName || 'Pedido'}</h1>
<p class="sub">Generado el ${date} &nbsp;·&nbsp; Algoritmo First Fit Decreasing &nbsp;·&nbsp; Barra estándar: 580 cm</p>
<div class="stats">
  <div class="stat"><span class="stat-v">${totalBarsAll}</span><span class="stat-l">Barras totales</span></div>
  <div class="stat"><span class="stat-v">${globalEff}%</span><span class="stat-l">Eficiencia</span></div>
  <div class="stat"><span class="stat-v">${totalWasteAll.toFixed(0)} cm</span><span class="stat-l">Desperdicio</span></div>
  <div class="stat"><span class="stat-v">${windowLabels.length}</span><span class="stat-l">Ventanas</span></div>
</div>
${buildHTML()}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),600)}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=950,height=750');
        w.document.write(html);
        w.document.close();
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col my-6">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-800 to-blue-950 rounded-t-2xl px-6 py-5 flex justify-between items-center">
                    <div>
                        <h2 className="text-white text-xl font-black flex items-center gap-2.5">
                            <FaRuler size={18} /> Plan de Corte Optimizado
                        </h2>
                        {projectName && <p className="text-blue-300 text-sm mt-0.5">{projectName}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isLoading && profiles.length > 0 && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl border border-white/20 transition-all"
                            >
                                <FaPrint size={13} /> Imprimir / PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
                            <svg className="animate-spin w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <p className="font-semibold">Calculando plan de corte óptimo...</p>
                            <p className="text-sm text-gray-400">Algoritmo First Fit Decreasing</p>
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <FaLayerGroup size={40} className="mx-auto mb-4 opacity-30" />
                            <p className="font-medium">No hay perfiles para optimizar en este pedido.</p>
                            <p className="text-sm mt-1">Verifica que las ventanas tengan catálogo de perfiles configurado.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* Estadísticas globales */}
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { val: totalBarsAll, lbl: 'Barras totales', cls: 'text-blue-700' },
                                    { val: `${globalEff}%`, lbl: 'Eficiencia global', cls: parseFloat(globalEff) >= 85 ? 'text-emerald-600' : parseFloat(globalEff) >= 70 ? 'text-amber-500' : 'text-red-500' },
                                    { val: `${totalWasteAll.toFixed(0)} cm`, lbl: 'Desperdicio total', cls: 'text-red-500' },
                                    { val: windowLabels.length, lbl: 'Ventanas', cls: 'text-gray-700' },
                                ].map(({ val, lbl, cls }) => (
                                    <div key={lbl} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                                        <p className={`text-2xl font-black ${cls}`}>{val}</p>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">{lbl}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Leyenda de ventanas */}
                            {windowLabels.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Referencia de Ventanas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {windowLabels.map((lbl) => {
                                            const c = getColorForLabel(lbl);
                                            return (
                                                <span key={lbl} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
                                                    {lbl}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Secciones por tipo de perfil */}
                            {profiles.map((profileName) => {
                                const totalBarsProfile = optimizationData[profileName].reduce((s, g) => s + g.totalBars, 0);
                                return (
                                    <div key={profileName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="bg-blue-800 px-5 py-3 flex items-center justify-between">
                                            <h3 className="text-white font-black text-sm tracking-wide">{profileName}</h3>
                                            <span className="text-blue-300 text-xs font-medium">
                                                {totalBarsProfile} barra{totalBarsProfile !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {optimizationData[profileName].map((group, gi) => (
                                            <div key={gi} className="p-4 border-b border-gray-100 last:border-0">
                                                <div className="flex items-center gap-2 mb-4 text-sm">
                                                    <span className="font-semibold text-gray-500">Color:</span>
                                                    <span className="font-bold text-gray-800">{group.color}</span>
                                                    <span className="ml-auto text-xs text-gray-400">
                                                        {group.totalBars} barra{group.totalBars !== 1 ? 's' : ''} × 580 cm
                                                    </span>
                                                </div>

                                                <div className="space-y-4">
                                                    {group.bars.map((bar) => {
                                                        const effCls = bar.efficiency >= 85
                                                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                            : bar.efficiency >= 70
                                                                ? 'text-amber-700 bg-amber-50 border-amber-200'
                                                                : 'text-red-700 bg-red-50 border-red-200';

                                                        return (
                                                            <div key={bar.barNumber} className="border border-gray-200 rounded-xl p-4">
                                                                {/* Cabecera de barra */}
                                                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                                    <span className="font-black text-blue-700 text-sm">Barra #{bar.barNumber}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        Uso: <span className="font-semibold text-gray-800">{bar.totalUsed} cm</span>
                                                                    </span>
                                                                    <span className="text-gray-300">·</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        Desperdicio: <span className="font-semibold text-red-500">{bar.waste} cm</span>
                                                                    </span>
                                                                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-lg border ${effCls}`}>
                                                                        {bar.efficiency}%
                                                                    </span>
                                                                </div>

                                                                {/* Visualización gráfica */}
                                                                <BarViz cuts={bar.cuts} totalUsed={bar.totalUsed} barLength={580} />

                                                                {/* Chips de cortes con ventana */}
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {bar.cuts.map((cut, ci) => {
                                                                        const c = getColorForLabel(cut.windowLabel);
                                                                        return (
                                                                            <div
                                                                                key={ci}
                                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${c.bg} ${c.border}`}
                                                                                title={cut.windowLabel}
                                                                            >
                                                                                <span className={`font-mono font-black text-xs ${c.text}`}>
                                                                                    {cut.length} cm
                                                                                </span>
                                                                                <span className="text-gray-300 text-[10px]">·</span>
                                                                                <span className={`text-[10px] font-semibold ${c.text} opacity-80`}>
                                                                                    {cut.windowLabel.split(' - ')[0]}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                        Algoritmo: First Fit Decreasing &nbsp;·&nbsp; Barra estándar: 580 cm
                    </p>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}