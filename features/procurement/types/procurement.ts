import type { InventoryActorSummary } from '@/features/inventory/types/inventory';

export type PricingAdjustmentType = 'FIXED' | 'PERCENTAGE';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED';

export interface SupplierAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface SupplierContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface Supplier {
  _id: string;
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
  isActive: boolean;
  deactivatedAt?: string | null;
  purchaseOrderCount?: number;
  totalOrderedValue?: number;
  recentPurchaseOrders?: PurchaseOrder[];
  recentReceipts?: GoodsReceipt[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrderItem {
  productId:
    | string
    | {
        _id: string;
        name: string;
        sku: string;
        isActive?: boolean;
      };
  productName: string;
  sku: string;
  unitName?: string;
  unitSymbol?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discountType: PricingAdjustmentType;
  discountValue: number;
  discountAmount: number;
  taxType: PricingAdjustmentType;
  taxValue: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplierId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
        address?: SupplierAddress;
        taxId?: string;
        isActive?: boolean;
      };
  supplierNameSnapshot: string;
  supplierCodeSnapshot: string;
  destinationWarehouseId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        address?: SupplierAddress;
        isActive?: boolean;
      };
  orderDate: string;
  expectedDeliveryDate?: string | null;
  currency: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  status: PurchaseOrderStatus;
  notes?: string;
  createdBy: InventoryActorSummary;
  submittedBy?: InventoryActorSummary | null;
  submittedAt?: string | null;
  cancelledBy?: InventoryActorSummary | null;
  cancelledAt?: string | null;
  cancellationReason?: string;
  receivedCompletedAt?: string | null;
  receipts?: GoodsReceipt[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol?: string;
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  lineReceivedAmount: number;
}

export interface GoodsReceipt {
  _id: string;
  receiptNumber: string;
  idempotencyKey?: string;
  purchaseOrderId:
    | string
    | {
        _id: string;
        orderNumber: string;
        status: PurchaseOrderStatus;
        orderDate?: string;
        grandTotal?: number;
        currency?: string;
      };
  purchaseOrderNumber: string;
  supplierId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
      };
  destinationWarehouseId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
      };
  receivedDate: string;
  status: GoodsReceiptStatus;
  items: GoodsReceiptItem[];
  totalReceivedUnits: number;
  currency: string;
  totalReceivedValue: number;
  notes?: string;
  createdBy: InventoryActorSummary;
  confirmedBy?: InventoryActorSummary | null;
  confirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SupplierTransactionType = 'PURCHASE_ORDER' | 'GOODS_RECEIPT';

export interface SupplierTransactionEntry {
  id: string;
  transactionType: SupplierTransactionType;
  referenceNumber: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  goodsReceiptId?: string;
  goodsReceiptNumber?: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  warehouseName?: string;
  warehouseCode?: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  commitmentLabel: string;
  notes?: string;
}

export interface SupplierTransactionsSummary {
  currency: string;
  totalOrderedCommitment: number;
  totalReceivedGoodsValue: number;
  unreceivedCommitmentAmount: number;
  transactionCount: number;
  accountingNote: string;
}

export interface SupplierStatementResponse {
  supplier: Supplier;
  summary: SupplierTransactionsSummary;
  transactions: SupplierTransactionEntry[];
}

export interface ProcurementDashboardSummary {
  currency: string;
  metrics: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchaseOrders: number;
    draftPurchaseOrders: number;
    orderedPurchaseOrders: number;
    partiallyReceivedPurchaseOrders: number;
    receivedPurchaseOrders: number;
    cancelledPurchaseOrders: number;
    confirmedGoodsReceipts: number;
  };
  statusBreakdown: Array<{
    status: PurchaseOrderStatus;
    count: number;
    amount: number;
  }>;
  recentPurchaseOrders: PurchaseOrder[];
  recentGoodsReceipts: GoodsReceipt[];
}
