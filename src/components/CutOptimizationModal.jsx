// RUTA: src/components/CutOptimizationModal.jsx
//
// Plan de corte por SERIES DE MÁQUINA.
// La cortadora carga 3 barras simultáneamente: HOJA · HOJA · MOSQUITERO
// Las 3 reciben exactamente el mismo patrón de cortes en cada ciclo.
//
// Compatibilidad dual:
//  · Nuevo service (machineSeries:true) → usa las series ya calculadas por el backend
//  · Viejo service  (bars[] con |HOJA/|CEDAZO mezclados) → re-calcula en frontend
//    extrayendo solo las piezas |HOJA y haciendo FFD, lo que produce
//    los mismos bins que el algoritmo correcto del backend.

import { FaPrint, FaTimes, FaRuler } from 'react-icons/fa';

// ─── Paletas por serie (verde/dorado alternantes, igual que imagen cliente) ────
const PALETTES = [
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
    { bg: '#2d7a2d', alt: '#3aaa3a' },
    { bg: '#b8860b', alt: '#d4a017' },
];

// Colores por ventana para perfiles individuales (no combo)
const WIN_BG = [
    '#1d6fa4', '#2d7a2d', '#7c3aed', '#b8860b',
    '#b91c1c', '#0e7490', '#c2410c', '#0f766e',
];

function winBg(label) {
    const m = (label || '').match(/V(\d+)/);
    return WIN_BG[m ? (parseInt(m[1]) - 1) % WIN_BG.length : 0];
}

// Parsea "V1 H - 1.20x1.79m|HOJA" → { vNum:'V1', dim:'H' }
function parseLabel(raw) {
    const base = (raw || '').split('|')[0];
    const short = base.split(' - ')[0].trim();
    const m = short.match(/^(V\d+)\s*([AH])?$/);
    return { vNum: m ? m[1] : short, dim: m ? (m[2] || null) : null };
}

// "170,8 cm ALV1"
function fmt(cut) {
    const { vNum, dim } = parseLabel(cut.windowLabel);
    const num = vNum.replace('V', '');
    const dc = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
    const n = cut.length;
    const len = Number.isInteger(n) ? `${n}` : `${n}`.replace('.', ',');
    return `${len} cm ${dc}V${num}`;
}

// "7 CM SOBRA" | "6,7 CM SOBRA"
function fmtWaste(cm) {
    if (!cm || cm <= 0.4) return null;
    const v = Number.isInteger(cm) ? `${cm}` : `${parseFloat(cm.toFixed(1))}`.replace('.', ',');
    return `${v} CM SOBRA`;
}

// PRIMER / SEGUNDA / TERCER …
function ordinal(n) {
    const w = ['PRIMER', 'SEGUNDA', 'TERCER', 'CUARTO', 'QUINTO',
        'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO',
        'UNDÉCIMO', 'DUODÉCIMO'];
    return (w[n - 1] ?? `${n}°`) + ' SERIE DE CORTE';
}

// Nombre corto para etiqueta de fila: "MARCO CORREDIZO S80 4,5 CM" → "MARCO 4,5 CM"
function shortName(name) {
    return name
        .replace(/CORREDIZ[AO]\s+S\d+\s*/gi, '')
        .replace(/\bFIJO\b\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

// ─── FFD bin-packing con labels ───────────────────────────────────────────────
// Igual que el service, para re-calcular series en el frontend cuando
// el backend todavía no envía machineSeries:true
function ffd(cuts, barLen = 580) {
    const sorted = [...cuts].sort((a, b) => b.length - a.length);
    const bins = [];
    for (const cut of sorted) {
        let placed = false;
        for (const bin of bins) {
            if (cut.length <= bin.rem) {
                bin.cuts.push(cut);
                bin.rem -= cut.length;
                placed = true;
                break;
            }
        }
        if (!placed) bins.push({ cuts: [cut], rem: barLen - cut.length });
    }
    return bins; // [{ cuts:[{length,windowLabel}], rem }]
}

// ─── Transforma los datos del backend en la lista plana de series ─────────────
function buildSeries(optimizationData) {
    const items = []; // items a renderizar
    const combos = []; // totales HOJA/MOSQUITERO para mostrar aparte
    let idx = 0;

    // Primero combos, luego solos (para que las series de hoja+mosquitero vayan primero)
    const names = Object.keys(optimizationData);
    const ordered = [
        ...names.filter(n => n.includes(' + ')),
        ...names.filter(n => !n.includes(' + ')),
    ];

    for (const pName of ordered) {
        const groups = optimizationData[pName];
        const isCombo = pName.includes(' + ');

        // Para combos: extraer nombre corto de cada parte del perfil
        // "HOJA CORREDIZA S60 6,6 CM + HOJA CEDAZO" → hojaLbl="HOJA 6,6 CM", cedazoLbl="MOSQUITERO"
        const [hojaFullName = '', cedazoFullName = ''] = pName.split(' + ');
        const hojaLbl = isCombo ? shortName(hojaFullName) : '';
        const cedazoLbl = isCombo
            ? (cedazoFullName.toUpperCase().includes('CEDAZO') || cedazoFullName.toUpperCase().includes('MOSQUITERO')
                ? 'MOSQUITERO'
                : shortName(cedazoFullName))
            : '';

        for (const group of groups) {

            if (isCombo) {
                // ── Modo combo: 3 filas (HOJA / HOJA / MOSQUITERO) ───────────
                let series = [];

                if (group.machineSeries && group.series?.length > 0) {
                    // ✅ Nuevo service: ya viene con series limpias del backend
                    series = group.series.map(s => ({
                        cuts: s.cuts,
                        waste: s.waste,
                    }));
                } else if (group.bars?.length > 0) {
                    // 🔄 Viejo service: re-calcular series en el frontend con FFD
                    // Tomamos SOLO piezas que NO son cedazo (o sin tag) para hacer el mismo
                    // FFD que el backend nuevo, produciendo los bins correctos.
                    const hojaCuts = [];
                    for (const bar of group.bars) {
                        for (const cut of bar.cuts) {
                            if (!cut.windowLabel?.includes('|CEDAZO')) {
                                hojaCuts.push({
                                    length: cut.length,
                                    windowLabel: cut.windowLabel.replace(/\|HOJA$/, ''),
                                });
                            }
                        }
                    }
                    const bins = ffd(hojaCuts);
                    series = bins.map(b => ({
                        cuts: [...b.cuts].sort((a, z) => z.length - a.length),
                        waste: parseFloat(b.rem.toFixed(1)),
                    }));
                }

                const nSeries = series.length;
                // Registrar totales de este combo para mostrar en columna derecha
                combos.push({
                    hojaLabel: hojaLbl,
                    cedazoLabel: cedazoLbl,
                    totalHoja: nSeries * 2,   // 2 barras HOJA por serie de máquina
                    totalCedazo: nSeries * 1,   // 1 barra MOSQUITERO por serie
                });

                for (const s of series) {
                    idx++;
                    items.push({
                        type: 'machine',
                        idx,
                        cuts: s.cuts,
                        waste: s.waste,
                        palette: PALETTES[(idx - 1) % PALETTES.length],
                        hojaLbl,
                        cedazoLbl,
                    });
                }

            } else {
                // ── Modo individual: 1 fila por barra ────────────────────────
                const rowLbl = shortName(pName);
                for (const bar of (group.bars ?? [])) {
                    idx++;
                    items.push({
                        type: 'single',
                        idx,
                        rowLbl,
                        cuts: [...bar.cuts].sort((a, z) => z.length - a.length),
                        waste: bar.waste,
                        palette: PALETTES[(idx - 1) % PALETTES.length],
                    });
                }
            }
        }
    }

    return { items, combos };
}

// ─── Una pieza en la barra ────────────────────────────────────────────────────
function Piece({ cut, bg, minW = 38 }) {
    const label = fmt(cut);
    const pct = (cut.length / 580) * 100;
    return (
        <div
            title={label}
            className="flex items-center justify-center border-r border-white/40 overflow-hidden flex-shrink-0"
            style={{ width: `${pct}%`, minWidth: minW, height: '100%', background: bg }}
        >
            <span
                className="text-[9.5px] font-bold text-white px-1 truncate leading-none select-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,.35)' }}
            >
                {label}
            </span>
        </div>
    );
}

// ─── Una fila de barra ────────────────────────────────────────────────────────
function BarRow({ rowLabel, cuts, waste, palette, singleMode = false }) {
    return (
        <div className="flex items-center mb-[3px]" style={{ minHeight: 30 }}>
            {/* Etiqueta */}
            <div className="flex-shrink-0 pr-2" style={{ width: 115 }}>
                <span className="text-[10px] text-gray-600 uppercase tracking-wide leading-tight">
                    {rowLabel}
                </span>
            </div>

            {/* Barra proporcional */}
            <div
                className="flex overflow-hidden rounded-[2px]"
                style={{ flex: 1, height: 30 }}
            >
                {cuts.map((cut, ci) => {
                    const bg = singleMode
                        ? winBg(cut.windowLabel)
                        : ci % 2 === 0 ? palette.bg : palette.alt;
                    return <Piece key={ci} cut={cut} bg={bg} />;
                })}
            </div>

            {/* Retal */}
            <div className="flex-shrink-0 pl-3" style={{ width: 98 }}>
                {fmtWaste(waste) && (
                    <span className="text-[10.5px] text-gray-800 whitespace-nowrap">
                        {fmtWaste(waste)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Un bloque de serie (título + filas) ──────────────────────────────────────
function SerieBlock({ item }) {
    // Para combos (machine): 3 filas con el nombre real del perfil en cada una
    // hojaLbl viene del buildSeries (ej: "HOJA 6,6 CM", "MARCO 4,5 CM", etc.)
    const rows = item.type === 'machine'
        ? [
            { lbl: item.hojaLbl || 'HOJA 6,6 CM', cuts: item.cuts, waste: item.waste },
            { lbl: item.hojaLbl || 'HOJA 6,6', cuts: item.cuts, waste: item.waste },
            { lbl: item.cedazoLbl || 'MOSQUITERO', cuts: item.cuts, waste: item.waste },
        ]
        : [{ lbl: item.rowLbl, cuts: item.cuts, waste: item.waste }];

    return (
        <div className="mb-5">
            <h4 className="text-[15px] font-black text-gray-900 uppercase tracking-wide mb-2 leading-none">
                {ordinal(item.idx)}
            </h4>
            {rows.map((row, ri) => (
                <BarRow
                    key={ri}
                    rowLabel={row.lbl}
                    cuts={row.cuts}
                    waste={row.waste}
                    palette={item.palette}
                    singleMode={item.type === 'single'}
                />
            ))}
        </div>
    );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function CutOptimizationModal({
    optimizationData = {},
    isLoading,
    onClose,
    projectName,
}) {
    // Construir lista de series y totales
    const { items, combos } = buildSeries(optimizationData);

    // Métricas globales
    // totalBars = barras físicas únicas (1 por serie individual, 3 por serie de máquina)
    // Para el resumen: mostramos solo barras individuales y usamos combos[] para el desglose
    let totalBarsSingle = 0, totalWaste = 0, totalUsed = 0;
    for (const it of items) {
        const rows = it.type === 'machine' ? 3 : 1;
        totalWaste += it.waste * rows;
        totalUsed += (580 - it.waste) * rows;
        if (it.type === 'single') totalBarsSingle++;
    }
    // Barras de combo: suma de totalHoja + totalCedazo de cada combo
    const totalBarsCombo = combos.reduce((s, c) => s + c.totalHoja + c.totalCedazo, 0);
    const totalBars = totalBarsSingle + totalBarsCombo;
    const eff = totalUsed > 0
        ? ((totalUsed / (totalUsed + totalWaste)) * 100).toFixed(1)
        : '0';

    // ── PDF ───────────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT',
            { day: 'numeric', month: 'long', year: 'numeric' });

        // Construir HTML de series
        let seriesHtml = '';
        for (const it of items) {
            const rows = it.type === 'machine'
                ? [
                    { lbl: it.hojaLbl || 'HOJA 6,6 CM', cuts: it.cuts, waste: it.waste },
                    { lbl: it.hojaLbl || 'HOJA 6,6', cuts: it.cuts, waste: it.waste },
                    { lbl: it.cedazoLbl || 'MOSQUITERO', cuts: it.cuts, waste: it.waste },
                ]
                : [{ lbl: it.rowLbl, cuts: it.cuts, waste: it.waste }];

            seriesHtml += `<div class="sblk">
                <div class="stit">${ordinal(it.idx)}</div>`;

            for (const row of rows) {
                seriesHtml += `<div class="brow">
                    <div class="rlbl">${row.lbl}</div>
                    <div class="bwrp">`;
                row.cuts.forEach((cut, ci) => {
                    const lbl = fmt(cut);
                    const pct = ((cut.length / 580) * 100).toFixed(2);
                    const bg = it.type === 'single'
                        ? winBg(cut.windowLabel)
                        : ci % 2 === 0 ? it.palette.bg : it.palette.alt;
                    seriesHtml += `<div class="pc" style="width:${pct}%;background:${bg}">
                        <span>${lbl}</span></div>`;
                });
                seriesHtml += `</div>`;
                const wt = fmtWaste(row.waste);
                if (wt) seriesHtml += `<div class="wlbl">${wt}</div>`;
                seriesHtml += `</div>`;
            }
            seriesHtml += `</div><div style="height:10px"></div>`;
        }

        // Totales combo
        let totHtml = '';
        if (combos.length > 0) {
            totHtml = `<div class="totbox">`;
            for (const c of combos) {
                totHtml += `
                <div class="tr"><span>TOTAL DE BARRAS ${c.hojaLabel}</span><b>${c.totalHoja} UNIDADES</b></div>
                <div class="tr"><span>TOTAL DE BARRAS ${c.cedazoLabel}</span><b>${c.totalCedazo} UNIDADES</b></div>`;
            }
            totHtml += `</div>`;
        }

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Plan de Corte — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:18px 22px;max-width:1100px;margin:0 auto}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}
.htit{font-size:17px;font-weight:900}
.hsub{font-size:10px;color:#666;margin-top:2px}
.smry{display:flex;gap:22px;margin-bottom:14px;padding:6px 10px;background:#f5f5f5;border-radius:3px;width:fit-content}
.smry span{font-size:10px;color:#555} .smry b{font-size:12px;font-weight:900;color:#111;display:block}
.layout{display:flex;gap:36px;align-items:flex-start}
.scol{flex:1}
.tcol{flex-shrink:0}
.sblk{page-break-inside:avoid}
.stit{font-size:13px;font-weight:900;text-transform:uppercase;color:#111;margin-bottom:5px}
.brow{display:flex;align-items:center;margin-bottom:3px;min-height:26px}
.rlbl{width:90px;flex-shrink:0;font-size:8.5px;text-transform:uppercase;color:#777;padding-right:5px;line-height:1.2}
.bwrp{flex:1;display:flex;height:26px;overflow:hidden}
.pc{display:flex;align-items:center;justify-content:center;height:100%;border-right:1px solid rgba(255,255,255,.4);min-width:26px;overflow:hidden;flex-shrink:0}
.pc span{font-size:7.5px;font-weight:700;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.3);padding:0 2px;white-space:nowrap}
.wlbl{width:84px;flex-shrink:0;padding-left:7px;font-size:9.5px;color:#333;white-space:nowrap}
.totbox{border:1px solid #ddd;border-radius:4px;padding:10px 14px;background:#fafafa;min-width:210px}
.tr{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#555;margin-bottom:3px;white-space:nowrap}
.tr b{font-weight:900;color:#111}
@media print{.sblk{page-break-inside:avoid}.layout{display:flex}}
</style></head><body>
<div class="hdr">
  <div class="htit">✂ PLAN DE CORTE</div>
  <div class="hsub">${projectName || 'Pedido'} · Barra: 580 cm · ${date}</div>
</div>
<div class="smry">
  <span>Barras totales<b>${totalBars}</b></span>
  <span>Eficiencia<b>${eff}%</b></span>
  <span>Desperdicio<b>${totalWaste.toFixed(0)} cm</b></span>
</div>
<div class="layout">
  <div class="scol">${seriesHtml}</div>
  <div class="tcol">${totHtml}</div>
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

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                            <FaRuler size={12} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide leading-none">
                                Plan de Corte
                            </h2>
                            {projectName && (
                                <p className="text-xs text-gray-400 leading-tight mt-0.5">{projectName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isLoading && items.length > 0 && (
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
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <FaRuler size={28} className="mb-3 opacity-20" />
                            <p className="text-sm">No hay perfiles para optimizar.</p>
                        </div>
                    ) : (
                        <div className="px-6 pt-5 pb-8">

                            {/* Resumen global */}
                            <div className="flex flex-wrap gap-8 mb-6 pb-5 border-b border-gray-100">
                                {/* Métricas fijas */}
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
                                {/* Desglose por combo: "8 HOJA · 4 MOSQUITERO" */}
                                {combos.map((c, ci) => (
                                    <div key={ci} className="flex gap-5 border-l border-gray-200 pl-8">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">{c.hojaLabel}</p>
                                            <p className="text-2xl font-black text-gray-900 leading-none">{c.totalHoja} <span className="text-xs font-semibold text-gray-400">uds</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">{c.cedazoLabel}</p>
                                            <p className="text-2xl font-black text-gray-900 leading-none">{c.totalCedazo} <span className="text-xs font-semibold text-gray-400">uds</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Layout: series izquierda | totales derecha */}
                            <div className="flex gap-8 items-start">

                                {/* Series */}
                                <div className="flex-1 min-w-0">
                                    {items.map(item => (
                                        <SerieBlock key={item.idx} item={item} />
                                    ))}
                                </div>

                                {/* Totales combo */}
                                {combos.length > 0 && (
                                    <div className="flex-shrink-0 pt-1" style={{ minWidth: 220 }}>
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                                            {combos.map((c, ci) => (
                                                <div key={ci}>
                                                    {ci > 0 && <div className="border-t border-gray-200 pt-3" />}
                                                    <div className="flex justify-between items-baseline gap-4 text-[11px] mb-1.5">
                                                        <span className="text-gray-500 uppercase leading-tight">
                                                            Total barras<br />{c.hojaLabel}
                                                        </span>
                                                        <span className="font-black text-gray-900 text-right text-base leading-none">
                                                            {c.totalHoja}
                                                            <span className="text-[10px] font-semibold text-gray-500 ml-1">UNIDADES</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-baseline gap-4 text-[11px]">
                                                        <span className="text-gray-500 uppercase leading-tight">
                                                            Total barras<br />{c.cedazoLabel}
                                                        </span>
                                                        <span className="font-black text-gray-900 text-right text-base leading-none">
                                                            {c.totalCedazo}
                                                            <span className="text-[10px] font-semibold text-gray-500 ml-1">UNIDADES</span>
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

                {/* Footer */}
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