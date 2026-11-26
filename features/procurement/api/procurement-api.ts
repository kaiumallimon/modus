import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { PaginatedResult } from '@/lib/api/types';
import type {
  GoodsReceipt,
  GoodsReceiptStatus,
  PricingAdjustmentType,
  ProcurementDashboardSummary,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
  SupplierContact,
  SupplierAddress,
  SupplierStatementResponse,
  SupplierTransactionEntry,
  SupplierTransactionsSummary,
  SupplierTransactionType,
} from '../types/procurement';

export const procurementApi = {
  getDashboardSummary: () =>
    apiClient<ProcurementDashboardSummary>(API_ENDPOINTS.PROCUREMENT_DASHBOARD),

  // Suppliers
  listSuppliers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) =>
    apiClient<PaginatedResult<Supplier>>(API_ENDPOINTS.PROCUREMENT_SUPPLIERS, {
      params,
    }),

  getSupplier: (id: string) =>
    apiClient<Supplier>(API_ENDPOINTS.PROCUREMENT_SUPPLIER_BY_ID(id)),

  createSupplier: (body: {
    name: string;
    code: string;
    contactPerson: string;
    email: string;
    phone: string;
    alternativePhone?: string;
    address?: SupplierAddress;
    website?: string;
    taxId?: string;
    notes?: string;
    contacts?: SupplierContact[];
    isActive?: boolean;
  }) =>
    apiClient<Supplier>(API_ENDPOINTS.PROCUREMENT_SUPPLIERS, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSupplier: (
    id: string,
    body: Partial<{
      name: string;
      code: string;
      contactPerson: string;
      email: string;
      phone: string;
      alternativePhone: string;
      address: SupplierAddress;
      website: string;
      taxId: string;
      notes: string;
      contacts: SupplierContact[];
      isActive: boolean;
    }>,
  ) =>
    apiClient<Supplier>(API_ENDPOINTS.PROCUREMENT_SUPPLIER_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivateSupplier: (id: string) =>
    apiClient<Supplier>(API_ENDPOINTS.PROCUREMENT_SUPPLIER_DEACTIVATE(id), {
      method: 'PATCH',
    }),

  deleteSupplier: (id: string) =>
    apiClient<{ deleted: boolean; id: string }>(
      API_ENDPOINTS.PROCUREMENT_SUPPLIER_BY_ID(id),
      { method: 'DELETE' },
    ),

  // Purchase Orders
  listPurchaseOrders: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: PurchaseOrderStatus;
    supplierId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient<PaginatedResult<PurchaseOrder>>(
      API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDERS,
      { params },
    ),

  getPurchaseOrder: (id: string) =>
    apiClient<PurchaseOrder>(API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDER_BY_ID(id)),

  createPurchaseOrder: (body: {
    supplierId: string;
    destinationWarehouseId: string;
    orderDate?: string;
    expectedDeliveryDate?: string;
    items: Array<{
      productId: string;
      orderedQuantity: number;
      unitPrice: number;
      discountType?: PricingAdjustmentType;
      discountValue?: number;
      taxType?: PricingAdjustmentType;
      taxValue?: number;
    }>;
    notes?: string;
  }) =>
    apiClient<PurchaseOrder>(API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDERS, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePurchaseOrder: (
    id: string,
    body: Partial<{
      supplierId: string;
      destinationWarehouseId: string;
      orderDate: string;
      expectedDeliveryDate: string | null;
      items: Array<{
        productId: string;
        orderedQuantity: number;
        unitPrice: number;
        discountType?: PricingAdjustmentType;
        discountValue?: number;
        taxType?: PricingAdjustmentType;
        taxValue?: number;
      }>;
      notes: string;
    }>,
  ) =>
    apiClient<PurchaseOrder>(API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDER_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  submitPurchaseOrder: (id: string) =>
    apiClient<PurchaseOrder>(
      API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDER_SUBMIT(id),
      { method: 'POST' },
    ),

  cancelPurchaseOrder: (id: string, reason?: string) =>
    apiClient<PurchaseOrder>(
      API_ENDPOINTS.PROCUREMENT_PURCHASE_ORDER_CANCEL(id),
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    ),

  // Goods Receipts
  listGoodsReceipts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: GoodsReceiptStatus;
    purchaseOrderId?: string;
    supplierId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient<PaginatedResult<GoodsReceipt>>(
      API_ENDPOINTS.PROCUREMENT_GOODS_RECEIPTS,
      { params },
    ),

  getGoodsReceipt: (id: string) =>
    apiClient<GoodsReceipt>(API_ENDPOINTS.PROCUREMENT_GOODS_RECEIPT_BY_ID(id)),

  createGoodsReceipt: (body: {
    purchaseOrderId: string;
    receivedDate?: string;
    items: Array<{ productId: string; receivedQuantity: number }>;
    notes?: string;
    idempotencyKey?: string;
    confirmImmediately?: boolean;
  }) =>
    apiClient<GoodsReceipt>(API_ENDPOINTS.PROCUREMENT_GOODS_RECEIPTS, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmGoodsReceipt: (id: string, idempotencyKey?: string) =>
    apiClient<GoodsReceipt>(
      API_ENDPOINTS.PROCUREMENT_GOODS_RECEIPT_CONFIRM(id),
      {
        method: 'POST',
        body: JSON.stringify({ idempotencyKey }),
      },
    ),

  // Supplier Transactions & Statements
  listSupplierTransactions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    supplierId?: string;
    type?: SupplierTransactionType;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient<
      PaginatedResult<SupplierTransactionEntry> & {
        summary: SupplierTransactionsSummary;
      }
    >(API_ENDPOINTS.PROCUREMENT_SUPPLIER_TRANSACTIONS, { params }),

  getSupplierStatement: (
    supplierId: string,
    params?: { startDate?: string; endDate?: string },
  ) =>
    apiClient<SupplierStatementResponse>(
      API_ENDPOINTS.PROCUREMENT_SUPPLIER_STATEMENT(supplierId),
      { params },
    ),
};
