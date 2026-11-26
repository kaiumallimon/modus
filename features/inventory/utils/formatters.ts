import type { ChipColor } from '@/components/base/badges/chip';
import type {
  AdjustmentType,
  StockMovementType,
  StockStatus,
  TransferStatus,
} from '../types/inventory';

export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatQuantity(qty: number | null | undefined, symbol?: string): string {
  const num = Number(qty ?? 0);
  const formatted = Number.isInteger(num)
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function getStockStatusMeta(status: StockStatus): {
  label: string;
  color: ChipColor;
  dotColor: 'lime' | 'yellow' | 'rose';
} {
  switch (status) {
    case 'OUT_OF_STOCK':
      return { label: 'Out of Stock', color: 'rose', dotColor: 'rose' };
    case 'LOW_STOCK':
      return { label: 'Low Stock', color: 'yellow', dotColor: 'yellow' };
    default:
      return { label: 'In Stock', color: 'lime', dotColor: 'lime' };
  }
}

export function getAdjustmentTypeMeta(type: AdjustmentType): {
  label: string;
  color: ChipColor;
} {
  switch (type) {
    case 'OPENING_STOCK':
      return { label: 'Opening Stock', color: 'blue' };
    case 'INCREASE':
      return { label: 'Increase (+)', color: 'lime' };
    case 'DECREASE':
      return { label: 'Decrease (-)', color: 'rose' };
  }
}

export function getTransferStatusMeta(status: TransferStatus): {
  label: string;
  color: ChipColor;
} {
  return status === 'CONFIRMED'
    ? { label: 'Confirmed', color: 'lime' }
    : { label: 'Pending Confirmation', color: 'yellow' };
}

export function getMovementTypeMeta(type: StockMovementType): {
  label: string;
  color: ChipColor;
} {
  switch (type) {
    case 'OPENING_STOCK':
      return { label: 'Opening Stock', color: 'blue' };
    case 'ADJUSTMENT_INCREASE':
      return { label: 'Adjustment (+)', color: 'lime' };
    case 'ADJUSTMENT_DECREASE':
      return { label: 'Adjustment (-)', color: 'rose' };
    case 'TRANSFER_IN':
      return { label: 'Transfer In', color: 'cyan' };
    case 'TRANSFER_OUT':
      return { label: 'Transfer Out', color: 'orange' };
    case 'PURCHASE_RECEIPT':
      return { label: 'Purchase Receipt', color: 'lime' };
  }
}

export function getRefName(
  val: string | { _id?: string; name?: string; code?: string } | null | undefined,
): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.name || val.code || val._id || '—';
}

export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  if (typeof window === 'undefined') return;
  const csv = buildCsvContent(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
