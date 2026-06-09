'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  BoxesIcon,
  DownloadIcon,
  EditIcon,
  FileSpreadsheetIcon,
  FileUpIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
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
  getInventoryItemsAction,
  importInventoryItemsAction,
  updateInventoryItemAction,
} from '../actions/inventory-item.actions';
import type { SerializedInventoryItem } from '../lib/inventory-item-serialize';
import type {
  InventoryItemFilters,
  InventoryItemFormInput,
} from '../schema/inventory-item.schema';

const ALL_STATUS = 'all';
type CatalogStatus = NonNullable<InventoryItemFilters['status']>;

const popularUnits = ['tấm', 'bộ', 'cái', 'mét', 'cuộn', 'kg', 'thùng'];

const inventoryExportColumns = [
  {
    key: 'sku',
    label: 'Mã vật tư (sku)',
    guide: 'Bắt buộc, không trùng. Đây là mã hệ thống dùng để tạo mới hoặc cập nhật.',
    example: 'PIN-550W',
  },
  {
    key: 'name',
    label: 'Tên vật tư (name)',
    guide: 'Bắt buộc. Tên dễ hiểu để nhân viên kho và thi công nhận diện.',
    example: 'Tấm pin năng lượng mặt trời 550W',
  },
  {
    key: 'category',
    label: 'Nhóm vật tư (category)',
    guide: 'Không bắt buộc. Ví dụ: Tấm pin, Inverter, Dây điện, Phụ kiện.',
    example: 'Tấm pin',
  },
  {
    key: 'unit',
    label: 'Đơn vị tính (unit)',
    guide: 'Bắt buộc. Ví dụ: tấm, bộ, cái, mét, cuộn, kg, thùng.',
    example: 'tấm',
  },
  {
    key: 'minStock',
    label: 'Tồn tối thiểu (minStock)',
    guide: 'Số không âm. Dùng để cảnh báo thiếu hàng ở các bước sau.',
    example: 0,
  },
  {
    key: 'isSerializable',
    label: 'Theo dõi serial (isSerializable)',
    guide: 'Nhập TRUE/FALSE. TRUE nếu vật tư cần quản lý serial/IMEI.',
    example: false,
  },
  {
    key: 'isActive',
    label: 'Đang sử dụng (isActive)',
    guide: 'Nhập TRUE/FALSE. FALSE nếu muốn ngừng dùng vật tư nhưng không xóa.',
    example: true,
  },
  {
    key: 'note',
    label: 'Ghi chú (note)',
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
};

type DialogMode =
  | { type: 'create'; item?: undefined }
  | { type: 'edit'; item: SerializedInventoryItem };

const emptyForm: InventoryItemFormInput = {
  sku: '',
  name: '',
  category: '',
  unit: '',
  minStock: 0,
  isSerializable: false,
  isActive: true,
  note: '',
};

const templateRows: InventoryExportRow[] = [
  {
    sku: 'PIN-550W',
    name: 'Tấm pin năng lượng mặt trời 550W',
    category: 'Tấm pin',
    unit: 'tấm',
    minStock: 0,
    isSerializable: false,
    isActive: true,
    note: 'Dòng này là ví dụ, có thể xóa trước khi import',
  },
  {
    sku: 'INV-5KW',
    name: 'Inverter hòa lưới 5kW',
    category: 'Inverter',
    unit: 'bộ',
    minStock: 0,
    isSerializable: true,
    isActive: true,
    note: 'Thiết bị có serial nên để TRUE ở cột theo dõi serial',
  },
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
  const guideWorksheet = workbook.addWorksheet('Huong dan');
  const worksheet = workbook.addWorksheet('Danh muc vat tu');

  guideWorksheet.columns = [
    { header: 'Cột trong file', key: 'label', width: 30 },
    { header: 'Cách nhập', key: 'guide', width: 58 },
    { header: 'Ví dụ', key: 'example', width: 28 },
  ];
  guideWorksheet.getRow(1).font = { bold: true };
  guideWorksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFF6FF' },
  };
  guideWorksheet.addRows(
    inventoryExportColumns.map((column) => ({
      label: column.label,
      guide: column.guide,
      example: String(column.example),
    })),
  );
  guideWorksheet.addRow({});
  guideWorksheet.addRow({
    label: 'Lưu ý',
    guide:
      'Có thể sửa phần tiếng Việt cho dễ nhìn, nhưng không đổi mã trong ngoặc như (sku), (name), (unit). Bước import sau này sẽ dùng các mã này để nhận diện cột.',
    example: '',
  });

  worksheet.columns = inventoryExportColumns.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.key === 'name' || column.key === 'note' ? 32 : 18,
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFF6FF' },
  };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.addRows(rows);

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
  return (match?.[1] ?? text).trim();
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
  if (!raw) return { value: 0, error: null };

  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { value: 0, error: 'Tồn tối thiểu phải là số không âm' };
  }

  return { value: numeric, error: null };
}

function parseCsvLine(line: string) {
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

    if (char === ',' && !inQuotes) {
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

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
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
    workbook.getWorksheet('Danh muc vat tu') ??
    workbook.worksheets.find((sheet) => sheet.name !== 'Huong dan') ??
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
  existingItems: SerializedInventoryItem[],
) {
  const existingSkus = new Set(existingItems.map((item) => item.sku.toUpperCase()));
  const fileSkus = new Map<string, number>();

  return rawRows.map<ImportPreviewRow>((row) => {
    const values = row.values;
    const sku = String(values.sku ?? '').trim().toUpperCase();
    const minStock = parseNumberCell(values.minStock);
    const isSerializable = parseBooleanCell(values.isSerializable);
    const isActive = parseBooleanCell(
      values.isActive === undefined || values.isActive === '' ? true : values.isActive,
    );
    const errors: string[] = [];

    const data: InventoryItemFormInput = {
      sku,
      name: String(values.name ?? '').trim(),
      category: String(values.category ?? '').trim(),
      unit: String(values.unit ?? '').trim(),
      minStock: minStock.value,
      isSerializable: isSerializable.value,
      isActive: isActive.value,
      note: String(values.note ?? '').trim(),
    };

    if (!data.sku) errors.push('Thiếu mã vật tư');
    if (!data.name) errors.push('Thiếu tên vật tư');
    if (!data.unit) errors.push('Thiếu đơn vị tính');
    if (minStock.error) errors.push(minStock.error);
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
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof InventoryItemFormInput>(
    key: K,
    value: InventoryItemFormInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {mode.type === 'edit' ? 'Sửa vật tư' : 'Tạo vật tư'}
            </DialogTitle>
            <DialogDescription>
              Dữ liệu này là catalog nền, chưa tự động trừ tồn hoặc nối BOM.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-sku">Mã vật tư</Label>
              <Input
                id="inventory-sku"
                value={form.sku}
                onChange={(e) => updateField('sku', e.target.value.toUpperCase())}
                placeholder="VD: PIN-550W"
                disabled={isPending}
              />
            </div>
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
              placeholder="Tên hiển thị trong kho"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventory-category">Nhóm vật tư</Label>
              <Input
                id="inventory-category"
                list="inventory-category-options"
                value={form.category ?? ''}
                onChange={(e) => updateField('category', e.target.value)}
                placeholder="Tấm pin, inverter..."
                disabled={isPending}
              />
              <datalist id="inventory-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
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
              {isPending ? 'Đang lưu...' : 'Lưu vật tư'}
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
}: CatalogProps) {
  const [items, setItems] = useState<SerializedInventoryItem[]>(initialItems ?? []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CatalogStatus>(ALL_STATUS);
  const [error, setError] = useState<string | null>(initialError);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  const stats = useMemo(() => {
    const active = items.filter((item) => item.isActive).length;
    const serial = items.filter((item) => item.isSerializable).length;
    return { total: items.length, active, inactive: items.length - active, serial };
  }, [items]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.category).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [items],
  );

  const unitOptions = useMemo(
    () =>
      Array.from(new Set([...popularUnits, ...items.map((item) => item.unit)])).sort(
        (a, b) => a.localeCompare(b, 'vi'),
      ),
    [items],
  );

  const currentExportRows = useMemo(() => exportRowsFromItems(items), [items]);
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

      const allItemsResult = await getInventoryItemsAction({ status: ALL_STATUS });
      setImportPreview(
        buildPreviewRows(rawRows, allItemsResult.success ? allItemsResult.data : items),
      );
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
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang sử dụng</SelectItem>
              <SelectItem value="inactive">Ngừng sử dụng</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            className="ml-auto w-full sm:w-auto"
            onClick={() => setDialogMode({ type: 'create' })}
          >
            <PlusIcon className="size-4" />
            Tạo vật tư
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium">File mẫu nhập liệu</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tải file mẫu hoặc export catalog hiện tại, nhập/sửa offline rồi upload
              lại ở bước import sau. Cột có tiếng Việt dễ đọc và mã hệ thống trong ngoặc
              để hệ thống vẫn nhận diện được.
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
              disabled={items.length === 0}
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
              disabled={items.length === 0}
            >
              <FileSpreadsheetIcon className="size-4" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

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
            <label className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted">
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
                  Tạo mới: <span className="font-semibold">{importStats.created}</span>
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
                          ? 'Tạo mới'
                          : row.status === 'update'
                            ? 'Cập nhật'
                            : 'Lỗi'}
                      </Badge>
                    </span>
                    <span className="truncate">{row.data.name || '-'}</span>
                    <span className="font-mono">{row.data.sku || '-'}</span>
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

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Catalog này chưa trừ tồn thật. Bước này chỉ chuẩn hóa mã vật tư, đơn vị,
        nhóm và trạng thái để chuẩn bị nối tồn kho/BOM.
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isPending && (
        <p className="text-xs text-muted-foreground">Đang cập nhật danh mục...</p>
      )}

      {!error && !isPending && items.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Chưa có vật tư phù hợp.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-primary">{item.sku}</p>
                  <Badge variant={item.isActive ? 'secondary' : 'outline'}>
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
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Nhóm: {item.category || 'Chưa phân nhóm'}</span>
                  <span>Đơn vị: {item.unit}</span>
                  <span>Tồn tối thiểu: {formatNumber(item.minStock)}</span>
                </div>
                {item.note && <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDialogMode({ type: 'edit', item })}
              >
                <EditIcon className="size-4" />
                Sửa
              </Button>
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
            <p className="text-sm font-medium">Bước sau catalog</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sau khi mã vật tư ổn, bước tiếp theo là kho vật lý và số tồn theo kho.
              Sau đó mới nối BOM từ báo giá/lệnh thi công.
            </p>
          </div>
        </div>
      </div>

      {dialogMode && (
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
