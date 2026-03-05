// RUTA: src/components/CutOptimizationModal.jsx
//
// Renderiza el plan de corte generado por reports.service.ts.
//
// DOS MODOS de visualización según el tipo de perfil:
//   ✂  Perfil individual   → lista de barras con sus piezas (modo clásico)
//   ⚡  Perfil combo        → SERIES DE MÁQUINA (modo nuevo)
//
// Una "serie de máquina" = 1 ciclo de la cortadora con 3 ranuras:
//   Ranura 1 → barra HOJA
//   Ranura 2 → barra HOJA
//   Ranura 3 → barra CEDAZO / MOSQUITERO
// Las 3 barras reciben el mismo patrón de cortes en un solo ciclo.
//
// El backend emite `machineSeries: true` y `series: [...]` cuando las
// piezas de HOJA y MOSQUITERO tienen dimensiones idénticas (ventanas corredizas).
// Si los largos difieren (override de reglas) el backend emite el formato antiguo
// y este modal lo renderiza con el modo clásico sin perder ningún dato.

import { FaPrint, FaTimes, FaRuler, FaLayerGroup } from 'react-icons/fa';

// ─── Paleta de colores por ventana ───────────────────────────────────────────
const WINDOW_PALETTE = [
    { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-400', hex: '#bfdbfe', hexText: '#1e3a8a' },
    { bg: 'bg-emerald-200', text: 'text-emerald-900', border: 'border-emerald-400', hex: '#a7f3d0', hexText: '#064e3b' },
    { bg: 'bg-violet-200', text: 'text-violet-900', border: 'border-violet-400', hex: '#ddd6fe', hexText: '#4c1d95' },
    { bg: 'bg-amber-200', text: 'text-amber-900', border: 'border-amber-400', hex: '#fde68a', hexText: '#78350f' },
    { bg: 'bg-rose-200', text: 'text-rose-900', border: 'border-rose-400', hex: '#fecdd3', hexText: '#881337' },
    { bg: 'bg-cyan-200', text: 'text-cyan-900', border: 'border-cyan-400', hex: '#a5f3fc', hexText: '#164e63' },
    { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-400', hex: '#fed7aa', hexText: '#7c2d12' },
    { bg: 'bg-teal-200', text: 'text-teal-900', border: 'border-teal-400', hex: '#99f6e4', hexText: '#134e4a' },
];

// Colores para el PDF (misma secuencia verde que muestra la imagen del cliente)
const PDF_COLORS = ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

function getColorForLabel(label) {
    const match = label.match(/V(\d+)/);
    const idx = match ? (parseInt(match[1]) - 1) % WINDOW_PALETTE.length : 0;
    return WINDOW_PALETTE[idx];
}

function getPdfColor(label) {
    const match = label.match(/V(\d+)/);
    const idx = match ? (parseInt(match[1]) - 1) % PDF_COLORS.length : 0;
    return PDF_COLORS[idx];
}

function parseCutLabel(windowLabel) {
    const [base, perfil = null] = (windowLabel || '').split('|');
    const short = base.split(' - ')[0];
    const m = short.match(/^(V\d+)\s*([AH])?$/);
    return { vNum: m?.[1] || short, dim: m?.[2] || null, perfil };
}

function ordinalEs(n) {
    const lst = ['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°',
        '11°', '12°', '13°', '14°', '15°', '16°', '17°', '18°', '19°', '20°'];
    return `${lst[n - 1] ?? `${n}°`} SERIE DE CORTE`;
}

// ─── Barra visual proporcional ────────────────────────────────────────────────
function BarVisual({ cuts, waste, barLength = 580 }) {
    return (
        <div className="flex items-stretch h-8 overflow-hidden flex-1">
            {cuts.map((cut, ci) => {
                const { vNum, dim } = parseCutLabel(cut.windowLabel);
                const c = getColorForLabel(cut.windowLabel);
                const pct = ((cut.length / barLength) * 100).toFixed(2);
                const dimLbl = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
                return (
                    <div
                        key={ci}
                        className={`flex items-center justify-center overflow-hidden border-r border-white/70 ${c.bg}`}
                        style={{ width: `${pct}%`, minWidth: '20px' }}
                        title={`${cut.length} cm — ${vNum} ${dimLbl}`}
                    >
                        <span className={`text-[9px] font-bold truncate px-0.5 leading-none ${c.text}`}>
                            {cut.length}<span className="hidden sm:inline"> {vNum}{dimLbl ? ' ' + dimLbl : ''}</span>
                        </span>
                    </div>
                );
            })}
            {waste > 0 && (
                <div
                    className="flex items-center justify-center bg-gray-100 border-l border-dashed border-gray-300"
                    style={{ width: `${((waste / barLength) * 100).toFixed(2)}%`, minWidth: '10px' }}
                    title={`Retal: ${waste.toFixed(1)} cm`}
                >
                    <span className="text-[8px] text-gray-400 px-0.5 hidden sm:block">
                        {waste.toFixed(0)}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Fila de ranura de máquina ────────────────────────────────────────────────
function MachineSlotRow({ label, isHoja, cuts, waste }) {
    return (
        <div className="flex items-stretch min-h-[30px]">
            <div className={`w-24 sm:w-28 flex-shrink-0 flex items-center px-2 py-1 self-stretch border-r ${isHoja ? 'bg-sky-50 border-sky-100' : 'bg-emerald-50 border-emerald-100'
                }`}>
                <span className={`text-[10px] font-bold uppercase leading-tight ${isHoja ? 'text-sky-700' : 'text-emerald-700'}`}>
                    {isHoja ? '🪟 ' : '🕸 '}{label}
                </span>
            </div>
            <BarVisual cuts={cuts} waste={waste} />
            <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-end pr-2 pl-1 border-l border-gray-100">
                <span className="text-[10px] text-gray-400 text-right leading-tight">
                    {waste.toFixed(1)} cm sobra
                </span>
            </div>
        </div>
    );
}

// ─── Bloque de una serie ──────────────────────────────────────────────────────
function MachineSerieBlock({ serie, cedazoLabel }) {
    const rows = [
        { label: 'HOJA', isHoja: true },
        { label: 'HOJA', isHoja: true },
        { label: cedazoLabel, isHoja: false },
    ];
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {ordinalEs(serie.serieIndex)}
                </span>
                <span className="text-[10px] text-gray-400">
                    Retal: {serie.waste.toFixed(1)} cm ({((serie.waste / 580) * 100).toFixed(1)}%)
                </span>
            </div>
            <div className="divide-y divide-gray-100">
                {rows.map((row, ri) => (
                    <MachineSlotRow
                        key={ri}
                        label={row.label}
                        isHoja={row.isHoja}
                        cuts={serie.cuts}
                        waste={serie.waste}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function CutOptimizationModal({ optimizationData = {}, isLoading, onClose, projectName }) {
    const profiles = Object.keys(optimizationData);

    // ── Métricas globales ─────────────────────────────────────────────────────
    let totalBarsAll = 0, totalWasteAll = 0, totalUsedAll = 0, totalPieces = 0;
    for (const groups of Object.values(optimizationData)) {
        for (const group of groups) {
            totalBarsAll += group.totalBars;
            if (group.machineSeries && group.series) {
                // Modo series: waste por serie × 3 barras (mismo patrón en las 3)
                for (const serie of group.series) {
                    totalWasteAll += serie.waste * 3;
                    totalUsedAll += serie.totalUsed * 3;
                    totalPieces += serie.cuts.length;
                }
            } else {
                for (const bar of (group.bars ?? [])) {
                    totalWasteAll += bar.waste;
                    totalUsedAll += bar.totalUsed ?? (580 - bar.waste);
                    totalPieces += bar.cuts.length;
                }
            }
        }
    }

    const globalEff = totalUsedAll > 0
        ? ((totalUsedAll / (totalUsedAll + totalWasteAll)) * 100).toFixed(1) : '0';

    // ── Print / PDF ───────────────────────────────────────────────────────────
    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });

        const buildProfileHtml = (profileName) => {
            const groups = optimizationData[profileName];
            const isCombo = profileName.includes(' + ');
            const totalBarsP = groups.reduce((s, g) => s + g.totalBars, 0);

            let html = `<div class="profile-block">
                <div class="profile-hdr">
                    <span>${isCombo ? '⚡ ' : '✂ '}${profileName}</span>
                    <span class="profile-count">${totalBarsP} barra${totalBarsP !== 1 ? 's' : ''} × 580 cm</span>
                </div>`;

            for (const group of groups) {
                if (group.machineSeries && group.series?.length > 0) {
                    // ── PDF: Series de máquina ────────────────────────────────
                    for (const serie of group.series) {
                        const retal = serie.waste.toFixed(1);
                        const rowLabels = ['HOJA', 'HOJA', 'MOSQUITERO'];
                        html += `<div class="serie-block">
                            <div class="serie-hdr">
                                <span>${ordinalEs(serie.serieIndex)}</span>
                                <span class="serie-retal">${retal} CM SOBRA</span>
                            </div>`;
                        for (const rowLabel of rowLabels) {
                            html += `<div class="machine-row">
                                <div class="row-label">${rowLabel}</div>
                                <div class="bar-visual">`;
                            for (const cut of serie.cuts) {
                                const { vNum, dim } = parseCutLabel(cut.windowLabel);
                                const dimLbl = dim === 'A' ? 'ANV' : dim === 'H' ? 'ALV' : '';
                                const pct = ((cut.length / 580) * 100).toFixed(2);
                                const color = getPdfColor(cut.windowLabel);
                                html += `<div class="piece" style="width:${pct}%;background:${color}">
                                    <span>${cut.length} cm ${dimLbl}${vNum.replace('V', '')}</span>
                                </div>`;
                            }
                            if (serie.waste > 0) {
                                const rPct = ((serie.waste / 580) * 100).toFixed(2);
                                html += `<div class="piece retal-p" style="width:${rPct}%">
                                    <span>${serie.waste.toFixed(1)} CM SOBRA</span>
                                </div>`;
                            }
                            html += `</div></div>`;
                        }
                        html += `</div>`;
                    }
                    html += `<div class="combo-totals">
                        <span>TOTAL BARRAS HOJA <b>${group.totalHojaBars} UNIDADES</b></span>
                        <span>TOTAL BARRAS MOSQUITERO <b>${group.totalCedazoBars} UNIDADES</b></span>
                    </div>`;
                } else {
                    // ── PDF: Barras estándar ──────────────────────────────────
                    html += `<div class="color-label">Color PVC: <b>${group.color}</b></div>`;
                    for (const bar of (group.bars ?? [])) {
                        const retal = bar.waste.toFixed(1);
                        const retalPct = ((bar.waste / 580) * 100).toFixed(1);
                        let pieces = '';
                        bar.cuts.forEach((cut, ci) => {
                            const { vNum, dim, perfil } = parseCutLabel(cut.windowLabel);
                            const dimLbl = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
                            const perfilLbl = isCombo && perfil ? ` · ${perfil}` : '';
                            pieces += `<div class="piece-row ${ci % 2 === 0 ? 'even' : ''}">
                                <span class="pl">${cut.length} cm</span>
                                <span class="pi">${vNum}${dimLbl ? ' – ' + dimLbl : ''}${perfilLbl}</span>
                            </div>`;
                        });
                        html += `<div class="bar-card">
                            <div class="bar-title">${bar.totalBars ?? 1} barra${(bar.totalBars ?? 1) !== 1 ? 's' : ''} de 580 cm</div>
                            ${pieces}
                            <div class="bar-retal">Retal: ${retal} cm (${retalPct}%)</div>
                        </div>`;
                    }
                }
            }
            html += `</div>`;
            return html;
        };

        const bodyHtml = profiles.map(buildProfileHtml).join('');

        const fullHtml = `<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8">
<title>Plan de Corte — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:16px 20px;background:#fff;max-width:960px;margin:0 auto}
.doc-hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.doc-title{font-size:17px;font-weight:900}
.doc-sub{font-size:10px;color:#555;margin-top:3px}
.doc-meta{font-size:10px;color:#888;margin-top:2px}
.summary{background:#f5f5f5;border-radius:5px;padding:8px 12px;margin-bottom:14px;font-size:11px;color:#444;display:flex;gap:16px;flex-wrap:wrap}
.summary b{color:#111;font-size:12px}
.profile-block{margin-bottom:18px;page-break-inside:avoid}
.profile-hdr{font-size:12px;font-weight:700;border-bottom:1.5px solid #111;padding-bottom:3px;margin-bottom:8px;display:flex;justify-content:space-between}
.profile-count{font-size:10px;font-weight:400;color:#888}
.color-label{font-size:10px;color:#666;margin-bottom:5px}
.bar-card{border:1px solid #ddd;border-radius:4px;margin-bottom:8px;overflow:hidden}
.bar-title{background:#f0f0f0;font-size:9px;font-style:italic;color:#555;padding:3px 8px;border-bottom:1px solid #ddd}
.piece-row{display:flex;justify-content:space-between;padding:3px 8px;font-size:10px}
.even{background:#fafafa}
.pl{font-weight:700;font-family:monospace;min-width:70px}
.pi{color:#555;font-size:9px}
.bar-retal{padding:3px 8px;font-size:9px;font-style:italic;color:#888;border-top:1px solid #eee}
.serie-block{border:1px solid #bbb;border-radius:4px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}
.serie-hdr{background:#1f2937;color:#fff;padding:5px 10px;display:flex;justify-content:space-between;align-items:center}
.serie-hdr span{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
.serie-retal{font-size:9px;color:#9ca3af;font-weight:400}
.machine-row{display:flex;align-items:stretch;border-bottom:1px solid #eee;min-height:26px}
.machine-row:last-child{border-bottom:none}
.row-label{width:78px;flex-shrink:0;font-size:8px;font-weight:700;text-transform:uppercase;color:#555;padding:0 6px;border-right:1px solid #eee;background:#f9fafb;display:flex;align-items:center}
.bar-visual{flex:1;display:flex;height:26px;overflow:hidden}
.piece{display:flex;align-items:center;justify-content:center;height:100%;border-right:1px solid rgba(255,255,255,.6);min-width:10px;overflow:hidden}
.piece span{font-size:7.5px;font-weight:700;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.25);padding:0 2px;white-space:nowrap}
.retal-p{background:#e5e7eb !important}
.retal-p span{color:#9ca3af !important;text-shadow:none !important;font-style:italic}
.combo-totals{background:#f9fafb;border-top:1px solid #ddd;padding:6px 10px;display:flex;gap:20px;font-size:10px;color:#444}
.combo-totals b{color:#111}
@media print{.profile-block,.serie-block{page-break-inside:avoid}}
</style></head><body>
<div class="doc-hdr">
  <div class="doc-title">✂ Plan de Corte</div>
  <div class="doc-sub">${projectName || 'Pedido'} · Barra estándar: 580 cm</div>
  <div class="doc-meta">${date}</div>
</div>
<div class="summary">
  <span>Barras totales: <b>${totalBarsAll}</b></span>
  <span>Piezas totales: <b>${totalPieces}</b></span>
  <span>Eficiencia: <b>${globalEff}%</b></span>
  <span>Desperdicio: <b>${totalWasteAll.toFixed(1)} cm</b></span>
</div>
${bodyHtml}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=1100,height=800');
        w.document.write(fullHtml);
        w.document.close();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start z-50 p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col my-4">

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <FaRuler size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-gray-900 leading-tight">Plan de Corte</h2>
                            {projectName && (
                                <p className="text-xs text-gray-400 leading-tight truncate">{projectName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!isLoading && profiles.length > 0 && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors"
                            >
                                <FaPrint size={11} /> Imprimir PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        >
                            <FaTimes size={13} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 min-h-[300px] max-h-[78vh]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <svg className="animate-spin w-7 h-7" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <p className="text-sm">Calculando plan de corte...</p>
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <FaLayerGroup size={28} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No hay perfiles para optimizar.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Resumen global */}
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
                                <span>Barras: <strong className="text-gray-900 text-sm">{totalBarsAll}</strong></span>
                                <span>Piezas: <strong className="text-gray-900 text-sm">{totalPieces}</strong></span>
                                <span>Eficiencia: <strong className="text-gray-900 text-sm">{globalEff}%</strong></span>
                                <span>Retal: <strong className="text-gray-900 text-sm">{totalWasteAll.toFixed(1)} cm</strong></span>
                            </div>

                            {profiles.map((profileName) => {
                                const groups = optimizationData[profileName];
                                const isCombo = profileName.includes(' + ');
                                const totalBarsP = groups.reduce((s, g) => s + g.totalBars, 0);

                                return (
                                    <div key={profileName} className="px-4 sm:px-5 py-4 border-b border-gray-100 last:border-0">

                                        {/* Cabecera del perfil */}
                                        <div className="flex items-baseline justify-between gap-2 mb-3">
                                            <h3 className="text-sm font-bold text-gray-900 leading-tight">
                                                {isCombo ? '⚡ ' : '✂ '}{profileName}
                                            </h3>
                                            <span className="text-xs text-gray-400 flex-shrink-0">
                                                {totalBarsP} barra{totalBarsP !== 1 ? 's' : ''} × 580 cm
                                            </span>
                                        </div>

                                        {groups.map((group, gi) => {
                                            // ── MODO SERIES DE MÁQUINA ────────────────────────────
                                            if (group.machineSeries && group.series?.length > 0) {
                                                const cedazoLabel = 'MOSQUITERO';
                                                return (
                                                    <div key={gi}>
                                                        {/* Nota instructiva */}
                                                        <div className="flex items-start gap-2 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                                            <span className="text-blue-500 flex-shrink-0 font-bold text-xs mt-0.5">ℹ</span>
                                                            <p className="text-[11px] text-blue-700 leading-relaxed">
                                                                Cada serie = 1 carga de máquina:{' '}
                                                                <strong>2 ranuras HOJA</strong> +{' '}
                                                                <strong>1 ranura {cedazoLabel}</strong>.{' '}
                                                                Las 3 barras reciben el mismo patrón de cortes simultáneamente.
                                                            </p>
                                                        </div>

                                                        {/* Series */}
                                                        <div className="space-y-3">
                                                            {group.series.map((serie) => (
                                                                <MachineSerieBlock
                                                                    key={serie.serieIndex}
                                                                    serie={serie}
                                                                    cedazoLabel={cedazoLabel}
                                                                />
                                                            ))}
                                                        </div>

                                                        {/* Totales del bloque */}
                                                        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex-shrink-0" />
                                                                <span className="text-xs font-medium text-gray-700">
                                                                    Barras HOJA:{' '}
                                                                    <span className="font-bold text-sky-700">{group.totalHojaBars}</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                                                <span className="text-xs font-medium text-gray-700">
                                                                    Barras {cedazoLabel}:{' '}
                                                                    <span className="font-bold text-emerald-700">{group.totalCedazoBars}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // ── MODO ESTÁNDAR (barras clásicas) ──────────────────
                                            return (
                                                <div key={gi} className="mb-3 last:mb-0">
                                                    <p className="text-xs text-gray-400 mb-2">
                                                        Color PVC:{' '}
                                                        <span className="font-medium text-gray-600">{group.color}</span>
                                                    </p>
                                                    <div className="space-y-2">
                                                        {(group.bars ?? []).map((bar) => {
                                                            const retal = bar.waste.toFixed(1);
                                                            const retalPct = ((bar.waste / 580) * 100).toFixed(1);
                                                            return (
                                                                <div key={bar.barNumber} className="border border-gray-200 rounded-lg overflow-hidden">
                                                                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                                                                        <span className="text-[11px] text-gray-500 italic">
                                                                            {bar.totalBars ?? 1} barra{(bar.totalBars ?? 1) !== 1 ? 's' : ''} de 580 cm
                                                                        </span>
                                                                    </div>
                                                                    <div className="divide-y divide-gray-50">
                                                                        {bar.cuts.map((cut, ci) => {
                                                                            const c = getColorForLabel(cut.windowLabel);
                                                                            const { vNum, dim, perfil } = parseCutLabel(cut.windowLabel);
                                                                            const dimLbl = dim === 'A' ? 'Ancho' : dim === 'H' ? 'Alto' : null;
                                                                            return (
                                                                                <div key={ci} className={`flex items-center gap-2 sm:gap-3 px-3 py-2 ${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                                                    <span className="font-mono font-bold text-gray-900 text-sm w-16 sm:w-20 flex-shrink-0">
                                                                                        {cut.length} cm
                                                                                    </span>
                                                                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border} flex-shrink-0`}>
                                                                                        {vNum}
                                                                                    </span>
                                                                                    {dimLbl && (
                                                                                        <span className={`text-[11px] px-1.5 py-0.5 rounded flex-shrink-0 ${dim === 'A' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                                            {dim === 'A' ? '↔' : '↕'} {dimLbl}
                                                                                        </span>
                                                                                    )}
                                                                                    {isCombo && perfil && (
                                                                                        <span className={`text-[11px] px-1.5 py-0.5 rounded flex-shrink-0 ${perfil === 'HOJA' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                                            {perfil === 'HOJA' ? '🪟 Hoja' : '🕸 Cedazo'}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="px-3 py-1.5 border-t border-gray-100 bg-white">
                                                                        <span className="text-[11px] text-gray-400 italic">
                                                                            Retal: {retal} cm ({retalPct}%)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
                    <span className="text-[11px] text-gray-300 hidden sm:block">
                        Barra: 580 cm · Máquina: 2 Hojas + 1 Mosquitero por serie
                    </span>
                    <button
                        onClick={onClose}
                        className="ml-auto px-4 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}