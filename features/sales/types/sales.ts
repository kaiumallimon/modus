export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CANCELLED';

export type SalesPricingAdjustmentType = 'FIXED' | 'PERCENTAGE';

export interface SalesActorRef {
  id: string;
  email: string;
  name?: string;
}

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface CustomerStats {
  orderCount?: number;
  totalOrders?: number;
  draftOrders?: number;
  confirmedOrders?: number;
  fulfilledOrders?: number;
  cancelledOrders?: number;
  committedValue: number;
  fulfillmentCount: number;
  fulfilledUnits?: number;
  fulfilledValue: number;
  lastFulfilledAt?: string | null;
}

export interface CustomerRecord {
  _id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  billingAddress: CustomerAddress;
  shippingAddress: CustomerAddress;
  notes: string;
  isActive: boolean;
  archivedAt?: string | null;
  createdBy: SalesActorRef;
  updatedBy?: SalesActorRef | null;
  createdAt: string;
  updatedAt: string;
  stats?: CustomerStats;
}

export interface SalesOrderItem {
  productId: string;
  productName: string;
  sku: string;
  unitName: string;
  unitSymbol: string;
  orderedQuantity: number;
  fulfilledQuantity: number;
  remainingQuantity?: number;
  availableStock?: number;
  unitPrice: number;
  discountType: SalesPricingAdjustmentType;
  discountValue: number;
  discountAmount: number;
  taxType: SalesPricingAdjustmentType;
  taxValue: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface SalesOrderRecord {
  _id: string;
  orderNumber: string;
  customerId:
    | string
    | {
        _id: string;
        code: string;
        name: string;
        phone: string;
        email?: string | null;
        isActive: boolean;
        billingAddress?: CustomerAddress;
        shippingAddress?: CustomerAddress;
      };
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot: string | null;
  warehouseId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        isActive: boolean;
        address?: string;
      };
  warehouseNameSnapshot: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  currency: string;
  items: SalesOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  notes: string;
  status: SalesOrderStatus;
  createdBy: SalesActorRef;
  updatedBy?: SalesActorRef | null;
  confirmedBy?: SalesActorRef | null;
  confirmedAt?: string | null;
  cancelledBy?: SalesActorRef | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  fulfilledCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  fulfillments?: SalesFulfillmentRecord[];
}

export interface SalesFulfillmentItem {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  orderedQuantity: number;
  previouslyFulfilledQuantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  lineFulfilledAmount: number;
}

export interface SalesFulfillmentRecord {
  _id: string;
  fulfillmentNumber: string;
  idempotencyKey?: string;
  salesOrderId:
    | string
    | {
        _id: string;
        orderNumber: string;
        status: SalesOrderStatus;
        grandTotal: number;
        orderDate: string;
      };
  salesOrderNumber: string;
  customerId:
    | string
    | {
        _id: string;
        code: string;
        name: string;
        phone?: string;
        email?: string | null;
      };
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  warehouseId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
      };
  warehouseNameSnapshot: string;
  fulfilledDate: string;
  items: SalesFulfillmentItem[];
  totalFulfilledUnits: number;
  currency: string;
  totalFulfilledValue: number;
  notes: string;
  createdBy: SalesActorRef;
  createdAt: string;
  updatedAt: string;
}

export interface SalesDashboardOverview {
  currency: string;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    archivedCustomers: number;
    totalOrders: number;
    draftOrdersCount: number;
    draftOrdersValue: number;
    confirmedOrdersCount: number;
    fulfilledOrdersCount: number;
    cancelledOrdersCount: number;
    committedOrdersCount: number;
    committedValue: number;
    fulfillmentCount: number;
    fulfilledUnits: number;
    fulfilledRevenue: number;
  };
  statusBreakdown: Array<{
    status: SalesOrderStatus;
    count: number;
    value: number;
  }>;
  dailyTrend: Array<{
    date: string;
    fulfillments: number;
    units: number;
    revenue: number;
  }>;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitSymbol: string;
    unitsSold: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    customerName: string;
    customerCode: string;
    warehouseName: string;
    orderDate: string;
    grandTotal: number;
    currency: string;
    status: SalesOrderStatus;
    itemCount: number;
  }>;
  recentCustomers: Array<{
    _id: string;
    code: string;
    name: string;
    phone: string;
    email: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
}

export interface SalesSummaryReport {
  currency: string;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  totals: {
    fulfilledRevenue: number;
    fulfilledUnits: number;
    fulfillmentCount: number;
    committedOrders: number;
    committedValue: number;
    draftOrders: number;
    draftValue: number;
    cancelledOrders: number;
    cancelledValue: number;
  };
  ordersByStatus: Array<{
    status: SalesOrderStatus;
    count: number;
    orderValue: number;
  }>;
  dailyTrend: Array<{
    date: string;
    fulfillments: number;
    units: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    customerCode: string;
    fulfillments: number;
    units: number;
    revenue: number;
  }>;
}

export interface SalesTopProductsReport {
  currency: string;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitSymbol: string;
    unitsSold: number;
    revenue: number;
    fulfillmentCount: number;
    lastSoldAt: string;
  }>;
}

export interface SalesPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SalesPaginatedResponse<T> {
  items: T[];
  pagination: SalesPaginationMeta;
}
