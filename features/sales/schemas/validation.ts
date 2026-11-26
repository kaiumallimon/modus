import type { SalesPricingAdjustmentType } from '../types/sales';

export const PHONE_REGEX = /^[+]?[\d\s().-]{6,24}$/;
export const CUSTOMER_CODE_REGEX = /^[A-Z0-9_-]{3,40}$/;

export function validateCustomerForm(input: {
  code?: string;
  name: string;
  phone: string;
  email?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = 'Customer name is required';
  }
  if (!input.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!PHONE_REGEX.test(input.phone.trim())) {
    errors.phone = 'Phone format is invalid (6-24 digits/symbols)';
  }
  if (input.code?.trim() && !CUSTOMER_CODE_REGEX.test(input.code.trim().toUpperCase())) {
    errors.code = 'Code must be 3-40 uppercase letters, numbers, - or _';
  }
  if (input.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  return errors;
}

export interface ComputedSalesLine {
  lineSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export function computeSalesLineClient(params: {
  orderedQuantity: number;
  unitPrice: number;
  discountType: SalesPricingAdjustmentType;
  discountValue: number;
  taxType: SalesPricingAdjustmentType;
  taxValue: number;
}): ComputedSalesLine {
  const qty = Number(params.orderedQuantity) || 0;
  const unitCents = Math.round((Number(params.unitPrice) || 0) * 100);
  const subtotalCents = Math.max(0, Math.round(qty * unitCents));

  let discountCents = 0;
  const dVal = Number(params.discountValue) || 0;
  if (params.discountType === 'PERCENTAGE') {
    discountCents = Math.round((subtotalCents * Math.min(100, Math.max(0, dVal))) / 100);
  } else {
    discountCents = Math.max(0, Math.round(dVal * 100));
  }
  discountCents = Math.min(discountCents, subtotalCents);

  const taxableCents = subtotalCents - discountCents;
  const tVal = Number(params.taxValue) || 0;
  let taxCents = 0;
  if (params.taxType === 'PERCENTAGE') {
    taxCents = Math.round((taxableCents * Math.min(100, Math.max(0, tVal))) / 100);
  } else {
    taxCents = Math.max(0, Math.round(tVal * 100));
  }

  const totalCents = taxableCents + taxCents;

  return {
    lineSubtotal: subtotalCents / 100,
    discountAmount: discountCents / 100,
    taxAmount: taxCents / 100,
    lineTotal: totalCents / 100,
  };
}

export function validateSalesOrderForm(input: {
  customerId: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    orderedQuantity: number;
    unitPrice: number;
    discountType: SalesPricingAdjustmentType;
    discountValue: number;
    taxType: SalesPricingAdjustmentType;
    taxValue: number;
  }>;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.customerId) {
    errors.customerId = 'Customer is required';
  }
  if (!input.warehouseId) {
    errors.warehouseId = 'Source warehouse is required';
  }
  if (!input.items.length) {
    errors.items = 'Add at least one product line item';
    return errors;
  }

  const seenProducts = new Set<string>();
  input.items.forEach((line, idx) => {
    if (!line.productId) {
      errors[`items.${idx}.productId`] = 'Select a product';
    } else if (seenProducts.has(line.productId)) {
      errors[`items.${idx}.productId`] = 'Duplicate product in order';
    } else {
      seenProducts.add(line.productId);
    }

    if (!(Number(line.orderedQuantity) > 0)) {
      errors[`items.${idx}.orderedQuantity`] = 'Qty > 0 required';
    }
    if (Number(line.unitPrice) < 0 || Number.isNaN(Number(line.unitPrice))) {
      errors[`items.${idx}.unitPrice`] = 'Price >= 0 required';
    }
    if (
      line.discountType === 'PERCENTAGE' &&
      (Number(line.discountValue) < 0 || Number(line.discountValue) > 100)
    ) {
      errors[`items.${idx}.discountValue`] = 'Discount % must be 0-100';
    }
    if (
      line.taxType === 'PERCENTAGE' &&
      (Number(line.taxValue) < 0 || Number(line.taxValue) > 100)
    ) {
      errors[`items.${idx}.taxValue`] = 'Tax % must be 0-100';
    }
  });

  return errors;
}

export function validateFulfillOrderForm(
  lines: Array<{
    productId: string;
    fulfilledQuantity: number;
    remainingQuantity: number;
    availableStock?: number;
  }>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const activeLines = lines.filter((l) => Number(l.fulfilledQuantity) > 0);

  if (!activeLines.length) {
    errors.items = 'Enter a positive fulfillment quantity for at least one line item';
    return errors;
  }

  lines.forEach((line, idx) => {
    const qty = Number(line.fulfilledQuantity) || 0;
    if (qty < 0) {
      errors[`items.${idx}.fulfilledQuantity`] = 'Quantity cannot be negative';
    } else if (qty > line.remainingQuantity) {
      errors[`items.${idx}.fulfilledQuantity`] = `Exceeds remaining (${line.remainingQuantity})`;
    } else if (
      line.availableStock !== undefined &&
      qty > line.availableStock
    ) {
      errors[`items.${idx}.fulfilledQuantity`] = `Exceeds available stock (${line.availableStock})`;
    }
  });

  return errors;
}
