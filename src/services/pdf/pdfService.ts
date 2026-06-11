import { Venta, Devolucion } from '../../features/types/sales';

declare const window: any;

export const generarVistaPreviaHTML = (ventaData: Venta, tipo: 'ticket' | 'factura'): string => {
    const fecha = new Date().toLocaleString();
    const subtotal = ventaData.subtotal;
    const igv = ventaData.igv;
    const descuento = ventaData.descuento || 0;

    let productosHtml = '';
    ventaData.productos.forEach(p => {
        productosHtml += `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>${p.nombre} x${p.cantidad}</span>
        <span>S/ ${(p.cantidad * p.precio).toFixed(2)}</span>
      </div>
    `;
    });

    return `
    <div class="vista-previa" style="background:#f8f9fa; border:1px solid #ddd; border-radius:0.5rem; padding:1rem; max-height:350px; overflow-y:auto; font-family:monospace; font-size:11px;">
      <div style="text-align:center;">
        <strong>DELICIAS CATERING</strong><br>
        RUC: 20123456789<br>
        Av. Principal 123, Lima - Perú<br>
        Tel: (01) 123-4567
      </div>
      <div style="border-top:1px dashed #ccc; margin:0.5rem 0;"></div>
      <div style="text-align:center;">
        <strong>${tipo === "ticket" ? "TICKET DE VENTA" : "FACTURA ELECTRÓNICA"}</strong>
      </div>
      <div>Fecha: ${fecha}</div>
      <div>Cliente: ${ventaData.cliente}</div>
      <div style="border-top:1px dashed #ccc; margin:0.5rem 0;"></div>
      <div><strong>PRODUCTOS</strong></div>
      ${productosHtml}
      <div style="border-top:1px dashed #ccc; margin:0.5rem 0;"></div>
      <div>Subtotal: S/ ${subtotal.toFixed(2)}</div>
      <div>Descuento: S/ ${descuento.toFixed(2)}</div>
      <div>IGV (18%): S/ ${igv.toFixed(2)}</div>
      <div><strong>TOTAL: S/ ${ventaData.total.toFixed(2)}</strong></div>
      <div style="border-top:1px dashed #ccc; margin:0.5rem 0;"></div>
      <div style="text-align:center;">¡Gracias por su compra!</div>
    </div>
  `;
};

export const generarPDF = (ventaData: Venta, tipo: 'ticket' | 'factura'): boolean => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        console.error('jsPDF no está cargado');
        return false;
    }

    const doc = new jsPDF();
    const fecha = new Date().toLocaleString();
    const subtotal = ventaData.subtotal;
    const igv = ventaData.igv;
    const descuento = ventaData.descuento || 0;

    doc.setFontSize(18);
    doc.setTextColor(217, 10, 70);
    doc.text("DELICIAS CATERING", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("RUC: 20123456789", 20, 30);
    doc.text("Av. Principal 123, Lima - Perú", 20, 36);
    doc.text("Tel: (01) 123-4567", 20, 42);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(tipo === "ticket" ? "TICKET DE VENTA" : "FACTURA ELECTRÓNICA", 20, 55);
    doc.setFontSize(10);
    doc.text(`N°: ${ventaData.numero}`, 20, 65);
    doc.text(`Fecha: ${fecha}`, 20, 72);
    doc.text(`Cliente: ${ventaData.cliente}`, 20, 79);

    let y = 92;
    doc.text("Descripción", 20, y);
    doc.text("Cant.", 120, y);
    doc.text("P.Unit.", 150, y);
    doc.text("Total", 180, y);

    y += 5;
    doc.line(20, y, 190, y);
    y += 5;

    ventaData.productos.forEach(p => {
        doc.text(p.nombre.substring(0, 25), 20, y);
        doc.text(p.cantidad.toString(), 120, y);
        doc.text(`S/ ${p.precio.toFixed(2)}`, 150, y);
        doc.text(`S/ ${(p.cantidad * p.precio).toFixed(2)}`, 180, y);
        y += 8;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 5;
    doc.text(`Subtotal: S/ ${subtotal.toFixed(2)}`, 140, y);
    y += 7;
    doc.text(`Descuento: S/ ${descuento.toFixed(2)}`, 140, y);
    y += 7;
    doc.text(`IGV (18%): S/ ${igv.toFixed(2)}`, 140, y);
    y += 7;
    doc.setFontSize(12);
    doc.setTextColor(217, 10, 70);
    doc.text(`TOTAL: S/ ${ventaData.total.toFixed(2)}`, 140, y);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("¡Gracias por su compra!", 20, y + 20);

    doc.save(`comprobante_${ventaData.numero}.pdf`);
    return true;
};

export const generarPDFNotaCredito = (venta: Venta, devolucion: Devolucion, monto: number, numeroNC: string): boolean => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return false;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(217, 10, 70);
    doc.text("DELICIAS CATERING", 20, 20);
    doc.setFontSize(14);
    doc.text("NOTA DE CRÉDITO", 20, 40);
    doc.setFontSize(10);
    doc.text(`N°: ${numeroNC}`, 20, 55);
    doc.text(`Venta: ${venta.numero}`, 20, 62);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 69);
    doc.text(`Cliente: ${venta.cliente}`, 20, 76);
    doc.text(`Motivo: ${devolucion.motivo}`, 20, 83);

    let y = 100;
    doc.text("Producto", 20, y);
    doc.text("Cant.", 120, y);
    doc.text("Total", 180, y);
    y += 5;
    doc.line(20, y, 190, y);
    y += 5;

    devolucion.productos.forEach(p => {
        doc.text(p.nombre.substring(0, 20), 20, y);
        doc.text(p.cantidad.toString(), 120, y);
        doc.text(`S/ ${(p.cantidad * p.precio).toFixed(2)}`, 180, y);
        y += 8;
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 5;
    doc.text(`Monto acreditar: S/ ${monto.toFixed(2)}`, 140, y);

    doc.save(`nota_credito_${numeroNC}.pdf`);
    return true;
};