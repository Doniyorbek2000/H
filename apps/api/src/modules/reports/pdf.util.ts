import PDFDocument from 'pdfkit';
import { STATUS_LABELS_UZ } from '@smart/shared';

interface ReportLike {
  title: string;
  aiSummary: string | null;
  createdAt: Date;
  content: unknown;
  organization?: { name: string } | null;
}

/** Hisobotni PDF ko'rinishida render qilish (pdfkit, streamsiz buffer) */
export function renderReportPdf(report: ReportLike): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const content = (report.content ?? {}) as Record<string, any>;

    doc.fontSize(16).text('SMART MUROJAAT AI', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).text(report.title, { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor('#555555')
      .text(`Yaratilgan: ${new Date(report.createdAt).toLocaleString('uz-UZ')}`, {
        align: 'center',
      });
    doc.moveDown(1);
    doc.fillColor('#000000');

    doc.fontSize(12).text('Asosiy ko‘rsatkichlar', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    const rows: [string, string][] = [
      ['Jami murojaatlar', String(content.total ?? 0)],
      ['Bajarilgan', String(content.completed ?? 0)],
      ['Rad etilgan', String(content.rejected ?? 0)],
      ['Kechikkan', String(content.overdue ?? 0)],
      ['Bajarilish foizi', `${content.completionRate ?? 0}%`],
      ['O‘rtacha baho', content.avgRating ? Number(content.avgRating).toFixed(2) : '—'],
    ];
    for (const [k, v] of rows) {
      doc.text(`${k}: ${v}`);
    }
    doc.moveDown(1);

    if (Array.isArray(content.byStatus) && content.byStatus.length) {
      doc.fontSize(12).text('Holatlar kesimida', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const s of content.byStatus) {
        const label = (STATUS_LABELS_UZ as Record<string, string>)[s.status] ?? s.status;
        doc.text(`${label}: ${s.count}`);
      }
      doc.moveDown(1);
    }

    if (Array.isArray(content.topCategories) && content.topCategories.length) {
      doc.fontSize(12).text('Eng ko‘p murojaat tushgan yo‘nalishlar', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const c of content.topCategories) {
        doc.text(`${c.name}: ${c.count} ta`);
      }
      doc.moveDown(1);
    }

    if (Array.isArray(content.topMahallas) && content.topMahallas.length) {
      doc.fontSize(12).text('Eng ko‘p muammoli mahallalar', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const m of content.topMahallas) {
        doc.text(`${m.mahalla}: ${m.count} ta`);
      }
      doc.moveDown(1);
    }

    if (report.aiSummary) {
      doc.fontSize(12).text('AI xulosasi va tavsiyalar', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(report.aiSummary, { align: 'justify' });
    }

    doc.end();
  });
}
