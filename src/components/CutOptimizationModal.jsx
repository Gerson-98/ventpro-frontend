// RUTA: src/components/CutOptimizationModal.jsx

import { FaPrint, FaTimes, FaRuler, FaLayerGroup } from 'react-icons/fa';

// ─── Paleta de colores por ventana ───────────────────────────────────────────
const WINDOW_PALETTE = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', hex: '#dbeafe', hexText: '#1e40af', hexBorder: '#93c5fd' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', hex: '#d1fae5', hexText: '#065f46', hexBorder: '#6ee7b7' },
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', hex: '#ede9fe', hexText: '#5b21b6', hexBorder: '#c4b5fd' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', hex: '#fef3c7', hexText: '#92400e', hexBorder: '#fcd34d' },
    { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', hex: '#ffe4e6', hexText: '#9f1239', hexBorder: '#fda4af' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', hex: '#cffafe', hexText: '#164e63', hexBorder: '#67e8f9' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', hex: '#ffedd5', hexText: '#9a3412', hexBorder: '#fdba74' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', hex: '#ccfbf1', hexText: '#0f766e', hexBorder: '#5eead4' },
];

function getColorForLabel(label) {
    const match = label.match(/V(\d+)/);
    const idx = match ? (parseInt(match[1]) - 1) % WINDOW_PALETTE.length : 0;
    return WINDOW_PALETTE[idx];
}

function parseCutLabel(windowLabel) {
    const [base, perfil = null] = (windowLabel || '').split('|');
    const short = base.split(' - ')[0];
    const m = short.match(/^(V\d+)\s*([AH])?$/);
    return { vNum: m?.[1] || short, dim: m?.[2] || null, perfil };
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function CutOptimizationModal({ optimizationData = {}, isLoading, onClose, projectName }) {
    const profiles = Object.keys(optimizationData);

    let totalBarsAll = 0, totalWasteAll = 0, totalUsedAll = 0;
    const allWindowLabels = new Set();

    for (const groups of Object.values(optimizationData)) {
        for (const group of groups) {
            totalBarsAll += group.totalBars;
            for (const bar of group.bars) {
                totalWasteAll += bar.waste;
                totalUsedAll += bar.totalUsed;
                for (const cut of bar.cuts) {
                    const normalized = cut.windowLabel
                        .replace(/\s*\(\d+\/\d+\)$/, '')
                        .replace(/^(V\d+)\s+[AH]\s+-/, '$1 -');
                    allWindowLabels.add(normalized);
                }
            }
        }
    }

    const globalEff = totalUsedAll > 0
        ? ((totalUsedAll / (totalUsedAll + totalWasteAll)) * 100).toFixed(1) : '0';

    // ── Print / PDF ───────────────────────────────────────────────────────────
    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });

        const buildBody = () => {
            let html = '';
            for (const profileName of profiles) {
                const isCombo = profileName.includes(' + ');
                const totalBarsP = optimizationData[profileName].reduce((s, g) => s + g.totalBars, 0);
                html += `<div class="profile-block">
                    <div class="profile-hdr">
                        <span>${isCombo ? '⚡ ' : '✂ '}${profileName}</span>
                        <span class="profile-count">${totalBarsP} barra${totalBarsP !== 1 ? 's' : ''} × 580 cm</span>
                    </div>`;
                for (const group of optimizationData[profileName]) {
                    html += `<div class="color-label">Color PVC: <b>${group.color}</b></div>`;
                    for (const bar of group.bars) {
                        const retal = bar.waste.toFixed(1);
                        const retalPct = ((bar.waste / 580) * 100).toFixed(1);
                        let piecesHtml = '';
                        bar.cuts.forEach((cut, ci) => {
                            const { vNum, dim, perfil } = parseCutLabel(cut.windowLabel);
                            const dimLbl = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
                            const perfilLbl = isCombo && perfil ? ` · ${perfil}` : '';
                            piecesHtml += `<div class="piece-row ${ci % 2 === 0 ? 'piece-even' : ''}">
                                <span class="piece-len">${cut.length} cm</span>
                                <span class="piece-info">${vNum}${dimLbl ? ' – ' + dimLbl : ''}${perfilLbl}</span>
                            </div>`;
                        });
                        html += `<div class="bar-card">
                            <div class="bar-title">${bar.totalBars ?? 1} barra${(bar.totalBars ?? 1) !== 1 ? 's' : ''} de 580 cm</div>
                            ${piecesHtml}
                            <div class="bar-retal">Retal: ${retal} cm (${retalPct}%)</div>
                        </div>`;
                    }
                }
                html += `</div>`;
            }
            return html;
        };

        const fullHtml = `<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8">
<title>Plan de Corte — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px 24px;background:#fff;max-width:700px;margin:0 auto}
.doc-hdr{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
.doc-title{font-size:18px;font-weight:900;color:#111}
.doc-sub{font-size:10px;color:#666;margin-top:4px}
.doc-meta{font-size:10px;color:#888;margin-top:2px}
.summary{background:#f5f5f5;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#444}
.summary b{color:#111;font-size:13px}
.profile-block{margin-bottom:18px}
.profile-hdr{font-size:13px;font-weight:700;color:#111;border-bottom:1.5px solid #111;padding-bottom:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}
.profile-count{font-size:10px;font-weight:400;color:#888}
.color-label{font-size:10px;color:#666;margin-bottom:6px;padding-left:2px}
.bar-card{border:1px solid #ddd;border-radius:6px;margin-bottom:10px;overflow:hidden}
.bar-title{background:#f0f0f0;font-size:10px;font-style:italic;color:#555;padding:5px 10px;border-bottom:1px solid #ddd}
.piece-row{display:flex;justify-content:space-between;align-items:center;padding:4px 10px;font-size:12px}
.piece-even{background:#fafafa}
.piece-len{font-weight:700;font-family:monospace;font-size:13px;min-width:80px}
.piece-info{color:#555;font-size:11px}
.bar-retal{padding:5px 10px;font-size:10px;font-style:italic;color:#888;border-top:1px solid #eee;background:#fff}
@media print{body{padding:12px 16px}.bar-card{page-break-inside:avoid}.profile-block{page-break-inside:avoid}}
</style></head><body>
<div class="doc-hdr">
  <div class="doc-title">✂ Plan de Corte</div>
  <div class="doc-sub">${projectName || 'Pedido'} &nbsp;·&nbsp; Barra estándar: 580 cm</div>
  <div class="doc-meta">${date}</div>
</div>
<div class="summary">
  Barras totales: <b>${totalBarsAll}</b> &nbsp;&nbsp;
  Piezas totales: <b>${Object.values(optimizationData).flatMap(g => g).flatMap(g => g.bars).flatMap(b => b.cuts).length}</b> &nbsp;&nbsp;
  Eficiencia: <b>${globalEff}%</b> &nbsp;&nbsp;
  Desperdicio: <b>${totalWasteAll.toFixed(1)} cm</b>
</div>
${buildBody()}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),700)}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=900,height=800');
        w.document.write(fullHtml);
        w.document.close();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start z-50 p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl flex flex-col my-4">

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <FaRuler size={14} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-gray-900 leading-tight">Plan de Corte</h2>
                            {projectName && <p className="text-xs text-gray-400 leading-tight truncate">{projectName}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!isLoading && profiles.length > 0 && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
                            >
                                <FaPrint size={11} /> Imprimir
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        >
                            <FaTimes size={13} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 min-h-[300px] max-h-[75vh] sm:max-h-[80vh]">
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
                            {/* Resumen global — scroll horizontal en pantallas muy pequeñas */}
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 sm:gap-4 text-xs text-gray-500">
                                <span>Barras: <strong className="text-gray-900 text-sm">{totalBarsAll}</strong></span>
                                <span>Piezas: <strong className="text-gray-900 text-sm">
                                    {Object.values(optimizationData).flatMap(g => g).flatMap(g => g.bars).flatMap(b => b.cuts).length}
                                </strong></span>
                                <span>Eficiencia: <strong className="text-gray-900 text-sm">{globalEff}%</strong></span>
                                <span>Retal: <strong className="text-gray-900 text-sm">{totalWasteAll.toFixed(1)} cm</strong></span>
                            </div>

                            {/* Perfiles */}
                            {profiles.map((profileName) => {
                                const isCombo = profileName.includes(' + ');
                                const totalBarsP = optimizationData[profileName].reduce((s, g) => s + g.totalBars, 0);
                                return (
                                    <div key={profileName} className="px-4 sm:px-5 py-4 border-b border-gray-100 last:border-0">

                                        {/* Nombre del perfil */}
                                        <div className="flex items-baseline justify-between gap-2 mb-3">
                                            <h3 className="text-sm font-bold text-gray-900 truncate">
                                                {isCombo ? '⚡ ' : '✂ '}{profileName}
                                            </h3>
                                            <span className="text-xs text-gray-400 flex-shrink-0">
                                                {totalBarsP} barra{totalBarsP !== 1 ? 's' : ''} × 580 cm
                                            </span>
                                        </div>

                                        {optimizationData[profileName].map((group, gi) => (
                                            <div key={gi} className="mb-3 last:mb-0">
                                                <p className="text-xs text-gray-400 mb-2">
                                                    Color PVC: <span className="font-medium text-gray-600">{group.color}</span>
                                                </p>

                                                <div className="space-y-2">
                                                    {group.bars.map((bar) => {
                                                        const retal = bar.waste.toFixed(1);
                                                        const retalPct = ((bar.waste / 580) * 100).toFixed(1);
                                                        return (
                                                            <div key={bar.barNumber} className="border border-gray-200 rounded-md overflow-hidden">
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
                                                                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border} flex-shrink-0`}>
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
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
                    <span className="text-[11px] text-gray-300">Barra estándar: 580 cm</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}