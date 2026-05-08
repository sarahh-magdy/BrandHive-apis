import PDFDocument from 'pdfkit';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export async function generateInvoicePDF(order: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });

    // ─── Collect PDF chunks in memory ─────────────────────────
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);

        // ─── Upload to Cloudinary ──────────────────────────────
        const result = await new Promise<any>((res, rej) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'invoices',
              public_id: `invoice-${order.orderNumber}`,
              resource_type: 'raw',
              format: 'pdf',
              // ─── FIXED: خلي الـ file public ────────────────────────
              type: 'upload',
              access_mode: 'public',
            },
            (error, result) => {
              if (error) return rej(error);
              res(result);
            },
          );

          const readable = new Readable();
          readable.push(pdfBuffer);
          readable.push(null);
          readable.pipe(uploadStream);
        });

        resolve(result.secure_url);
      } catch (err) {
        reject(err);
      }
    });

    // ─── Header ───────────────────────────────────────────────
    doc.fontSize(24).font('Helvetica-Bold').text('BRAND HIVE', 50, 50);
    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`#${order.orderNumber}`, 400, 78, { align: 'right' })
      .text(`Date: ${new Date(order.createdAt ?? Date.now()).toLocaleDateString()}`, 400, 92, { align: 'right' })
      .fillColor('#000');

    doc.moveTo(50, 115).lineTo(560, 115).stroke('#ddd');

    // ─── Bill To ──────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('BILL TO:', 50, 130);
    doc.fontSize(10).font('Helvetica')
      .text(order.shippingAddress?.fullName ?? '', 50, 148)
      .text(order.shippingAddress?.phone ?? '', 50, 162)
      .text(`${order.shippingAddress?.street ?? ''}, ${order.shippingAddress?.city ?? ''}`, 50, 176)
      .text(`${order.shippingAddress?.governorate ?? ''}, ${order.shippingAddress?.country ?? 'Egypt'}`, 50, 190);

    // ─── Payment ──────────────────────────────────────────────
    doc.font('Helvetica-Bold').text('PAYMENT:', 350, 130);
    doc.font('Helvetica')
      .text(`Method: ${(order.paymentMethod ?? '').toUpperCase()}`, 350, 148)
      .text(`Status: ${(order.paymentStatus ?? '').toUpperCase()}`, 350, 162);

    // ─── Items Table ──────────────────────────────────────────
    let y = 230;
    doc.moveTo(50, y - 5).lineTo(560, y - 5).stroke('#ddd');
    doc.font('Helvetica-Bold').fontSize(10)
      .text('ITEM', 50, y).text('SKU', 250, y)
      .text('QTY', 330, y).text('PRICE', 380, y).text('TOTAL', 490, y, { align: 'right' });
    doc.moveTo(50, y + 18).lineTo(560, y + 18).stroke('#ddd');
    y += 28;

    for (const item of order.items ?? []) {
      const price = item.unitDiscountPrice ?? item.unitPrice;
      doc.font('Helvetica').fontSize(9)
        .text((item.productName ?? '').substring(0, 30), 50, y)
        .text(item.sku ?? '', 250, y)
        .text(String(item.quantity), 330, y)
        .text(`EGP ${price.toFixed(2)}`, 380, y)
        .text(`EGP ${item.itemTotal.toFixed(2)}`, 490, y, { align: 'right' });
      y += 22;
      if (y > 680) { doc.addPage(); y = 50; }
    }

    // ─── Summary ──────────────────────────────────────────────
    doc.moveTo(350, y + 5).lineTo(560, y + 5).stroke('#ddd');
    y += 15;
    doc.font('Helvetica').fontSize(10)
      .text('Subtotal:', 370, y)
      .text(`EGP ${(order.subtotal ?? 0).toFixed(2)}`, 560, y, { align: 'right' });
    y += 16;
    doc.text('Shipping:', 370, y)
      .text(`EGP ${(order.shippingFee ?? 0).toFixed(2)}`, 560, y, { align: 'right' });
    y += 16;
    if ((order.discount ?? 0) > 0) {
      doc.fillColor('#27ae60')
        .text('Discount:', 370, y)
        .text(`-EGP ${order.discount.toFixed(2)}`, 560, y, { align: 'right' })
        .fillColor('#000');
      y += 16;
    }
    doc.moveTo(350, y).lineTo(560, y).stroke('#333');
    y += 8;
    doc.font('Helvetica-Bold').fontSize(12)
      .text('TOTAL:', 370, y)
      .text(`EGP ${(order.total ?? 0).toFixed(2)}`, 560, y, { align: 'right' });

    // ─── Footer ───────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica').fillColor('#999')
      .text('Thank you for shopping with Brand Hive!', 50, 750, { align: 'center' });

    doc.end();
  });
} 