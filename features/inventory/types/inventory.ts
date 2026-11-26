export interface InventoryActorSummary {
  id: string;
  email: string;
  humanId?: string;
  role?: string;
}

export interface ProductCategory {
  _id: string;
  name: string;
  description?: string;
  parentCategoryId?:
    | string
    | { _id: string; name: string; isActive?: boolean }
    | null;
  isActive: boolean;
  archivedAt?: string | null;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitOfMeasurement {
  _id: string;
  name: string;
  symbol: string;
  description?: string;
  isActive: boolean;
  archivedAt?: string | null;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Warehouse {
  _id: string;
  name: string;
  code: string;
  description?: string;
  address?: WarehouseAddress;
  isActive: boolean;
  deactivatedAt?: string | null;
  stockedProductsCount?: number;
  totalStockUnits?: number;
  stockItems?: Array<{
    _id: string;
    quantity: number;
    productId: {
      _id: string;
      name: string;
      sku: string;
      minStockThreshold?: number;
      unitId?: { _id: string; name: string; symbol: string };
    };
  }>;
  recentMovements?: StockMovement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: string | { _id: string; name: string; isActive?: boolean };
  unitId: string | { _id: string; name: string; symbol: string; isActive?: boolean };
  costPrice: number;
  sellingPrice?: number | null;
  minStockThreshold: number;
  imageUrl?: string | null;
  imageKey?: string | null;
  isActive: boolean;
  archivedAt?: string | null;
  totalStock?: number;
  warehouseCount?: number;
  warehouseBalances?: Array<{
    _id: string;
    quantity: number;
    warehouseId: { _id: string; name: string; code: string; isActive?: boolean };
    updatedAt?: string;
  }>;
  recentMovements?: StockMovement[];
  createdAt?: string;
  updatedAt?: string;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface StockBalanceRow {
  _id: string;
  quantity: number;
  stockStatus: StockStatus;
  productId: string;
  warehouseId: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    barcode?: string;
    minStockThreshold: number;
    isActive: boolean;
    imageUrl?: string | null;
  };
  category?: { _id?: string; name?: string };
  unit?: { _id?: string; name?: string; symbol?: string };
  warehouse: {
    _id: string;
    name: string;
    code: string;
    isActive: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type AdjustmentType = 'OPENING_STOCK' | 'INCREASE' | 'DECREASE';

export interface StockAdjustment {
  _id: string;
  referenceNumber: string;
  adjustmentType: AdjustmentType;
  productId:
    | string
    | {
        _id: string;
        name: string;
        sku: string;
        unitId?: { _id: string; name: string; symbol: string };
      };
  warehouseId: string | { _id: string; name: string; code: string };
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string;
  notes?: string;
  createdBy: InventoryActorSummary;
  createdAt: string;
}

export type TransferStatus = 'PENDING' | 'CONFIRMED';

export interface StockTransferItem {
  productId:
    | string
    | {
        _id: string;
        name: string;
        sku: string;
        unitId?: { _id: string; name: string; symbol: string };
      };
  quantity: number;
}

export interface StockTransfer {
  _id: string;
  referenceNumber: string;
  sourceWarehouseId: string | { _id: string; name: string; code: string; isActive?: boolean };
  destinationWarehouseId: string | { _id: string; name: string; code: string; isActive?: boolean };
  items: StockTransferItem[];
  notes?: string;
  status: TransferStatus;
  createdBy: InventoryActorSummary;
  confirmedBy?: InventoryActorSummary | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'ADJUSTMENT_INCREASE'
  | 'ADJUSTMENT_DECREASE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PURCHASE_RECEIPT'
  | 'SALE_FULFILLMENT';

export interface StockMovement {
  _id: string;
  productId:
    | string
    | {
        _id: string;
        name: string;
        sku: string;
        barcode?: string;
        minStockThreshold?: number;
        unitId?: { _id: string; name: string; symbol: string };
      };
  warehouseId: string | { _id: string; name: string; code: string };
  movementType: StockMovementType;
  quantityChange: number;
  previousBalance: number;
  resultingBalance: number;
  referenceType: 'ADJUSTMENT' | 'TRANSFER' | 'GOODS_RECEIPT' | 'SALES_FULFILLMENT';
  referenceId: string;
  referenceNumber: string;
  description: string;
  actor: InventoryActorSummary;
  createdAt: string;
}

export interface InventoryDashboardSummary {
  metrics: {
    totalActiveProducts: number;
    totalProducts: number;
    totalCategories: number;
    totalUnits: number;
    totalWarehouses: number;
    totalStockUnits: number;
    lowStockProductsCount: number;
    outOfStockProductsCount: number;
    pendingTransfersCount: number;
  };
  lowStockProducts: Array<{
    _id: string;
    name: string;
    sku: string;
    totalStock: number;
    minStockThreshold: number;
    unit?: { _id: string; name: string; symbol: string };
    category?: { _id: string; name: string };
    status: 'OUT_OF_STOCK' | 'LOW_STOCK';
  }>;
  warehouseSummary: Array<{
    warehouseId: string;
    name: string;
    code: string;
    isActive: boolean;
    skuCount: number;
    totalUnits: number;
  }>;
  recentMovements: StockMovement[];
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string;
  categoryId: string;
  unitId: string;
  costPrice: number;
  sellingPrice?: number | null;
  minStockThreshold?: number;
  imageUrl?: string | null;
  imageKey?: string | null;
  isActive?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export interface CreateUnitPayload {
  name: string;
  symbol: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateUnitPayload = Partial<CreateUnitPayload>;

export interface CreateWarehousePayload {
  name: string;
  code: string;
  description?: string;
  address?: WarehouseAddress;
  isActive?: boolean;
}

export type UpdateWarehousePayload = Partial<CreateWarehousePayload>;

export interface CreateAdjustmentPayload {
  adjustmentType: AdjustmentType;
  productId: string;
  warehouseId: string;
  quantity: number;
  reason: string;
  notes?: string;
  referenceNumber?: string;
  idempotencyKey?: string;
}

export interface CreateTransferPayload {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: Array<{ productId: string; quantity: number }>;
  notes?: string;
  referenceNumber?: string;
  idempotencyKey?: string;
}
