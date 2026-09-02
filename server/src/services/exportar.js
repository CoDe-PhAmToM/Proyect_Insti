// ============================================================
// EXPORTACION A PDF Y EXCEL
//
// Los botones de exportar antes solo mostraban un aviso. Ahora
// generan el archivo de verdad.
//
// Se generan en memoria con pdfkit y exceljs, sin navegador
// headless: en los 512 MB del plan gratuito de Render, Puppeteer
// no entra.
//
// Los PDF llevan pie con la fecha de emision y el nombre del
// taller, porque son documentos que el microempresario puede
// terminar llevando al banco a pedir un credito — que es
// justamente uno de los fines que plantea la tesis.
// ============================================================

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { nombrePeriodo } from 'shared/formato';

const NEGRO = '#1c1917';
const GRIS = '#78716c';
const NARANJA = '#ea580c';

const bsPdf = (n) =>
  `Bs. ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaLarga = () =>
  new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });

// ── PDF ──────────────────────────────────────────────────────

/** Devuelve un Buffer con el PDF ya armado. */
export const generarPDF = ({ titulo, subtitulo, taller, secciones }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const trozos = [];

    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    // Encabezado
    doc.fontSize(9).fillColor(GRIS).text(taller?.nombre ?? 'Taller', { align: 'right' });
    doc.text(taller?.distrito ?? '', { align: 'right' });
    doc.moveDown(1.5);

    doc.fontSize(20).fillColor(NEGRO).font('Helvetica-Bold').text(titulo);
    if (subtitulo) {
      doc.fontSize(10).fillColor(GRIS).font('Helvetica').text(subtitulo);
    }

    doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor('#d6d3d1').stroke();
    doc.moveDown(1.5);

    for (const sec of secciones) {
      if (doc.y > 700) doc.addPage();

      if (sec.titulo) {
        doc.fontSize(12).fillColor(NEGRO).font('Helvetica-Bold').text(sec.titulo);
        doc.moveDown(0.5);
      }

      if (sec.texto) {
        doc.fontSize(9).fillColor(GRIS).font('Helvetica').text(sec.texto, { width: 495 });
        doc.moveDown(0.7);
      }

      if (sec.filas?.length) {
        const cols = sec.columnas ?? [];
        const anchoTotal = 495;
        const anchos = cols.map((c) => (c.ancho ?? 1 / cols.length) * anchoTotal);

        // Cabecera de la tabla
        let x = 50;
        const yCab = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS);
        cols.forEach((c, i) => {
          doc.text(c.titulo.toUpperCase(), x, yCab, {
            width: anchos[i],
            align: c.alinear ?? 'left',
          });
          x += anchos[i];
        });
        doc.moveDown(0.4);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e7e5e4').stroke();
        doc.moveDown(0.4);

        // Filas
        doc.font('Helvetica').fontSize(9);
        for (const fila of sec.filas) {
          if (doc.y > 760) {
            doc.addPage();
            doc.font('Helvetica').fontSize(9);
          }
          let cx = 50;
          const cy = doc.y;
          cols.forEach((c, i) => {
            const v = fila[c.campo];
            const texto = c.moneda ? bsPdf(v) : String(v ?? '');
            doc
              .fillColor(fila._destacar ? NEGRO : '#44403c')
              .font(fila._destacar ? 'Helvetica-Bold' : 'Helvetica')
              .text(texto, cx, cy, { width: anchos[i], align: c.alinear ?? 'left' });
            cx += anchos[i];
          });
          doc.moveDown(0.35);
        }
        doc.moveDown(0.8);
      }

      if (sec.total) {
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#a8a29e').stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(NEGRO).text(sec.total.label, 50, doc.y, {
          width: 300,
          continued: false,
        });
        doc.fontSize(13).fillColor(NARANJA).text(bsPdf(sec.total.valor), 350, doc.y - 14, {
          width: 195,
          align: 'right',
        });
        doc.moveDown(1.2);
      }
    }

    // Pie
    const pie = `Emitido el ${fechaLarga()} · Plataforma de Gestión Financiera · Distrito 6, El Alto`;
    doc.fontSize(7).fillColor(GRIS).font('Helvetica').text(pie, 50, 790, { align: 'center', width: 495 });

    doc.end();
  });

// ── Excel ────────────────────────────────────────────────────

/** Devuelve un Buffer con el .xlsx. */
export const generarExcel = async ({ titulo, taller, hojas }) => {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Plataforma de Gestión Financiera';
  libro.created = new Date();

  for (const h of hojas) {
    const hoja = libro.addWorksheet(h.nombre.slice(0, 31));

    // Encabezado del reporte
    hoja.addRow([titulo]);
    hoja.getRow(1).font = { bold: true, size: 14 };
    hoja.addRow([taller?.nombre ?? '', taller?.distrito ?? '']);
    hoja.addRow([`Emitido el ${fechaLarga()}`]);
    hoja.getRow(3).font = { size: 9, color: { argb: 'FF78716C' } };
    hoja.addRow([]);

    if (h.subtitulo) {
      hoja.addRow([h.subtitulo]);
      hoja.lastRow.font = { italic: true, size: 10 };
      hoja.addRow([]);
    }

    const filaCabecera = hoja.rowCount + 1;
    hoja.addRow(h.columnas.map((c) => c.titulo));
    const cab = hoja.getRow(filaCabecera);
    cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1917' } };
    cab.alignment = { vertical: 'middle' };

    for (const fila of h.filas) {
      const r = hoja.addRow(h.columnas.map((c) => fila[c.campo] ?? ''));
      if (fila._destacar) r.font = { bold: true };
      h.columnas.forEach((c, i) => {
        if (c.moneda) r.getCell(i + 1).numFmt = '"Bs." #,##0.00';
        if (c.porcentaje) r.getCell(i + 1).numFmt = '0.0"%"';
      });
    }

    // Ancho de columnas segun el contenido, con un maximo razonable
    h.columnas.forEach((c, i) => {
      const largos = [c.titulo.length, ...h.filas.map((f) => String(f[c.campo] ?? '').length)];
      hoja.getColumn(i + 1).width = Math.min(Math.max(...largos) + 4, 42);
    });

    if (h.nota) {
      hoja.addRow([]);
      hoja.addRow([h.nota]);
      hoja.lastRow.font = { italic: true, size: 9, color: { argb: 'FF78716C' } };
    }
  }

  return libro.xlsx.writeBuffer();
};

/**
 * Nombre de archivo limpio: sin acentos ni espacios, con el periodo
 * adentro para que no se pisen al descargar varios.
 */
export const nombreArchivo = (base, periodo, ext) => {
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();
  return `${limpio}-${periodo ?? 'general'}.${ext}`;
};

export { nombrePeriodo };
