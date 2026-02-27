// src/lib/generateMaterialsPDF.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatCurrency = (amount) => `Q${Number(amount || 0).toFixed(2)}`;

export function generateMaterialsPDF({ reportData, projectName, orderId, isConsolidated = false }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = { left: 15, right: 15, top: 15 };

  // ── Helpers de tipografía ──
  const setTitle = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 23, 42); };
  const setSubtitle = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 64, 175); };
  const setBody = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(71, 85, 105); };
  const setLabel = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 116, 139); };

  // ── Header ──
  // Barra superior azul
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("VentPro", margin.left, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text(
    isConsolidated ? "Reporte Consolidado de Materiales" : "Lista de Materiales para Proveedor",
    margin.left,
    17
  );

  // Fecha a la derecha
  doc.setFontSize(8);
  doc.setTextColor(219, 234, 254);
  const dateStr = new Date().toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
  doc.text(dateStr, pageW - margin.right, 17, { align: "right" });

  let currentY = 30;

  // ── Info del proyecto ──
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin.left, currentY, pageW - margin.left - margin.right, 16, 2, 2, "F");

  setLabel();
  doc.text(isConsolidated ? "PROYECTOS INCLUIDOS" : "PROYECTO", margin.left + 4, currentY + 6);
  setTitle();
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(projectName || "Sin nombre", margin.left + 4, currentY + 13);

  if (!isConsolidated && orderId) {
    setLabel();
    doc.text(`Pedido #${orderId}`, pageW - margin.right - 4, currentY + 13, { align: "right" });
  }

  currentY += 22;

  // ── Función para dibujar sección ──
  const drawSection = (title, accentColor, columns, rows) => {
    if (!rows || rows.length === 0) return;

    // Título de sección con acento de color
    doc.setFillColor(...accentColor);
    doc.rect(margin.left, currentY, 3, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin.left + 6, currentY + 5.5);
    currentY += 11;

    autoTable(doc, {
      startY: currentY,
      head: [columns.map(c => c.header)],
      body: rows,
      margin: { left: margin.left, right: margin.right },
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: columns.reduce((acc, col, i) => {
        acc[i] = { halign: col.align || "left" };
        return acc;
      }, {}),
    });

    currentY = doc.lastAutoTable.finalY + 8;
  };

  // Separar datos por tipo
  const profiles = Array.isArray(reportData)
    ? reportData.filter(i => i.tipo?.trim().toUpperCase() === "PERFIL")
    : [];
  const accessories = Array.isArray(reportData)
    ? reportData.filter(i => i.tipo?.trim().toUpperCase() === "ACCESORIO")
    : [];
  const glasses = Array.isArray(reportData)
    ? reportData.filter(i => i.tipo?.trim().toUpperCase() === "VIDRIO")
    : [];

  // ── Sección Perfiles ──
  drawSection(
    "Perfiles PVC",
    [59, 130, 246], // azul
    [
      { header: "Color", align: "left" },
      { header: "Perfil", align: "left" },
      { header: "Cant.", align: "center" },
      { header: "P. Unitario", align: "right" },
      { header: "Total", align: "right" },
    ],
    profiles.map(i => [
      i.color || "—",
      i.nombre,
      String(i.cantidad),
      formatCurrency(i.precioUnitario),
      formatCurrency(i.precioTotal),
    ])
  );

  // ── Sección Accesorios ──
  drawSection(
    "Accesorios",
    [239, 68, 68], // rojo
    [
      { header: "Accesorio", align: "left" },
      { header: "Cant.", align: "center" },
      { header: "P. Unitario", align: "right" },
      { header: "Total", align: "right" },
    ],
    accessories.map(i => [
      i.nombre,
      String(i.cantidad),
      formatCurrency(i.precioUnitario),
      formatCurrency(i.precioTotal),
    ])
  );

  // ── Sección Vidrios ──
  drawSection(
    "Vidrios",
    [34, 197, 94], // verde
    [
      { header: "Tipo de Vidrio", align: "left" },
      { header: "Planchas", align: "center" },
      { header: "P. Unitario", align: "right" },
      { header: "Total", align: "right" },
    ],
    glasses.map(i => [
      i.nombre,
      String(i.cantidad),
      formatCurrency(i.precioUnitario),
      formatCurrency(i.precioTotal),
    ])
  );

  // ── Total general ──
  const grandTotal = Array.isArray(reportData)
    ? reportData.reduce((sum, i) => sum + (i.precioTotal || 0), 0)
    : 0;

  // Caja de total
  const totalBoxH = 14;
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(pageW - margin.right - 70, currentY, 70, totalBoxH, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(219, 234, 254);
  doc.text("COSTO TOTAL DE MATERIALES", pageW - margin.right - 4, currentY + 5, { align: "right" });
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(grandTotal), pageW - margin.right - 4, currentY + 11.5, { align: "right" });

  currentY += totalBoxH + 8;

  // ── Nota al pie ──
  setBody();
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Este documento es para uso interno y de proveedores. Los precios son de costo de materiales.",
    margin.left,
    currentY
  );

  // ── Número de página ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin.right, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  // ── Guardar ──
  const fileName = isConsolidated
    ? `Materiales_Consolidado_${new Date().toISOString().slice(0, 10)}`
    : `Materiales_Pedido${orderId}_${projectName?.replace(/\s+/g, "_") || ""}`;

  doc.save(`${fileName}.pdf`);
}