import { Venta } from '../../features/types/sales';
import { VentaCatering } from '../../features/types/catering';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import logoUrl from '../../assets/images/logo.png';

declare const window: any;

type VentaCompatible = Venta | VentaCatering;
type TipoDocumento = 'ticket' | 'factura' | 'cotizacion' | 'contrato';

// ═══════════════════════════════════════════════════════════════════
// TIPOS INTERNOS
// ═══════════════════════════════════════════════════════════════════

interface ItemPDF {
  nombre: string;
  cantidad: number;
  precio: number;
  tipo: 'Producto' | 'Servicio' | 'Material';
  categoria?: string;
}

interface GrupoPDF {
  titulo: string;
  items: ItemPDF[];
}

interface EmpresaPDF {
  razonSocial: string;
  ruc: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_EMPRESA: EmpresaPDF = {
  razonSocial: 'DELICIAS ALI SAC',
  ruc: '20613823027',
  direccion: null,
  telefono: null,
  email: null,
};

const COLOR_PRINCIPAL = '#d90a46';
const COLOR_TEXTO = '#1a0a0e';
const COLOR_FONDO_SECCION: [number, number, number] = [253, 242, 245];
const COLOR_BLANCO: [number, number, number] = [255, 255, 255];
const COLOR_GRIS_CLARO: [number, number, number] = [250, 250, 250];

// URLs de recursos para Cotización (PDF membretado + firma)
const PDF_MEMBRETADO_URL = 'http://localhost:5173/uploads/membretadas/Documento_Membretado.pdf';
const FIRMA_VENDEDOR_URL = 'http://localhost:5173/uploads/firmas/Firma_Alexandra.png';
const NUMERO_CONTRATO_PREFIJO = 'CONT';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const esEventoCatering = (v: VentaCompatible): v is VentaCatering => {
  if ('servicios' in v && Array.isArray((v as any).servicios)) {
    return true;
  }
  if ('eventoData' in v && v.eventoData) {
    return true;
  }
  return false;
};

const normalizarEventoData = (ev: any): any => {
  if (!ev) return null;

  if (ev.fechaHora && typeof ev.fechaHora === 'string') {
    const [fecha, horaCompleta] = ev.fechaHora.split('T');
    return {
      ...ev,
      fecha: fecha || null,
      horario: horaCompleta ? horaCompleta.substring(0, 5) : null,
    };
  }

  return ev;
};

const extraerItems = (ventaData: VentaCompatible): ItemPDF[] => {
  if (esEventoCatering(ventaData)) {
    const items: ItemPDF[] = [];

    (ventaData.servicios || []).forEach((serv: any) => {
      (serv.productos || []).forEach((p: any) => {
        items.push({
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio: p.precio,
          tipo: 'Servicio',
          categoria: serv.tipoNombre,
        });
      });
    });

    (ventaData.materiales || []).forEach((m: any) => {
      items.push({
        nombre: m.nombre,
        cantidad: m.cantidad,
        precio: m.precio,
        tipo: 'Material',
      });
    });

    const ev = normalizarEventoData((ventaData as any).eventoData);
    if (ev?.incluir_mozo && (ev.subtotal_mozo || 0) > 0) {
      items.push({
        nombre: 'Servicio de mozo',
        cantidad: ev.cantidad_mozos || 0,
        precio: ev.precio_mozo || 0,
        tipo: 'Servicio',
      });
    }

    return items;
  }

  return (ventaData.productos || []).map((p: any) => ({
    nombre: p.nombre,
    cantidad: p.cantidad,
    precio: p.precio,
    tipo: 'Producto' as const,
  }));
};

const extraerProductosDevolucion = (devolucion: any): ItemPDF[] => {
  const items: ItemPDF[] = [];

  if (devolucion.productos && Array.isArray(devolucion.productos)) {
    devolucion.productos.forEach((p: any) => {
      const nombre = p.servicioNombre ? `${p.nombre} (${p.servicioNombre})` : p.nombre;
      items.push({
        nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        tipo: 'Producto',
      });
    });
  }

  if (devolucion.materiales && Array.isArray(devolucion.materiales)) {
    devolucion.materiales.forEach((m: any) => {
      items.push({
        nombre: m.nombre,
        cantidad: m.cantidad,
        precio: m.precio,
        tipo: 'Material',
      });
    });
  }

  return items;
};

const fechaActual = (): string => {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hh}:${mm}`;
};

const formatearFecha = (fecha: string | null | undefined): string => {
  if (!fecha) return '-';
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return fecha;
};

const formatearFechaTexto = (fecha: Date): string => {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const formatearHorario = (horario: string | null | undefined): string => {
  if (!horario) return '-';
  return horario.substring(0, 5);
};

const formatearMoneda = (n: number): string => {
  return `S/ ${(n || 0).toFixed(2)}`;
};

/**
 * Genera el número de cotización con formato:
 * COT-{venta.numero}-YYYYMMDD-HHMM
 */
const generarNumeroCotizacion = (venta: VentaCompatible): string => {
  let fecha: Date;
  try {
    fecha = venta.fechaObj instanceof Date
      ? venta.fechaObj
      : new Date(venta.fecha);
    if (isNaN(fecha.getTime())) {
      fecha = new Date();
    }
  } catch {
    fecha = new Date();
  }

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mi = String(fecha.getMinutes()).padStart(2, '0');

  return `COT-${venta.numero}-${yyyy}${mm}${dd}-${hh}${mi}`;
};

/**
 * Genera el número de contrato con formato:
 * CONT-{venta.numero}-YYYYMMDD-HHMM
 * Ejemplo: CONT-V-000005-20261001-1847
 */
const generarNumeroContrato = (venta: VentaCompatible): string => {
  let fecha: Date;
  try {
    fecha = venta.fechaObj instanceof Date
      ? venta.fechaObj
      : new Date(venta.fecha);
    if (isNaN(fecha.getTime())) {
      fecha = new Date();
    }
  } catch {
    fecha = new Date();
  }

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mi = String(fecha.getMinutes()).padStart(2, '0');

  return `${NUMERO_CONTRATO_PREFIJO}-${venta.numero}-${yyyy}${mm}${dd}-${hh}${mi}`;
};

/**
 * Convierte milímetros a puntos (pdf-lib trabaja en puntos).
 * 1mm = 2.834645 pt
 */
const mmToPt = (mm: number): number => mm * 2.834645;

/**
 * Convierte color hex a rgb de pdf-lib
 */
const hexToRgbPDF = (hex: string) => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
};

const cargarLogoBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('[pdfService] No se pudo cargar el logo:', error);
    return null;
  }
};

/**
 * Carga un archivo (PDF o imagen) como ArrayBuffer
 */
const cargarRecursoBytes = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } catch (error) {
    console.warn(`[pdfService] No se pudo cargar recurso: ${url}`, error);
    return null;
  }
};

/**
 * Divide un texto en líneas según el ancho máximo.
 * Útil para pdf-lib (que no tiene auto-wrap).
 */
const dividirTextoEnLineas = (
  texto: string,
  font: any,
  size: number,
  maxWidth: number
): string[] => {
  const palabras = texto.split(' ');
  const lineas: string[] = [];
  let lineaActual = '';

  palabras.forEach((palabra) => {
    const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    const anchoPrueba = font.widthOfTextAtSize(prueba, size);
    if (anchoPrueba <= maxWidth) {
      lineaActual = prueba;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabra;
    }
  });

  if (lineaActual) lineas.push(lineaActual);
  return lineas;
};

// ═══════════════════════════════════════════════════════════════════
// VISTA PREVIA HTML (para el modal, no imprime PDF)
// ═══════════════════════════════════════════════════════════════════

export const generarVistaPreviaHTML = (
  ventaData: VentaCompatible,
  tipo: TipoDocumento
): string => {
  const esCatering = esEventoCatering(ventaData);
  const items = extraerItems(ventaData);
  const empresa = DEFAULT_EMPRESA;

  const headerEmpresa = `
        <div style="text-align:center; margin-bottom:8px;">
            <div style="font-size:14px; font-weight:bold; color:${COLOR_TEXTO};">
                ${empresa.razonSocial}
            </div>
            <div style="font-size:11px; color:#444;">
                RUC: ${empresa.ruc}
            </div>
        </div>
    `;

  const seccionCliente = `
        <div style="border-left:3px solid ${COLOR_PRINCIPAL}; background:#fdf2f5; padding:6px 8px; margin:8px 0;">
            <div style="font-size:11px; font-weight:bold; color:${COLOR_PRINCIPAL}; margin-bottom:4px;">
                DATOS DEL CLIENTE
            </div>
            <div style="font-size:10px;">
                <strong>Cliente:</strong> ${ventaData.cliente || '-'}<br>
                <strong>Doc:</strong> ${ventaData.clienteDoc || '-'}
            </div>
        </div>
    `;

  let seccionEvento = '';
  if (esCatering) {
    const ev = normalizarEventoData((ventaData as any).eventoData);
    seccionEvento = `
            <div style="border-left:3px solid ${COLOR_PRINCIPAL}; background:#fdf2f5; padding:6px 8px; margin:8px 0;">
                <div style="font-size:11px; font-weight:bold; color:${COLOR_PRINCIPAL}; margin-bottom:4px;">
                    DATOS DEL EVENTO
                </div>
                <div style="font-size:10px; line-height:1.5;">
                    <strong>Fecha del evento:</strong> ${formatearFecha(ev?.fecha)}<br>
                    <strong>Horario:</strong> ${formatearHorario(ev?.horario)}<br>
                    <strong>Personas:</strong> ${ev?.personas || '-'}<br>
                    <strong>Tipo de servicio:</strong> ${ev?.tipoDesayuno || '-'}<br>
                    ${ev?.direccion ? `<strong>Lugar:</strong> ${ev.direccion}<br>` : ''}
                    ${ev?.referencia ? `<strong>Referencia:</strong> ${ev.referencia}<br>` : ''}
                    ${ev?.incluir_mozo && ev?.cantidad_mozos ? `<strong>Personal:</strong> ${ev.cantidad_mozos} mozo(s) (${formatearMoneda(ev.subtotal_mozo || 0)})` : ''}
                </div>
            </div>
        `;
  }

  let tablaHtml = '';
  if (items.length === 0) {
    tablaHtml = `<div style="text-align:center; font-size:10px; color:#999; padding:8px;">Sin items</div>`;
  } else {
    tablaHtml = items.map((it) => `
            <div style="display:flex; justify-content:space-between; font-size:10px; padding:2px 0; ${it.tipo === 'Material' ? 'color:#666;' : ''}">
                <span style="flex:1;">${it.cantidad} × ${it.nombre}${it.tipo === 'Material' ? ' [Material]' : ''}</span>
                <span style="text-align:right;">${formatearMoneda(it.cantidad * it.precio)}</span>
            </div>
        `).join('');
  }

  const totales = `
        <div style="border-top:1px dashed #ccc; margin:8px 0; padding-top:6px; font-size:10px;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${formatearMoneda(ventaData.subtotal)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Descuento:</span><span>${formatearMoneda(ventaData.descuento || 0)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>IGV (18%):</span><span>${formatearMoneda(ventaData.igv)}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:${COLOR_PRINCIPAL}; font-size:12px; margin-top:4px;">
                <span>TOTAL:</span><span>${formatearMoneda(ventaData.total)}</span>
            </div>
        </div>
    `;

  const tituloDoc = tipo === 'ticket'
    ? 'TICKET DE VENTA'
    : tipo === 'factura'
      ? 'FACTURA ELECTRÓNICA'
      : 'COTIZACIÓN';

  const numeroDoc = tipo === 'cotizacion'
    ? generarNumeroCotizacion(ventaData)
    : ventaData.numero;

  return `
        <div class="vista-previa" style="background:#f8f9fa; border:1px solid #ddd; border-radius:0.5rem; padding:1rem; max-height:400px; overflow-y:auto; font-family:Helvetica, Arial, sans-serif;">
            ${headerEmpresa}
            <div style="text-align:center; font-size:12px; font-weight:bold; color:${COLOR_PRINCIPAL}; margin:6px 0;">
                ${tituloDoc}
            </div>
            <div style="text-align:center; font-size:10px; margin-bottom:6px;">
                N° ${numeroDoc} | ${fechaActual()}
            </div>
            ${seccionCliente}
            ${seccionEvento}
            <div style="margin:8px 0;">
                <div style="font-size:10px; font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:2px; margin-bottom:4px;">
                    DETALLE
                </div>
                ${tablaHtml}
            </div>
            ${totales}
            <div style="text-align:center; font-size:9px; color:#666; margin-top:8px;">
                ${ventaData.metodoPago ? `Pago: ${ventaData.metodoPago}` : ''}
            </div>
        </div>
    `;
};

// ═══════════════════════════════════════════════════════════════════
// GENERADOR PDF — FACTURA A4 (jsPDF)
// ═══════════════════════════════════════════════════════════════════

const generarFacturaPDF = async (
  ventaData: VentaCompatible,
  doc: any
): Promise<void> => {
  const { autoTable } = window.jspdf;
  const esCatering = esEventoCatering(ventaData);
  const items = extraerItems(ventaData);
  const empresa = DEFAULT_EMPRESA;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, y, 25, 25);
    } catch (e) {
      console.warn('[pdfService] Error al agregar logo:', e);
    }
  }

  const xEmpresa = margin + 30;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_PRINCIPAL);
  doc.text(empresa.razonSocial, xEmpresa, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`RUC: ${empresa.ruc}`, xEmpresa, y + 15);

  const badgeX = pageWidth - margin - 55;
  const badgeY = y;
  doc.setFillColor(217, 10, 70);
  doc.roundedRect(badgeX, badgeY, 55, 22, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FACTURA', badgeX + 27.5, badgeY + 8, { align: 'center' });
  doc.text('ELECTRÓNICA', badgeX + 27.5, badgeY + 14, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`N° ${ventaData.numero}`, badgeX + 27.5, badgeY + 20, { align: 'center' });

  y += 30;

  doc.setDrawColor(217, 10, 70);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('FECHA DE EMISIÓN:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaActual(), margin + 40, y);
  y += 8;

  y = dibujarSeccion(doc, {
    titulo: 'DATOS DEL CLIENTE',
    filas: [
      ['Razón Social:', ventaData.cliente || '-'],
      ['DNI/RUC:', ventaData.clienteDoc || '-'],
    ],
    x: margin,
    y,
    ancho: pageWidth - margin * 2,
  });

  if (esCatering) {
    const ev = normalizarEventoData((ventaData as any).eventoData);
    const filasEvento: [string, string][] = [
      ['Fecha del evento:', formatearFecha(ev?.fecha)],
      ['Horario:', formatearHorario(ev?.horario)],
      ['Cantidad personas:', String(ev?.personas || '-')],
      ['Tipo de servicio:', ev?.tipoDesayuno || '-'],
    ];
    if (ev?.direccion) filasEvento.push(['Lugar:', ev.direccion]);
    if (ev?.referencia) filasEvento.push(['Referencia:', ev.referencia]);
    if (ev?.incluir_mozo && ev?.cantidad_mozos) {
      filasEvento.push([
        'Personal:',
        `${ev.cantidad_mozos} mozo(s) (${formatearMoneda(ev.subtotal_mozo || 0)})`,
      ]);
    }

    y = dibujarSeccion(doc, {
      titulo: 'DATOS DEL EVENTO',
      filas: filasEvento,
      x: margin,
      y,
      ancho: pageWidth - margin * 2,
    });
  }

  y += 4;

  const headers = esCatering
    ? [['Cant.', 'Descripción', 'Tipo', 'P.Unit', 'Importe']]
    : [['Cant.', 'Descripción', 'P.Unit', 'Importe']];

  const body = items.map((it) =>
    esCatering
      ? [
        String(it.cantidad),
        it.nombre,
        it.tipo,
        formatearMoneda(it.precio),
        formatearMoneda(it.cantidad * it.precio),
      ]
      : [
        String(it.cantidad),
        it.nombre,
        formatearMoneda(it.precio),
        formatearMoneda(it.cantidad * it.precio),
      ]
  );

  autoTable(doc, {
    startY: y,
    head: headers,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [26, 10, 14],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [217, 10, 70],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: esCatering
      ? {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 28 },
      }
      : {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left' },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 28 },
      },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 8;

  const totalesX = pageWidth - margin - 70;
  const totalesW = 70;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalesX, y, totalesW, 32, 1.5, 1.5, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  let ty = y + 6;
  doc.text('Subtotal:', totalesX + 4, ty);
  doc.text(formatearMoneda(ventaData.subtotal), totalesX + totalesW - 4, ty, { align: 'right' });
  ty += 6;

  doc.text('Descuento:', totalesX + 4, ty);
  doc.text(formatearMoneda(ventaData.descuento || 0), totalesX + totalesW - 4, ty, { align: 'right' });
  ty += 6;

  doc.text('IGV (18%):', totalesX + 4, ty);
  doc.text(formatearMoneda(ventaData.igv), totalesX + totalesW - 4, ty, { align: 'right' });
  ty += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(totalesX + 4, ty, totalesX + totalesW - 4, ty);
  ty += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 10, 70);
  doc.text('TOTAL:', totalesX + 4, ty);
  doc.text(formatearMoneda(ventaData.total), totalesX + totalesW - 4, ty, { align: 'right' });

  y = ty + 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('MÉTODO DE PAGO:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ventaData.metodoPago || '-', margin + 40, y);

  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    'Representación impresa de la Factura Electrónica',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    'Generada por Yehinnerta Delicias',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );
};

// ═══════════════════════════════════════════════════════════════════
// HELPER: Dibuja una sección con barra lateral roja (jsPDF)
// ═══════════════════════════════════════════════════════════════════

interface SeccionOpts {
  titulo: string;
  filas: [string, string][];
  x: number;
  y: number;
  ancho: number;
}

const dibujarSeccion = (doc: any, opts: SeccionOpts): number => {
  const { titulo, filas, x, y, ancho } = opts;
  const alturaLinea = 5;
  const altura = 10 + filas.length * alturaLinea;

  doc.setFillColor(...COLOR_FONDO_SECCION);
  doc.rect(x, y, ancho, altura, 'F');

  doc.setFillColor(217, 10, 70);
  doc.rect(x, y, 1.5, altura, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 10, 70);
  doc.text(titulo, x + 5, y + 6);

  doc.setFontSize(9);
  let fy = y + 11;
  filas.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(label, x + 5, fy);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 10, 14);
    doc.text(String(valor || '-'), x + 45, fy);

    fy += alturaLinea;
  });

  return y + altura + 4;
};

// ═══════════════════════════════════════════════════════════════════
// GENERADOR PDF — TICKET 80mm (jsPDF)
// ═══════════════════════════════════════════════════════════════════

const generarTicketPDF = async (
  ventaData: VentaCompatible,
  doc: any
): Promise<void> => {
  const esCatering = esEventoCatering(ventaData);
  const items = extraerItems(ventaData);
  const empresa = DEFAULT_EMPRESA;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 3;
  const anchoUtil = pageWidth - margin * 2;
  let y = margin + 5;

  doc.setFont('courier', 'normal');

  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    try {
      const logoSize = 15;
      const logoX = (pageWidth - logoSize) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, y, logoSize, logoSize);
      y += logoSize + 2;
    } catch (e) {
      console.warn('[pdfService] Error al agregar logo:', e);
    }
  }

  doc.setFontSize(10);
  doc.setFont('courier', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(empresa.razonSocial, pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.text(`RUC: ${empresa.ruc}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('courier', 'bold');
  doc.text('TICKET DE VENTA', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.text(`N° ${ventaData.numero}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Fecha: ${fechaActual()}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.text(`Cliente: ${(ventaData.cliente || '-').substring(0, 30)}`, margin, y);
  y += 4;
  doc.text(`Doc:     ${ventaData.clienteDoc || '-'}`, margin, y);
  y += 6;

  if (esCatering) {
    const ev = normalizarEventoData((ventaData as any).eventoData);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('courier', 'bold');
    doc.text('DATOS DEL EVENTO', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('courier', 'normal');

    doc.text(`Evento:    ${formatearFecha(ev?.fecha)}`, margin, y);
    y += 4;
    doc.text(`Horario:   ${formatearHorario(ev?.horario)}`, margin, y);
    y += 4;
    doc.text(`Personas:  ${ev?.personas || '-'}`, margin, y);
    y += 4;
    doc.text(`Servicio:  ${(ev?.tipoDesayuno || '-').substring(0, 20)}`, margin, y);
    y += 4;

    if (ev?.direccion) {
      const lineas = doc.splitTextToSize(`Lugar:     ${ev.direccion}`, anchoUtil);
      doc.text(lineas, margin, y);
      y += lineas.length * 4;
    }
    if (ev?.referencia) {
      const lineas = doc.splitTextToSize(`Ref:       ${ev.referencia}`, anchoUtil);
      doc.text(lineas, margin, y);
      y += lineas.length * 4;
    }
    if (ev?.incluir_mozo && ev?.cantidad_mozos) {
      doc.text(`Mozos:     ${ev.cantidad_mozos} (${formatearMoneda(ev.subtotal_mozo || 0)})`, margin, y);
      y += 4;
    }

    y += 2;
  }

  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('courier', 'bold');
  doc.text('Cant  Descripción', margin, y);
  doc.text('Importe', pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.setFont('courier', 'normal');
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  items.forEach((it) => {
    const descCorta = it.nombre.length > 18 ? it.nombre.substring(0, 17) + '…' : it.nombre;
    doc.text(String(it.cantidad).padStart(3, ' '), margin, y);
    doc.text(descCorta, margin + 10, y);
    doc.text(formatearMoneda(it.cantidad * it.precio), pageWidth - margin, y, { align: 'right' });
    y += 4;
  });

  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('courier', 'normal');
  doc.text('Subtotal:', margin, y);
  doc.text(formatearMoneda(ventaData.subtotal), pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.text('Descuento:', margin, y);
  doc.text(formatearMoneda(ventaData.descuento || 0), pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.text('IGV (18%):', margin, y);
  doc.text(formatearMoneda(ventaData.igv), pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('courier', 'bold');
  doc.text('TOTAL:', margin, y);
  doc.text(formatearMoneda(ventaData.total), pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFont('courier', 'normal');
  doc.text(`Pago: ${ventaData.metodoPago || '-'}`, margin, y);
  y += 6;

  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('¡Gracias por su preferencia!', pageWidth / 2, y, { align: 'center' });
};

// ═══════════════════════════════════════════════════════════════════
// GENERADOR PDF — COTIZACIÓN (pdf-lib + PDF membretado de fondo)
// ═══════════════════════════════════════════════════════════════════

/**
 * Dibuja una tabla sobre el PDF (con pdf-lib).
 * Devuelve el cursor Y actualizado.
 */
/**
 * Dibuja una tabla con paginación automática.
 * Si el contenido excede el espacio, llama al callback para crear nueva página.
 */
/**
 * Dibuja una tabla con paginación automática.
 * Si no cabe, llama a asegurarEspacio que maneja el salto de página.
 */
const dibujarTablaConPaginacion = (
  getPage: () => any,
  setPage: (p: any) => void,
  titulo: string,
  items: ItemPDF[],
  x: number,
  yStart: number,
  ancho: number,
  fontRegular: any,
  fontBold: any,
  yBottomLimit: number,
  yTopUtil: number,
  asegurarEspacio: (altura: number) => void
): number => {
  const colorHeader = hexToRgbPDF(COLOR_PRINCIPAL);
  const colorTexto = hexToRgbPDF(COLOR_TEXTO);
  const colorBlanco = rgb(1, 1, 1);
  const colorGrisFila = hexToRgbPDF('#fafafa');

  let page = getPage();
  let y = yStart;

  const colCant = mmToPt(15);
  const colPUnit = mmToPt(25);
  const colImporte = mmToPt(28);
  const colDesc = ancho - colCant - colPUnit - colImporte;

  const colX = {
    cant: x,
    desc: x + colCant,
    punit: x + colCant + colDesc,
    importe: x + colCant + colDesc + colPUnit,
  };

  const dibujarHeader = (): void => {
    page = getPage();

    // Título
    page.drawText(titulo, {
      x,
      y,
      size: 10,
      font: fontBold,
      color: colorHeader,
    });
    y -= mmToPt(6);

    // Header columnas
    const headerH = mmToPt(7);
    page.drawRectangle({
      x,
      y: y - headerH,
      width: ancho,
      height: headerH,
      color: colorHeader,
    });

    const headerTextoY = y - mmToPt(4.5);
    page.drawText('Cant.', {
      x: colX.cant + mmToPt(2),
      y: headerTextoY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });
    page.drawText('Descripción', {
      x: colX.desc + mmToPt(2),
      y: headerTextoY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });
    page.drawText('P.Unit', {
      x: colX.punit + mmToPt(2),
      y: headerTextoY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });
    page.drawText('Importe', {
      x: colX.importe + mmToPt(2),
      y: headerTextoY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });

    y -= headerH;
  };

  // Espacio para header de tabla
  asegurarEspacio(mmToPt(13));
  page = getPage();
  y = yStart; // ⚠️ importante: recalcular y después de asegurarEspacio

  // Refrescamos el Y desde el state (asegurarEspacio pudo haber cambiado cursorY)
  // ⚠️ Por diseño, el Y debe venir del llamador. Vamos a rediseñar:
  // El llamador debe pasar el cursorY actual y recibir el nuevo.

  // Simplificación: como asegurarEspacio actualiza el cursorY del llamador,
  // pero acá no tenemos acceso a esa variable, devolvemos el Y calculado y 
  // el llamador reajusta. Para evitar más cambios, uso una versión "best effort".

  // En la práctica: si el header cabe (lo verificamos), dibujamos.
  dibujarHeader();

  const rowH = mmToPt(5.5);
  items.forEach((item, idx) => {
    // Chequear espacio para esta fila
    if (y - rowH < yBottomLimit) {
      // No cabe → nueva página
      asegurarEspacio(rowH + mmToPt(10));
      page = getPage();
      // Redibujamos header en la nueva página
      y = yTopUtil;
      dibujarHeader();
    }

    if (idx % 2 === 1) {
      page.drawRectangle({
        x,
        y: y - rowH,
        width: ancho,
        height: rowH,
        color: colorGrisFila,
      });
    }

    const rowY = y - mmToPt(4);

    page.drawText(String(item.cantidad), {
      x: colX.cant + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    const desc = item.nombre.length > 45
      ? item.nombre.substring(0, 42) + '...'
      : item.nombre;
    page.drawText(desc, {
      x: colX.desc + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    page.drawText(formatearMoneda(item.precio), {
      x: colX.punit + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    page.drawText(formatearMoneda(item.cantidad * item.precio), {
      x: colX.importe + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    y -= rowH;
  });

  return y;
};

// ═══════════════════════════════════════════════════════════════════
// HELPER: Dibuja un grupo (título + tabla + subtotal) con paginación
// ═══════════════════════════════════════════════════════════════════

interface EstadoPaginacion {
  getPage: () => any;
  getCursorY: () => number;
  setCursorY: (y: number) => void;
  asegurarEspacio: (altura: number) => void;
  yTopUtil: number;
  yBottomUtil: number;
}

const dibujarGrupoConSubtotal = (
  estado: EstadoPaginacion,
  grupo: GrupoPDF,
  x: number,
  ancho: number,
  fontRegular: any,
  fontBold: any
): number => {
  if (grupo.items.length === 0) return estado.getCursorY();

  const colorPrincipal = hexToRgbPDF(COLOR_PRINCIPAL);
  const colorTexto = hexToRgbPDF(COLOR_TEXTO);
  const colorBlanco = rgb(1, 1, 1);
  const colorGrisFila = hexToRgbPDF('#fafafa');
  const colorSubtotalBg = hexToRgbPDF('#f0f0f0');

  // Anchos de columnas
  const colCant = mmToPt(15);
  const colPUnit = mmToPt(25);
  const colImporte = mmToPt(28);
  const colDesc = ancho - colCant - colPUnit - colImporte;

  const colX = {
    cant: x,
    desc: x + colCant,
    punit: x + colCant + colDesc,
    importe: x + colCant + colDesc + colPUnit,
  };

  let page = estado.getPage();
  let cursorY = estado.getCursorY();

  // ─── Dibujar título del grupo ───
  const dibujarTituloGrupo = (): void => {
    page = estado.getPage();
    cursorY = estado.getCursorY();

    // Barra vertical roja
    page.drawRectangle({
      x,
      y: cursorY - mmToPt(3.5),
      width: mmToPt(1.5),
      height: mmToPt(5),
      color: colorPrincipal,
    });

    // Texto del título
    page.drawText(grupo.titulo, {
      x: x + mmToPt(5),
      y: cursorY - mmToPt(2),
      size: 10,
      font: fontBold,
      color: colorPrincipal,
    });

    cursorY -= mmToPt(7);
    estado.setCursorY(cursorY);
  };

  // ─── Dibujar header de tabla ───
  const dibujarHeaderTabla = (): void => {
    page = estado.getPage();
    cursorY = estado.getCursorY();

    const headerH = mmToPt(7);

    page.drawRectangle({
      x,
      y: cursorY - headerH,
      width: ancho,
      height: headerH,
      color: colorPrincipal,
    });

    const headerY = cursorY - mmToPt(4.5);

    page.drawText('Cant.', {
      x: colX.cant + mmToPt(2),
      y: headerY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });
    page.drawText('Descripción', {
      x: colX.desc + mmToPt(2),
      y: headerY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });
    page.drawText('P.Unit', {
      x: colX.punit + mmToPt(2),
      y: headerY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });
    page.drawText('Importe', {
      x: colX.importe + mmToPt(2),
      y: headerY,
      size: 9,
      font: fontBold,
      color: colorBlanco,
    });

    cursorY -= headerH;
    estado.setCursorY(cursorY);
  };

  // ─── Calcular subtotal del grupo ───
  const subtotalGrupo = grupo.items.reduce(
    (s, it) => s + it.cantidad * it.precio,
    0
  );

  // ─── Reservar espacio para título + header + primeras filas ───
  const alturaMinima = mmToPt(7) + mmToPt(7) + mmToPt(5.5);
  estado.asegurarEspacio(alturaMinima);

  // ─── Dibujar título y header ───
  dibujarTituloGrupo();
  dibujarHeaderTabla();

  // ─── Dibujar filas ───
  const rowH = mmToPt(5.5);

  grupo.items.forEach((item, idx) => {
    // Si no cabe la fila → nueva página + redibujar título y header
    if (estado.getCursorY() - rowH < estado.yBottomUtil) {
      estado.asegurarEspacio(rowH);
      dibujarTituloGrupo();
      dibujarHeaderTabla();
    }

    page = estado.getPage();
    cursorY = estado.getCursorY();

    // Fondo alternado
    if (idx % 2 === 1) {
      page.drawRectangle({
        x,
        y: cursorY - rowH,
        width: ancho,
        height: rowH,
        color: colorGrisFila,
      });
    }

    const rowY = cursorY - mmToPt(4);

    page.drawText(String(item.cantidad), {
      x: colX.cant + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    const desc =
      item.nombre.length > 45
        ? item.nombre.substring(0, 42) + '...'
        : item.nombre;

    page.drawText(desc, {
      x: colX.desc + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    page.drawText(formatearMoneda(item.precio), {
      x: colX.punit + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    page.drawText(formatearMoneda(item.cantidad * item.precio), {
      x: colX.importe + mmToPt(2),
      y: rowY,
      size: 8.5,
      font: fontRegular,
      color: colorTexto,
    });

    cursorY -= rowH;
    estado.setCursorY(cursorY);
  });

  // ─── Fila de subtotal ───
  if (estado.getCursorY() - mmToPt(7) < estado.yBottomUtil) {
    estado.asegurarEspacio(mmToPt(10));
  }

  page = estado.getPage();
  cursorY = estado.getCursorY();

  // Fondo gris claro
  page.drawRectangle({
    x,
    y: cursorY - mmToPt(6),
    width: ancho,
    height: mmToPt(6),
    color: colorSubtotalBg,
  });

  // Línea superior
  page.drawLine({
    start: { x, y: cursorY },
    end: { x: x + ancho, y: cursorY },
    thickness: 0.3,
    color: colorTexto,
  });

  const subtotalY = cursorY - mmToPt(4);

  page.drawText('Subtotal', {
    x: colX.desc + mmToPt(2),
    y: subtotalY,
    size: 9,
    font: fontBold,
    color: colorTexto,
  });

  const subtotalTxt = formatearMoneda(subtotalGrupo);
  const subtotalW = fontBold.widthOfTextAtSize(subtotalTxt, 9);
  page.drawText(subtotalTxt, {
    x: colX.importe + mmToPt(2),
    y: subtotalY,
    size: 9,
    font: fontBold,
    color: colorPrincipal,
  });

  cursorY -= mmToPt(8);
  estado.setCursorY(cursorY);

  return cursorY;
};

// ═══════════════════════════════════════════════════════════════════
// GENERADOR PDF — COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════

const generarCotizacionConFondo = async (
  ventaData: VentaCompatible
): Promise<boolean> => {
  try {
    // ─── 1) Cargar PDF membretado ───
    const pdfBytes = await cargarRecursoBytes(PDF_MEMBRETADO_URL);
    if (!pdfBytes) {
      console.error('[pdfService] No se pudo cargar el PDF membretado');
      return false;
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const templatePdf = await PDFDocument.load(pdfBytes);

    // ─── 2) Preparar datos ───
    const esCatering = esEventoCatering(ventaData);
    const numeroCotizacion = generarNumeroCotizacion(ventaData);
    const ev = normalizarEventoData((ventaData as any).eventoData);

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUIR GRUPOS
    // ═══════════════════════════════════════════════════════════════

    const grupos: GrupoPDF[] = [];

    if (esCatering) {
      // ─── Servicios agrupados por tipoNombre ───
      const serviciosAgrupados = new Map<string, ItemPDF[]>();

      ((ventaData as VentaCatering).servicios || []).forEach((serv: any) => {
        const tipoNombre = serv.tipoNombre || 'Sin categoría';

        (serv.productos || []).forEach((p: any) => {
          const item: ItemPDF = {
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio: p.precio,
            tipo: 'Servicio',
            categoria: tipoNombre,
          };

          if (serviciosAgrupados.has(tipoNombre)) {
            serviciosAgrupados.get(tipoNombre)!.push(item);
          } else {
            serviciosAgrupados.set(tipoNombre, [item]);
          }
        });
      });

      // Convertir a array respetando orden de BD
      serviciosAgrupados.forEach((items, tipoNombre) => {
        if (items.length > 0) {
          grupos.push({ titulo: tipoNombre, items });
        }
      });

      // ─── Adicionales (mozos) ───
      const adicionales: ItemPDF[] = [];
      if (ev?.incluir_mozo && (ev.subtotal_mozo || 0) > 0) {
        adicionales.push({
          nombre: 'Servicio de mozo',
          cantidad: ev.cantidad_mozos || 0,
          precio: ev.precio_mozo || 0,
          tipo: 'Servicio',
        });
      }
      if (adicionales.length > 0) {
        grupos.push({ titulo: 'Adicionales', items: adicionales });
      }

      // ─── Materiales ───
      const materiales: ItemPDF[] = (
        (ventaData as VentaCatering).materiales || []
      ).map((m: any) => ({
        nombre: m.nombre,
        cantidad: m.cantidad,
        precio: m.precio,
        tipo: 'Material',
      }));

      if (materiales.length > 0) {
        grupos.push({
          titulo: 'Materiales y Equipamiento',
          items: materiales,
        });
      }
    } else {
      // ─── Tienda: un solo grupo con todos los productos ───
      const productos: ItemPDF[] = (ventaData.productos || []).map((p: any) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        tipo: 'Producto',
      }));

      if (productos.length > 0) {
        grupos.push({ titulo: 'Productos', items: productos });
      }
    }

    // ─── 3) Cargar firma ───
    const firmaBytes = await cargarRecursoBytes(FIRMA_VENDEDOR_URL);
    let firmaImage: any = null;
    if (firmaBytes) {
      try {
        firmaImage = await pdfDoc.embedPng(firmaBytes);
      } catch (e) {
        console.warn('[pdfService] Error al embeber firma:', e);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONSTANTES DE PÁGINA
    // ═══════════════════════════════════════════════════════════════

    const pageWidth = mmToPt(210);
    const pageHeight = mmToPt(297);
    const marginLeft = mmToPt(15);
    const marginRight = mmToPt(15);
    const anchoUtil = pageWidth - marginLeft - marginRight;

    const yTopUtil = pageHeight - mmToPt(52);
    const yBottomUtil = mmToPt(52);

    // ═══════════════════════════════════════════════════════════════
    // PAGINACIÓN: Precargar N copias del fondo
    // ═══════════════════════════════════════════════════════════════

    const MAX_PAGINAS = 10;
    const paginasFondo: any[] = [];
    for (let i = 0; i < MAX_PAGINAS; i++) {
      const [copia] = await pdfDoc.copyPages(templatePdf, [0]);
      paginasFondo.push(copia);
    }

    let paginasUsadas = 0;

    while (pdfDoc.getPageCount() > 0) {
      pdfDoc.removePage(0);
    }

    const primeraPagina = paginasFondo[0];
    pdfDoc.addPage(primeraPagina);
    let currentPage = primeraPagina;
    paginasUsadas = 1;
    let cursorY = yTopUtil;

    const colorPrincipal = hexToRgbPDF(COLOR_PRINCIPAL);
    const colorTexto = hexToRgbPDF(COLOR_TEXTO);
    const colorGris = hexToRgbPDF('#333333');

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    const asegurarEspacio = (alturaNecesaria: number): void => {
      if (cursorY - alturaNecesaria < yBottomUtil) {
        if (paginasUsadas >= MAX_PAGINAS) {
          console.warn('[pdfService] Máximo de páginas alcanzado');
          return;
        }
        const nuevaPagina = paginasFondo[paginasUsadas];
        pdfDoc.addPage(nuevaPagina);
        currentPage = nuevaPagina;
        paginasUsadas++;
        cursorY = yTopUtil;
      }
    };

    const escribir = (
      texto: string,
      x: number,
      y: number,
      opts: { font?: any; size?: number; color?: any } = {}
    ) => {
      currentPage.drawText(texto, {
        x,
        y,
        size: opts.size || 9,
        font: opts.font || fontRegular,
        color: opts.color || colorTexto,
      });
    };

    const lineaGris = (
      x: number,
      y: number,
      w: number,
      thickness = 0.3
    ) => {
      currentPage.drawLine({
        start: { x, y },
        end: { x: x + w, y },
        thickness,
        color: hexToRgbPDF('#cccccc'),
      });
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDERIZADO
    // ═══════════════════════════════════════════════════════════════

    // ─── TÍTULO ───
    const titulo = 'COTIZACIÓN';
    const tituloSize = 18;
    const tituloWidth = fontBold.widthOfTextAtSize(titulo, tituloSize);
    escribir(titulo, (pageWidth - tituloWidth) / 2, cursorY, {
      font: fontBold,
      size: tituloSize,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(8);

    const numeroTxt = `N° ${numeroCotizacion}`;
    const numeroSize = 11;
    const numeroWidth = fontBold.widthOfTextAtSize(numeroTxt, numeroSize);
    escribir(numeroTxt, (pageWidth - numeroWidth) / 2, cursorY, {
      font: fontBold,
      size: numeroSize,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(12);

    // ─── FECHA ───
    const fechaVenta =
      ventaData.fechaObj instanceof Date
        ? ventaData.fechaObj
        : new Date(ventaData.fecha);
    const fechaTexto = `Lima, ${formatearFechaTexto(
      isNaN(fechaVenta.getTime()) ? new Date() : fechaVenta
    )}`;
    escribir(fechaTexto, marginLeft, cursorY, { size: 10, color: colorGris });
    cursorY -= mmToPt(10);

    // ─── DATOS CLIENTE + EVENTO ───
    const labelX = marginLeft;
    const valueX = marginLeft + mmToPt(35);

    const escribirFila = (label: string, value: string) => {
      asegurarEspacio(mmToPt(5));
      escribir(label, labelX, cursorY, { font: fontBold, size: 9 });
      escribir(value, valueX, cursorY, { size: 9, color: colorGris });
      cursorY -= mmToPt(5);
    };

    escribirFila('Razón Social:', ventaData.cliente || '-');
    escribirFila('RUC/DNI:', ventaData.clienteDoc || '-');

    if (esCatering && ev) {
      if (ev.fecha) escribirFila('Fecha evento:', formatearFecha(ev.fecha));
      if (ev.tipoDesayuno)
        escribirFila('Tipo de Servicio:', ev.tipoDesayuno);

      if (ev.direccion) {
        const direccionCompleta = ev.referencia
          ? `${ev.direccion} - Ref: ${ev.referencia}`
          : ev.direccion;
        escribirFila('Lugar:', direccionCompleta);
      }

      if (ev.incluir_mozo && ev.cantidad_mozos) {
        escribirFila(
          'Personal:',
          `${ev.cantidad_mozos} mozo(s) (${formatearMoneda(
            ev.subtotal_mozo || 0
          )})`
        );
      }
    }

    cursorY -= mmToPt(4);

    // ─── TEXTO INTRODUCTORIO ───
    const tipoServicio = ev?.tipoDesayuno || 'nuestros servicios';
    const personas = ev?.personas || 0;
    const horario = formatearHorario(ev?.horario);
    const lugar = ev?.direccion || 'las instalaciones indicadas';

    const textoIntro = `Por el presente le saludamos cordialmente y a su vez remitimos la Cotización de ${tipoServicio} para ${personas} personas, en el horario ${horario}, a realizarse en ${lugar}.`;

    const lineasIntro = dividirTextoEnLineas(
      textoIntro,
      fontRegular,
      9.5,
      anchoUtil
    );

    lineasIntro.forEach((lineaTexto) => {
      asegurarEspacio(mmToPt(5));
      escribir(lineaTexto, marginLeft, cursorY, {
        size: 9.5,
        color: colorGris,
      });
      cursorY -= mmToPt(4.5);
    });

    cursorY -= mmToPt(6);

    // ─── GRUPOS ───
    const estadoPaginacion: EstadoPaginacion = {
      getPage: () => currentPage,
      getCursorY: () => cursorY,
      setCursorY: (y: number) => {
        cursorY = y;
      },
      asegurarEspacio: (altura: number) => {
        asegurarEspacio(altura);
      },
      yTopUtil,
      yBottomUtil,
    };

    grupos.forEach((grupo, idx) => {
      dibujarGrupoConSubtotal(
        estadoPaginacion,
        grupo,
        marginLeft,
        anchoUtil,
        fontRegular,
        fontBold
      );

      if (idx < grupos.length - 1) {
        cursorY -= mmToPt(3);
      }
    });

    cursorY -= mmToPt(6);

    // ─── TOTALES GENERALES ───
    asegurarEspacio(mmToPt(28));

    const totalesW = mmToPt(70);
    const totalesX = pageWidth - marginRight - totalesW;

    const filaTotal = (
      label: string,
      valor: string,
      bold = false,
      color = colorGris,
      size = 9
    ) => {
      const f = bold ? fontBold : fontRegular;
      escribir(label, totalesX + mmToPt(3), cursorY, { font: f, size, color });
      const valorWidth = f.widthOfTextAtSize(valor, size);
      escribir(valor, totalesX + totalesW - mmToPt(3) - valorWidth, cursorY, {
        font: f,
        size,
        color,
      });
      cursorY -= mmToPt(5);
    };

    filaTotal('Subtotal:', formatearMoneda(ventaData.subtotal));
    if ((ventaData.descuento || 0) > 0) {
      filaTotal('Descuento:', formatearMoneda(ventaData.descuento || 0));
    }
    filaTotal('IGV (18%):', formatearMoneda(ventaData.igv));

    lineaGris(totalesX + mmToPt(3), cursorY + mmToPt(2), totalesW - mmToPt(6));
    cursorY -= mmToPt(2);

    filaTotal(
      'TOTAL:',
      formatearMoneda(ventaData.total),
      true,
      colorPrincipal,
      12
    );
    cursorY -= mmToPt(10);

    // ─── TÉRMINOS Y CONDICIONES ───
    asegurarEspacio(mmToPt(45));

    escribir('TÉRMINOS Y CONDICIONES:', marginLeft, cursorY, {
      font: fontBold,
      size: 10,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(6);

    const terminos = [
      '1. Forma de Pago: 50% de adelanto a la confirmación del servicio y el saldo el día del evento.',
      '2. Precio No incluye IGV.',
      '3. Incluye Movilidad dentro de Lima Metropolitana.',
      '4. Cuenta Bancaria - Banco Interbank',
      '   Cuenta Negocios Soles: 3763007028797',
      '   CC Interbancario Soles: 00337600300702879711',
    ];

    terminos.forEach((t) => {
      const lineasT = dividirTextoEnLineas(t, fontRegular, 8.5, anchoUtil);
      lineasT.forEach((lineaTexto) => {
        asegurarEspacio(mmToPt(5));
        escribir(lineaTexto, marginLeft, cursorY, {
          size: 8.5,
          color: colorGris,
        });
        cursorY -= mmToPt(4);
      });
    });

    cursorY -= mmToPt(8);

    // ─── FIRMA ───
    const firmaBlockH = mmToPt(38);
    asegurarEspacio(firmaBlockH);

    const firmaW = mmToPt(50);
    const firmaH = mmToPt(20);
    const firmaX = pageWidth - marginRight - firmaW;
    const firmaY = cursorY - firmaH;

    if (firmaImage) {
      try {
        currentPage.drawImage(firmaImage, {
          x: firmaX + mmToPt(5),
          y: firmaY,
          width: firmaW - mmToPt(10),
          height: firmaH,
        });
      } catch (e) {
        console.warn('[pdfService] Error al dibujar firma:', e);
      }
    }

    currentPage.drawLine({
      start: { x: firmaX, y: firmaY - mmToPt(2) },
      end: { x: firmaX + firmaW, y: firmaY - mmToPt(2) },
      thickness: 0.5,
      color: colorTexto,
    });

    const firmaLabel = 'Firma del Vendedor';
    const firmaLabelW = fontRegular.widthOfTextAtSize(firmaLabel, 9);
    escribir(
      firmaLabel,
      firmaX + (firmaW - firmaLabelW) / 2,
      firmaY - mmToPt(7),
      { size: 9, color: colorGris }
    );

    // ═══════════════════════════════════════════════════════════════
    // GUARDAR
    // ═══════════════════════════════════════════════════════════════

    const pdfFinalBytes = await pdfDoc.save();
    const blob = new Blob([pdfFinalBytes as BlobPart], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cotizacion_${ventaData.numero}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('[pdfService] Error al generar cotización:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════
// GENERADOR PDF — CONTRATO
// ═══════════════════════════════════════════════════════════════════

const generarContratoConFondo = async (
  ventaData: VentaCompatible
): Promise<boolean> => {
  try {
    // ─── 1) Cargar PDF membretado ───
    const pdfBytes = await cargarRecursoBytes(PDF_MEMBRETADO_URL);
    if (!pdfBytes) {
      console.error('[pdfService] No se pudo cargar el PDF membretado');
      return false;
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const templatePdf = await PDFDocument.load(pdfBytes);

    // ─── 2) Preparar datos ───
    const esCatering = esEventoCatering(ventaData);
    const numeroContrato = generarNumeroContrato(ventaData);
    const ev = normalizarEventoData((ventaData as any).eventoData);

    // Solo catering
    if (!esCatering) {
      console.warn('[pdfService] El contrato solo aplica para eventos catering');
      return false;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUIR GRUPOS (igual que en cotización)
    // ═══════════════════════════════════════════════════════════════

    const grupos: GrupoPDF[] = [];

    // Servicios agrupados por tipoNombre
    const serviciosAgrupados = new Map<string, ItemPDF[]>();
    ((ventaData as VentaCatering).servicios || []).forEach((serv: any) => {
      const tipoNombre = serv.tipoNombre || 'Sin categoría';
      (serv.productos || []).forEach((p: any) => {
        const item: ItemPDF = {
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio: p.precio,
          tipo: 'Servicio',
          categoria: tipoNombre,
        };
        if (serviciosAgrupados.has(tipoNombre)) {
          serviciosAgrupados.get(tipoNombre)!.push(item);
        } else {
          serviciosAgrupados.set(tipoNombre, [item]);
        }
      });
    });

    serviciosAgrupados.forEach((items, tipoNombre) => {
      if (items.length > 0) {
        grupos.push({ titulo: tipoNombre, items });
      }
    });

    // Adicionales (mozos)
    const adicionales: ItemPDF[] = [];
    if (ev?.incluir_mozo && (ev.subtotal_mozo || 0) > 0) {
      adicionales.push({
        nombre: 'Servicio de mozo',
        cantidad: ev.cantidad_mozos || 0,
        precio: ev.precio_mozo || 0,
        tipo: 'Servicio',
      });
    }
    if (adicionales.length > 0) {
      grupos.push({ titulo: 'Adicionales', items: adicionales });
    }

    // Materiales
    const materiales: ItemPDF[] = ((ventaData as VentaCatering).materiales || []).map(
      (m: any) => ({
        nombre: m.nombre,
        cantidad: m.cantidad,
        precio: m.precio,
        tipo: 'Material',
      })
    );
    if (materiales.length > 0) {
      grupos.push({ titulo: 'Materiales y Equipamiento', items: materiales });
    }

    // ─── 3) Cargar firma del vendedor ───
    const firmaBytes = await cargarRecursoBytes(FIRMA_VENDEDOR_URL);
    let firmaImage: any = null;
    if (firmaBytes) {
      try {
        firmaImage = await pdfDoc.embedPng(firmaBytes);
      } catch (e) {
        console.warn('[pdfService] Error al embeber firma:', e);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONSTANTES DE PÁGINA
    // ═══════════════════════════════════════════════════════════════

    const pageWidth = mmToPt(210);
    const pageHeight = mmToPt(297);
    const marginLeft = mmToPt(15);
    const marginRight = mmToPt(15);
    const anchoUtil = pageWidth - marginLeft - marginRight;

    const yTopUtil = pageHeight - mmToPt(52);
    const yBottomUtil = mmToPt(52);

    // ═══════════════════════════════════════════════════════════════
    // PAGINACIÓN
    // ═══════════════════════════════════════════════════════════════

    const MAX_PAGINAS = 10;
    const paginasFondo: any[] = [];
    for (let i = 0; i < MAX_PAGINAS; i++) {
      const [copia] = await pdfDoc.copyPages(templatePdf, [0]);
      paginasFondo.push(copia);
    }

    let paginasUsadas = 0;

    while (pdfDoc.getPageCount() > 0) {
      pdfDoc.removePage(0);
    }

    const primeraPagina = paginasFondo[0];
    pdfDoc.addPage(primeraPagina);
    let currentPage = primeraPagina;
    paginasUsadas = 1;
    let cursorY = yTopUtil;

    const colorPrincipal = hexToRgbPDF(COLOR_PRINCIPAL);
    const colorTexto = hexToRgbPDF(COLOR_TEXTO);
    const colorGris = hexToRgbPDF('#333333');

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    const asegurarEspacio = (alturaNecesaria: number): void => {
      if (cursorY - alturaNecesaria < yBottomUtil) {
        if (paginasUsadas >= MAX_PAGINAS) {
          console.warn('[pdfService] Máximo de páginas alcanzado');
          return;
        }
        const nuevaPagina = paginasFondo[paginasUsadas];
        pdfDoc.addPage(nuevaPagina);
        currentPage = nuevaPagina;
        paginasUsadas++;
        cursorY = yTopUtil;
      }
    };

    const escribir = (
      texto: string,
      x: number,
      y: number,
      opts: { font?: any; size?: number; color?: any } = {}
    ) => {
      currentPage.drawText(texto, {
        x,
        y,
        size: opts.size || 9,
        font: opts.font || fontRegular,
        color: opts.color || colorTexto,
      });
    };

    const escribirCentrado = (
      texto: string,
      y: number,
      opts: { font?: any; size?: number; color?: any } = {}
    ) => {
      const font = opts.font || fontBold;
      const size = opts.size || 9;
      const width = font.widthOfTextAtSize(texto, size);
      escribir(texto, (pageWidth - width) / 2, y, opts);
    };

    /**
 * Escribe texto centrado dentro de un bloque horizontal (x, w)
 */
    const escribirEnBloqueCentrado = (
      texto: string,
      y: number,
      bloqueX: number,
      bloqueW: number,
      opts: { font?: any; size?: number; color?: any } = {}
    ) => {
      const font = opts.font || fontRegular;
      const size = opts.size || 9;
      const width = font.widthOfTextAtSize(texto, size);
      const x = bloqueX + (bloqueW - width) / 2;
      escribir(texto, x, y, opts);
    };

    const escribirParrafo = (
      texto: string,
      x: number,
      yStart: number,
      ancho: number,
      opts: { font?: any; size?: number; color?: any; lineHeight?: number } = {}
    ): number => {
      const size = opts.size || 9;
      const lineHeight = opts.lineHeight || mmToPt(4.5);
      const lineas = dividirTextoEnLineas(texto, opts.font || fontRegular, size, ancho);

      let y = yStart;
      lineas.forEach((linea) => {
        asegurarEspacio(lineHeight);
        escribir(linea, x, y, opts);
        y -= lineHeight;
      });
      return y;
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDERIZADO DEL CONTRATO
    // ═══════════════════════════════════════════════════════════════

    // ─── TÍTULO ───
    escribirCentrado('CONTRATO DE PRESTACIÓN DE SERVICIOS', cursorY, {
      font: fontBold,
      size: 15,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(7);

    escribirCentrado('DE CATERING', cursorY, {
      font: fontBold,
      size: 15,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(8);

    escribirCentrado(`N° ${numeroContrato}`, cursorY, {
      font: fontBold,
      size: 11,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(12);

    // ─── PÁRRAFO INTRODUCTORIO ───
    const cliente = ventaData.cliente || '-';
    const clienteDoc = ventaData.clienteDoc || '-';

    const textoIntro = `Conste por el presente documento el Contrato de Prestación de Servicios de Catering que celebran, de una parte, DELICIAS ALI SAC, con RUC 20613823027, debidamente representada por su Gerente General, en adelante "EL PROVEEDOR"; y de la otra parte, ${cliente}, con documento ${clienteDoc}, en adelante "EL CLIENTE", en los términos y condiciones siguientes:`;

    cursorY = escribirParrafo(textoIntro, marginLeft, cursorY, anchoUtil, {
      size: 9,
      color: colorTexto,
      lineHeight: mmToPt(4.5),
    });
    cursorY -= mmToPt(5);

    // ─── Helper para cláusula con título + texto ───
    const escribirClausula = (
      titulo: string,
      texto: string,
      alturaMinTitulo: number = 12
    ): void => {
      // Reservar espacio mínimo para el título + 2 líneas
      asegurarEspacio(mmToPt(alturaMinTitulo));

      // Título de la cláusula
      escribir(titulo, marginLeft, cursorY, {
        font: fontBold,
        size: 10,
        color: colorPrincipal,
      });
      cursorY -= mmToPt(5);

      // Cuerpo de la cláusula
      cursorY = escribirParrafo(texto, marginLeft, cursorY, anchoUtil, {
        size: 9,
        color: colorTexto,
        lineHeight: mmToPt(4.5),
      });
      cursorY -= mmToPt(4);
    };

    // ─── Helper para cláusula con bullets ───
    const escribirClausulaConBullets = (
      titulo: string,
      bullets: string[]
    ): void => {
      asegurarEspacio(mmToPt(15));

      escribir(titulo, marginLeft, cursorY, {
        font: fontBold,
        size: 10,
        color: colorPrincipal,
      });
      cursorY -= mmToPt(5);

      bullets.forEach((bullet) => {
        cursorY = escribirParrafo(`• ${bullet}`, marginLeft, cursorY, anchoUtil, {
          size: 9,
          color: colorTexto,
          lineHeight: mmToPt(4.5),
        });
      });
      cursorY -= mmToPt(4);
    };

    // ─── CLÁUSULAS ───

    escribirClausula(
      'PRIMERA: OBJETO DEL CONTRATO',
      `EL PROVEEDOR se compromete a brindar el servicio de ${ev?.tipoDesayuno || 'catering'} para ${ev?.personas || 0} personas, en la fecha, hora y lugar indicados en la cláusula siguiente, conforme al detalle anexo al presente documento.`
    );

    escribirClausula(
      'SEGUNDA: FECHA, HORA Y LUGAR DEL EVENTO',
      `El evento se llevará a cabo el día ${formatearFecha(ev?.fecha)} a las ${formatearHorario(ev?.horario)}, en ${ev?.direccion || 'las instalaciones indicadas'}${ev?.referencia ? `, referencia ${ev.referencia}` : ''}.`
    );

    escribirClausula(
      'TERCERA: MONTO Y FORMA DE PAGO',
      `El monto total del servicio asciende a ${formatearMoneda(ventaData.total)}. La forma de pago será: 50% de adelanto a la firma del presente contrato y el saldo el día del evento. Los precios no incluyen IGV.`
    );

    escribirClausulaConBullets('CUARTA: OBLIGACIONES DEL PROVEEDOR', [
      'Cumplir con la fecha y hora pactada.',
      'Brindar el servicio con calidad, higiene y presentación.',
      'Incluir movilidad dentro de Lima Metropolitana.',
      'Contar con personal debidamente uniformado.',
    ]);

    escribirClausulaConBullets('QUINTA: OBLIGACIONES DEL CLIENTE', [
      'Pagar el monto pactado en la forma establecida.',
      'Proporcionar acceso y condiciones adecuadas en el lugar del evento.',
      'Confirmar la asistencia y cambios con al menos 48 horas de anticipación.',
    ]);

    escribirClausula(
      'SEXTA: CANCELACIONES Y REPROGRAMACIONES',
      'Las cancelaciones realizadas con menos de 48 horas de anticipación generarán un cargo del 50% del monto total. Las reprogramaciones están sujetas a disponibilidad de agenda.'
    );

    escribirClausula(
      'SÉPTIMA: RESPONSABILIDADES',
      'EL PROVEEDOR no se responsabiliza por daños ocasionados por terceros ajenos al servicio, ni por causas de fuerza mayor.'
    );

    escribirClausula(
      'OCTAVA: RESOLUCIÓN DE CONFLICTOS',
      'Ambas partes se comprometen a resolver cualquier controversia mediante diálogo directo y buena fe.'
    );

    cursorY -= mmToPt(4);

    // ─── ANEXO: DETALLE DE SERVICIOS ───
    asegurarEspacio(mmToPt(20));

    escribir('ANEXO: DETALLE DE SERVICIOS CONTRATADOS', marginLeft, cursorY, {
      font: fontBold,
      size: 11,
      color: colorPrincipal,
    });
    cursorY -= mmToPt(8);

    // ─── Grupos (servicios + adicionales + materiales) ───
    const estadoPaginacion: EstadoPaginacion = {
      getPage: () => currentPage,
      getCursorY: () => cursorY,
      setCursorY: (y: number) => {
        cursorY = y;
      },
      asegurarEspacio: (altura: number) => {
        asegurarEspacio(altura);
      },
      yTopUtil,
      yBottomUtil,
    };

    grupos.forEach((grupo, idx) => {
      dibujarGrupoConSubtotal(
        estadoPaginacion,
        grupo,
        marginLeft,
        anchoUtil,
        fontRegular,
        fontBold
      );

      if (idx < grupos.length - 1) {
        cursorY -= mmToPt(3);
      }
    });

    cursorY -= mmToPt(6);

    // ─── TOTALES GENERALES ───
    asegurarEspacio(mmToPt(28));

    const totalesW = mmToPt(70);
    const totalesX = pageWidth - marginRight - totalesW;

    const filaTotal = (
      label: string,
      valor: string,
      bold = false,
      color = colorGris,
      size = 9
    ) => {
      const f = bold ? fontBold : fontRegular;
      escribir(label, totalesX + mmToPt(3), cursorY, { font: f, size, color });
      const valorWidth = f.widthOfTextAtSize(valor, size);
      escribir(valor, totalesX + totalesW - mmToPt(3) - valorWidth, cursorY, {
        font: f,
        size,
        color,
      });
      cursorY -= mmToPt(5);
    };

    filaTotal('Subtotal:', formatearMoneda(ventaData.subtotal));
    if ((ventaData.descuento || 0) > 0) {
      filaTotal('Descuento:', formatearMoneda(ventaData.descuento || 0));
    }
    filaTotal('IGV (18%):', formatearMoneda(ventaData.igv));

    currentPage.drawLine({
      start: { x: totalesX + mmToPt(3), y: cursorY + mmToPt(2) },
      end: { x: totalesX + totalesW - mmToPt(3), y: cursorY + mmToPt(2) },
      thickness: 0.3,
      color: hexToRgbPDF('#cccccc'),
    });
    cursorY -= mmToPt(2);

    filaTotal('TOTAL:', formatearMoneda(ventaData.total), true, colorPrincipal, 12);
    cursorY -= mmToPt(14);

    // ─── FIRMAS ───
    // Reservar espacio para bloque de firmas (≈50mm)
    asegurarEspacio(mmToPt(50));

    // Texto previo
    escribir('En señal de conformidad, firman las partes:', marginLeft, cursorY, {
      font: fontRegular,
      size: 9,
      color: colorTexto,
    });
    cursorY -= mmToPt(12);

    // Posicionar firmas: izquierda (proveedor) y derecha (cliente)
    const firmaW = mmToPt(60);
    const firmaH = mmToPt(20);
    const gap = mmToPt(10);
    const totalFirmasW = firmaW * 2 + gap;
    const firmaStartX = (pageWidth - totalFirmasW) / 2;

    const firmaLeftX = firmaStartX;
    const firmaRightX = firmaStartX + firmaW + gap;
    const firmaTopY = cursorY;

    // ─── Firma del vendedor (izquierda) ───
    if (firmaImage) {
      try {
        currentPage.drawImage(firmaImage, {
          x: firmaLeftX + mmToPt(5),
          y: firmaTopY - firmaH,
          width: firmaW - mmToPt(10),
          height: firmaH,
        });
      } catch (e) {
        console.warn('[pdfService] Error al dibujar firma vendedor:', e);
      }
    }

    // Línea de firma vendedor
    currentPage.drawLine({
      start: { x: firmaLeftX, y: firmaTopY - firmaH - mmToPt(2) },
      end: { x: firmaLeftX + firmaW, y: firmaTopY - firmaH - mmToPt(2) },
      thickness: 0.5,
      color: colorTexto,
    });

    // Texto debajo firma vendedor
    escribirEnBloqueCentrado('EL PROVEEDOR', firmaTopY - firmaH - mmToPt(7), firmaLeftX, firmaW, {
      font: fontBold, size: 9, color: colorTexto,
    });
    escribirEnBloqueCentrado('DELICIAS ALI SAC', firmaTopY - firmaH - mmToPt(11), firmaLeftX, firmaW, {
      font: fontRegular, size: 8, color: colorGris,
    });
    escribirEnBloqueCentrado('RUC: 20613823027', firmaTopY - firmaH - mmToPt(15), firmaLeftX, firmaW, {
      font: fontRegular, size: 8, color: colorGris,
    });

    // ─── Firma del cliente (derecha, en blanco) ───
    // Línea
    currentPage.drawLine({
      start: { x: firmaRightX, y: firmaTopY - firmaH - mmToPt(2) },
      end: { x: firmaRightX + firmaW, y: firmaTopY - firmaH - mmToPt(2) },
      thickness: 0.5,
      color: colorTexto,
    });

    escribirEnBloqueCentrado('EL CLIENTE', firmaTopY - firmaH - mmToPt(7), firmaRightX, firmaW, {
      font: fontBold, size: 9, color: colorTexto,
    });
    escribirEnBloqueCentrado(cliente.substring(0, 30), firmaTopY - firmaH - mmToPt(11), firmaRightX, firmaW, {
      font: fontRegular, size: 8, color: colorGris,
    });
    escribirEnBloqueCentrado(`Doc: ${clienteDoc}`, firmaTopY - firmaH - mmToPt(15), firmaRightX, firmaW, {
      font: fontRegular, size: 8, color: colorGris,
    });

    // ═══════════════════════════════════════════════════════════════
    // GUARDAR
    // ═══════════════════════════════════════════════════════════════

    const pdfFinalBytes = await pdfDoc.save();
    const blob = new Blob([pdfFinalBytes as BlobPart], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrato_${ventaData.numero}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('[pdfService] Error al generar contrato:', error);
    return false;
  }
};

/**
 * Helper: escribir texto centrado dentro de un bloque horizontal
 */
const escribirCentrado2 = (
  texto: string,
  y: number,
  opts: {
    x: number;
    w: number;
    font?: any;
    size?: number;
    color?: any;
  }
) => {
  const font = opts.font;
  const size = opts.size || 9;
  const width = font.widthOfTextAtSize(texto, size);
  const centerX = opts.x + (opts.w - width) / 2;

  // Acceso a la página actual (closure)
  // Como esta función se define fuera, usa el estado capturado
  // En este caso, se asume que se llama dentro del contexto correcto
  // Pasar el currentPage y usar drawText
  // Solución: usar el mismo currentPage que está en el closure
  // (Aquí simplificamos: se llama dentro de `generarContratoConFondo` que tiene `currentPage`)
  // Para que funcione, hay que definirla DENTRO de la función principal.
  // 
  // Como este helper se usa dentro de `generarContratoConFondo`, lo dejamos
  // como función local ahí dentro en lugar de aquí afuera.
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT PÚBLICO — generarPDF
// ═══════════════════════════════════════════════════════════════════
export const generarPDF = async (
  ventaData: VentaCompatible,
  tipo: TipoDocumento
): Promise<boolean> => {
  // Cotización usa pdf-lib + PDF membretado
  if (tipo === 'cotizacion') {
    return await generarCotizacionConFondo(ventaData);
  }

  if (tipo === 'contrato') {
    return await generarContratoConFondo(ventaData);
  }

  // Ticket y Factura siguen con jsPDF
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    console.error('[pdfService] jsPDF no está cargado');
    return false;
  }

  try {
    const doc = tipo === 'ticket'
      ? new jsPDF({
        unit: 'mm',
        format: [80, 250],
        orientation: 'portrait',
      })
      : new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

    const promesa = tipo === 'ticket'
      ? generarTicketPDF(ventaData, doc)
      : generarFacturaPDF(ventaData, doc);

    await promesa;
    const prefijo = tipo === 'factura' ? 'factura' : 'ticket';
    doc.save(`${prefijo}_${ventaData.numero}.pdf`);

    return true;
  } catch (error) {
    console.error('[pdfService] Error al generar PDF:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════
// NOTA DE CRÉDITO
// ═══════════════════════════════════════════════════════════════════

export const generarPDFNotaCredito = (
  venta: VentaCompatible,
  devolucion: any,
  monto: number,
  numeroNC: string
): boolean => {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) return false;

  try {
    const itemsDevueltos = extraerProductosDevolucion(devolucion);
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setTextColor(217, 10, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(DEFAULT_EMPRESA.razonSocial, 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`RUC: ${DEFAULT_EMPRESA.ruc}`, 15, 27);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 10, 70);
    doc.text('NOTA DE CRÉDITO', 15, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`N°: ${numeroNC}`, 15, 55);
    doc.text(`Venta: ${venta.numero}`, 15, 62);
    doc.text(`Fecha: ${fechaActual()}`, 15, 69);
    doc.text(`Cliente: ${venta.cliente}`, 15, 76);
    doc.text(`Motivo: ${devolucion.motivo}`, 15, 83);

    let y = 95;
    doc.setFont('helvetica', 'bold');
    doc.text('Producto', 15, y);
    doc.text('Cant.', 120, y);
    doc.text('Total', 165, y);
    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    itemsDevueltos.forEach((p) => {
      doc.text(p.nombre.substring(0, 30), 15, y);
      doc.text(String(p.cantidad), 120, y);
      doc.text(formatearMoneda(p.cantidad * p.precio), 165, y);
      y += 6;
    });

    y += 4;
    doc.line(15, y, pageWidth - 15, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Monto a acreditar: ${formatearMoneda(monto)}`, 120, y);

    doc.save(`nota_credito_${numeroNC}.pdf`);
    return true;
  } catch (error) {
    console.error('[pdfService] Error en nota de crédito:', error);
    return false;
  }
};