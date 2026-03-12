// src/lib/generateDocumentPDF.js

import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// --- Cache e imagen loader con compresión via canvas ---
const imageCache = {};

async function loadImageAsBase64(url, { maxWidth = null, quality = 0.6 } = {}) {
  const cacheKey = `${url}_${maxWidth}_${quality}`;
  if (imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }

  const response = await fetch(url);
  const blob = await response.blob();

  // Cargar imagen en un elemento <img>
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(blob);
  });

  // Redibujar en canvas con escala y compresión JPEG
  let width = img.width;
  let height = img.height;
  if (maxWidth && width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Liberar objectURL
  URL.revokeObjectURL(img.src);

  // Convertir a JPEG comprimido
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  imageCache[cacheKey] = dataUrl;
  return dataUrl;
}

const companyDetails = {
  name: "INNOVA HOGAR",
  slogan: "SEGURO, CONFIABLE Y TRANSPARENTE",
};

/**
 * Genera un PDF dinámico para Cotizaciones o Pedidos
 * @param {Object} data - El objeto de la cotización o el pedido
 * @param {string} mode - 'quotation' o 'order'
 */
export const generateDocumentPDF = async (data, mode = 'quotation') => {
  const toastId = toast.loading('Generando PDF...');
  // Cede el hilo para que el toast se renderice antes
  await new Promise(resolve => setTimeout(resolve, 50));
  try {
    // Cargar imágenes comprimidas en paralelo
    const [logoBase64, backgroundImageBase64] = await Promise.all([
      loadImageAsBase64('/assets/logo-pdf.png', { quality: 0.6 }),
      loadImageAsBase64('/assets/background-pdf.png', { maxWidth: 800, quality: 0.5 }),
    ]);

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const isOrder = mode === 'order';
    const themeColor = isOrder ? [50, 50, 50] : [0, 51, 102]; // Gris oscuro para pedido, Azul para cotización

    const margin = {
      top: 40,
      bottom: 40,
      left: 20,
      right: 20
    };

    const addBackground = () => {
      doc.addImage(backgroundImageBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    };

    addBackground();

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A";
    const formatCurrency = (amount) => `Q ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ======================================================
    // 1. CABECERA DINÁMICA
    // ======================================================
    doc.addImage(logoBase64, 'JPEG', margin.left, 18, 45, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);

    const headerTitle = isOrder ? "COMPROBANTE DE PEDIDO" : "COTIZACIÓN";
    doc.text(headerTitle, pageWidth - margin.right, 35, { align: 'right' });

    // ======================================================
    // 2. SECCIÓN DE DATOS
    // ======================================================
    let startY = 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(150);

    doc.text("CLIENTE:", margin.left, startY);
    doc.text(isOrder ? "PEDIDO #:" : "COTIZACIÓN #:", pageWidth / 2 + 15, startY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);

    const clientName = data.client?.name ?? 'N/A';
    doc.text(clientName || "N/A", margin.left, startY + 5);
    doc.text(String(data.quotationNumber || data.id), pageWidth / 2 + 15, startY + 5);

    startY += 12;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150);
    doc.text("PROYECTO:", margin.left, startY);
    doc.text("FECHA:", pageWidth / 2 + 15, startY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    doc.text(data.project || "N/A", margin.left, startY + 5);
    doc.text(formatDate(data.createdAt), pageWidth / 2 + 15, startY + 5);

    startY += 12;

    // ======================================================
    // 3. TABLA DE PRODUCTOS
    // ======================================================
    const tableColumn = ["#", "Cant.", "Descripción", "Color PVC", "Color Vidrio", "Dimensiones", "P. Unitario", "Subtotal"];

    // Origen de datos dinámico: 'windows' para pedidos, 'quotation_windows' para cotizaciones
    const items = isOrder ? (data.windows || []) : (data.quotation_windows || []);

    const tableRows = items.map((win, index) => {
      const quantity = win.quantity || 1;
      const unitPrice = (win.price || 0) / quantity;
      return [
        index + 1,
        String(quantity),
        win.displayName || "Ventana",
        win.pvcColor?.name || "N/A",
        win.glassColor?.name || "N/A",
        `${(win.width_cm / 100).toFixed(2)} x ${(win.height_cm / 100).toFixed(2)}m`,
        formatCurrency(unitPrice),
        formatCurrency(win.price),
      ];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 15,
        theme: 'striped',
        margin: { left: margin.left, right: margin.right },
        headStyles: {
            fillColor: themeColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9,
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 2.5,
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'center', cellWidth: 10 },
            2: { cellWidth: 45 },
            5: { halign: 'center' },
            6: { halign: 'right' },
            7: { halign: 'right' }
        },
        didDrawPage: (pageData) => {
          if (pageData.pageNumber > 1) {
            addBackground();
          }
        }
    });

    // ======================================================
    // 4. TOTALES Y LÓGICA DE IVA
    // ======================================================
    let finalY = doc.lastAutoTable.finalY;

    // Si es pedido, buscamos el IVA en la relación 'generatedFromQuotation'
    const isIvaIncluded = data.include_iva !== undefined
      ? (data.include_iva === true || data.include_iva === "true")
      : (data.generatedFromQuotation?.include_iva === true);

    // RECALCULO DINÁMICO: Sumamos los precios de las ventanas que están en el PDF
    const items2 = isOrder ? (data.windows || []) : (data.quotation_windows || []);
    const rawTotal = items2.reduce((acc, win) => acc + (Number(win.price) || 0), 0);

    let subtotalExento, ivaMonto, totalFinal;

    const neededSpace = isIvaIncluded ? 45 : 30;
    if (finalY > pageHeight - margin.bottom - neededSpace) {
        doc.addPage();
        addBackground();
        finalY = margin.top;
    }

    const bottomBlockY = finalY + 10;

    if (isIvaIncluded) {
      subtotalExento = rawTotal;
      ivaMonto = subtotalExento * 0.12;
      totalFinal = subtotalExento + ivaMonto;
    } else {
      subtotalExento = rawTotal;
      ivaMonto = 0;
      totalFinal = rawTotal;
    }

    const totalBoxWidth = 60;
    const tableEndX = pageWidth - margin.right;
    const totalBoxStartX = tableEndX - totalBoxWidth;
    let currentY = bottomBlockY;

    // --- Notas Izquierda ---
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);

    const quotationNotes = [
      "*Precios sujetos a cambios, sin previo aviso. La cotización tiene vigencia de 8 días.",
      "*Entrega e instalación incluida en el perímetro de la Capital,",
      " Carretera a El Salvador y Departamentos aledaños."
    ];

    const orderNotes = [
      "*Este documento es un comprobante de pedido para producción e instalación.",
      "*Favor revisar medidas y especificaciones antes de firmar de conformidad.",
      "*Cualquier cambio posterior a la firma puede generar costos adicionales."
    ];

    doc.text(isOrder ? orderNotes : quotationNotes, margin.left, bottomBlockY);

    if (isIvaIncluded) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("*PRECIOS MÁS IVA (12%)", margin.left, bottomBlockY + 12);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Subtotal:", totalBoxStartX, currentY + 4);
      doc.text(formatCurrency(subtotalExento), tableEndX, currentY + 4, { align: 'right' });

      currentY += 6;
      doc.text("IVA (12%):", totalBoxStartX, currentY + 4);
      doc.text(formatCurrency(ivaMonto), tableEndX, currentY + 4, { align: 'right' });
      currentY += 8;
    } else {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("*PRECIO NO INCLUYE IVA", margin.left, bottomBlockY + 12);
    }

    // --- Caja de Total Final ---
    doc.setFillColor(...themeColor);
    doc.rect(totalBoxStartX, currentY, totalBoxWidth, 9, 'F');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL:", totalBoxStartX + 5, currentY + 6);
    doc.setFontSize(12);
    doc.text(formatCurrency(totalFinal), tableEndX - 5, currentY + 6, { align: 'right' });

    // --- Espacio para Firma (Solo en Pedidos) ---
    if (isOrder) {
      const signatureY = currentY + 25;
      doc.setDrawColor(150);
      doc.line(margin.left, signatureY, margin.left + 60, signatureY);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text("Firma de Conformidad Cliente", margin.left, signatureY + 4);
    }

    const fileName = isOrder ? `Pedido_${data.id}_${data.project}` : `Cotizacion_${data.quotationNumber || data.id}_${data.project}`;
    doc.save(`${fileName}.pdf`);
    toast.success('PDF generado correctamente.', { id: toastId });
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    toast.error('Error al generar el PDF. Intenta de nuevo.', { id: toastId });
    throw error;
  }
};
