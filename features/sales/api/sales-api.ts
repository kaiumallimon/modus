import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  CustomerAddress,
  CustomerRecord,
  SalesDashboardOverview,
  SalesFulfillmentRecord,
  SalesOrderRecord,
  SalesOrderStatus,
  SalesPaginatedResponse,
  SalesPricingAdjustmentType,
  SalesSummaryReport,
  SalesTopProductsReport,
} from '../types/sales';

export interface CustomerPayload {
  code?: string;
  name: string;
  phone: string;
  email?: string;
  billingAddress?: CustomerAddress;
  shippingAddress?: CustomerAddress;
  notes?: string;
}

export interface SalesOrderLinePayload {
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  discountType?: SalesPricingAdjustmentType;
  discountValue?: number;
  taxType?: SalesPricingAdjustmentType;
  taxValue?: number;
}

export interface SalesOrderPayload {
  customerId: string;
  warehouseId: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  items: SalesOrderLinePayload[];
  notes?: string;
}

export interface FulfillOrderPayload {
  items: Array<{
    productId: string;
    fulfilledQuantity: number;
  }>;
  fulfilledDate?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface SalesAnalyticsParams {
  days?: number;
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  limit?: number;
}

export const salesApi = {
  // Dashboard
  getDashboard: (params?: SalesAnalyticsParams) =>
    apiClient<SalesDashboardOverview>(API_ENDPOINTS.SALES_DASHBOARD, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  // Customers
  listCustomers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) =>
    apiClient<SalesPaginatedResponse<CustomerRecord>>(
      API_ENDPOINTS.SALES_CUSTOMERS,
      { params }
    ),

  getCustomer: (id: string) =>
    apiClient<CustomerRecord>(API_ENDPOINTS.SALES_CUSTOMER_BY_ID(id)),

  createCustomer: (data: CustomerPayload) =>
    apiClient<CustomerRecord>(API_ENDPOINTS.SALES_CUSTOMERS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomer: (id: string, data: Partial<CustomerPayload>) =>
    apiClient<CustomerRecord>(API_ENDPOINTS.SALES_CUSTOMER_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveCustomer: (id: string, isActive: boolean = false) =>
    apiClient<CustomerRecord>(API_ENDPOINTS.SALES_CUSTOMER_ARCHIVE(id), {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  getCustomerOrders: (
    id: string,
    params?: { page?: number; limit?: number; search?: string }
  ) =>
    apiClient<{
      items: SalesOrderRecord[];
      fulfillments: SalesFulfillmentRecord[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(API_ENDPOINTS.SALES_CUSTOMER_ORDERS(id), { params }),

  // Sales Orders
  listOrders: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SalesOrderStatus;
    customerId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) =>
    apiClient<SalesPaginatedResponse<SalesOrderRecord>>(
      API_ENDPOINTS.SALES_ORDERS,
      { params }
    ),

  getOrder: (id: string) =>
    apiClient<SalesOrderRecord>(API_ENDPOINTS.SALES_ORDER_BY_ID(id)),

  createOrder: (data: SalesOrderPayload) =>
    apiClient<SalesOrderRecord>(API_ENDPOINTS.SALES_ORDERS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrder: (
    id: string,
    data: Partial<Omit<SalesOrderPayload, 'expectedDeliveryDate'>> & {
      expectedDeliveryDate?: string | null;
    }
  ) =>
    apiClient<SalesOrderRecord>(API_ENDPOINTS.SALES_ORDER_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  confirmOrder: (id: string) =>
    apiClient<SalesOrderRecord>(API_ENDPOINTS.SALES_ORDER_CONFIRM(id), {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  cancelOrder: (id: string, reason?: string) =>
    apiClient<SalesOrderRecord>(API_ENDPOINTS.SALES_ORDER_CANCEL(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Fulfillments
  fulfillOrder: (orderId: string, data: FulfillOrderPayload) =>
    apiClient<SalesFulfillmentRecord>(
      API_ENDPOINTS.SALES_ORDER_FULFILL(orderId),
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  listFulfillments: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    salesOrderId?: string;
    customerId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) =>
    apiClient<SalesPaginatedResponse<SalesFulfillmentRecord>>(
      API_ENDPOINTS.SALES_FULFILLMENTS,
      { params }
    ),

  getFulfillment: (id: string) =>
    apiClient<SalesFulfillmentRecord>(API_ENDPOINTS.SALES_FULFILLMENT_BY_ID(id)),

  // Reports
  getSummaryReport: (params?: SalesAnalyticsParams) =>
    apiClient<SalesSummaryReport>(API_ENDPOINTS.SALES_REPORTS_SUMMARY, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  getTopProductsReport: (params?: SalesAnalyticsParams) =>
    apiClient<SalesTopProductsReport>(API_ENDPOINTS.SALES_REPORTS_TOP_PRODUCTS, {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};
