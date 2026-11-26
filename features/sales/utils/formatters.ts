import type { CustomerAddress, SalesOrderStatus } from '../types/sales';

export function formatSalesCurrency(
  amount: number | undefined | null,
  currency: string = 'USD'
): string {
  const val = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    return `$${val.toFixed(2)}`;
  }
}

export function formatSalesQty(qty: number | undefined | null): string {
  const val = typeof qty === 'number' && Number.isFinite(qty) ? qty : 0;
  return Number.isInteger(val) ? String(val) : val.toFixed(2).replace(/\.?0+$/, '');
}

export function formatSalesDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCustomerAddress(addr?: CustomerAddress | null): string {
  if (!addr) return '—';
  const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
    .map((v) => v?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export function getSalesOrderStatusMeta(status: SalesOrderStatus): {
  label: string;
  color: 'gray' | 'blue' | 'yellow' | 'lime' | 'rose';
} {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', color: 'gray' };
    case 'CONFIRMED':
      return { label: 'Confirmed', color: 'blue' };
    case 'PARTIALLY_FULFILLED':
      return { label: 'Partially Fulfilled', color: 'yellow' };
    case 'FULFILLED':
      return { label: 'Fulfilled', color: 'lime' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'rose' };
  }
}
