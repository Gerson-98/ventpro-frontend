// RUTA: src/components/GlassCutModal.jsx

import { useState } from 'react';
import { FaPrint, FaTimes, FaThLarge, FaList } from 'react-icons/fa';

// ─── Fills sólidos apagados, texto siempre negro — optimizados para impresión ─
const PIECE_COLORS = [
    { bg: '#C8E6C9', border: '#81C784', text: '#000000' }, // verde
    { bg: '#FFF9C4', border: '#F9A825', text: '#000000' }, // amarillo
    { bg: '#B3E5FC', border: '#4FC3F7', text: '#000000' }, // azul claro
    { bg: '#F8BBD9', border: '#F06292', text: '#000000' }, // rosa
    { bg: '#D1C4E9', border: '#9575CD', text: '#000000' }, // violeta
    { bg: '#FFE0B2', border: '#FF9800', text: '#000000' }, // naranja
    { bg: '#B2EBF2', border: '#26C6DA', text: '#000000' }, // cyan
    { bg: '#DCEDC8', border: '#AED581', text: '#000000' }, // verde claro
];

// Asignar color por etiqueta de ventana (V1, V2, etc.)
const labelColorMap = new Map();
let colorIdx = 0;
function pieceColor(label) {
    const base = (label || '').match(/V\d+/)?.[0] || label;
    if (!labelColorMap.has(base)) {
        labelColorMap.set(base, PIECE_COLORS[colorIdx % PIECE_COLORS.length]);
        colorIdx++;
    }
    return labelColorMap.get(base);
}

// ─── Una plancha con layout 2D ────────────────────────────────────────────────
function SheetLayout({ sheetIndex, sheet, sheetWidth, sheetHeight, scale }) {
    const W = sheetWidth * scale;
    const H = sheetHeight * scale;
    const COTA = 18; // ancho reservado para la cota de alto

    return (
        <div className="mb-6">
            {/* Título */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Plancha {sheetIndex + 1}
                </span>
                <span className="text-xs text-gray-400">
                    {sheet.pieces.length} pieza{sheet.pieces.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Fila: cota-alto + plancha */}
            <div className="flex items-stretch">
                {/* Cota de alto — línea roja vertical con medida */}
                <div className="flex flex-col items-center mr-1 flex-shrink-0" style={{ width: COTA, height: H }}>
                    <div className="flex-1 w-px bg-red-400" />
                    <span
                        className="text-[9px] font-bold text-red-500 my-0.5 select-none"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}
                    >
                        {sheetHeight}
                    </span>
                    <div className="flex-1 w-px bg-red-400" />
                </div>

                {/* Plancha */}
                <div
                    className="relative border-2 border-red-400 bg-gray-50 overflow-hidden flex-shrink-0"
                    style={{ width: W, height: H }}
                >
                    {/* Piezas */}
                    {sheet.pieces.map((piece, pi) => {
                        const color = pieceColor(piece.label);
                        const pw = piece.width * scale;
                        const ph = piece.height * scale;
                        const px = piece.x * scale;
                        const py = piece.y * scale;
                        return (
                            <div
                                key={pi}
                                className="absolute border overflow-hidden"
                                style={{
                                    left: px, top: py, width: pw, height: ph,
                                    background: color.bg,
                                    borderColor: color.border,
                                    borderWidth: 1.5,
                                }}
                                title={`${piece.label} — ${piece.width}×${piece.height} cm`}
                            >
                                {/* Ancho arriba, centrado horizontalmente */}
                                {pw > 35 && ph > 18 && (
                                    <span
                                        className="absolute text-[9px] font-bold leading-none select-none"
                                        style={{ color: color.text, top: 2, left: '50%', transform: 'translateX(-50%)' }}
                                    >
                                        {piece.width}
                                    </span>
                                )}
                                {/* Etiqueta en el centro absoluto */}
                                {pw > 25 && ph > 30 && (
                                    <span
                                        className="absolute text-[11px] font-black leading-none select-none"
                                        style={{ color: color.text, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                                    >
                                        {piece.label}
                                    </span>
                                )}
                                {/* Alto en la izquierda, vertical */}
                                {pw > 20 && ph > 25 && (
                                    <span
                                        className="absolute text-[8px] font-semibold select-none"
                                        style={{
                                            color: color.text,
                                            left: 2,
                                            top: '50%',
                                            writingMode: 'vertical-rl',
                                            transform: 'translateY(-50%) rotate(180deg)',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {piece.height}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {/* Desperdicios — solo texto de dimensiones, sin bordes punteados */}
                    {(sheet.wasteRects || []).map((wr, wi) => {
                        if (wr.width < 5 || wr.height < 5) return null;
                        const ww = wr.width * scale;
                        const wh = wr.height * scale;
                        if (ww < 30 || wh < 16) return null;
                        return (
                            <div
                                key={`w${wi}`}
                                className="absolute flex items-center justify-center pointer-events-none"
                                style={{ left: wr.x * scale, top: wr.y * scale, width: ww, height: wh }}
                            >
                                <span className="text-[8px] text-gray-400 select-none leading-none text-center">
                                    {Math.round(wr.width * 10) / 10}×{Math.round(wr.height * 10) / 10}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cota de ancho — debajo, alineada con la plancha */}
            <div className="flex items-center mt-0.5" style={{ width: W, marginLeft: COTA + 4 }}>
                <div className="flex-1 h-px bg-red-400" />
                <span className="text-[10px] font-bold text-red-500 px-1">{sheetWidth}</span>
                <div className="flex-1 h-px bg-red-400" />
            </div>
        </div>
    );
}


// ─── Vista de tabla (lista de piezas) ─────────────────────────────────────────
function TableView({ glassData }) {
    return (
        <div className="space-y-6">
            {Object.entries(glassData).map(([key, data]) => (
                <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                            {data.glassName}
                        </h3>
                        <span className="text-xs text-gray-400">
                            {data.planchaSize} · {data.totalPieces} pieza{data.totalPieces !== 1 ? 's' : ''} · {data.minPlanchas} plancha{data.minPlanchas !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-3 py-2 text-left text-gray-500 font-semibold">Ventana</th>
                                    <th className="px-3 py-2 text-center text-gray-500 font-semibold">Ancho (cm)</th>
                                    <th className="px-3 py-2 text-center text-gray-500 font-semibold">Alto (cm)</th>
                                    <th className="px-3 py-2 text-center text-gray-500 font-semibold">Cant.</th>
                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold">Área (cm²)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pieces.map((p, pi) => {
                                    const color = pieceColor(p.windowLabel);
                                    return (
                                        <tr key={pi} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2 font-bold" style={{ color: color.text }}>{p.windowLabel}</td>
                                            <td className="px-3 py-2 text-center font-mono">{p.width}</td>
                                            <td className="px-3 py-2 text-center font-mono">{p.height}</td>
                                            <td className="px-3 py-2 text-center font-bold">{p.quantity}</td>
                                            <td className="px-3 py-2 text-right font-mono text-gray-600">
                                                {(p.width * p.height * p.quantity).toFixed(0)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Vista visual de planchas ─────────────────────────────────────────────────
function VisualView({ glassData }) {
    // Escala: ajustar para que la plancha más grande quepa en ~420px de ancho
    const maxW = Math.max(...Object.values(glassData).map(d => d.sheetWidth || 213));
    const scale = Math.min(1.8, 420 / maxW);

    return (
        <div className="space-y-8">
            {Object.entries(glassData).map(([key, data]) => {
                if (!data.sheets || data.sheets.length === 0) return null;
                // Reset color map per glass type
                labelColorMap.clear();
                colorIdx = 0;
                return (
                    <div key={key}>
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                                {data.glassName}
                            </h3>
                            <span className="text-xs text-gray-400">
                                {data.planchaSize} · {data.minPlanchas} plancha{data.minPlanchas !== 1 ? 's' : ''} optimizada{data.minPlanchas !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-6">
                            {data.sheets.map((sheet, si) => (
                                <SheetLayout
                                    key={si}
                                    sheetIndex={si}
                                    sheet={sheet}
                                    sheetWidth={data.sheetWidth || 213}
                                    sheetHeight={data.sheetHeight || 165.8}
                                    scale={scale}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function GlassCutModal({ glassCutData = {}, isLoading, onClose, projectName }) {
    const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'table'

    const glassTypes = Object.entries(glassCutData);
    const totalPlanchas = glassTypes.reduce((s, [, v]) => s + (v.minPlanchas || 0), 0);
    const totalPieces = glassTypes.reduce((s, [, v]) => s + (v.totalPieces || 0), 0);

    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });

        // Construir SVG por plancha para el PDF
        let bodyHtml = '';
        for (const [, data] of glassTypes) {
            if (!data.sheets) continue;
            const sw = data.sheetWidth || 213;
            const sh = data.sheetHeight || 165.8;
            const pscale = 2.2;
            const W = sw * pscale;
            const H = sh * pscale;

            bodyHtml += `<div class="gblock">
                <div class="gtit">${data.glassName}
                    <span style="font-weight:400;font-size:10px;color:#666;margin-left:8px">
                        ${data.planchaSize} · ${data.totalPieces} piezas · ${data.minPlanchas} plancha${data.minPlanchas !== 1 ? 's' : ''}
                    </span>
                </div>
                <div>`;

            data.sheets.forEach((sheet, si) => {
                bodyHtml += `<div class="plancha">
                    <div style="font-size:9px;font-weight:700;color:#666;margin-bottom:3px">PLANCHA ${si + 1}</div>
                    <div style="display:flex;align-items:stretch;gap:0">
                    <div style="display:flex;flex-direction:column;align-items:center;width:16px;margin-right:3px">
                        <div style="flex:1;width:1px;background:#e53935"></div>
                        <span style="font-size:8px;font-weight:700;color:#e53935;padding:2px 0;writing-mode:vertical-rl;transform:rotate(180deg)">${sh}</span>
                        <div style="flex:1;width:1px;background:#e53935"></div>
                    </div>
                    <svg width="${W}" height="${H}" style="border:2px solid #e53935;background:#fafafa">`;

                const SVG_COLORS  = ['#C8E6C9','#FFF9C4','#B3E5FC','#F8BBD9','#D1C4E9','#FFE0B2','#B2EBF2','#DCEDC8'];
                const SVG_BORDERS = ['#81C784','#F9A825','#4FC3F7','#F06292','#9575CD','#FF9800','#26C6DA','#AED581'];

                // Mapa etiqueta→índice de color para consistencia entre piezas
                const svgColorMap = new Map();
                let svgColorIdx = 0;

                sheet.pieces.forEach((piece) => {
                    const base = (piece.label || '').match(/V\d+/)?.[0] || piece.label;
                    if (!svgColorMap.has(base)) { svgColorMap.set(base, svgColorIdx % SVG_COLORS.length); svgColorIdx++; }
                    const ci = svgColorMap.get(base);
                    const px = piece.x * pscale;
                    const py = piece.y * pscale;
                    const pw = piece.width * pscale;
                    const ph = piece.height * pscale;
                    bodyHtml += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${SVG_COLORS[ci]}" stroke="${SVG_BORDERS[ci]}" stroke-width="1.5"/>`;
                    if (pw > 30 && ph > 20) {
                        // Ancho centrado arriba
                        if (pw > 35 && ph > 18)
                            bodyHtml += `<text x="${px + pw / 2}" y="${py + 10}" text-anchor="middle" font-size="8" font-weight="700" fill="#000000">${piece.width}</text>`;
                        // Etiqueta centrada
                        bodyHtml += `<text x="${px + pw / 2}" y="${py + ph / 2 + 4}" text-anchor="middle" font-size="10" font-weight="900" fill="#000000">${piece.label}</text>`;
                        // Alto en la izquierda, rotado
                        if (pw > 20 && ph > 25)
                            bodyHtml += `<text x="${px + 8}" y="${py + ph / 2}" text-anchor="middle" font-size="8" font-weight="600" fill="#000000" transform="rotate(-90,${px + 8},${py + ph / 2})">${piece.height}</text>`;
                    }
                });

                // Desperdicios — solo texto de dimensiones, sin bordes punteados
                (sheet.wasteRects || []).forEach((wr) => {
                    if (wr.width < 5 || wr.height < 5) return;
                    const wx = wr.x * pscale, wy = wr.y * pscale;
                    const ww = wr.width * pscale, wh = wr.height * pscale;
                    if (ww < 40 || wh < 18) return;
                    bodyHtml += `<text x="${wx + ww / 2}" y="${wy + wh / 2 + 3}" text-anchor="middle" font-size="8" fill="#9e9e9e">${Math.round(wr.width * 10) / 10}×${Math.round(wr.height * 10) / 10}</text>`;
                });

                bodyHtml += `</svg></div>
                    <div style="display:flex;align-items:center;margin-top:2px;margin-left:19px">
                        <div style="flex:1;height:1px;background:#e53935"></div>
                        <span style="font-size:9px;font-weight:700;color:#e53935;padding:0 4px">${sw}</span>
                        <div style="flex:1;height:1px;background:#e53935"></div>
                    </div>
                </div>`;
            });

            bodyHtml += `</div></div>`;
        }

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Corte de Vidrio — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:18px 22px;max-width:1100px;margin:0 auto}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.htit{font-size:17px;font-weight:900}
.hsub{font-size:10px;color:#666;margin-top:2px}
.smry{display:flex;gap:22px;margin-bottom:16px;padding:6px 10px;background:#f5f5f5;border-radius:3px;width:fit-content}
.smry span{font-size:10px;color:#555} .smry b{font-size:12px;font-weight:900;color:#111;display:block}
.gblock{margin-bottom:24px}
.gtit{font-size:13px;font-weight:900;text-transform:uppercase;margin-bottom:8px;border-left:4px solid #e53935;padding-left:8px}
.plancha{margin-bottom:20px;page-break-inside:avoid;break-inside:avoid}
</style></head><body>
<div class="hdr">
  <div class="htit">CORTE DE VIDRIO — OPTIMIZADO</div>
  <div class="hsub">${projectName || 'Pedido'} · ${date}</div>
</div>
<div class="smry">
  <span>Planchas optimizadas<b>${totalPlanchas}</b></span>
  <span>Piezas totales<b>${totalPieces}</b></span>
</div>
${bodyHtml}
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=1100,height=800');
        w.document.write(html);
        w.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start z-50 overflow-y-auto p-4 sm:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col my-4 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide leading-none">
                            Optimizador de Vidrio
                        </h2>
                        {projectName && (
                            <p className="text-xs text-gray-400 leading-tight mt-0.5">{projectName}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Toggle vista */}
                        {!isLoading && glassTypes.length > 0 && (
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    onClick={() => setViewMode('visual')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'visual' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FaThLarge size={9} /> Visual
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FaList size={9} /> Lista
                                </button>
                            </div>
                        )}
                        {!isLoading && glassTypes.length > 0 && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <FaPrint size={10} /> Imprimir PDF
                            </button>
                        )}
                        <button onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            <FaTimes size={13} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto max-h-[80vh] min-h-[200px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <p className="text-sm font-medium">Optimizando corte de vidrio...</p>
                        </div>
                    ) : glassTypes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <p className="text-sm">No hay vidrios para optimizar.</p>
                        </div>
                    ) : (
                        <div className="px-6 pt-5 pb-8">
                            {/* Resumen */}
                            <div className="flex flex-wrap gap-8 mb-6 pb-5 border-b border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Planchas optimizadas</p>
                                    <p className="text-2xl font-black text-gray-900 leading-none">{totalPlanchas}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Piezas totales</p>
                                    <p className="text-2xl font-black text-gray-900 leading-none">{totalPieces}</p>
                                </div>
                            </div>

                            {viewMode === 'visual'
                                ? <VisualView glassData={glassCutData} />
                                : <TableView glassData={glassCutData} />
                            }
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end flex-shrink-0">
                    <button onClick={onClose}
                        className="px-4 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}