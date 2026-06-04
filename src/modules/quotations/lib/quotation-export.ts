import 'server-only';

import ExcelJS from 'exceljs';
import { GOLDENCARD_COMPANY_ADDRESS, GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';
import { queryQuotationById } from './quotation.queries';

// Re-export for existing imports
export { GOLDENCARD_COMPANY_ADDRESS } from '@/lib/documents/company-profile';

const COMPANY_CONTACT = {
  email: GOLDENCARD_COMPANY_PROFILE.email,
  hotline: GOLDENCARD_COMPANY_PROFILE.hotline,
  website: GOLDENCARD_COMPANY_PROFILE.website,
  bankAccount: GOLDENCARD_COMPANY_PROFILE.bankAccount,
  bankBeneficiary: GOLDENCARD_COMPANY_PROFILE.bankBeneficiary,
  bankName: GOLDENCARD_COMPANY_PROFILE.bankName,
  contactPhone: '0333314288',
} as const;

/** Shared with browser print document (quotation print route). */
export const QUOTATION_PRINT_GENERIC_TERMS =
  'Các điều kiện chi tiết thực hiện theo thỏa thuận giữa hai bên.';

/** Shared with browser print document (quotation print route). */
export const QUOTATION_PRINT_PAYMENT_TERMS = [
  'Thanh toán theo tiến độ thỏa thuận giữa hai bên (thường gồm đặt cọc khi xác nhận và thanh toán số dư sau nghiệm thu, bàn giao).',
  `Tài khoản nhận thanh toán: ${GOLDENCARD_COMPANY_PROFILE.bankAccount} — ${GOLDENCARD_COMPANY_PROFILE.bankBeneficiary} — ${GOLDENCARD_COMPANY_PROFILE.bankName}.`,
].join(' ');

/** Shared with browser print document (quotation print route). */
export const QUOTATION_PRINT_WARRANTY_TEXT =
  'Bảo hành Trọn Gói Biến Tần Inverter, Battery  5 năm 1 đổi 1 lỗi đến từ nhà sản xuất. 5 năm tiếp theo miễn phí sữa chữa và hỗ trợ cài đặt. Tấm pin mặt trời bảo hành 15 năm.';

/** Shared with browser print document (quotation print route). */
export const QUOTATION_PRINT_TERMS_LINES: string[] = [
  'Điều kiện bảo hành được nêu rõ trong chính sách bảo hành, Battery dưới 6000 lần xạc xả',
  'Tặng 1 lần bảo trì trong năm đầu tiên.',
  '',
  'Điều kiện chào hàng:',
  ' - Thời gian giao hàng : Thời gian đặt hàng tối đa 30 ngày kể từ ngày xác nhận đơn hàng và thanh toán cọc.',
  ' - Địa điểm giao hàng :',
  ' - Điều kiện thanh toán : Cọc 50% ngay sau khi ký đơn hàng, 50% còn lại ngay sau khi bàn giao nghiệm thu và hướng dẫn sử dụng',
  ` - Chi tiết Tài khoản nhận thanh toán: STK ${COMPANY_CONTACT.bankAccount}`,
  `  Tên thụ hưởng :  ${COMPANY_CONTACT.bankBeneficiary}`,
  `  Mở Tại ${COMPANY_CONTACT.bankName}`,
  ' - Giá trị của chào hàng:  15 ngày ',
  'Xin cám ơn và mong nhận được sự trợ giúp của khách hàng,',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuotationExportItem = {
  productName: string;
  description: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type QuotationExportData = {
  quotationId: string;
  code: string;
  revisionNumber: number;
  codeWithRevision: string;
  filename: string;
  exportDateLabel: string;
  exportDateFooter: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  surveyCode: string | null;
  validUntil: string | null;
  note: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  vatRate: number;
  items: QuotationExportItem[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNum(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDateVi(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateLongVi(date: Date): string {
  return `${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

function formatDateFooterVi(date: Date): string {
  return `TP.HCM, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

function exportFilename(code: string, revisionNumber: number): string {
  return `${code}_v${revisionNumber}.xlsx`;
}

const VND_NUM_FMT = '#,##0';
const HEADER_FILL = 'FFFFFF99';

function setBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}

function mergeSet(
  sheet: ExcelJS.Worksheet,
  range: string,
  value: ExcelJS.CellValue,
  style?: Partial<ExcelJS.Style>,
) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]!);
  cell.value = value;
  if (style?.font) cell.font = { ...cell.font, ...style.font };
  if (style?.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
}

function descriptionLines(item: QuotationExportItem): string[] {
  if (item.description?.trim()) {
    return item.description
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [item.productName.trim() || '—'];
}

// ---------------------------------------------------------------------------
// Data builder
// ---------------------------------------------------------------------------

export async function buildQuotationExportData(
  quotationId: string,
): Promise<QuotationExportData> {
  const quotation = await queryQuotationById(quotationId);
  if (!quotation) {
    throw new Error('Không tìm thấy báo giá');
  }

  const revisionNumber = quotation.revisionNumber ?? 1;
  const code = quotation.code;
  const now = new Date();

  return {
    quotationId: quotation.id,
    code,
    revisionNumber,
    codeWithRevision: `${code} · v${revisionNumber}`,
    filename: exportFilename(code, revisionNumber),
    exportDateLabel: formatDateLongVi(now),
    exportDateFooter: formatDateFooterVi(now),
    customerName: quotation.customerNameSnapshot,
    customerPhone: quotation.customerPhoneSnapshot ?? null,
    customerAddress: quotation.customerAddressSnapshot ?? null,
    surveyCode: quotation.survey?.code ?? null,
    validUntil: formatDateVi(quotation.validUntil),
    note: quotation.note ?? null,
    subtotal: parseNum(quotation.subtotal),
    discountAmount: parseNum(quotation.discountAmount),
    taxAmount: parseNum(quotation.taxAmount),
    grandTotal: parseNum(quotation.grandTotal),
    vatRate: parseNum(quotation.vatRate),
    items: (quotation.items ?? []).map((item) => ({
      productName: item.productName,
      description: item.description ?? null,
      unit: item.unit,
      quantity: parseNum(item.quantity),
      unitPrice: parseNum(item.unitPrice),
      lineTotal: parseNum(item.lineTotal),
    })),
  };
}

// ---------------------------------------------------------------------------
// XLSX generator — GoldenCard NLMT template
// ---------------------------------------------------------------------------

export async function buildQuotationXlsxBuffer(data: QuotationExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GoldenCard ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Trang_tính1', {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { width: 6 },
    { width: 15.2 },
    { width: 8.8 },
    { width: 8.8 },
    { width: 29.7 },
    { width: 5.5 },
    { width: 6 },
    { width: 21 },
  ];

  const address = GOLDENCARD_COMPANY_ADDRESS;

  // Logo / header area
  mergeSet(sheet, 'A1:H5', 'GOLDENCARD', {
    font: { bold: true, size: 16, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  mergeSet(sheet, 'A6:H6', 'BẢNG CHÀO GIÁ HỆ THỐNG NĂNG LƯỢNG MẶT TRỜI', {
    font: { bold: true, size: 13, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  mergeSet(
    sheet,
    'A7:H7',
    `( Đính kèm HĐKT Số : ${data.codeWithRevision}${data.surveyCode ? ` · ${data.surveyCode}` : ''})`,
    { alignment: { horizontal: 'center' } },
  );

  // Company block (left) — all addresses unified
  sheet.getCell('A10').value = `Trụ sở : ${address}`;
  mergeSet(sheet, 'F10:G10', 'Ngày:');
  sheet.getCell('H10').value = data.validUntil
    ? `Hiệu lực đến ${data.validUntil}`
    : data.exportDateLabel;

  sheet.getCell('A11').value = `VP Giao dịch : ${address}`;
  sheet.getCell('G11').value = 'Khách hàng:';
  sheet.getCell('H11').value = data.customerName;

  sheet.getCell('A12').value = `Kho hàng : ${address}`;
  sheet.getCell('G12').value = 'Số Điện Thoại:';
  sheet.getCell('H12').value = data.customerPhone ?? '';

  mergeSet(sheet, 'A13:D13', `Email : ${COMPANY_CONTACT.email}`);
  sheet.getCell('G13').value = 'Địa điểm lắp :';
  sheet.getCell('H13').value = data.customerAddress ?? '';

  mergeSet(sheet, 'A14:C14', `Hotline : ${COMPANY_CONTACT.hotline}`);
  sheet.getCell('G14').value = 'Kiểu lắp:';
  sheet.getCell('H14').value = '';

  mergeSet(sheet, 'A15:C15', `Website : ${COMPANY_CONTACT.website}`);
  mergeSet(sheet, 'F15:G15', 'Công suất:');
  sheet.getCell('H15').value = '';

  // Table header (row 20)
  const headerRow = sheet.getRow(20);
  headerRow.values = [
    'STT',
    'Sản Phẩm/ Model',
    '',
    'DIỄN GIẢI',
    '',
    'ĐVT',
    'SL',
    'Thành Tiền',
  ];
  headerRow.font = { bold: true, size: 11, name: 'Calibri' };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= 8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      setBorder(cell);
    }
  });
  sheet.mergeCells('B20:C20');
  sheet.mergeCells('D20:E20');

  let row = 21;
  let stt = 0;

  if (data.items.length === 0) {
    sheet.mergeCells(`A${row}:E${row}`);
    sheet.getCell(`A${row}`).value = '(Không có dòng hàng)';
    sheet.getCell(`F${row}`).value = '';
    sheet.getCell(`G${row}`).value = '';
    sheet.getCell(`H${row}`).value = 0;
    sheet.getRow(row).eachCell({ includeEmpty: true }, (cell, col) => {
      if (col <= 8) setBorder(cell);
    });
    row += 1;
  } else {
    for (const item of data.items) {
      stt += 1;
      const lines = descriptionLines(item);
      const startRow = row;
      const endRow = startRow + lines.length - 1;

      for (let i = 0; i < lines.length; i++) {
        const rNum = startRow + i;
        sheet.mergeCells(`D${rNum}:E${rNum}`);
        sheet.getCell(`D${rNum}`).value = lines[i];
        sheet.getCell(`D${rNum}`).alignment = { vertical: 'top', wrapText: true };

        const r = sheet.getRow(rNum);
        r.eachCell({ includeEmpty: true }, (cell, col) => {
          if (col <= 8) setBorder(cell);
        });
      }

      sheet.mergeCells(`A${startRow}:A${endRow}`);
      sheet.getCell(`A${startRow}`).value = stt;
      sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(`B${startRow}:C${endRow}`);
      sheet.getCell(`B${startRow}`).value = item.productName;
      sheet.getCell(`B${startRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      sheet.mergeCells(`F${startRow}:F${endRow}`);
      sheet.getCell(`F${startRow}`).value = item.unit;
      sheet.getCell(`F${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(`G${startRow}:G${endRow}`);
      sheet.getCell(`G${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getCell(`G${startRow}`).numFmt = '#,##0.###';

      sheet.mergeCells(`H${startRow}:H${endRow}`);
      const totalCell = sheet.getCell(`H${startRow}`);
      totalCell.value = item.lineTotal;
      totalCell.numFmt = VND_NUM_FMT;
      totalCell.alignment = { horizontal: 'right', vertical: 'middle' };

      row = endRow + 1;
    }
  }

  row += 1;

  // Summary rows (template style)
  mergeSet(
    sheet,
    `A${row}:G${row}`,
    `Tạm tính (chưa VAT) :`,
    { alignment: { horizontal: 'right' } },
  );
  const subtotalCell = sheet.getCell(`H${row}`);
  subtotalCell.value = data.subtotal;
  subtotalCell.numFmt = VND_NUM_FMT;
  subtotalCell.alignment = { horizontal: 'right' };
  row += 1;

  if (data.discountAmount > 0) {
    mergeSet(sheet, `A${row}:G${row}`, 'Chiết khấu :', {
      alignment: { horizontal: 'right' },
    });
    const discountCell = sheet.getCell(`H${row}`);
    discountCell.value = -data.discountAmount;
    discountCell.numFmt = VND_NUM_FMT;
    discountCell.alignment = { horizontal: 'right' };
    row += 1;
  }

  mergeSet(
    sheet,
    `A${row}:G${row}`,
    `Thuế VAT (${data.vatRate}%) :`,
    { alignment: { horizontal: 'right' } },
  );
  const taxCell = sheet.getCell(`H${row}`);
  taxCell.value = data.taxAmount;
  taxCell.numFmt = VND_NUM_FMT;
  taxCell.alignment = { horizontal: 'right' };
  row += 1;

  mergeSet(
    sheet,
    `A${row}:G${row}`,
    `Tổng cộng (đã bao gồm VAT ${data.vatRate}%) :`,
    { font: { bold: true }, alignment: { horizontal: 'right' } },
  );
  const grandCell = sheet.getCell(`H${row}`);
  grandCell.value = data.grandTotal;
  grandCell.numFmt = VND_NUM_FMT;
  grandCell.font = { bold: true };
  grandCell.alignment = { horizontal: 'right' };
  row += 1;

  // Per-unit reference row (when single qty bundle semantics)
  const totalQty = data.items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty > 0) {
    const perUnit = Math.round((data.grandTotal / totalQty) * 100) / 100;
    mergeSet(
      sheet,
      `A${row}:G${row}`,
      `Đơn giá 1 bộ bao gồm VAT ${data.vatRate}% :`,
      { alignment: { horizontal: 'left' } },
    );
    const perUnitCell = sheet.getCell(`H${row}`);
    perUnitCell.value = perUnit;
    perUnitCell.numFmt = VND_NUM_FMT;
    perUnitCell.alignment = { horizontal: 'right' };
    row += 1;

    if (totalQty > 1) {
      mergeSet(
        sheet,
        `A${row}:G${row}`,
        `Tổng Cộng ${totalQty} bộ :`,
        { font: { bold: true }, alignment: { horizontal: 'left' } },
      );
      const totalCell = sheet.getCell(`H${row}`);
      totalCell.value = data.grandTotal;
      totalCell.numFmt = VND_NUM_FMT;
      totalCell.font = { bold: true };
      totalCell.alignment = { horizontal: 'right' };
      row += 1;
    }
  }

  row += 1;

  // Warranty block
  mergeSet(sheet, `A${row}:H${row}`, data.note?.trim() || QUOTATION_PRINT_WARRANTY_TEXT, {
    alignment: { wrapText: true, vertical: 'top' },
  });
  row += 1;

  for (const term of QUOTATION_PRINT_TERMS_LINES) {
    if (term === '') {
      row += 1;
      continue;
    }
    mergeSet(sheet, `A${row}:H${row}`, term, {
      alignment: { wrapText: true, vertical: 'top' },
    });
    row += 1;
  }

  mergeSet(sheet, `A${row}:H${row}`, data.exportDateFooter);
  row += 1;
  mergeSet(
    sheet,
    `A${row}:H${row}`,
    `Số điện thoại liên hệ: ${COMPANY_CONTACT.contactPhone}`,
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
