// RUTA: src/components/CutOptimizationModal.jsx
//
// Layout exacto según imagen del cliente:
//  - SIN cabeceras de sección por perfil
//  - Todo el documento = lista continua de series de corte
//  - Cada serie: título "PRIMER SERIE DE CORTE" + N filas
//  - Cada fila: [nombre del perfil] [barra proporcional] [X CM SOBRA]
//  - Para combo (HOJA+MOSQUITERO): 3 filas con el mismo patrón de cortes
//  - Para perfil solo: 1 fila por barra
//  - Totales (HOJA / MOSQUITERO) a la derecha del bloque de series

import { FaPrint, FaTimes, FaRuler } from 'react-icons/fa';

// ─── Paletas alternantes por serie (verde / dorado como en la imagen) ─────────
const SERIE_PALETTES = [
    { bg: '#2d7a2d', alt: '#3aaa3a' },   // verde bosque
    { bg: '#b8860b', alt: '#d4a017' },   // dorado oscuro
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
];

// Para perfiles individuales — colores por nº de ventana
const WIN_COLORS = ['#1d6fa4', '#2d7a2d', '#7c3aed', '#b8860b', '#b91c1c', '#0e7490', '#c2410c', '#0f766e'];

function getWinBg(label) {
    const m = label.match(/V(\d+)/);
    return WIN_COLORS[m ? (parseInt(m[1]) - 1) % WIN_COLORS.length : 0];
}

function parseCutLabel(raw) {
    const base = (raw || '').split('|')[0];
    const short = base.split(' - ')[0].trim();
    const m = short.match(/^(V\d+)\s*([AH])?$/);
    return { vNum: m ? m[1] : short, dim: m ? (m[2] || null) : null };
}

// "170,8 cm ALV1" — formato idéntico al de la imagen
function fmtPiece(cut) {
    const { vNum, dim } = parseCutLabel(cut.windowLabel);
    const num = vNum.replace('V', '');
    const dc = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
    const n = cut.length;
    const len = Number.isInteger(n) ? `${n}` : `${n}`.replace('.', ',');
    return `${len} cm ${dc}V${num}`;
}

// "7 CM SOBRA" / "6,7 CM SOBRA"
function fmtWaste(cm) {
    if (cm <= 0.4) return null;
    const v = Number.isInteger(cm) ? `${cm}` : `${cm.toFixed(1)}`.replace('.', ',');
    return `${v} CM SOBRA`;
}

// PRIMER / SEGUNDA / TERCER …
function ordinalEs(n) {
    const w = ['PRIMER', 'SEGUNDA', 'TERCER', 'CUARTO', 'QUINTO',
        'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO',
        'UNDÉCIMO', 'DUODÉCIMO'];
    return (w[n - 1] ?? `${n}°`) + ' SERIE DE CORTE';
}

// Nombre corto para la etiqueta de fila (perfil individual)
// "MARCO CORREDIZO S80 4,5 CM" → "MARCO 4,5 CM"
// "HOJA CORREDIZA S60 6,6 CM"  → "HOJA 6,6 CM"
function shortProfileName(name) {
    return name
        .replace(/CORREDIZ[AO]\s+S\d+\s*/i, '')
        .replace(/\bFIJO\b\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

// ─── Una fila de perfil dentro de una serie ───────────────────────────────────
// singleMode=true → colores por ventana (perfiles individuales)
// singleMode=false → paleta verde/dorado alternante (combos)
function ProfileRow({ rowLabel, cuts, waste, palette, singleMode = false, barLength = 580 }) {
    return (
        <div className="flex items-center mb-[3px]" style={{ minHeight: 30 }}>
            {/* Etiqueta perfil */}
            <div className="flex-shrink-0 pr-3" style={{ width: 118 }}>
                <span className="text-[10px] text-gray-600 uppercase tracking-wide font-normal leading-tight">
                    {rowLabel}
                </span>
            </div>

            {/* Barra proporcional */}
            <div className="flex overflow-hidden rounded-[3px] flex-shrink-0"
                style={{ flex: 1, height: 30 }}>
                {cuts.map((cut, ci) => {
                    const pct = (cut.length / barLength) * 100;
                    const bg = singleMode
                        ? getWinBg(cut.windowLabel)
                        : (ci % 2 === 0 ? palette.bg : palette.alt);
                    return (
                        <div
                            key={ci}
                            title={fmtPiece(cut)}
                            className="flex items-center justify-center border-r border-white/40 overflow-hidden flex-shrink-0"
                            style={{ width: `${pct}%`, minWidth: 38, background: bg, height: 30 }}
                        >
                            <span className="text-[9.5px] font-bold text-white px-1 truncate leading-none"
                                style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
                                {fmtPiece(cut)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Retal fuera */}
            <div className="flex-shrink-0 pl-3" style={{ width: 100 }}>
                {fmtWaste(waste) && (
                    <span className="text-[10.5px] text-gray-800 font-normal whitespace-nowrap">
                        {fmtWaste(waste)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Construye la lista plana de "series" a renderizar ────────────────────────
// Recibe optimizationData y devuelve array de items:
//   { type:'machine', serieIndex, cuts, waste, hojaLabel, cedazoLabel, palette }
//   { type:'single',  serieIndex, rowLabel, cuts, waste, palette }
// También extrae los totales combo separados para mostrarlos aparte.
function buildSeriesList(optimizationData) {
    const series = [];
    const combos = []; // { hojaLabel, cedazoLabel, totalHoja, totalCedazo }
    let serieCounter = 0;

    // Orden: primero combos (hoja+mosquitero), luego individuales
    // Para que el orden visual coincida con la imagen
    const profileNames = Object.keys(optimizationData);
    const comboNames = profileNames.filter(n => n.includes(' + '));
    const soloNames = profileNames.filter(n => !n.includes(' + '));
    const ordered = [...comboNames, ...soloNames];

    for (const pName of ordered) {
        const groups = optimizationData[pName];
        const isCombo = pName.includes(' + ');

        for (const group of groups) {
            if (isCombo && group.machineSeries && group.series?.length > 0) {
                // ── Series de máquina (HOJA + MOSQUITERO) ────────────────────
                // Derivar etiquetas de fila a partir del nombre del perfil
                const parts = pName.split(' + ');
                const hojaFull = parts[0] || 'HOJA';
                const cedazoFull = parts[1] || 'MOSQUITERO';
                const hojaShort = shortProfileName(hojaFull);   // "HOJA 6,6 CM"
                const cedazoShort = cedazoFull.toUpperCase().includes('CEDAZO')
                    ? 'MOSQUITERO'
                    : shortProfileName(cedazoFull);

                combos.push({
                    hojaLabel: hojaShort,
                    cedazoLabel: cedazoShort,
                    totalHoja: group.totalHojaBars,
                    totalCedazo: group.totalCedazoBars,
                });

                for (const serie of group.series) {
                    serieCounter++;
                    const palIdx = (serieCounter - 1) % SERIE_PALETTES.length;
                    series.push({
                        type: 'machine',
                        serieIndex: serieCounter,
                        cuts: serie.cuts,
                        waste: serie.waste,
                        hojaLabel: hojaShort,
                        cedazoLabel: cedazoShort,
                        palette: SERIE_PALETTES[palIdx],
                    });
                }

            } else {
                // ── Barras individuales (un perfil, una fila por barra) ───────
                const rowLabel = shortProfileName(pName);
                for (const bar of (group.bars ?? [])) {
                    serieCounter++;
                    const palIdx = (serieCounter - 1) % SERIE_PALETTES.length;
                    series.push({
                        type: 'single',
                        serieIndex: serieCounter,
                        rowLabel,
                        cuts: bar.cuts,
                        waste: bar.waste,
                        palette: SERIE_PALETTES[palIdx],
                    });
                }
            }
        }
    }

    return { series, combos };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function CutOptimizationModal({
    optimizationData = {},
    isLoading,
    onClose,
    projectName,
}) {
    const profiles = Object.keys(optimizationData);

    // ── Métricas globales ─────────────────────────────────────────────────────
    let totalBars = 0, totalWaste = 0, totalUsed = 0;
    for (const groups of Object.values(optimizationData)) {
        for (const g of groups) {
            totalBars += g.totalBars ?? 0;
            if (g.machineSeries && g.series) {
                for (const s of g.series) { totalWaste += s.waste * 3; totalUsed += s.totalUsed * 3; }
            } else {
                for (const b of (g.bars ?? [])) {
                    totalWaste += b.waste;
                    totalUsed += b.totalUsed ?? (580 - b.waste);
                }
            }
        }
    }
    const eff = totalUsed > 0
        ? ((totalUsed / (totalUsed + totalWaste)) * 100).toFixed(1)
        : '0';

    const { series: allSeries, combos } = buildSeriesList(optimizationData);

    // ── PDF ───────────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT',
            { day: 'numeric', month: 'long', year: 'numeric' });

        // Bloque de totales combo (lado derecho en la imagen, aquí al final del PDF)
        let combosHtml = '';
        if (combos.length > 0) {
            combosHtml = `<div class="combo-totals">`;
            for (const c of combos) {
                combosHtml += `
                <div class="tot-row">
                    <span class="tot-lbl">TOTAL DE BARRAS ${c.hojaLabel}</span>
                    <span class="tot-val">${c.totalHoja} UNIDADES</span>
                </div>
                <div class="tot-row">
                    <span class="tot-lbl">TOTAL DE BARRAS ${c.cedazoLabel}</span>
                    <span class="tot-val">${c.totalCedazo} UNIDADES</span>
                </div>`;
            }
            combosHtml += `</div>`;
        }

        let seriesHtml = '';
        for (const item of allSeries) {
            const pb = item.palette.bg, pa = item.palette.alt;
            seriesHtml += `<div class="serie-block">
                <div class="stitle">${ordinalEs(item.serieIndex)}</div>`;

            const rows = item.type === 'machine'
                ? [
                    { lbl: item.hojaLabel + ' 6.6 CM', cuts: item.cuts, waste: item.waste },
                    { lbl: item.hojaLabel, cuts: item.cuts, waste: item.waste },
                    { lbl: item.cedazoLabel, cuts: item.cuts, waste: item.waste },
                ]
                : [{ lbl: item.rowLabel, cuts: item.cuts, waste: item.waste }];

            for (const row of rows) {
                seriesHtml += `<div class="brow">
                    <div class="rlbl">${row.lbl}</div>
                    <div class="bwrap">`;
                row.cuts.forEach((cut, ci) => {
                    const lbl = fmtPiece(cut);
                    const pct = ((cut.length / 580) * 100).toFixed(2);
                    const bg = item.type === 'single'
                        ? getWinBg(cut.windowLabel)
                        : (ci % 2 === 0 ? pb : pa);
                    seriesHtml += `<div class="pc" style="width:${pct}%;background:${bg}"><span>${lbl}</span></div>`;
                });
                seriesHtml += `</div>`;
                const wt = fmtWaste(row.waste);
                if (wt) seriesHtml += `<div class="wlbl">${wt}</div>`;
                seriesHtml += `</div>`;
            }
            seriesHtml += `</div><div style="height:8px"></div>`;
        }

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Plan de Corte — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:20px 24px;max-width:1100px;margin:0 auto}
.page-layout{display:flex;gap:40px;align-items:flex-start}
.series-col{flex:1}
.totals-col{flex-shrink:0;padding-top:4px}
.doc-hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.doc-title{font-size:17px;font-weight:900}
.doc-sub{font-size:10px;color:#666;margin-top:2px}
.summ{display:flex;gap:24px;margin-bottom:16px;padding:7px 12px;background:#f5f5f5;border-radius:3px;width:fit-content}
.summ span{font-size:10px;color:#555}
.summ b{font-size:13px;font-weight:900;color:#111;display:block}
.serie-block{margin-bottom:4px;page-break-inside:avoid}
.stitle{font-size:13px;font-weight:900;text-transform:uppercase;color:#111;margin-bottom:5px;letter-spacing:.1px}
.brow{display:flex;align-items:center;margin-bottom:3px;min-height:26px}
.rlbl{width:95px;flex-shrink:0;font-size:8.5px;color:#777;text-transform:uppercase;padding-right:6px;line-height:1.2}
.bwrap{flex:1;display:flex;height:26px;overflow:hidden}
.pc{display:flex;align-items:center;justify-content:center;height:100%;border-right:1px solid rgba(255,255,255,.45);min-width:28px;overflow:hidden;flex-shrink:0}
.pc span{font-size:7.5px;font-weight:700;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.3);padding:0 2px;white-space:nowrap}
.wlbl{width:88px;flex-shrink:0;padding-left:8px;font-size:9.5px;color:#333;white-space:nowrap}
.combo-totals{background:#fafafa;border:1px solid #eee;border-radius:4px;padding:10px 14px;min-width:220px}
.tot-row{display:flex;justify-content:space-between;gap:16px;font-size:10px;color:#555;margin-bottom:3px;white-space:nowrap}
.tot-lbl{font-size:10px}
.tot-val{font-weight:900;color:#111}
@media print{.serie-block{page-break-inside:avoid}.page-layout{display:flex}}
</style></head><body>
<div class="doc-hdr">
  <div class="doc-title">✂ PLAN DE CORTE</div>
  <div class="doc-sub">${projectName || 'Pedido'} &nbsp;·&nbsp; Barra: 580 cm &nbsp;·&nbsp; ${date}</div>
</div>
<div class="summ">
  <span>Barras totales<b>${totalBars}</b></span>
  <span>Eficiencia<b>${eff}%</b></span>
  <span>Desperdicio<b>${totalWaste.toFixed(0)} cm</b></span>
</div>
<div class="page-layout">
  <div class="series-col">${seriesHtml}</div>
  <div class="totals-col">${combosHtml}</div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),900)}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=1200,height=860');
        w.document.write(html);
        w.document.close();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start z-50 overflow-y-auto p-4 sm:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col my-4 overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
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
                        {!isLoading && allSeries.length > 0 && (
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

                {/* ── Body ── */}
                <div className="overflow-y-auto max-h-[80vh] min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <p className="text-sm font-medium">Calculando plan de corte...</p>
                        </div>
                    ) : allSeries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <FaRuler size={28} className="mb-3 opacity-20" />
                            <p className="text-sm">No hay perfiles para optimizar.</p>
                        </div>
                    ) : (
                        <div className="px-6 pt-5 pb-8">

                            {/* Resumen */}
                            <div className="flex flex-wrap gap-8 mb-6 pb-5 border-b border-gray-100">
                                {[
                                    ['Barras totales', totalBars],
                                    ['Eficiencia', `${eff}%`],
                                    ['Desperdicio', `${totalWaste.toFixed(0)} cm`],
                                ].map(([l, v]) => (
                                    <div key={l}>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">{l}</p>
                                        <p className="text-2xl font-black text-gray-900 leading-none">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Layout: series a la izquierda, totales a la derecha */}
                            <div className="flex gap-8 items-start">

                                {/* ── Columna de series ── */}
                                <div className="flex-1 min-w-0">
                                    {allSeries.map((item) => {
                                        const rows = item.type === 'machine'
                                            ? [
                                                { lbl: `${item.hojaLabel} 6.6 CM`, cuts: item.cuts, waste: item.waste },
                                                { lbl: item.hojaLabel, cuts: item.cuts, waste: item.waste },
                                                { lbl: item.cedazoLabel, cuts: item.cuts, waste: item.waste },
                                            ]
                                            : [{ lbl: item.rowLabel, cuts: item.cuts, waste: item.waste }];

                                        return (
                                            <div key={item.serieIndex} className="mb-5">
                                                {/* Título de la serie */}
                                                <h4 className="text-[15px] font-black text-gray-900 uppercase tracking-wide mb-2 leading-none">
                                                    {ordinalEs(item.serieIndex)}
                                                </h4>

                                                {/* Filas de perfil */}
                                                {rows.map((row, ri) => (
                                                    <ProfileRow
                                                        key={ri}
                                                        rowLabel={row.lbl}
                                                        cuts={row.cuts}
                                                        waste={row.waste}
                                                        palette={item.type === 'single'
                                                            ? null
                                                            : item.palette}
                                                        singleMode={item.type === 'single'}
                                                        serieIdx={item.serieIndex - 1}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Columna de totales combo ── */}
                                {combos.length > 0 && (
                                    <div className="flex-shrink-0 pt-1" style={{ minWidth: 220 }}>
                                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2">
                                            {combos.map((c, ci) => (
                                                <div key={ci} className="space-y-1.5">
                                                    {ci > 0 && <div className="border-t border-gray-200 pt-2" />}
                                                    <div className="flex justify-between gap-6 text-[11px]">
                                                        <span className="text-gray-500 leading-tight">
                                                            TOTAL DE BARRAS<br />{c.hojaLabel}
                                                        </span>
                                                        <span className="font-black text-gray-900 text-right whitespace-nowrap">
                                                            {c.totalHoja}<br />UNIDADES
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-6 text-[11px]">
                                                        <span className="text-gray-500 leading-tight">
                                                            TOTAL DE BARRAS<br />{c.cedazoLabel}
                                                        </span>
                                                        <span className="font-black text-gray-900 text-right whitespace-nowrap">
                                                            {c.totalCedazo}<br />UNIDADES
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
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