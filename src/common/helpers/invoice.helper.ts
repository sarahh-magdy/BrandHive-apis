/**
 * Invoice Helper — Option C (Hybrid)
 *
 * Strategy:
 *  - Generate PDF in-memory using pdfkit
 *  - Save to disk (or upload to S3/cloud) then return URL
 *  - For small deployments: serve from /public/invoices/
 *  - For production: upload buffer to S3 and return presigned URL
 *
 * Install: npm install pdfkit @types/pdfkit
 */

import * as path from 'path';
import * as fs from 'fs';

export interface InvoiceData {
  orderNumber: string;
  invoiceNumber: string;
  createdAt: Date;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    governorate: string;
    country: string;
  };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  pricing: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    tax: number;
    total: number;
  };
  couponCode?: string;
  paymentMethod: string;
  paymentStatus: string;
}

/**
 * Generates invoice PDF and saves to disk.
 * Returns the local file path and a URL to serve it.
 *
 * In production, replace the disk-save logic with S3 upload.
 */
export async function generateInvoicePdf(
  data: InvoiceData,
  outputDir = path.join(process.cwd(), 'public', 'invoices'),
): Promise<{ filePath: string; pdfUrl: string }> {
  // Lazy-load pdfkit so the module is optional
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PDFDocument = require('pdfkit');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `invoice-${data.invoiceNumber}.pdf`;
  const filePath = path.join(outputDir, fileName);
  const pdfUrl = `/invoices/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Header ──────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('INVOICE', { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' })
      .text(`Order #: ${data.orderNumber}`, { align: 'right' })
      .text(`Date: ${data.createdAt.toLocaleDateString('en-EG')}`, { align: 'right' });

    doc.moveDown(2);

    // ── Bill To ─────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.customer.name)
      .text(data.customer.email)
      .text(data.customer.phone);

    doc.moveDown();

    // ── Ship To ─────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text('Ship To:');
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.shippingAddress.fullName)
      .text(data.shippingAddress.street)
      .text(`${data.shippingAddress.city}, ${data.shippingAddress.governorate}`)
      .text(data.shippingAddress.country);

    doc.moveDown(2);

    // ── Items Table ──────────────────────────────────────────
    const tableTop = doc.y;
    const colWidths = { item: 220, qty: 60, unit: 90, total: 90 };
    const startX = 50;

    // Table header
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Item', startX, tableTop);
    doc.text('Qty', startX + colWidths.item, tableTop);
    doc.text('Unit Price', startX + colWidths.item + colWidths.qty, tableTop);
    doc.text('Total', startX + colWidths.item + colWidths.qty + colWidths.unit, tableTop, {
      align: 'right',
      width: colWidths.total,
    });

    doc
      .moveTo(startX, tableTop + 15)
      .lineTo(startX + 460, tableTop + 15)
      .stroke();

    let rowY = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    for (const item of data.items) {
      doc.text(item.name, startX, rowY, { width: colWidths.item - 10 });
      doc.text(String(item.quantity), startX + colWidths.item, rowY);
      doc.text(`EGP ${item.unitPrice.toFixed(2)}`, startX + colWidths.item + colWidths.qty, rowY);
      doc.text(
        `EGP ${item.totalPrice.toFixed(2)}`,
        startX + colWidths.item + colWidths.qty + colWidths.unit,
        rowY,
        { align: 'right', width: colWidths.total },
      );
      rowY += 20;
    }

    doc
      .moveTo(startX, rowY)
      .lineTo(startX + 460, rowY)
      .stroke();

    rowY += 15;

    // ── Pricing Summary ──────────────────────────────────────
    const summaryX = startX + 250;

    const addSummaryRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      doc.text(label, summaryX, rowY);
      doc.text(value, summaryX + 120, rowY, { align: 'right', width: 90 });
      rowY += 18;
    };

    addSummaryRow('Subtotal:', `EGP ${data.pricing.subtotal.toFixed(2)}`);
    addSummaryRow('Shipping:', `EGP ${data.pricing.shippingFee.toFixed(2)}`);

    if (data.pricing.discount > 0) {
      addSummaryRow(
        `Discount${data.couponCode ? ` (${data.couponCode})` : ''}:`,
        `-EGP ${data.pricing.discount.toFixed(2)}`,
      );
    }

    if (data.pricing.tax > 0) {
      addSummaryRow('Tax:', `EGP ${data.pricing.tax.toFixed(2)}`);
    }

    doc
      .moveTo(summaryX, rowY)
      .lineTo(summaryX + 210, rowY)
      .stroke();
    rowY += 5;

    addSummaryRow('TOTAL:', `EGP ${data.pricing.total.toFixed(2)}`, true);

    // ── Payment Info ─────────────────────────────────────────
    doc.moveDown(2);
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(
        `Payment Method: ${data.paymentMethod.toUpperCase()} | Status: ${data.paymentStatus.toUpperCase()}`,
        { align: 'center' },
      );

    // ── Footer ───────────────────────────────────────────────
    doc
      .fontSize(8)
      .fillColor('#aaaaaa')
      .text('Thank you for your order!', { align: 'center' })
      .text('For support: support@yourstore.com', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ filePath, pdfUrl }));
    stream.on('error', reject);
  });
}

export function generateInvoiceNumber(orderNumber: string): string {
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${orderNumber}-${timestamp}`;
}