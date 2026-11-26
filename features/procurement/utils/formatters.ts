import type { ChipColor } from '@/components/base/badges/chip';
import type {
  GoodsReceiptStatus,
  PurchaseOrderStatus,
  SupplierTransactionType,
} from '../types/procurement';

export const PROCUREMENT_APP_CURRENCY = 'USD';

export function getPurchaseOrderStatusMeta(status: PurchaseOrderStatus): {
  label: string;
  color: ChipColor;
} {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', color: 'neutral' };
    case 'ORDERED':
      return { label: 'Ordered', color: 'blue' };
    case 'PARTIALLY_RECEIVED':
      return { label: 'Partially Received', color: 'yellow' };
    case 'RECEIVED':
      return { label: 'Received', color: 'lime' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'rose' };
  }
}

export function getGoodsReceiptStatusMeta(status: GoodsReceiptStatus): {
  label: string;
  color: ChipColor;
} {
  return status === 'CONFIRMED'
    ? { label: 'Confirmed', color: 'lime' }
    : { label: 'Draft', color: 'yellow' };
}

export function getTransactionTypeMeta(type: SupplierTransactionType): {
  label: string;
  color: ChipColor;
} {
  return type === 'GOODS_RECEIPT'
    ? { label: 'Goods Receipt', color: 'lime' }
    : { label: 'Purchase Order', color: 'blue' };
}
