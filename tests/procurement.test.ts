import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SIDEBAR_NAV_GROUPS,
  filterSidebarGroups,
} from '../lib/navigation/sidebar';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  calculateLinePreview,
  validateGoodsReceiptForm,
  validatePurchaseOrderForm,
  validateSupplierForm,
} from '../features/procurement/schemas/validation';
import {
  getGoodsReceiptStatusMeta,
  getPurchaseOrderStatusMeta,
  getTransactionTypeMeta,
} from '../features/procurement/utils/formatters';

describe('Procurement Navigation, Validation, and Helpers Tests', () => {
  it('exposes the 4 consolidated Procurement routes only when both Procurement and Inventory modules are active', () => {
    const activeBoth = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (id) => id === 'procurement' || id === 'inventory',
    );
    const procGroup = activeBoth.find((g) => g.id === 'procurement');
    assert.ok(procGroup, 'Procurement group should be visible when both modules are active');
    assert.deepEqual(
      procGroup.items.map((i) => i.href),
      [
        '/procurement',
        '/procurement/suppliers',
        '/procurement/purchase-orders',
        '/procurement/goods-receipts',
      ],
    );

    const deactivatedInventory = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (id) => id === 'procurement', // inventory inactive
    );
    assert.equal(
      deactivatedInventory.some((g) => g.id === 'procurement'),
      false,
      'Procurement sidebar must hide when Inventory dependency is deactivated',
    );

    const deactivatedProcurement = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (id) => id === 'inventory',
    );
    assert.equal(
      deactivatedProcurement.some((g) => g.id === 'procurement'),
      false,
    );
  });

  it('filters consolidated Procurement routes based on granular RBAC permissions', () => {
    const partialPerms = new Set(['procurement.purchase-orders.read']);
    const groups = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      (perm) => partialPerms.has(perm),
      '',
      () => true,
    );
    const procGroup = groups.find((g) => g.id === 'procurement');
    assert.ok(procGroup);
    assert.deepEqual(
      procGroup.items.map((i) => i.href),
      ['/procurement', '/procurement/purchase-orders'],
    );
  });

  it('validates supplier email, phone, website, and code strictly', () => {
    assert.equal(
      validateSupplierForm({
        name: 'MediCore',
        code: 'SUP-01',
        contactPerson: 'Sarah',
        email: 'orders@medicore.com',
        phone: '+1 555 201 7788',
        website: 'https://medicore.com',
      }),
      null,
    );
    assert.ok(
      validateSupplierForm({
        name: 'MediCore',
        code: 'SUP 01',
        contactPerson: 'Sarah',
        email: 'orders@medicore.com',
        phone: '+1 555 201 7788',
      }),
    );
    assert.ok(
      validateSupplierForm({
        name: 'MediCore',
        code: 'SUP-01',
        contactPerson: 'Sarah',
        email: 'invalid-email',
        phone: '+1 555 201 7788',
      }),
    );
  });

  it('computes multi-item purchase order pricing previews without float drift and rejects invalid lines', () => {
    const line = calculateLinePreview({
      productId: 'p1',
      orderedQuantity: 3,
      unitPrice: 33.33,
      discountType: 'FIXED',
      discountValue: 4.99,
      taxType: 'PERCENTAGE',
      taxValue: 10,
    });
    assert.equal(line.subtotal, 99.99);
    assert.equal(line.discountAmount, 4.99);
    assert.equal(line.taxAmount, 9.5);
    assert.equal(line.lineTotal, 104.5);

    assert.equal(
      validatePurchaseOrderForm({
        supplierId: 'sup1',
        destinationWarehouseId: 'wh1',
        items: [
          {
            productId: 'p1',
            orderedQuantity: 3,
            unitPrice: 33.33,
            discountType: 'FIXED',
            discountValue: 4.99,
            taxType: 'PERCENTAGE',
            taxValue: 10,
          },
        ],
      }),
      null,
    );

    assert.ok(
      validatePurchaseOrderForm({
        supplierId: 'sup1',
        destinationWarehouseId: 'wh1',
        items: [
          {
            productId: 'p1',
            orderedQuantity: 5,
            unitPrice: 10,
            discountType: 'FIXED',
            discountValue: 0,
            taxType: 'FIXED',
            taxValue: 0,
          },
          {
            productId: 'p1',
            orderedQuantity: 2,
            unitPrice: 10,
            discountType: 'FIXED',
            discountValue: 0,
            taxType: 'FIXED',
            taxValue: 0,
          },
        ],
      }),
    );
  });

  it('prevents over-receiving in goods receipt validation', () => {
    assert.equal(
      validateGoodsReceiptForm({
        purchaseOrderId: 'po1',
        items: [{ productId: 'p1', receivedQuantity: 25, remaining: 40 }],
      }),
      null,
    );
    assert.ok(
      validateGoodsReceiptForm({
        purchaseOrderId: 'po1',
        items: [{ productId: 'p1', receivedQuantity: 45, remaining: 40 }],
      }),
    );
    assert.ok(
      validateGoodsReceiptForm({
        purchaseOrderId: 'po1',
        items: [{ productId: 'p1', receivedQuantity: 0, remaining: 40 }],
      }),
    );
  });

  it('provides Procurement status metadata and compliant REST endpoint paths', () => {
    assert.equal(getPurchaseOrderStatusMeta('PARTIALLY_RECEIVED').label, 'Partially Received');
    assert.equal(getGoodsReceiptStatusMeta('CONFIRMED').color, 'lime');
    assert.equal(getTransactionTypeMeta('GOODS_RECEIPT').label, 'Goods Receipt');
    assert.equal(API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDER_SUBMIT('po1'), '/procurement/purchase-orders/po1/submit');
    assert.equal(API_ENDPOINTS.PROCUREMENT_GOODS_RECEIPT_CONFIRM('gr1'), '/procurement/goods-receipts/gr1/confirm');
    assert.equal(API_ENDPOINTS.PROCUREMENT_SUPPLIER_STATEMENT('s1'), '/procurement/suppliers/s1/statement');
  });
});
