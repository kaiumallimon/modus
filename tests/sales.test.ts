import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SIDEBAR_NAV_GROUPS,
  filterSidebarGroups,
} from '../lib/navigation/sidebar';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  computeSalesLineClient,
  validateCustomerForm,
  validateFulfillOrderForm,
  validateSalesOrderForm,
} from '../features/sales/schemas/validation';
import {
  formatCustomerAddress,
  getSalesOrderStatusMeta,
} from '../features/sales/utils/formatters';

describe('Sales Navigation, Validation, and Helpers Tests', () => {
  it('exposes the 4 consolidated Sales routes only when both Sales and Inventory modules are active (independent of Procurement)', () => {
    const activeSalesAndInventory = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (id) => id === 'sales' || id === 'inventory'
    );
    const salesGroup = activeSalesAndInventory.find((g) => g.id === 'sales');
    assert.ok(salesGroup, 'Sales group should appear when Sales & Inventory are active');
    assert.deepEqual(
      salesGroup.items.map((i) => i.href),
      ['/sales', '/sales/customers', '/sales/orders', '/sales/fulfillments']
    );

    const deactivatedInventory = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      () => true,
      '',
      (id) => id === 'sales'
    );
    assert.equal(
      deactivatedInventory.find((g) => g.id === 'sales'),
      undefined,
      'Sales sidebar group must be hidden if Inventory dependency is inactive'
    );
  });

  it('filters Sales navigation links strictly by user RBAC permissions', () => {
    const ordersOnlyUser = filterSidebarGroups(
      ALL_SIDEBAR_NAV_GROUPS,
      (perm) => perm === 'sales.orders.read' || perm === 'sales.reports.read',
      '',
      () => true
    );
    const salesGroup = ordersOnlyUser.find((g) => g.id === 'sales');
    assert.ok(salesGroup);
    assert.deepEqual(
      salesGroup.items.map((i) => i.id),
      ['sales-orders', 'sales-fulfillments']
    );
  });

  it('registers all expected Sales API endpoints cleanly', () => {
    assert.equal(API_ENDPOINTS.SALES_DASHBOARD, '/sales/dashboard');
    assert.equal(API_ENDPOINTS.SALES_CUSTOMERS, '/sales/customers');
    assert.equal(
      API_ENDPOINTS.SALES_CUSTOMER_ARCHIVE('cust-1'),
      '/sales/customers/cust-1/archive'
    );
    assert.equal(
      API_ENDPOINTS.SALES_ORDER_CONFIRM('so-1'),
      '/sales/orders/so-1/confirm'
    );
    assert.equal(
      API_ENDPOINTS.SALES_ORDER_FULFILL('so-1'),
      '/sales/orders/so-1/fulfill'
    );
    assert.equal(API_ENDPOINTS.SALES_REPORTS_SUMMARY, '/sales/reports/summary');
    assert.equal(
      API_ENDPOINTS.SALES_REPORTS_TOP_PRODUCTS,
      '/sales/reports/top-products'
    );
  });

  it('validates customer code, phone, email, and sales order duplicate lines cleanly', () => {
    const badCust = validateCustomerForm({
      code: 'bad code!',
      name: '',
      phone: '12',
      email: 'not-an-email',
    });
    assert.ok(badCust.name);
    assert.ok(badCust.phone);
    assert.ok(badCust.code);
    assert.ok(badCust.email);

    const dupOrder = validateSalesOrderForm({
      customerId: 'c1',
      warehouseId: 'w1',
      items: [
        {
          productId: 'p1',
          orderedQuantity: 2,
          unitPrice: 15,
          discountType: 'FIXED',
          discountValue: 0,
          taxType: 'FIXED',
          taxValue: 0,
        },
        {
          productId: 'p1',
          orderedQuantity: 1,
          unitPrice: 15,
          discountType: 'FIXED',
          discountValue: 0,
          taxType: 'FIXED',
          taxValue: 0,
        },
      ],
    });
    assert.ok(dupOrder['items.1.productId']);
  });

  it('computes line pricing accurately and enforces fulfillment stock/remaining limits', () => {
    const priced = computeSalesLineClient({
      orderedQuantity: 4,
      unitPrice: 25.5,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      taxType: 'PERCENTAGE',
      taxValue: 5,
    });
    assert.equal(priced.lineSubtotal, 102);
    assert.equal(priced.discountAmount, 10.2);
    assert.equal(priced.taxAmount, 4.59);
    assert.equal(priced.lineTotal, 96.39);

    const badFulfill = validateFulfillOrderForm([
      {
        productId: 'p1',
        fulfilledQuantity: 6,
        remainingQuantity: 5,
        availableStock: 4,
      },
    ]);
    assert.ok(badFulfill['items.0.fulfilledQuantity']);
  });

  it('formats customer address and maps Sales order status metadata', () => {
    assert.equal(
      formatCustomerAddress({ street: '10 Main St', city: 'Austin', country: 'US' }),
      '10 Main St, Austin, US'
    );
    assert.equal(getSalesOrderStatusMeta('CONFIRMED').color, 'blue');
    assert.equal(getSalesOrderStatusMeta('FULFILLED').color, 'lime');
  });
});
