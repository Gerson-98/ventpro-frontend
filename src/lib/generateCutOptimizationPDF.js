// src/lib/generateCutOptimizationPDF.js
//
// PDF para optimización global de cortes multi-pedido.
// Comparte estilo con generateMaterialsPDF.js.
// Cada ventana se identifica con un V# + el proyecto al que pertenece.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export async function generateCutOptimizationPDF({ optimization, windows, orders }) {
    const toastId = toast.loading('Generando PDF...');
    await new Promise((r) => setTimeout(r, 50));
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = { left: 15, right: 15, top: 15 };

        // ── Header ──
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageW, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('VentPro', margin.left, 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(219, 234, 254);
        doc.text('Plan de Corte Consolidado (Optimización Global)', margin.left, 17);
        doc.setFontSize(8);
        const dateStr = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(dateStr, pageW - margin.right, 17, { align: 'right' });

        let currentY = 30;

        // ── Proyectos incluidos ──
        const projectsLabel = (orders || []).map((o) => o.project).join(' · ') || '—';
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin.left, currentY, pageW - margin.left - margin.right, 16, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('PROYECTOS INCLUIDOS', margin.left + 4, currentY + 6);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(projectsLabel.length > 110 ? projectsLabel.slice(0, 107) + '...' : projectsLabel, margin.left + 4, currentY + 13);
        currentY += 22;

        // ── Listado de ventanas ──
        doc.setFillColor(59, 130, 246);
        doc.rect(margin.left, currentY, 3, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('Ventanas incluidas', margin.left + 6, currentY + 5.5);
        currentY += 9;

        autoTable(doc, {
            startY: currentY,
            head: [['Ref', 'Proyecto', 'Tipo', 'Color PVC', 'Vidrio', 'Dimensiones', 'Cant', 'Mosq.']],
            body: (windows || []).map((w) => [
                w.label,
                w.project,
                w.windowTypeName,
                w.pvcColor,
                w.glassColor,
                `${Number(w.width_cm).toFixed(1)} x ${Number(w.height_cm).toFixed(1)} cm`,
                String(w.quantity),
                w.hasMosquitero ? 'SI' : 'NO',
            ]),
            margin: { left: margin.left, right: margin.right },
            styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.1 },
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
                1: { cellWidth: 38 },
                2: { cellWidth: 32 },
                3: { cellWidth: 20 },
                4: { cellWidth: 22 },
                5: { halign: 'center', cellWidth: 26 },
                6: { halign: 'center', cellWidth: 10 },
                7: { halign: 'center', cellWidth: 12 },
            },
            willDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 7) {
                    if (data.cell.text[0] === 'SI') data.cell.styles.textColor = [22, 163, 74];
                    else if (data.cell.text[0] === 'NO') data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });
        currentY = doc.lastAutoTable.finalY + 10;

        // ── Optimización por perfil ──
        const BAR_LENGTH = 580;
        const profileEntries = Object.entries(optimization || {});
        const ensurePageSpace = (needed) => {
            if (currentY + needed > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                currentY = 20;
            }
        };

        profileEntries.forEach(([profileName, variants]) => {
            (variants || []).forEach((variant) => {
                ensurePageSpace(18);
                // Cabecera del perfil
                doc.setFillColor(30, 64, 175);
                doc.rect(margin.left, currentY, 3, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text(`${profileName} — ${variant.color}`, margin.left + 6, currentY + 5.5);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(
                    `Barras totales: ${variant.totalBars}${variant.machineSeries ? `  ·  Series máquina: ${variant.series?.length ?? 0}` : ''}`,
                    pageW - margin.right,
                    currentY + 5.5,
                    { align: 'right' },
                );
                currentY += 9;

                if (variant.machineSeries && Array.isArray(variant.series)) {
                    // Series máquina (Hoja+Cedazo combinadas)
                    variant.series.forEach((s) => {
                        ensurePageSpace(14);
                        const cutsText = (s.cuts || [])
                            .map((c) => `${c.length}cm (${c.windowLabel})`)
                            .join('  ·  ');
                        const efficiency = typeof s.efficiency === 'number' ? s.efficiency.toFixed(1) : '0.0';
                        doc.setFillColor(248, 250, 252);
                        const lines = doc.splitTextToSize(cutsText || '—', pageW - margin.left - margin.right - 4);
                        const boxH = 7 + lines.length * 3.5;
                        doc.roundedRect(margin.left, currentY, pageW - margin.left - margin.right, boxH, 1.5, 1.5, 'F');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8);
                        doc.setTextColor(30, 64, 175);
                        doc.text(`Serie ${s.serieIndex}  ·  Uso ${s.totalUsed}/${BAR_LENGTH}cm  ·  Eficiencia ${efficiency}%`, margin.left + 2, currentY + 5);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7.5);
                        doc.setTextColor(71, 85, 105);
                        doc.text(lines, margin.left + 2, currentY + 9);
                        currentY += boxH + 2;
                    });
                } else {
                    // Barras individuales
                    (variant.bars || []).forEach((bar, idx) => {
                        ensurePageSpace(12);
                        const cutsText = (bar.cuts || [])
                            .map((c) => `${c.length}cm (${c.windowLabel})`)
                            .join('  ·  ');
                        const lines = doc.splitTextToSize(cutsText || '—', pageW - margin.left - margin.right - 4);
                        const boxH = 6 + lines.length * 3.5;
                        doc.setFillColor(248, 250, 252);
                        doc.roundedRect(margin.left, currentY, pageW - margin.left - margin.right, boxH, 1.5, 1.5, 'F');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(7.5);
                        doc.setTextColor(30, 64, 175);
                        const used = bar.totalUsed ?? bar.used ?? 0;
                        const waste = bar.waste ?? (BAR_LENGTH - used);
                        doc.text(`Barra ${idx + 1}  ·  Uso ${used}/${BAR_LENGTH}cm  ·  Desperdicio ${waste}cm`, margin.left + 2, currentY + 4.5);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7.5);
                        doc.setTextColor(71, 85, 105);
                        doc.text(lines, margin.left + 2, currentY + 8.5);
                        currentY += boxH + 2;
                    });
                }
                currentY += 4;
            });
        });

        // ── Paginación ──
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${i} de ${totalPages}`, pageW - margin.right, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
        }

        doc.save(`Plan_Corte_Consolidado_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success('PDF generado correctamente.', { id: toastId });
    } catch (error) {
        console.error('❌ Error al generar PDF de cortes:', error);
        toast.error('Error al generar el PDF. Intenta de nuevo.', { id: toastId });
        throw error;
    }
}
