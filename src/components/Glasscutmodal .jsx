// RUTA: src/components/GlassCutModal.jsx

import { FaPrint, FaTimes } from 'react-icons/fa';

const GLASS_COLORS = [
    '#2563eb', '#0891b2', '#059669', '#7c3aed',
    '#dc2626', '#d97706', '#0d9488', '#6366f1',
];

function glassColor(idx) {
    return GLASS_COLORS[idx % GLASS_COLORS.length];
}

export default function GlassCutModal({ glassCutData = {}, isLoading, onClose, projectName }) {
    const glassTypes = Object.entries(glassCutData);
    const totalPlanchas = glassTypes.reduce((s, [, v]) => s + (v.minPlanchas || 0), 0);
    const totalPieces = glassTypes.reduce((s, [, v]) => s + (v.totalPieces || 0), 0);

    const handlePrint = () => {
        const date = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
        let bodyHtml = '';

        glassTypes.forEach(([, data], gi) => {
            const bg = glassColor(gi);
            bodyHtml += `<div class="gblock">
                <div class="gtit" style="border-left:4px solid ${bg};padding-left:8px">${data.glassName}
                    <span style="font-weight:400;font-size:10px;color:#666;margin-left:8px">${data.totalPieces} piezas · ${data.minPlanchas} plancha${data.minPlanchas !== 1 ? 's' : ''} mín.</span>
                </div>
                <table class="gtbl">
                    <thead><tr><th>Ventana</th><th>Ancho (cm)</th><th>Alto (cm)</th><th>Cant.</th><th>Área (cm²)</th></tr></thead>
                    <tbody>`;
            for (const p of data.pieces) {
                bodyHtml += `<tr>
                    <td>${p.windowLabel}</td>
                    <td>${p.width}</td>
                    <td>${p.height}</td>
                    <td>${p.quantity}</td>
                    <td>${(p.width * p.height * p.quantity).toFixed(0)}</td>
                </tr>`;
            }
            bodyHtml += `</tbody></table></div>`;
        });

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Corte de Vidrio — ${projectName || 'Pedido'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;padding:18px 22px;max-width:900px;margin:0 auto}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.htit{font-size:17px;font-weight:900}
.hsub{font-size:10px;color:#666;margin-top:2px}
.smry{display:flex;gap:22px;margin-bottom:16px;padding:6px 10px;background:#f5f5f5;border-radius:3px;width:fit-content}
.smry span{font-size:10px;color:#555} .smry b{font-size:12px;font-weight:900;color:#111;display:block}
.gblock{margin-bottom:18px;page-break-inside:avoid}
.gtit{font-size:13px;font-weight:900;text-transform:uppercase;margin-bottom:6px}
.gtbl{width:100%;border-collapse:collapse;font-size:10px}
.gtbl th{background:#f5f5f5;padding:4px 8px;text-align:left;font-weight:700;border-bottom:2px solid #ddd}
.gtbl td{padding:4px 8px;border-bottom:1px solid #eee}
.gtbl tr:hover td{background:#fafafa}
@media print{.gblock{page-break-inside:avoid}}
</style></head><body>
<div class="hdr">
  <div class="htit">CORTE DE VIDRIO</div>
  <div class="hsub">${projectName || 'Pedido'} · ${date}</div>
</div>
<div class="smry">
  <span>Planchas mín.<b>${totalPlanchas}</b></span>
  <span>Piezas totales<b>${totalPieces}</b></span>
</div>
${bodyHtml}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),900)}<\/script>
</body></html>`;

        const w = window.open('', '_blank', 'width=900,height=700');
        w.document.write(html);
        w.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-start z-50 overflow-y-auto p-4 sm:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col my-4 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide leading-none">
                            Corte de Vidrio
                        </h2>
                        {projectName && (
                            <p className="text-xs text-gray-400 leading-tight mt-0.5">{projectName}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
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
                            <p className="text-sm font-medium">Calculando corte de vidrio...</p>
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
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Planchas mín.</p>
                                    <p className="text-2xl font-black text-gray-900 leading-none">{totalPlanchas}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Piezas totales</p>
                                    <p className="text-2xl font-black text-gray-900 leading-none">{totalPieces}</p>
                                </div>
                            </div>

                            {/* Por tipo de vidrio */}
                            {glassTypes.map(([key, data], gi) => (
                                <div key={key} className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: glassColor(gi) }} />
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                                            {data.glassName}
                                        </h3>
                                        <span className="text-xs text-gray-400 ml-2">
                                            {data.totalPieces} pieza{data.totalPieces !== 1 ? 's' : ''} · {data.minPlanchas} plancha{data.minPlanchas !== 1 ? 's' : ''} mín.
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b-2 border-gray-200">
                                                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">Ventana</th>
                                                    <th className="px-3 py-2 text-center text-gray-500 font-semibold uppercase tracking-wide">Ancho (cm)</th>
                                                    <th className="px-3 py-2 text-center text-gray-500 font-semibold uppercase tracking-wide">Alto (cm)</th>
                                                    <th className="px-3 py-2 text-center text-gray-500 font-semibold uppercase tracking-wide">Cant.</th>
                                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase tracking-wide">Área (cm²)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.pieces.map((p, pi) => (
                                                    <tr key={pi} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="px-3 py-2 font-bold" style={{ color: glassColor(gi) }}>{p.windowLabel}</td>
                                                        <td className="px-3 py-2 text-center font-mono">{p.width}</td>
                                                        <td className="px-3 py-2 text-center font-mono">{p.height}</td>
                                                        <td className="px-3 py-2 text-center font-bold">{p.quantity}</td>
                                                        <td className="px-3 py-2 text-right font-mono text-gray-600">{(p.width * p.height * p.quantity).toFixed(0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}