import type { PricingAdjustmentType } from '../types/procurement';

const PHONE_REGEX = /^[+]?[\d\s().-]{6,24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SupplierFormInput {
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternativePhone?: string;
  website?: string;
}

export function validateSupplierForm(input: SupplierFormInput): string | null {
  if (!input.name.trim()) return 'Supplier name is required.';
  if (!input.code.trim()) return 'Supplier code is required.';
  if (!/^[A-Za-z0-9_-]+$/.test(input.code.trim())) {
    return 'Supplier code may only contain letters, numbers, hyphens, and underscores.';
  }
  if (!input.contactPerson.trim()) return 'Primary contact person is required.';
  if (!EMAIL_REGEX.test(input.email.trim())) return 'Please provide a valid email address.';
  if (!PHONE_REGEX.test(input.phone.trim())) return 'Please provide a valid primary phone number.';
  if (input.alternativePhone?.trim() && !PHONE_REGEX.test(input.alternativePhone.trim())) {
    return 'Alternative phone number format is invalid.';
  }
  if (input.website?.trim() && !/^https?:\/\/.+/i.test(input.website.trim())) {
    return 'Website must start with http:// or https://';
  }
  return null;
}

export interface PurchaseOrderLineInput {
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  discountType: PricingAdjustmentType;
  discountValue: number;
  taxType: PricingAdjustmentType;
  taxValue: number;
}

export interface ComputedOrderLinePreview {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export function calculateLinePreview(
  line: PurchaseOrderLineInput,
): ComputedOrderLinePreview {
  const qty = Number(line.orderedQuantity) || 0;
  const price = Number(line.unitPrice) || 0;
  const unitCents = Math.round(Math.max(0, price) * 100);
  const subCents = Math.round(Math.max(0, qty) * unitCents);

  const dVal = Math.max(0, Number(line.discountValue) || 0);
  const discountCents =
    line.discountType === 'PERCENTAGE'
      ? Math.round((subCents * Math.min(100, dVal)) / 100)
      : Math.min(subCents, Math.round(dVal * 100));

  const taxableCents = Math.max(0, subCents - discountCents);
  const tVal = Math.max(0, Number(line.taxValue) || 0);
  const taxCents =
    line.taxType === 'PERCENTAGE'
      ? Math.round((taxableCents * Math.min(100, tVal)) / 100)
      : Math.round(tVal * 100);

  return {
    subtotal: subCents / 100,
    discountAmount: discountCents / 100,
    taxAmount: taxCents / 100,
    lineTotal: (taxableCents + taxCents) / 100,
  };
}

export function validatePurchaseOrderForm(input: {
  supplierId: string;
  destinationWarehouseId: string;
  items: PurchaseOrderLineInput[];
}): string | null {
  if (!input.supplierId) return 'Please select a supplier.';
  if (!input.destinationWarehouseId) return 'Please select a destination warehouse.';
  if (!input.items.length) return 'Add at least one product line item.';

  const seen = new Set<string>();
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    if (!item.productId) return `Line ${i + 1}: Please select a product.`;
    if (seen.has(item.productId)) {
      return 'Duplicate products are not allowed in the same purchase order.';
    }
    seen.add(item.productId);
    if (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity <= 0) {
      return `Line ${i + 1}: Ordered quantity must be greater than 0.`;
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return `Line ${i + 1}: Unit price cannot be negative.`;
    }
    if (!Number.isFinite(item.discountValue) || item.discountValue < 0) {
      return `Line ${i + 1}: Discount cannot be negative.`;
    }
    if (item.discountType === 'PERCENTAGE' && item.discountValue > 100) {
      return `Line ${i + 1}: Percentage discount cannot exceed 100%.`;
    }
    const preview = calculateLinePreview(item);
    if (
      item.discountType === 'FIXED' &&
      item.discountValue > preview.subtotal
    ) {
      return `Line ${i + 1}: Discount cannot exceed line subtotal.`;
    }
    if (!Number.isFinite(item.taxValue) || item.taxValue < 0) {
      return `Line ${i + 1}: Tax cannot be negative.`;
    }
  }
  return null;
}

export function validateGoodsReceiptForm(input: {
  purchaseOrderId: string;
  items: Array<{ productId: string; receivedQuantity: number; remaining: number }>;
}): string | null {
  if (!input.purchaseOrderId) return 'Please select a purchase order to receive.';
  const activeLines = input.items.filter((i) => i.receivedQuantity > 0);
  if (activeLines.length === 0) {
    return 'Enter a received quantity greater than 0 for at least one line item.';
  }
  for (const line of activeLines) {
    if (!Number.isFinite(line.receivedQuantity) || line.receivedQuantity <= 0) {
      return 'Received quantities must be positive numbers.';
    }
    if (line.receivedQuantity > line.remaining + 1e-6) {
      return 'Received quantity cannot exceed remaining order quantity.';
    }
  }
  return null;
}
