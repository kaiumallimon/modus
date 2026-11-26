import type { CreateAdjustmentPayload, CreateProductPayload, CreateTransferPayload } from '../types/inventory';

export function validateProductForm(input: {
  name: string;
  sku: string;
  categoryId: string;
  unitId: string;
  costPrice: number;
  sellingPrice?: number | null;
  minStockThreshold?: number;
}): { valid: boolean; error?: string; payload?: CreateProductPayload } {
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  if (!name) return { valid: false, error: 'Product name is required.' };
  if (!sku || !/^[A-Za-z0-9._-]+$/.test(sku)) {
    return {
      valid: false,
      error: 'Valid SKU is required (letters, numbers, dots, hyphens, underscores).',
    };
  }
  if (!input.categoryId) return { valid: false, error: 'Product category is required.' };
  if (!input.unitId) return { valid: false, error: 'Unit of measurement is required.' };
  if (!Number.isFinite(input.costPrice) || input.costPrice < 0) {
    return { valid: false, error: 'Cost price must be a non-negative number.' };
  }
  if (
    input.sellingPrice !== undefined &&
    input.sellingPrice !== null &&
    (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0)
  ) {
    return { valid: false, error: 'Selling price cannot be negative.' };
  }
  if (
    input.minStockThreshold !== undefined &&
    (!Number.isFinite(input.minStockThreshold) || input.minStockThreshold < 0)
  ) {
    return { valid: false, error: 'Minimum stock threshold cannot be negative.' };
  }

  return {
    valid: true,
    payload: {
      name,
      sku,
      categoryId: input.categoryId,
      unitId: input.unitId,
      costPrice: Number(input.costPrice),
      sellingPrice:
        input.sellingPrice === undefined || input.sellingPrice === null
          ? null
          : Number(input.sellingPrice),
      minStockThreshold: Number(input.minStockThreshold ?? 0),
    },
  };
}

export function validateAdjustmentForm(input: {
  adjustmentType: CreateAdjustmentPayload['adjustmentType'];
  productId: string;
  warehouseId: string;
  quantity: number;
  reason: string;
  notes?: string;
}): { valid: boolean; error?: string } {
  if (!input.productId) return { valid: false, error: 'Select a product.' };
  if (!input.warehouseId) return { valid: false, error: 'Select a warehouse.' };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { valid: false, error: 'Quantity must be strictly greater than zero.' };
  }
  if (!input.reason.trim()) {
    return { valid: false, error: 'Adjustment reason is required.' };
  }
  return { valid: true };
}

export function validateTransferForm(input: {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: CreateTransferPayload['items'];
}): { valid: boolean; error?: string } {
  if (!input.sourceWarehouseId) {
    return { valid: false, error: 'Select a source warehouse.' };
  }
  if (!input.destinationWarehouseId) {
    return { valid: false, error: 'Select a destination warehouse.' };
  }
  if (input.sourceWarehouseId === input.destinationWarehouseId) {
    return {
      valid: false,
      error: 'Source and destination warehouses must be different.',
    };
  }
  if (!input.items || input.items.length === 0) {
    return { valid: false, error: 'Add at least one product line item.' };
  }
  const seen = new Set<string>();
  for (const item of input.items) {
    if (!item.productId) {
      return { valid: false, error: 'Each transfer line requires a product.' };
    }
    if (seen.has(item.productId)) {
      return {
        valid: false,
        error: 'Duplicate products found in transfer lines. Combine quantities into one line.',
      };
    }
    seen.add(item.productId);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return {
        valid: false,
        error: 'All transfer quantities must be strictly greater than zero.',
      };
    }
  }
  return { valid: true };
}
