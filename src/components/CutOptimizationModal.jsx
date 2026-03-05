// RUTA: src/components/CutOptimizationModal.jsx

import { FaPrint, FaTimes, FaRuler } from 'react-icons/fa';

// ─── Paletas de color por serie (alternan verde / dorado como en la imagen) ───
const SERIE_PALETTES = [
    { bg: '#2d7a2d', lighter: '#3aaa3a' },   // verde bosque
    { bg: '#b8860b', lighter: '#d4a017' },   // dorado oscuro
    { bg: '#2d7a2d', lighter: '#3aaa3a' },
    { bg: '#b8860b', lighter: '#d4a017' },
    { bg: '#2d7a2d', lighter: '#3aaa3a' },
    { bg: '#b8860b', lighter: '#d4a017' },
];

// Colores para perfiles individuales (por ventana)
const WIN_BG = ['#1d6fa4', '#2d7a2d', '#7c3aed', '#b8860b', '#b91c1c', '#0e7490', '#c2410c', '#0f766e'];

function getWinBg(label) {
    const m = label.match(/V(\d+)/);
    return WIN_BG[m ? (parseInt(m[1]) - 1) % WIN_BG.length : 0];
}

function parseCutLabel(windowLabel) {
    const [base] = (windowLabel || '').split('|');
    const short = base.split(' - ')[0].trim();
    const m = short.match(/^(V\d+)\s*([AH])?$/);
    return { vNum: m?.[1] || short, dim: m?.[2] || null };
}

// "170,8 cm ALV1"  — mismo formato que la imagen del cliente
function pieceLabel(cut) {
    const { vNum, dim } = parseCutLabel(cut.windowLabel);
    const num = vNum.replace('V', '');
    const dc = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
    const len = Number.isInteger(cut.length)
        ? `${cut.length}`
        : `${cut.length}`.replace('.', ',');
    return `${len} cm ${dc}V${num}`;
}

function ordinalEs(n) {
    const w = ['PRIMER', 'SEGUNDA', 'TERCER', 'CUARTO', 'QUINTO',
        'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO'];
    return `${w[n - 1] ?? `${n}°`} SERIE DE CORTE`;
}

function wasteText(cm) {
    if (cm <= 0.4) return null;
    const v = Number.isInteger(cm) ? cm : cm.toFixed(1);
    return `${v} CM SOBRA`;
}

// ─── Una fila de barra (ranura de la máquina) ─────────────────────────────────
function BarRow({ rowLabel, cuts, waste, palette, barLength = 580 }) {
    return (
        <div className="flex items-center mb-[3px]" style={{ minHeight: 30 }}>

            {/* Etiqueta de ranura — ancho fijo, texto pequeño gris */}
            <div className="flex-shrink-0 pr-2" style={{ width: 112 }}>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-normal leading-tight">
                    {rowLabel}
                </span>
            </div>

            {/* Piezas proporcionales */}
            <div className="flex overflow-hidden rounded-[3px]" style={{ flex: 1, height: 30 }}>
                {cuts.map((cut, ci) => {
                    const pct = (cut.length / barLength) * 100;
                    const bg = ci % 2 === 0 ? palette.bg : palette.lighter;
                    return (
                        <div
                            key={ci}
                            title={pieceLabel(cut)}
                            className="flex items-center justify-center flex-shrink-0 border-r border-white/40 overflow-hidden"
                            style={{ width: `${pct}%`, minWidth: 36, background: bg, height: 30 }}
                        >
                            <span className="text-[9.5px] font-bold text-white px-1 truncate leading-none"
                                style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
                                {pieceLabel(cut)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Retal fuera de la barra */}
            <div className="flex-shrink-0 pl-3" style={{ width: 96 }}>
                {wasteText(waste) && (
                    <span className="text-[10.5px] text-gray-800 font-normal whitespace-nowrap">
                        {wasteText(waste)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Bloque de 1 serie (título + 3 filas) ────────────────────────────────────
function SerieBlock({ serie, serieIdx }) {
    const pal = SERIE_PALETTES[serieIdx % SERIE_PALETTES.length];
    const rows = ['HOJA 6.6 CM', 'HOJA 6.6', 'MOSQUITERO'];
    return (
        <div className="mb-5">
            <h4 className="text-[15px] font-black text-gray-900 uppercase tracking-wide mb-2 leading-none">
                {ordinalEs(serie.serieIndex)}
            </h4>
            {rows.map((lbl, ri) => (
                <BarRow
                    key={ri}
                    rowLabel={lbl}
                    cuts={serie.cuts}
                    waste={serie.waste}
                    palette={pal}
                />
            ))}
        </div>
    );
}

// ─── Bloque de perfil individual (no combo) ───────────────────────────────────
function StdBlock({ group }) {
    return (
        <div className="mb-2">
            <p className="text-[11px] text-gray-400 mb-3">
                Color PVC: <span className="font-semibold text-gray-600">{group.color}</span>
            </p>
            {(group.bars ?? []).map((bar, bi) => (
                <div key={bi} className="mb-4">
                    <p className="text-[10px] text-gray-400 italic mb-1">Barra {bar.barNumber} de 580 cm</p>
                    <div className="flex items-center" style={{ minHeight: 30 }}>
                        <div className="flex-shrink-0 pr-2" style={{ width: 112 }} />
                        <div className="flex overflow-hidden rounded-[3px]" style={{ flex: 1, height: 30 }}>
                            {bar.cuts.map((cut, ci) => {
                                const pct = (cut.length / 580) * 100;
                                const bg = getWinBg(cut.windowLabel);
                                return (
                                    <div
                                        key={ci}
                                        title={pieceLabel(cut)}
                                        className="flex items-center justify-center flex-shrink-0 border-r border-white/40 overflow-hidden"
                                        style={{ width: `${pct}%`, minWidth: 36, background: bg, height: 30 }}
                                    >
                                        <span className="text-[9.5px] font-bold text-white px-1 truncate leading-none"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
                                            {pieceLabel(cut)}
                                        </span>
                                    </div>
                                );
                            })}
                            {bar.waste > 0 && (
                                <div className="flex-shrink-0 bg-gray-100 border-l-2 border-dashed border-gray-300"
                                    style={{ width: `${(bar.waste / 580) * 100}%`, minWidth: 4, height: 30 }} />
                            )}
                        </div>
                        <div className="flex-shrink-0 pl-3" style={{ width: 96 }}>
                            {wasteText(bar.waste) && (
                                <span className="text-[10.5px] text-gray-800 whitespace-nowrap">
                                    {wasteText(bar.waste)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function CutOptimizationModal({ optimizationData = {}, isLoading, onClose, projectName }) {
    const profiles = Object.keys(optimizationData);

    let totalBars = 0, totalWaste = 0, totalUsed = 0;
    for (const groups of Object.values(optimizationData)) {
        for (const g of groups) {
            totalBars += g.totalBars ?? 0;
            if (g.machineSeries && g.series) {
                for (const s of g.series) { totalWaste += s.waste * 3; totalUsed += s.totalUsed * 3; }
            } else {
                for (const b of (g.bars ?? [])) { totalWaste += b.waste; totalUsed += b.totalUsed ?? (580 - b.waste); }
            }
        }
    }
    const eff = totalUsed > 0 ? ((totalUsed / (totalUsed + totalWaste)) * 100).toFixed(1) : '0';

    // ── PDF ───────────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
        let body = '';

        for (const pName of profiles) {
            const groups = optimizationData[pName];
            const isCombo = pName.includes(' + ');
            const total = groups.reduce((s, g) => s + (g.totalBars ?? 0), 0);

            body += `<div class="psec">
                <div class="phdr">${pName}<span class="pcnt">${total} barras × 580 cm</span></div>`;

            for (const group of groups) {
                if (group.machineSeries && group.series?.length > 0) {
                    body += `<div class="totrow"><span>TOTAL DE BARRAS HOJA 6.6 CM</span><b>${group.totalHojaBars} UNIDADES</b></div>
                             <div class="totrow"><span>TOTAL DE BARRAS MOSQUITERO</span><b>${group.totalCedazoBars} UNIDADES</b></div>
                             <div style="height:10px"></div>`;

                    group.series.forEach((serie, si) => {
                        const pals = ['#2d7a2d', '#b8860b', '#2d7a2d', '#b8860b', '#2d7a2d', '#b8860b'];
                        const pall = ['#3aaa3a', '#d4a017', '#3aaa3a', '#d4a017', '#3aaa3a', '#d4a017'];
                        const pb = pals[si % pals.length], pl = pall[si % pall.length];

                        body += `<div class="stitle">${ordinalEs(serie.serieIndex)}</div>`;
                        ['HOJA 6.6 CM', 'HOJA 6.6', 'MOSQUITERO'].forEach(lbl => {
                            body += `<div class="brow"><div class="rlbl">${lbl}</div><div class="bwrap">`;
                            serie.cuts.forEach((cut, ci) => {
                                const lbl2 = pieceLabel(cut);
                                const pct = ((cut.length / 580) * 100).toFixed(2);
                                const bg = ci % 2 === 0 ? pb : pl;
                                body += `<div class="pc" style="width:${pct}%;background:${bg}"><span>${lbl2}</span></div>`;
                            });
                            body += `</div>`;
                            const wt = wasteText(serie.waste);
                            if (wt) body += `<div class="wlbl">${wt}</div>`;
                            body += `</div>`;
                        });
                        body += `<div style="height:10px"></div>`;
                    });
                } else {
                    body += `<p class="clbl">Color PVC: <b>${group.color}</b></p>`;
                    (group.bars ?? []).forEach((bar) => {
                        body += `<p class="blbl">Barra ${bar.barNumber} de 580 cm</p>
                                 <div class="brow"><div class="rlbl"></div><div class="bwrap">`;
                        bar.cuts.forEach((cut, ci) => {
                            const lbl2 = pieceLabel(cut);
                            const pct = ((cut.length / 580) * 100).toFixed(2);
                            const bg = getWinBg(cut.windowLabel);
                            body += `<div class="pc" style="width:${pct}%;background:${bg}"><span>${lbl2}</span></div>`;
                        });
                        body += `</div>`;
                        const wt = wasteText(bar.waste);
                        if (wt) body += `<div class="wlbl">${wt}</div>`;
                        body += `</div><div style="height:6px"></div>`;
                    });
                }
            }
            body += `</div>`;
        }

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Plan de Corte</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:20px 24px;max-width:990px;margin:0 auto}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.htitle{font-size:17px;font-weight:900}
.hsub{font-size:10px;color:#666;margin-top:2px}
.summ{display:flex;gap:24px;margin-bottom:16px;padding:7px 12px;background:#f5f5f5;border-radius:3px}
.summ span{font-size:10px;color:#555}
.summ b{font-size:13px;font-weight:900;color:#111;display:block}
.psec{margin-bottom:20px;page-break-inside:avoid}
.phdr{font-size:13px;font-weight:900;border-bottom:1.5px solid #111;padding-bottom:3px;margin-bottom:8px;text-transform:uppercase}
.pcnt{font-size:10px;font-weight:400;color:#888;margin-left:10px}
.totrow{display:flex;gap:16px;font-size:10px;color:#555;margin-bottom:1px}
.stitle{font-size:13px;font-weight:900;text-transform:uppercase;color:#111;margin:6px 0 5px;letter-spacing:.1px}
.brow{display:flex;align-items:center;margin-bottom:3px;min-height:26px}
.rlbl{width:95px;flex-shrink:0;font-size:8.5px;color:#777;text-transform:uppercase;padding-right:6px;line-height:1.2}
.bwrap{flex:1;display:flex;height:26px;overflow:hidden}
.pc{display:flex;align-items:center;justify-content:center;height:100%;border-right:1px solid rgba(255,255,255,.45);min-width:28px;overflow:hidden;flex-shrink:0}
.pc span{font-size:7.5px;font-weight:700;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.3);padding:0 2px;white-space:nowrap}
.wlbl{width:88px;flex-shrink:0;padding-left:8px;font-size:9.5px;color:#333;white-space:nowrap}
.clbl{font-size:10px;color:#777;margin-bottom:4px}
.blbl{font-size:9px;color:#aaa;font-style:italic;margin-bottom:3px}
@media print{.psec{page-break-inside:avoid}}
</style></head><body>
<div class="hdr">
  <div class="htitle">✂ PLAN DE CORTE</div>
  <div class="hsub">${projectName || 'Pedido'} &nbsp;·&nbsp; Barra: 580 cm &nbsp;·&nbsp; ${date}</div>
</div>
<div class="summ">
  <span>Barras totales<b>${totalBars}</b></span>
  <span>Eficiencia<b>${eff}%</b></span>
  <span>Desperdicio<b>${totalWaste.toFixed(0)} cm</b></span>
</div>
${body}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),900)}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=1100,height=820');
        w.document.write(html);
        w.document.close();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start z-50 overflow-y-auto p-4 sm:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col my-4 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                            <FaRuler size={12} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide leading-tight">
                                Plan de Corte
                            </h2>
                            {projectName && (
                                <p className="text-xs text-gray-400 leading-tight">{projectName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isLoading && profiles.length > 0 && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <FaPrint size={10} /> Imprimir PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                            <FaTimes size={13} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto max-h-[80vh] min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <p className="text-sm font-medium">Calculando plan de corte...</p>
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <FaRuler size={28} className="mb-3 opacity-20" />
                            <p className="text-sm">No hay perfiles para optimizar.</p>
                        </div>
                    ) : (
                        <div className="px-6 pt-5 pb-8">

                            {/* Resumen */}
                            <div className="flex flex-wrap gap-8 mb-6 pb-5 border-b border-gray-100">
                                {[['Barras totales', totalBars], ['Eficiencia', `${eff}%`], ['Desperdicio', `${totalWaste.toFixed(0)} cm`]].map(([l, v]) => (
                                    <div key={l}>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">{l}</p>
                                        <p className="text-2xl font-black text-gray-900 leading-none">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {profiles.map((pName) => {
                                const groups = optimizationData[pName];
                                const isCombo = pName.includes(' + ');
                                const total = groups.reduce((s, g) => s + (g.totalBars ?? 0), 0);

                                return (
                                    <div key={pName} className="mb-10 last:mb-0">
                                        {/* Cabecera perfil */}
                                        <div className="flex items-baseline justify-between gap-2 mb-4 pb-2 border-b-2 border-gray-900">
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                                                {pName}
                                            </h3>
                                            <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">
                                                {total} barra{total !== 1 ? 's' : ''} × 580 cm
                                            </span>
                                        </div>

                                        {groups.map((group, gi) => {

                                            /* ═══ MODO SERIES ═══ */
                                            if (group.machineSeries && group.series?.length > 0) {
                                                return (
                                                    <div key={gi}>
                                                        {/* Totales — arriba, igual que la imagen */}
                                                        <div className="mb-5 space-y-0.5">
                                                            <div className="flex items-center gap-4 text-[11px]">
                                                                <span className="text-gray-500" style={{ minWidth: 200 }}>TOTAL DE BARRAS HOJA 6.6 CM</span>
                                                                <span className="font-black text-gray-900">{group.totalHojaBars} UNIDADES</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-[11px]">
                                                                <span className="text-gray-500" style={{ minWidth: 200 }}>TOTAL DE BARRAS MOSQUITERO</span>
                                                                <span className="font-black text-gray-900">{group.totalCedazoBars} UNIDADES</span>
                                                            </div>
                                                        </div>

                                                        {/* Series */}
                                                        {group.series.map((serie, si) => (
                                                            <SerieBlock
                                                                key={serie.serieIndex}
                                                                serie={serie}
                                                                serieIdx={si}
                                                            />
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            /* ═══ MODO ESTÁNDAR ═══ */
                                            return <StdBlock key={gi} group={group} />;
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-300 font-medium tracking-wide hidden sm:block">
                        BARRA 580 CM · 2 HOJAS + 1 MOSQUITERO POR SERIE
                    </span>
                    <button
                        onClick={onClose}
                        className="ml-auto px-4 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}