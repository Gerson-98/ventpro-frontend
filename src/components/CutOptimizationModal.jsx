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

// ─── Paletas por serie — colores pastel claros, aptos para impresión ──────────
const PALETTES = [
    { bg: '#c8e6c9', alt: '#a5d6a7' },  // verde claro
    { bg: '#fff9c4', alt: '#fff176' },  // amarillo claro
    { bg: '#c8e6c9', alt: '#a5d6a7' },
    { bg: '#fff9c4', alt: '#fff176' },
    { bg: '#c8e6c9', alt: '#a5d6a7' },
    { bg: '#fff9c4', alt: '#fff176' },
    { bg: '#c8e6c9', alt: '#a5d6a7' },
    { bg: '#fff9c4', alt: '#fff176' },
];

// Colores pastel por ventana para perfiles individuales
const WIN_BG = [
    '#bbdefb', // azul claro
    '#c8e6c9', // verde claro
    '#e1bee7', // violeta claro
    '#fff9c4', // amarillo claro
    '#ffcdd2', // rojo/rosa claro
    '#b2ebf2', // cyan claro
    '#ffe0b2', // naranja claro
    '#b2dfdb', // teal claro
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
    return `${n}° SERIE DE CORTE`;
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

    // Orden: primero perfiles individuales (MARCO, etc.), luego combos (HOJA+MOSQUITERO)
    const names = Object.keys(optimizationData);
    const ordered = [
        ...names.filter(n => !n.includes(' + ')),
        ...names.filter(n => n.includes(' + ')),
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

        // Reiniciar contador de serie para cada grupo de perfil
        let groupIdx = 0;

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
                combos.push({
                    hojaLabel: hojaLbl,
                    cedazoLabel: cedazoLbl,
                    totalHoja: nSeries * 2,
                    totalCedazo: nSeries * 1,
                });

                for (const s of series) {
                    idx++;
                    groupIdx++;
                    items.push({
                        type: 'machine',
                        idx,
                        groupIdx,
                        groupName: `${hojaLbl} + ${cedazoLbl}`,
                        cuts: s.cuts,
                        waste: s.waste,
                        palette: PALETTES[(groupIdx - 1) % PALETTES.length],
                        hojaLbl,
                        cedazoLbl,
                    });
                }

            } else {
                // ── Modo individual: 1 fila por barra ────────────────────────
                const rowLbl = shortName(pName);
                for (const bar of (group.bars ?? [])) {
                    idx++;
                    groupIdx++;
                    items.push({
                        type: 'single',
                        idx,
                        groupIdx,
                        groupName: rowLbl,
                        rowLbl,
                        cuts: [...bar.cuts].sort((a, z) => z.length - a.length),
                        waste: bar.waste,
                        palette: PALETTES[(groupIdx - 1) % PALETTES.length],
                    });
                }
            }
        }
    }

    return { items, combos };
}

// ─── Una pieza en la barra ────────────────────────────────────────────────────
function Piece({ cut, bg, minW = 42 }) {
    const { vNum, dim } = parseLabel(cut.windowLabel);
    const num = vNum.replace('V', '');
    const dc = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
    const n = cut.length;
    const len = Number.isInteger(n) ? `${n}` : `${n}`.replace('.', ',');
    const pct = (cut.length / 580) * 100;

    return (
        <div
            title={fmt(cut)}
            className="flex flex-col items-center justify-center border-r border-white/60 overflow-hidden flex-shrink-0"
            style={{ width: `${pct}%`, minWidth: minW, height: '100%', background: bg }}
        >
            <span className="text-[12px] font-black text-gray-800 leading-none select-none">
                {len}
            </span>
            <span className="text-[10px] font-semibold text-gray-600 leading-none mt-0.5 select-none">
                {dc}V{num}
            </span>
        </div>
    );
}

// ─── Una fila de barra ────────────────────────────────────────────────────────
const BAR_H = 50;

function BarRow({ rowLabel, cuts, waste, palette, singleMode = false }) {
    const wasteLabel = fmtWaste(waste);
    const wastePct = ((waste || 0) / 580) * 100;

    return (
        <div className="mb-1">
            <div className="flex items-center" style={{ minHeight: BAR_H }}>
                {/* Etiqueta izquierda */}
                <div className="flex-shrink-0 pr-2" style={{ width: 120 }}>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
                        {rowLabel}
                    </span>
                </div>

                {/* Barra proporcional */}
                <div
                    className="flex overflow-hidden border border-gray-300"
                    style={{ flex: 1, height: BAR_H }}
                >
                    {cuts.map((cut, ci) => {
                        const bg = singleMode
                            ? winBg(cut.windowLabel)
                            : ci % 2 === 0 ? palette.bg : palette.alt;
                        return <Piece key={ci} cut={cut} bg={bg} />;
                    })}
                    {/* Zona de sobra */}
                    {wastePct > 0.5 && (
                        <div
                            className="flex items-center justify-center border-l border-dashed border-gray-400 bg-white flex-shrink-0"
                            style={{ width: `${wastePct}%`, height: '100%' }}
                        >
                            {wasteLabel && (
                                <span
                                    className="text-[10px] font-semibold text-gray-400 select-none"
                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                    {wasteLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Dimensión total */}
                <div className="flex-shrink-0 pl-2" style={{ width: 50 }}>
                    <span
                        className="text-[10px] font-bold text-red-500 select-none"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                        {BAR_H}
                    </span>
                </div>
            </div>

            {/* Línea roja con "580" debajo */}
            <div className="flex items-center ml-[120px] mr-[50px] mt-0.5">
                <div className="flex-1 h-px bg-red-400" />
                <span className="text-[10px] font-bold text-red-500 px-1.5">580</span>
                <div className="flex-1 h-px bg-red-400" />
            </div>
        </div>
    );
}

// ─── Un bloque de serie (título + filas) ──────────────────────────────────────
function SerieBlock({ item, showGroupHeader }) {
    // Para combos (machine): 3 filas con el nombre real del perfil en cada una
    const rows = item.type === 'machine'
        ? [
            { lbl: item.hojaLbl || 'HOJA 6,6 CM', cuts: item.cuts, waste: item.waste },
            { lbl: item.hojaLbl || 'HOJA 6,6', cuts: item.cuts, waste: item.waste },
            { lbl: item.cedazoLbl || 'MOSQUITERO', cuts: item.cuts, waste: item.waste },
        ]
        : [{ lbl: item.rowLbl, cuts: item.cuts, waste: item.waste }];

    return (
        <>
            {showGroupHeader && (
                <div className="mt-6 mb-3 pb-2 border-b-2 border-gray-800 first:mt-0">
                    <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest">
                        {item.groupName}
                    </span>
                </div>
            )}
            <div className="mb-5">
                <h4 className="text-[15px] font-black text-gray-900 uppercase tracking-wide mb-2 leading-none">
                    {ordinal(item.groupIdx)}
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

        // Construir HTML de series con separadores de grupo
        let seriesHtml = '';
        let prevGroup = null;
        for (const it of items) {
            // Separador de grupo
            if (it.groupName !== prevGroup) {
                if (prevGroup !== null) seriesHtml += `<div style="height:6px"></div>`;
                seriesHtml += `<div style="margin-top:12px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #222;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#222">${it.groupName}</div>`;
                prevGroup = it.groupName;
            }

            const rows = it.type === 'machine'
                ? [
                    { lbl: it.hojaLbl || 'HOJA 6,6 CM', cuts: it.cuts, waste: it.waste },
                    { lbl: it.hojaLbl || 'HOJA 6,6', cuts: it.cuts, waste: it.waste },
                    { lbl: it.cedazoLbl || 'MOSQUITERO', cuts: it.cuts, waste: it.waste },
                ]
                : [{ lbl: it.rowLbl, cuts: it.cuts, waste: it.waste }];

            seriesHtml += `<div class="sblk">
                <div class="stit">${ordinal(it.groupIdx)}</div>`;

            for (const row of rows) {
                const wastePct = ((row.waste || 0) / 580 * 100).toFixed(2);
                seriesHtml += `<div class="brow">
                    <div class="rlbl">${row.lbl}</div>
                    <div class="bwrp">`;
                row.cuts.forEach((cut, ci) => {
                    const { vNum, dim } = parseLabel(cut.windowLabel);
                    const num = vNum.replace('V', '');
                    const dc = dim === 'A' ? 'AN' : dim === 'H' ? 'AL' : '';
                    const n = cut.length;
                    const len = Number.isInteger(n) ? `${n}` : `${n}`.replace('.', ',');
                    const pct = ((cut.length / 580) * 100).toFixed(2);
                    const bg = it.type === 'single'
                        ? winBg(cut.windowLabel)
                        : ci % 2 === 0 ? it.palette.bg : it.palette.alt;
                    seriesHtml += `<div class="pc" style="width:${pct}%;background:${bg}">
                        <span class="top">${len}</span>
                        <span class="bot">${dc}V${num}</span></div>`;
                });
                // Zona de sobra
                if (parseFloat(wastePct) > 0.5) {
                    const wt = fmtWaste(row.waste);
                    seriesHtml += `<div class="pc waste" style="width:${wastePct}%"><span>${wt || ''}</span></div>`;
                }
                seriesHtml += `</div>
                    <div class="dim"><span>50</span></div>
                </div>
                <div class="ruler"><div class="ruler-line"></div><span class="ruler-lbl">580</span><div class="ruler-line"></div></div>`;
                seriesHtml += `</div>`;
            }
            seriesHtml += `</div><div style="height:10px"></div>`;
        }

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Plan de Corte — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:18px 22px;max-width:1100px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pc{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}
.htit{font-size:17px;font-weight:900}
.hsub{font-size:10px;color:#666;margin-top:2px}
.smry{display:flex;gap:22px;margin-bottom:14px;padding:6px 10px;background:#f5f5f5;border-radius:3px;width:fit-content}
.smry span{font-size:10px;color:#555} .smry b{font-size:12px;font-weight:900;color:#111;display:block}
.sblk{page-break-inside:avoid}
.stit{font-size:13px;font-weight:900;text-transform:uppercase;color:#111;margin-bottom:6px}
.brow{display:flex;align-items:stretch;margin-bottom:2px}
.rlbl{width:90px;flex-shrink:0;font-size:9px;text-transform:uppercase;color:#666;padding-right:6px;display:flex;align-items:center;font-weight:600}
.bwrp{flex:1;display:flex;height:50px;border:1px solid #ccc;overflow:hidden}
.pc{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;border-right:1px solid rgba(255,255,255,.6);min-width:30px;overflow:hidden;flex-shrink:0}
.pc .top{font-size:12px;font-weight:900;color:#333;line-height:1}
.pc .bot{font-size:10px;font-weight:600;color:#555;line-height:1;margin-top:2px}
.pc.waste{background:#fff!important;border-left:1px dashed #aaa;flex:1}
.pc.waste span{font-size:9px;color:#aaa;writing-mode:vertical-rl;transform:rotate(180deg)}
.dim{width:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding-left:4px}
.dim span{font-size:10px;font-weight:700;color:#e53935;writing-mode:vertical-rl;transform:rotate(180deg)}
.ruler{display:flex;align-items:center;margin-left:90px;margin-right:36px;margin-top:2px;margin-bottom:8px}
.ruler-line{flex:1;height:1px;background:#e53935}
.ruler-lbl{font-size:10px;font-weight:700;color:#e53935;padding:0 5px}
@media print{.sblk{page-break-inside:avoid}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
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
<div>${seriesHtml}</div>
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

                            {/* Series con separadores por grupo */}
                            <div>
                                {items.map((item, i) => {
                                    const prevGroup = i > 0 ? items[i - 1].groupName : null;
                                    const showGroupHeader = item.groupName !== prevGroup;
                                    return (
                                        <SerieBlock
                                            key={item.idx}
                                            item={item}
                                            showGroupHeader={showGroupHeader}
                                        />
                                    );
                                })}
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