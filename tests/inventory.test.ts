import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SIDEBAR_NAV_GROUPS,
  INVENTORY_NAV_GROUP,
  filterSidebarGroups,
} from '../lib/navigation/sidebar';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  validateAdjustmentForm,
  validateProductForm,
  validateTransferForm,
} from '../features/inventory/schemas/validation';
import {
  buildCsvContent,
  getAdjustmentTypeMeta,
  getMovementTypeMeta,
  getStockStatusMeta,
  getTransferStatusMeta,
} from '../features/inventory/utils/formatters';

describe('Inventory Frontend Navigation, Validation, and Helpers Tests', () => {
  it('exposes the 4 consolidated Inventory routes and hides them when Inventory module is deactivated', () => {
    assert.equal(INVENTORY_NAV_GROUP.moduleId, 'inventory');
    assert.deepEqual(
      INVENTORY_NAV_GROUP.items.map((i) => i.href),
      [
        '/inventory',
        '/inventory/catalog',
        '/inventory/warehouses',
        '/inventory/stock',
      ],
    );

    const deactivated = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (modId) => modId !== 'inventory',
    );
    assert.equal(deactivated.some((g) => g.id === 'inventory'), false);

    const activated = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (modId) => modId === 'inventory',
    );
    assert.equal(activated.some((g) => g.id === 'inventory'), true);
  });

  it('filters consolidated Inventory routes based on granular RBAC permissions', () => {
    const stockClerkPerms = new Set(['inventory.stock.read', 'inventory.movements.read']);
    const groups = filterSidebarGroups(
      [INVENTORY_NAV_GROUP],
      (perm) => stockClerkPerms.has(perm),
      '',
      () => true,
    );

    assert.equal(groups.length, 1);
    assert.deepEqual(
      groups[0].items.map((i) => i.href),
      ['/inventory', '/inventory/stock'],
    );

    const catalogReaderPerms = new Set(['inventory.products.read']);
    const catalogGroups = filterSidebarGroups(
      [INVENTORY_NAV_GROUP],
      (perm) => catalogReaderPerms.has(perm),
      '',
      () => true,
    );
    assert.deepEqual(
      catalogGroups[0].items.map((i) => i.href),
      ['/inventory', '/inventory/catalog'],
    );
  });

  it('escapes Inventory CSV exports reliably', () => {
    const csv = buildCsvContent(
      ['SKU', 'Name', 'Notes'],
      [['MED-1', 'Gloves, "Sterile"', 'Line 1\nLine 2']],
    );
    assert.ok(csv.includes('"Gloves, ""Sterile"""'));
    assert.ok(csv.includes('"Line 1\nLine 2"'));
  });

  it('validates product, adjustment, and transfer form payloads strictly', () => {
    const badProd = validateProductForm({
      name: 'Gloves',
      sku: 'bad sku!',
      categoryId: 'cat1',
      unitId: 'u1',
      costPrice: 5,
    });
    assert.equal(badProd.valid, false);

    const negPrice = validateProductForm({
      name: 'Gloves',
      sku: 'GLV-1',
      categoryId: 'cat1',
      unitId: 'u1',
      costPrice: -1,
    });
    assert.equal(negPrice.valid, false);

    const okProd = validateProductForm({
      name: 'Gloves',
      sku: 'glv-1',
      categoryId: 'cat1',
      unitId: 'u1',
      costPrice: 4.5,
      sellingPrice: 8,
      minStockThreshold: 10,
    });
    assert.equal(okProd.valid, true);
    assert.equal(okProd.payload?.sku, 'GLV-1');

    assert.equal(
      validateAdjustmentForm({
        adjustmentType: 'INCREASE',
        productId: 'p1',
        warehouseId: 'w1',
        quantity: 0,
        reason: 'Recount',
      }).valid,
      false,
    );
    assert.equal(
      validateAdjustmentForm({
        adjustmentType: 'OPENING_STOCK',
        productId: 'p1',
        warehouseId: 'w1',
        quantity: 25,
        reason: 'Initial stock',
      }).valid,
      true,
    );

    assert.equal(
      validateTransferForm({
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w1',
        items: [{ productId: 'p1', quantity: 5 }],
      }).valid,
      false,
    );
    assert.equal(
      validateTransferForm({
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w2',
        items: [
          { productId: 'p1', quantity: 5 },
          { productId: 'p1', quantity: 3 },
        ],
      }).valid,
      false,
    );
    assert.equal(
      validateTransferForm({
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w2',
        items: [{ productId: 'p1', quantity: 5 }],
      }).valid,
      true,
    );
  });

  it('formats stock statuses, movement types, and REST endpoints consistently', () => {
    assert.equal(API_ENDPOINTS.INVENTORY_TRANSFER_CONFIRM('tr1'), '/inventory/transfers/tr1/confirm');
    assert.equal(getStockStatusMeta('OUT_OF_STOCK').color, 'rose');
    assert.equal(getStockStatusMeta('LOW_STOCK').color, 'yellow');
    assert.equal(getStockStatusMeta('IN_STOCK').color, 'lime');
    assert.equal(getAdjustmentTypeMeta('OPENING_STOCK').label, 'Opening Stock');
    assert.equal(getTransferStatusMeta('CONFIRMED').color, 'lime');
    assert.equal(getMovementTypeMeta('TRANSFER_OUT').label, 'Transfer Out');
  });
});
