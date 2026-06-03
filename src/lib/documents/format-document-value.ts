const EMPTY = '—';

export function formatDocumentValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : EMPTY;
  }
  const trimmed = value.trim();
  return trimmed || EMPTY;
}

export function formatDocumentDateTime(date: Date | string | null | undefined): string {
  if (!date) return EMPTY;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return EMPTY;
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDocumentDate(date: Date | string | null | undefined): string {
  if (!date) return EMPTY;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return EMPTY;
  return parsed.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
