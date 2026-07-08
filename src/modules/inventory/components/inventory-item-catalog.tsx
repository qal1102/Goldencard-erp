'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  BoxesIcon,
  CheckCircle2Icon,
  DownloadIcon,
  EditIcon,
  FileSpreadsheetIcon,
  FileUpIcon,
  FilterIcon,
  ImageIcon,
  ImageUpIcon,
  PauseCircleIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  TablePropertiesIcon,
  Trash2Icon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createInventoryItemAction,
  getInventoryExistingSkusAction,
  getInventoryItemsAction,
  importInventoryItemsAction,
  updateInventoryItemAction,
} from '../actions/inventory-item.actions';
import {
  getDefaultMinStockForCategory,
  inventoryCategoryOptions,
  inventoryCategoryValues,
} from '../lib/inventory-item-config';
import type { SerializedInventoryItem } from '../lib/inventory-item-serialize';
import type {
  InventoryItemFilters,
  InventoryItemFormInput,
} from '../schema/inventory-item.schema';

const ALL_STATUS = 'all';
const ALL_CATEGORY = 'all';
const INVENTORY_ITEM_CACHE_KEY = 'goldencard.inventory.items.v1';
type CatalogStatus = NonNullable<InventoryItemFilters['status']>;

type InventoryItemCache = {
  items: SerializedInventoryItem[];
  savedAt: string;
};

function readInventoryItemCache(): InventoryItemCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(INVENTORY_ITEM_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<InventoryItemCache>;
    return Array.isArray(cached.items)
      ? {
          items: cached.items,
          savedAt: typeof cached.savedAt === 'string' ? cached.savedAt : '',
        }
      : null;
  } catch {
    window.localStorage.removeItem(INVENTORY_ITEM_CACHE_KEY);
    return null;
  }
}

const catalogStatusLabels: Record<CatalogStatus, string> = {
  all: 'Tất cả trạng thái',
  active: 'Đang sử dụng',
  inactive: 'Ngừng sử dụng',
};

function getCatalogStatusLabel(value: string | null) {
  if (!value) return catalogStatusLabels.all;
  return catalogStatusLabels[value as CatalogStatus] ?? catalogStatusLabels.all;
}

const popularUnits = ['tấm', 'bộ', 'cái', 'mét', 'cuộn', 'kg', 'thùng'];

function uniqueOptions(values: string[]) {
  const map = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase('vi');
    if (!map.has(key)) map.set(key, trimmed);
  }
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'vi'));
}

const inventoryExportColumns = [
  {
    key: 'sku',
    label: 'Mã vật tư',
    guide: 'Có thể để trống khi tạo mới để hệ thống tự sinh mã. Nếu muốn cập nhật vật tư cũ, điền đúng mã đang có.',
    example: '',
  },
  {
    key: 'name',
    label: 'Tên vật tư',
    guide: 'Bắt buộc. Tên dễ hiểu để nhân viên kho và thi công nhận diện.',
    example: 'Tấm pin năng lượng mặt trời 550W',
  },
  {
    key: 'category',
    label: 'Nhóm vật tư',
    guide: 'Nên chọn theo nhóm chuẩn: Tấm pin, Inverter, Dây điện, Tủ điện, Khung/rail, Phụ kiện, Dụng cụ thi công, Thiết bị bảo vệ.',
    example: 'Tấm pin',
  },
  {
    key: 'specification',
    label: 'Quy cách/kích cỡ',
    guide: 'Không bắt buộc nhưng nên điền để tránh nhầm vật tư. Ví dụ: 550W, 6mm2, 5kW, dài 4.2m.',
    example: '550W',
  },
  {
    key: 'imageUrl',
    label: 'Link ảnh',
    guide: 'Không bắt buộc. Dán link ảnh vật tư nếu có để nhân viên nhận diện nhanh hơn.',
    example: '',
  },
  {
    key: 'unit',
    label: 'Đơn vị tính',
    guide: 'Bắt buộc. Ví dụ: tấm, bộ, cái, mét, cuộn, kg, thùng.',
    example: 'tấm',
  },
  {
    key: 'minStock',
    label: 'Mức cảnh báo tồn thấp',
    guide: 'Số không âm. Dùng để cảnh báo thiếu hàng ở các bước sau.',
    example: 0,
  },
  {
    key: 'isSerializable',
    label: 'Có quản lý số serial',
    guide: 'Nhập TRUE/FALSE. TRUE nếu vật tư cần quản lý serial/IMEI.',
    example: false,
  },
  {
    key: 'isActive',
    label: 'Đang sử dụng',
    guide: 'Nhập TRUE/FALSE. FALSE nếu muốn ngừng dùng vật tư nhưng không xóa.',
    example: true,
  },
  {
    key: 'note',
    label: 'Ghi chú',
    guide: 'Không bắt buộc. Ghi thông tin thêm cho nội bộ.',
    example: 'Ví dụ, có thể xóa dòng này trước khi import',
  },
] as const;

type InventoryExportColumnKey = (typeof inventoryExportColumns)[number]['key'];
type InventoryExportRow = Record<InventoryExportColumnKey, string | number | boolean>;

type ImportPreviewStatus = 'new' | 'update' | 'error';
type ImportPreviewRow = {
  rowNumber: number;
  data: InventoryItemFormInput;
  status: ImportPreviewStatus;
  errors: string[];
};

type CatalogProps = {
  initialItems?: SerializedInventoryItem[];
  initialError?: string | null;
  canManageInventory?: boolean;
};

type DialogMode =
  | { type: 'create'; item?: undefined }
  | { type: 'edit'; item: SerializedInventoryItem };

const emptyForm: InventoryItemFormInput = {
  sku: '',
  name: '',
  category: '',
  specification: '',
  imageUrl: '',
  unit: '',
  minStock: 1,
  isSerializable: false,
  isActive: true,
  note: '',
};

const MAX_INVENTORY_IMAGE_FILE_BYTES = 650 * 1024;

function readInventoryImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

const templateRows: InventoryExportRow[] = [
];

function formatNumber(value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 3,
  }).format(numericValue);
}

function itemToForm(item: SerializedInventoryItem): InventoryItemFormInput {
  return {
    sku: item.sku,
    name: item.name,
    category: item.category ?? '',
    specification: item.specification ?? '',
    imageUrl: item.imageUrl ?? '',
    unit: item.unit,
    minStock: Number(item.minStock),
    isSerializable: item.isSerializable,
    isActive: item.isActive,
    note: item.note ?? '',
  };
}

function getExportFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function exportRowsFromItems(items: SerializedInventoryItem[]): InventoryExportRow[] {
  return items.map((item) => ({
    sku: item.sku,
    name: item.name,
    category: item.category ?? '',
    specification: item.specification ?? '',
    imageUrl: item.imageUrl ?? '',
    unit: item.unit,
    minStock: Number(item.minStock),
    isSerializable: item.isSerializable,
    isActive: item.isActive,
    note: item.note ?? '',
  }));
}

function escapeCsvCell(value: string | number | boolean) {
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(rows: InventoryExportRow[], filename: string) {
  const header = inventoryExportColumns.map((column) => column.label);
  const body = rows.map((row) =>
    inventoryExportColumns.map((column) => escapeCsvCell(row[column.key])).join(','),
  );
  const csv = [`\uFEFF${header.join(',')}`, ...body].join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

async function downloadXlsx(rows: InventoryExportRow[], filename: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const guideSheet = workbook.addWorksheet('Hướng dẫn');
  const worksheet = workbook.addWorksheet('Danh mục vật tư');

  guideSheet.properties.tabColor = { argb: 'FF2563EB' };
  worksheet.properties.tabColor = { argb: 'FF16A34A' };

  guideSheet.columns = [
    { header: 'Cột cần nhập', key: 'label', width: 28 },
    { header: 'Cách điền', key: 'guide', width: 64 },
    { header: 'Ví dụ', key: 'example', width: 28 },
  ];
  guideSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  guideSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D4ED8' },
  };
  guideSheet.addRows(
    inventoryExportColumns.map((column) => ({
      label: column.label,
      guide: column.guide,
      example: String(column.example),
    })),
  );
  guideSheet.getColumn('label').font = { bold: true };
  guideSheet.views = [{ state: 'frozen', ySplit: 1 }];
  guideSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (rowNumber > 1) {
        const isRequired = ['name', 'unit'].includes(inventoryExportColumns[rowNumber - 2]?.key);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: isRequired
              ? 'FFFFF7ED'
              : rowNumber % 2 === 0
                ? 'FFF8FAFC'
                : 'FFFFFFFF',
          },
        };
      }
    });
  });

  worksheet.columns = inventoryExportColumns.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.key === 'name' || column.key === 'note' ? 32 : 18,
  }));
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).height = 26;
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const key = inventoryExportColumns[columnNumber - 1]?.key;
    const headerColor =
      key === 'sku'
        ? 'FF2563EB'
        : key === 'name' || key === 'unit'
          ? 'FFEA580C'
          : key === 'isActive'
            ? 'FF16A34A'
            : 'FF047857';
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerColor },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.note =
      key === 'sku'
        ? 'Để trống khi tạo vật tư mới để hệ thống tự sinh mã. Điền mã đang có nếu muốn cập nhật.'
        : key === 'name' || key === 'unit'
          ? 'Cột bắt buộc phải nhập.'
          : inventoryExportColumns[columnNumber - 1]?.guide;
  });
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.addRows(rows);
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(rows.length + 1, 1), column: inventoryExportColumns.length },
  };
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, columnNumber) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (rowNumber > 1) {
        const activeColumnNumber =
          inventoryExportColumns.findIndex((column) => column.key === 'isActive') + 1;
        const isActiveColumn = columnNumber === activeColumnNumber;
        const activeCell = row.getCell(activeColumnNumber).value;
        const isActive = activeCell === true || activeCell === 'TRUE';
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: isActiveColumn
              ? isActive
                ? 'FFDCFCE7'
                : 'FFFEE2E2'
              : rowNumber % 2 === 0
                ? 'FFF8FAFC'
                : 'FFFFFFFF',
          },
        };
      }
    });
  });

  const dataEndRow = Math.max(rows.length + 80, 100);
  const categoryColumn = inventoryExportColumns.findIndex((column) => column.key === 'category') + 1;
  const unitColumn = inventoryExportColumns.findIndex((column) => column.key === 'unit') + 1;
  const serialColumn =
    inventoryExportColumns.findIndex((column) => column.key === 'isSerializable') + 1;
  const activeColumn = inventoryExportColumns.findIndex((column) => column.key === 'isActive') + 1;
  const categoryFormula = `"${inventoryCategoryOptions.map((option) => option.value).join(',')}"`;
  const unitFormula = `"${popularUnits.join(',')}"`;
  for (let rowNumber = 2; rowNumber <= dataEndRow; rowNumber += 1) {
    worksheet.getCell(rowNumber, categoryColumn).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [categoryFormula],
    };
    worksheet.getCell(rowNumber, unitColumn).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [unitFormula],
    };
    worksheet.getCell(rowNumber, serialColumn).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"TRUE,FALSE"'],
    };
    worksheet.getCell(rowNumber, activeColumn).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"TRUE,FALSE"'],
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
}

function normalizeHeader(header: unknown) {
  const text = String(header ?? '').trim();
  const match = text.match(/\(([^)]+)\)/);
  const normalized = (match?.[1] ?? text).trim();
  const lookupKey = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const aliasMap: Record<string, InventoryExportColumnKey> = {
    'Mã vật tư': 'sku',
    'Ma vat tu': 'sku',
    'ma vat tu': 'sku',
    sku: 'sku',
    'Tên vật tư': 'name',
    'Ten vat tu': 'name',
    'ten vat tu': 'name',
    name: 'name',
    'Nhóm vật tư': 'category',
    'Nhom vat tu': 'category',
    'nhom vat tu': 'category',
    category: 'category',
    'Quy cách/kích cỡ': 'specification',
    'Quy cach/kich co': 'specification',
    'Quy cách': 'specification',
    'Quy cach': 'specification',
    'Kích cỡ': 'specification',
    'Kich co': 'specification',
    specification: 'specification',
    'Link ảnh': 'imageUrl',
    'Link anh': 'imageUrl',
    'Ảnh': 'imageUrl',
    Anh: 'imageUrl',
    image: 'imageUrl',
    imageurl: 'imageUrl',
    'image url': 'imageUrl',
    'Đơn vị tính': 'unit',
    'Don vi tinh': 'unit',
    'don vi tinh': 'unit',
    unit: 'unit',
    'Mức cảnh báo tồn thấp': 'minStock',
    'Muc canh bao ton thap': 'minStock',
    'Tồn tối thiểu': 'minStock',
    'Ton toi thieu': 'minStock',
    'muc canh bao ton thap': 'minStock',
    'ton toi thieu': 'minStock',
    minstock: 'minStock',
    'Có quản lý số serial': 'isSerializable',
    'Co quan ly so serial': 'isSerializable',
    'Theo dõi serial': 'isSerializable',
    'Theo doi serial': 'isSerializable',
    'co quan ly so serial': 'isSerializable',
    'theo doi serial': 'isSerializable',
    isserializable: 'isSerializable',
    'Đang sử dụng': 'isActive',
    'Dang su dung': 'isActive',
    'Trạng thái sử dụng': 'isActive',
    'Trang thai su dung': 'isActive',
    'dang su dung': 'isActive',
    'trang thai su dung': 'isActive',
    isactive: 'isActive',
    'Ghi chú': 'note',
    'Ghi chu': 'note',
    'ghi chu': 'note',
    note: 'note',
  };
  return aliasMap[normalized] ?? aliasMap[lookupKey] ?? normalized;
}

function parseBooleanCell(value: unknown) {
  if (typeof value === 'boolean') return { value, error: null };
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return { value: false, error: null };

  if (['true', '1', 'yes', 'y', 'co', 'có', 'x'].includes(text)) {
    return { value: true, error: null };
  }
  if (['false', '0', 'no', 'n', 'khong', 'không'].includes(text)) {
    return { value: false, error: null };
  }

  return { value: false, error: 'Giá trị TRUE/FALSE không hợp lệ' };
}

function parseNumberCell(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: 0, error: null, isBlank: true };

  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { value: 0, error: 'Tồn tối thiểu phải là số không âm', isBlank: false };
  }

  return { value: numeric, error: null, isBlank: false };
}

function parseUrlCell(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return { value: '', error: null };

  if (
    text.startsWith('data:image/png;base64,') ||
    text.startsWith('data:image/jpeg;base64,') ||
    text.startsWith('data:image/webp;base64,')
  ) {
    return { value: text, error: null };
  }

  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { value: text, error: null };
    }
  } catch {
    return { value: text, error: 'Link ảnh không hợp lệ' };
  }

  return { value: text, error: 'Link ảnh không hợp lệ' };
}

function detectCsvDelimiter(headerLine: string) {
  const candidates = [',', ';', '\t'];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: parseCsvLine(headerLine, delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
}

function parseCsvLine(line: string, delimiter = ',') {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvText(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    return {
      rowNumber: index + 2,
      values: Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ''])),
    };
  });
}

async function parseXlsxFile(file: File) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const worksheet =
    workbook.getWorksheet('Danh mục vật tư') ??
    workbook.getWorksheet('Danh muc vat tu') ??
    workbook.worksheets.find((sheet) => !['Huong dan', 'Hướng dẫn'].includes(sheet.name)) ??
    workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = headerValues.map((value) => normalizeHeader(value));

  const rows: { rowNumber: number; values: Record<string, unknown> }[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
    const isBlank = rowValues.every((value) => String(value ?? '').trim() === '');
    if (isBlank) return;

    rows.push({
      rowNumber,
      values: Object.fromEntries(headers.map((header, i) => [header, rowValues[i] ?? ''])),
    });
  });

  return rows;
}

function buildPreviewRows(
  rawRows: { rowNumber: number; values: Record<string, unknown> }[],
  existingSkuList: string[],
) {
  const existingSkus = new Set(existingSkuList.map((sku) => sku.toUpperCase()));
  const fileSkus = new Map<string, number>();

  return rawRows.map<ImportPreviewRow>((row) => {
    const values = row.values;
    const sku = String(values.sku ?? '').trim().toUpperCase();
    const minStock = parseNumberCell(values.minStock);
    const category = String(values.category ?? '').trim();
    const imageUrl = parseUrlCell(values.imageUrl);
    const isSerializable = parseBooleanCell(values.isSerializable);
    const isActive = parseBooleanCell(
      values.isActive === undefined || values.isActive === '' ? true : values.isActive,
    );
    const errors: string[] = [];

    const data: InventoryItemFormInput = {
      sku,
      name: String(values.name ?? '').trim(),
      category,
      specification: String(values.specification ?? '').trim(),
      imageUrl: imageUrl.value,
      unit: String(values.unit ?? '').trim(),
      minStock: minStock.isBlank ? getDefaultMinStockForCategory(category) : minStock.value,
      isSerializable: isSerializable.value,
      isActive: isActive.value,
      note: String(values.note ?? '').trim(),
    };

    if (!data.name) errors.push('Thiếu tên vật tư');
    if (!data.unit) errors.push('Thiếu đơn vị tính');
    if (minStock.error) errors.push(minStock.error);
    if (imageUrl.error) errors.push(imageUrl.error);
    if (isSerializable.error) errors.push(`Theo dõi serial: ${isSerializable.error}`);
    if (isActive.error) errors.push(`Đang sử dụng: ${isActive.error}`);

    if (data.sku) {
      const firstRow = fileSkus.get(data.sku);
      if (firstRow) {
        errors.push(`SKU trùng với dòng ${firstRow}`);
      } else {
        fileSkus.set(data.sku, row.rowNumber);
      }
    }

    return {
      rowNumber: row.rowNumber,
      data,
      status: errors.length > 0 ? 'error' : existingSkus.has(data.sku) ? 'update' : 'new',
      errors,
    };
  });
}

function InventoryItemDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
  refreshFilters,
  categoryOptions,
  unitOptions,
}: {
  mode: DialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (items: SerializedInventoryItem[]) => void;
  refreshFilters: InventoryItemFilters;
  categoryOptions: string[];
  unitOptions: string[];
}) {
  const [form, setForm] = useState<InventoryItemFormInput>(
    mode.type === 'edit' ? itemToForm(mode.item) : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCategoryOption = inventoryCategoryOptions.find(
    (option) => option.value === form.category,
  );

  function updateField<K extends keyof InventoryItemFormInput>(
    key: K,
    value: InventoryItemFormInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCategory(value: string) {
    setForm((current) => ({
      ...current,
      category: value,
      minStock:
        mode.type === 'create' && (!current.minStock || current.minStock <= 1)
          ? getDefaultMinStockForCategory(value)
          : current.minStock,
    }));
  }

  async function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError(null);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setImageError('Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_INVENTORY_IMAGE_FILE_BYTES) {
      setImageError('Ảnh vật tư quá lớn. Vui lòng chọn ảnh dưới 650KB.');
      event.target.value = '';
      return;
    }

    try {
      updateField('imageUrl', await readInventoryImageFile(file));
    } catch {
      setImageError('Không thể đọc file ảnh. Vui lòng thử ảnh khác.');
    } finally {
      event.target.value = '';
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const submitter = (e.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const shouldCreateNext =
      mode.type === 'create' && submitter?.value === 'save-and-new';

    startTransition(async () => {
      const result =
        mode.type === 'edit'
          ? await updateInventoryItemAction(mode.item.id, form)
          : await createInventoryItemAction(form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const refreshed = await getInventoryItemsAction(refreshFilters);
      if (refreshed.success) onSaved(refreshed.data);

      if (shouldCreateNext) {
        setForm(emptyForm);
        return;
      }

      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {mode.type === 'edit' ? 'Sửa mã vật tư' : 'Thêm mã vật tư'}
            </DialogTitle>
            <DialogDescription>
              Đây là danh mục mã vật tư/SKU để hệ thống nhận diện hàng hóa. Bước này chưa nhập số lượng tồn kho.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {mode.type === 'edit' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inventory-sku">Mã vật tư</Label>
                <Input id="inventory-sku" value={form.sku} readOnly disabled />
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">Mã vật tư do hệ thống tự sinh</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ví dụ: PIN-0001, INV-0001, DAY-0001. Hãy chọn nhóm vật tư để mã dễ phân loại.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-unit">Đơn vị tính</Label>
              <Input
                id="inventory-unit"
                list="inventory-unit-options"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
                placeholder="tấm, bộ, mét..."
                disabled={isPending}
              />
              <datalist id="inventory-unit-options">
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </div>
          </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-name">Tên vật tư</Label>
              <Input
                id="inventory-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="VD: Tấm pin Jinko Tiger Neo"
                disabled={isPending}
              />
            </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-specification">Quy cách/kích cỡ</Label>
              <Input
                id="inventory-specification"
                value={form.specification ?? ''}
                onChange={(e) => updateField('specification', e.target.value)}
                placeholder="VD: 550W, 6mm2, 5kW..."
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-image-url">Link ảnh</Label>
              <Input
                id="inventory-image-url"
                value={form.imageUrl ?? ''}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="Dán link ảnh hoặc tải ảnh từ máy"
                disabled={isPending}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => document.getElementById('inventory-image-file')?.click()}
                >
                  <ImageUpIcon className="size-4" />
                  Tải ảnh từ máy
                </Button>
                {form.imageUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => updateField('imageUrl', '')}
                  >
                    <Trash2Icon className="size-4" />
                    Xóa ảnh
                  </Button>
                ) : null}
              </div>
              <Input
                id="inventory-image-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={isPending}
                onChange={handleImageFileChange}
              />
              {form.imageUrl ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-2">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
                    <div
                      aria-label="Ảnh vật tư"
                      className="size-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${form.imageUrl}")` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ảnh này sẽ hiển thị trong danh mục kho và có thể đi kèm báo giá cho thiết bị chính.
                  </p>
                </div>
              ) : null}
              {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-category">Nhóm vật tư</Label>
              <Input
                id="inventory-category"
                list="inventory-category-options"
                value={form.category ?? ''}
                onChange={(e) => updateCategory(e.target.value)}
                placeholder="Chọn nhóm chuẩn hoặc nhập nhóm khác..."
                disabled={isPending}
              />
              <datalist id="inventory-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                {selectedCategoryOption?.hint ??
                  'Nhóm quyết định tiền tố mã vật tư và tồn tối thiểu gợi ý.'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-min-stock">Tồn tối thiểu</Label>
              <Input
                id="inventory-min-stock"
                type="number"
                min="0"
                step="0.001"
                value={form.minStock}
                onChange={(e) => updateField('minStock', Number(e.target.value))}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Hệ thống dùng mức này để cảnh báo tồn thấp. Có thể để 0 nếu vật tư không cần cảnh báo.
              </p>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.isSerializable}
                onChange={(e) => updateField('isSerializable', e.target.checked)}
                disabled={isPending}
              />
              <span>
                <span className="font-medium">Theo dõi serial</span>
                <span className="block text-xs text-muted-foreground">
                  Dùng cho thiết bị cần IMEI/serial.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                disabled={isPending}
              />
              <span>
                <span className="font-medium">Đang sử dụng</span>
                <span className="block text-xs text-muted-foreground">
                  Tắt nếu ngừng dùng vật tư này.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inventory-note">Ghi chú</Label>
            <Textarea
              id="inventory-note"
              value={form.note ?? ''}
              onChange={(e) => updateField('note', e.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            {mode.type === 'create' && (
              <Button
                type="submit"
                name="intent"
                value="save-and-new"
                variant="secondary"
                disabled={isPending}
              >
                {isPending ? 'Đang lưu...' : 'Lưu & tạo tiếp'}
              </Button>
            )}
            <Button type="submit" name="intent" value="save" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu mã vật tư'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryItemCatalog({
  initialItems,
  initialError = null,
  canManageInventory = false,
}: CatalogProps) {
  const [cachedItems] = useState(readInventoryItemCache);
  const [items, setItems] = useState<SerializedInventoryItem[]>(
    () => initialItems ?? (initialError && cachedItems ? cachedItems.items : []),
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CatalogStatus>(ALL_STATUS);
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [error, setError] = useState<string | null>(
    () => (initialError && cachedItems ? null : initialError),
  );
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [isQuickTableOpen, setIsQuickTableOpen] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  useEffect(() => {
    if (items.length === 0) return;

    try {
      const cache: InventoryItemCache = {
        items,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(INVENTORY_ITEM_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Local cache is best-effort only; server data remains the source of truth.
    }
  }, [items]);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.isActive).length;
    const serial = items.filter((item) => item.isSerializable).length;
    return { total: items.length, active, inactive: items.length - active, serial };
  }, [items]);

  const categoryOptions = useMemo(
    () =>
      uniqueOptions([
        ...inventoryCategoryValues,
        ...(items.map((item) => item.category).filter(Boolean) as string[]),
      ]),
    [items],
  );

  const unitOptions = useMemo(
    () => uniqueOptions([...popularUnits, ...items.map((item) => item.unit)]),
    [items],
  );

  const visibleItems = useMemo(
    () =>
      category === ALL_CATEGORY
        ? items
        : items.filter((item) => (item.category || '').trim() === category),
    [category, items],
  );

  const currentExportRows = useMemo(() => exportRowsFromItems(visibleItems), [visibleItems]);
  const importStats = useMemo(
    () => ({
      total: importPreview.length,
      valid: importPreview.filter((row) => row.status !== 'error').length,
      created: importPreview.filter((row) => row.status === 'new').length,
      updated: importPreview.filter((row) => row.status === 'update').length,
      errors: importPreview.filter((row) => row.status === 'error').length,
    }),
    [importPreview],
  );

  const currentFilters = useMemo(
    () => ({
      q: search.trim() || undefined,
      status,
    }),
    [search, status],
  );

  function loadItems(next?: Partial<InventoryItemFilters>) {
    const filters = {
      ...currentFilters,
      ...next,
    };

    startTransition(async () => {
      const result = await getInventoryItemsAction(filters);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setItems(result.data);
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loadItems();
  }

  function handleStatusChange(value: CatalogStatus | null) {
    const nextStatus = value ?? ALL_STATUS;
    setStatus(nextStatus);
    loadItems({ status: nextStatus });
  }

  function handleToggleItemActive(item: SerializedInventoryItem) {
    setError(null);
    startTransition(async () => {
      const result = await updateInventoryItemAction(item.id, {
        ...itemToForm(item),
        isActive: !item.isActive,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const refreshed = await getInventoryItemsAction(currentFilters);
      if (refreshed.success) {
        setItems(refreshed.data);
      }
    });
  }

  async function handleImportFile(file: File | null) {
    setImportError(null);
    setImportResult(null);
    setImportPreview([]);
    setImportFileName(file?.name ?? null);
    if (!file) return;

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const rawRows =
        extension === 'xlsx'
          ? await parseXlsxFile(file)
          : parseCsvText(await file.text());

      if (rawRows.length === 0) {
        setImportError('File không có dòng dữ liệu để preview.');
        return;
      }

      const uploadedSkus = rawRows
        .map((row) => String(row.values.sku ?? '').trim().toUpperCase())
        .filter(Boolean);
      const existingSkusResult = await getInventoryExistingSkusAction(uploadedSkus);
      if (!existingSkusResult.success) {
        setImportError(existingSkusResult.error);
        return;
      }

      setImportPreview(buildPreviewRows(rawRows, existingSkusResult.data));
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : 'Không thể đọc file. Vui lòng kiểm tra lại.',
      );
    }
  }

  function handleConfirmImport() {
    const validRows = importPreview
      .filter((row) => row.status !== 'error')
      .map((row) => row.data);

    if (validRows.length === 0) {
      setImportError('Không có dòng hợp lệ để import.');
      return;
    }

    setImportError(null);
    setImportResult(null);
    startImportTransition(async () => {
      const result = await importInventoryItemsAction(validRows);
      if (!result.success) {
        setImportError(result.error);
        return;
      }

      const refreshed = await getInventoryItemsAction(currentFilters);
      if (refreshed.success) setItems(refreshed.data);
      setImportResult(
        `Import xong: tạo mới ${result.data.created}, cập nhật ${result.data.updated}.`,
      );
      setImportPreview([]);
      setImportFileName(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Tổng vật tư</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Đang sử dụng</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.active}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Ngừng sử dụng</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.inactive}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Có theo dõi serial</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.serial}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm mã, tên hoặc nhóm vật tư..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={isPending}>
            Tìm
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue>{(value) => getCatalogStatusLabel(value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{catalogStatusLabels.all}</SelectItem>
              <SelectItem value="active">{catalogStatusLabels.active}</SelectItem>
              <SelectItem value="inactive">{catalogStatusLabels.inactive}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={(value) => setCategory(value || ALL_CATEGORY)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Tất cả nhóm vật tư" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORY}>Tất cả nhóm vật tư</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex min-h-9 w-full items-center gap-2 rounded-md border bg-muted/30 px-3 text-xs text-muted-foreground sm:w-auto">
            <FilterIcon className="size-3.5" />
            Đang hiển thị {visibleItems.length}/{items.length}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:ml-auto sm:w-auto"
            onClick={() => setIsQuickTableOpen(true)}
            disabled={visibleItems.length === 0}
          >
            <TablePropertiesIcon className="size-4" />
            Bảng danh mục
          </Button>

          {canManageInventory && (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setDialogMode({ type: 'create' })}
            >
              <PlusIcon className="size-4" />
              Thêm mã vật tư
            </Button>
          )}
        </div>
      </div>

      {canManageInventory ? (
        <div className="rounded-lg border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">File mẫu nhập liệu</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mẫu tải về chỉ có cột trống để nhập tay. Điền tối thiểu Tên vật tư và Đơn
                vị tính; Mã vật tư có thể để trống để hệ thống tự sinh. Các cột Có/Không có
                thể nhập TRUE/FALSE hoặc Có/Không.
                Muốn sửa hàng loạt thì export danh mục hiện tại, chỉnh trong Excel rồi upload
                lại để hệ thống preview trước khi cập nhật.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv(templateRows, `inventory-template-${getExportFileDate()}.csv`)
                }
              >
                <DownloadIcon className="size-4" />
                Mẫu CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadXlsx(
                    templateRows,
                    `inventory-template-${getExportFileDate()}.xlsx`,
                  )
                }
              >
                <FileSpreadsheetIcon className="size-4" />
                Mẫu Excel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv(currentExportRows, `inventory-catalog-${getExportFileDate()}.csv`)
                }
                disabled={currentExportRows.length === 0}
              >
                <DownloadIcon className="size-4" />
                Export CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadXlsx(
                    currentExportRows,
                    `inventory-catalog-${getExportFileDate()}.xlsx`,
                  )
                }
                disabled={currentExportRows.length === 0}
              >
                <FileSpreadsheetIcon className="size-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Danh mục vật tư</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bạn đang xem dữ liệu kho ở chế độ đọc. Nếu cần tạo mới, import hoặc sửa vật
                tư, hãy gửi file cho Super Admin để kiểm tra và cập nhật.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv(currentExportRows, `inventory-catalog-${getExportFileDate()}.csv`)
                }
                disabled={currentExportRows.length === 0}
              >
                <DownloadIcon className="size-4" />
                Export CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadXlsx(
                    currentExportRows,
                    `inventory-catalog-${getExportFileDate()}.xlsx`,
                  )
                }
                disabled={currentExportRows.length === 0}
              >
                <FileSpreadsheetIcon className="size-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {canManageInventory && (
      <div className="rounded-lg border p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Import từ file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload CSV/XLSX để preview trước. Dòng lỗi sẽ không được import. SKU đã có
                sẽ cập nhật, SKU mới sẽ tạo mới.
              </p>
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <FileUpIcon className="size-3.5" />
              Chọn file
              <input
                type="file"
                className="sr-only"
                accept=".csv,.xlsx"
                onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {importFileName && (
            <p className="text-xs text-muted-foreground">File đang preview: {importFileName}</p>
          )}

          {importError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {importError}
            </p>
          )}

          {importResult && (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              {importResult}
            </p>
          )}

          {importPreview.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="grid gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md border px-3 py-2">
                  Tổng dòng: <span className="font-semibold">{importStats.total}</span>
                </div>
                <div className="rounded-md border px-3 py-2">
                  Thêm mới: <span className="font-semibold">{importStats.created}</span>
                </div>
                <div className="rounded-md border px-3 py-2">
                  Cập nhật: <span className="font-semibold">{importStats.updated}</span>
                </div>
                <div className="rounded-md border px-3 py-2">
                  Lỗi: <span className="font-semibold">{importStats.errors}</span>
                </div>
              </div>

              <div className="max-h-80 overflow-auto rounded-md border">
                <div className="grid min-w-[760px] grid-cols-[70px_110px_1fr_110px_120px_1.3fr] border-b bg-muted/60 px-3 py-2 text-xs font-medium">
                  <span>Dòng</span>
                  <span>Trạng thái</span>
                  <span>Tên vật tư</span>
                  <span>SKU</span>
                  <span>Đơn vị</span>
                  <span>Lỗi/Ghi chú</span>
                </div>
                {importPreview.slice(0, 80).map((row) => (
                  <div
                    key={`${row.rowNumber}-${row.data.sku}`}
                    className="grid min-w-[760px] grid-cols-[70px_110px_1fr_110px_120px_1.3fr] border-b px-3 py-2 text-xs last:border-b-0"
                  >
                    <span>{row.rowNumber}</span>
                    <span>
                      <Badge
                        variant={row.status === 'error' ? 'destructive' : 'secondary'}
                      >
                        {row.status === 'new'
                          ? 'Thêm mới'
                          : row.status === 'update'
                            ? 'Cập nhật'
                            : 'Lỗi'}
                      </Badge>
                    </span>
                    <span className="truncate">{row.data.name || '-'}</span>
                    <span className="font-mono">{row.data.sku || 'Tự sinh'}</span>
                    <span>{row.data.unit || '-'}</span>
                    <span className={row.errors.length ? 'text-destructive' : 'text-muted-foreground'}>
                      {row.errors.length ? row.errors.join('; ') : 'Hợp lệ'}
                    </span>
                  </div>
                ))}
              </div>

              {importPreview.length > 80 && (
                <p className="text-xs text-muted-foreground">
                  Đang hiển thị 80 dòng đầu để giữ màn hình nhẹ. Khi xác nhận, hệ thống
                  vẫn xử lý toàn bộ dòng hợp lệ.
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImportPreview([]);
                    setImportFileName(null);
                    setImportError(null);
                  }}
                >
                  Xóa preview
                </Button>
                <Button
                  type="button"
                  disabled={isImportPending || importStats.valid === 0}
                  onClick={handleConfirmImport}
                >
                  {isImportPending
                    ? 'Đang import...'
                    : `Import ${importStats.valid} dòng hợp lệ`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
        {canManageInventory
          ? 'Danh mục vật tư là dữ liệu nền cho tồn kho. Sau khi mã vật tư ổn định, bạn có thể nhập tồn ban đầu, nhập kho hoặc xuất kho ở phần tồn kho phía trên.'
          : 'Danh mục vật tư là dữ liệu nền cho tồn kho. Bạn có thể tra cứu để chọn đúng vật tư khi làm việc với khách hàng hoặc công trình.'}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isPending && (
        <p className="text-xs text-muted-foreground">Đang cập nhật danh mục...</p>
      )}

      {!error && !isPending && visibleItems.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Chưa có vật tư phù hợp.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {visibleItems.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-primary">{item.sku}</p>
                  <Badge
                    variant={item.isActive ? 'secondary' : 'outline'}
                    className={
                      item.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                    }
                  >
                    {item.isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                  </Badge>
                  {item.isSerializable && (
                    <Badge variant="outline" className="gap-1">
                      <ShieldCheckIcon className="size-3" />
                      Serial
                    </Badge>
                  )}
                </div>
                <h2 className="mt-1 font-medium">{item.name}</h2>
                {item.specification && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quy cách/kích cỡ: {item.specification}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Nhóm: {item.category || 'Chưa phân nhóm'}</span>
                  <span>Đơn vị: {item.unit}</span>
                  <span>Tồn tối thiểu: {formatNumber(item.minStock)}</span>
                </div>
                {item.note && <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>}
                {canManageInventory && (
                  <Button
                    type="button"
                    size="sm"
                    variant={item.isActive ? 'outline' : 'default'}
                    className={
                      item.isActive
                        ? 'mt-3 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/30'
                        : 'mt-3 bg-emerald-600 text-white hover:bg-emerald-700'
                    }
                    disabled={isPending}
                    onClick={() => handleToggleItemActive(item)}
                  >
                    {item.isActive ? (
                      <PauseCircleIcon className="size-4" />
                    ) : (
                      <CheckCircle2Icon className="size-4" />
                    )}
                    {item.isActive ? 'Ngừng sử dụng' : 'Kích hoạt lại'}
                  </Button>
                )}
                </div>
              </div>
              {canManageInventory && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogMode({ type: 'edit', item })}
                >
                  <EditIcon className="size-4" />
                  Sửa
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BoxesIcon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Luồng kho tiếp theo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Khi tồn kho đã ổn, bước tiếp theo nên là phiếu kho chuẩn, giữ vật tư
              cho công trình và nối BOM từ báo giá/lệnh thi công.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isQuickTableOpen} onOpenChange={setIsQuickTableOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Bảng danh mục vật tư</DialogTitle>
            <DialogDescription>
              {canManageInventory
                ? 'Xem nhanh danh mục theo bộ lọc hiện tại và mở từng dòng để sửa khi cần.'
                : 'Xem nhanh danh mục theo bộ lọc hiện tại.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto rounded-md border">
            <div className="sticky top-0 z-10 grid min-w-[1020px] grid-cols-[130px_1.2fr_160px_150px_90px_120px_120px_80px] border-b bg-muted px-3 py-2 text-xs font-medium shadow-sm">
              <span>Mã vật tư</span>
              <span>Tên vật tư</span>
              <span>Quy cách</span>
              <span>Nhóm</span>
              <span>Đơn vị</span>
              <span>Tồn tối thiểu</span>
              <span>Trạng thái</span>
              <span></span>
            </div>
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="grid min-w-[1020px] grid-cols-[130px_1.2fr_160px_150px_90px_120px_120px_80px] items-center border-b px-3 py-2 text-xs last:border-b-0"
              >
                <span className="font-mono font-medium text-primary">{item.sku}</span>
                <span className="truncate">{item.name}</span>
                <span className="truncate text-muted-foreground">{item.specification || '-'}</span>
                <span className="truncate text-muted-foreground">
                  {item.category || 'Chưa phân nhóm'}
                </span>
                <span>{item.unit}</span>
                <span className="tabular-nums">{formatNumber(item.minStock)}</span>
                <span>
                  <Badge
                    variant={item.isActive ? 'secondary' : 'outline'}
                    className={
                      item.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                    }
                  >
                    {item.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                  </Badge>
                </span>
                {canManageInventory && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsQuickTableOpen(false);
                      setDialogMode({ type: 'edit', item });
                    }}
                  >
                    Sửa
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuickTableOpen(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManageInventory && dialogMode && (
        <InventoryItemDialog
          key={dialogMode.type === 'edit' ? dialogMode.item.id : 'create'}
          mode={dialogMode}
          open={Boolean(dialogMode)}
          onOpenChange={(open) => {
            if (!open) setDialogMode(null);
          }}
          onSaved={setItems}
          refreshFilters={currentFilters}
          categoryOptions={categoryOptions}
          unitOptions={unitOptions}
        />
      )}
    </div>
  );
}
