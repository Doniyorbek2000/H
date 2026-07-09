import * as ExcelJS from 'exceljs';
import { STATUS_LABELS_UZ } from '@smart/shared';

interface ReportLike {
  title: string;
  aiSummary: string | null;
  createdAt: Date;
  content: unknown;
}

/** Hisobotni Excel (xlsx) ko'rinishida render qilish */
export async function renderReportExcel(report: ReportLike): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Smart Murojaat AI';
  const ws = wb.addWorksheet('Hisobot');
  const content = (report.content ?? {}) as Record<string, any>;

  ws.columns = [
    { header: '', key: 'a', width: 40 },
    { header: '', key: 'b', width: 20 },
  ];

  ws.addRow([report.title]);
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.addRow([`Yaratilgan: ${new Date(report.createdAt).toLocaleString('uz-UZ')}`]);
  ws.addRow([]);

  const header = ws.addRow(['Ko‘rsatkich', 'Qiymat']);
  header.font = { bold: true };
  ws.addRow(['Jami murojaatlar', content.total ?? 0]);
  ws.addRow(['Bajarilgan', content.completed ?? 0]);
  ws.addRow(['Rad etilgan', content.rejected ?? 0]);
  ws.addRow(['Kechikkan', content.overdue ?? 0]);
  ws.addRow(['Bajarilish foizi (%)', content.completionRate ?? 0]);
  ws.addRow(['O‘rtacha baho', content.avgRating ?? '—']);
  ws.addRow([]);

  if (Array.isArray(content.byStatus)) {
    const h = ws.addRow(['Holat', 'Soni']);
    h.font = { bold: true };
    for (const s of content.byStatus) {
      ws.addRow([(STATUS_LABELS_UZ as Record<string, string>)[s.status] ?? s.status, s.count]);
    }
    ws.addRow([]);
  }

  if (Array.isArray(content.topCategories)) {
    const h = ws.addRow(['Kategoriya', 'Soni']);
    h.font = { bold: true };
    for (const c of content.topCategories) ws.addRow([c.name, c.count]);
    ws.addRow([]);
  }

  if (Array.isArray(content.topMahallas)) {
    const h = ws.addRow(['Mahalla', 'Soni']);
    h.font = { bold: true };
    for (const m of content.topMahallas) ws.addRow([m.mahalla, m.count]);
    ws.addRow([]);
  }

  if (report.aiSummary) {
    const h = ws.addRow(['AI xulosasi']);
    h.font = { bold: true };
    const r = ws.addRow([report.aiSummary]);
    r.alignment = { wrapText: true };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
