import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { PaginatedResult } from '@/lib/api/types';
import type {
  CreateAdjustmentPayload,
  CreateCategoryPayload,
  CreateProductPayload,
  CreateTransferPayload,
  CreateUnitPayload,
  CreateWarehousePayload,
  InventoryDashboardSummary,
  Product,
  ProductCategory,
  StockAdjustment,
  StockBalanceRow,
  StockMovement,
  StockTransfer,
  UnitOfMeasurement,
  UpdateCategoryPayload,
  UpdateProductPayload,
  UpdateUnitPayload,
  UpdateWarehousePayload,
  Warehouse,
} from '../types/inventory';

export const inventoryApi = {
  getDashboard: () =>
    apiClient<InventoryDashboardSummary>(API_ENDPOINTS.INVENTORY_DASHBOARD),

  // Products
  listProducts: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<Product>>(API_ENDPOINTS.INVENTORY_PRODUCTS, {
      params,
    }),
  getProduct: (id: string) =>
    apiClient<Product>(API_ENDPOINTS.INVENTORY_PRODUCT_BY_ID(id)),
  createProduct: (payload: CreateProductPayload) =>
    apiClient<Product>(API_ENDPOINTS.INVENTORY_PRODUCTS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: string, payload: UpdateProductPayload) =>
    apiClient<Product>(API_ENDPOINTS.INVENTORY_PRODUCT_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  archiveProduct: (id: string) =>
    apiClient<Product>(API_ENDPOINTS.INVENTORY_PRODUCT_ARCHIVE(id), {
      method: 'PATCH',
    }),
  uploadProductImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient<Product>(API_ENDPOINTS.INVENTORY_PRODUCT_IMAGE(id), {
      method: 'POST',
      body: formData,
    });
  },

  // Categories
  listCategories: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<ProductCategory>>(
      API_ENDPOINTS.INVENTORY_CATEGORIES,
      { params },
    ),
  createCategory: (payload: CreateCategoryPayload) =>
    apiClient<ProductCategory>(API_ENDPOINTS.INVENTORY_CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCategory: (id: string, payload: UpdateCategoryPayload) =>
    apiClient<ProductCategory>(API_ENDPOINTS.INVENTORY_CATEGORY_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  archiveCategory: (id: string) =>
    apiClient<ProductCategory>(API_ENDPOINTS.INVENTORY_CATEGORY_ARCHIVE(id), {
      method: 'PATCH',
    }),
  deleteCategory: (id: string) =>
    apiClient<{ success: boolean; message: string }>(
      API_ENDPOINTS.INVENTORY_CATEGORY_BY_ID(id),
      { method: 'DELETE' },
    ),

  // Units
  listUnits: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<UnitOfMeasurement>>(API_ENDPOINTS.INVENTORY_UNITS, {
      params,
    }),
  createUnit: (payload: CreateUnitPayload) =>
    apiClient<UnitOfMeasurement>(API_ENDPOINTS.INVENTORY_UNITS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUnit: (id: string, payload: UpdateUnitPayload) =>
    apiClient<UnitOfMeasurement>(API_ENDPOINTS.INVENTORY_UNIT_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  archiveUnit: (id: string) =>
    apiClient<UnitOfMeasurement>(API_ENDPOINTS.INVENTORY_UNIT_ARCHIVE(id), {
      method: 'PATCH',
    }),
  deleteUnit: (id: string) =>
    apiClient<{ success: boolean; message: string }>(
      API_ENDPOINTS.INVENTORY_UNIT_BY_ID(id),
      { method: 'DELETE' },
    ),

  // Warehouses
  listWarehouses: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<Warehouse>>(API_ENDPOINTS.INVENTORY_WAREHOUSES, {
      params,
    }),
  getWarehouse: (id: string) =>
    apiClient<Warehouse>(API_ENDPOINTS.INVENTORY_WAREHOUSE_BY_ID(id)),
  createWarehouse: (payload: CreateWarehousePayload) =>
    apiClient<Warehouse>(API_ENDPOINTS.INVENTORY_WAREHOUSES, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateWarehouse: (id: string, payload: UpdateWarehousePayload) =>
    apiClient<Warehouse>(API_ENDPOINTS.INVENTORY_WAREHOUSE_BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deactivateWarehouse: (id: string) =>
    apiClient<Warehouse>(API_ENDPOINTS.INVENTORY_WAREHOUSE_DEACTIVATE(id), {
      method: 'PATCH',
    }),
  deleteWarehouse: (id: string) =>
    apiClient<{ success: boolean; message: string }>(
      API_ENDPOINTS.INVENTORY_WAREHOUSE_BY_ID(id),
      { method: 'DELETE' },
    ),

  // Stock
  listStock: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<StockBalanceRow>>(API_ENDPOINTS.INVENTORY_STOCK, {
      params,
    }),

  // Adjustments
  listAdjustments: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<StockAdjustment>>(
      API_ENDPOINTS.INVENTORY_ADJUSTMENTS,
      { params },
    ),
  createAdjustment: (payload: CreateAdjustmentPayload) =>
    apiClient<StockAdjustment>(API_ENDPOINTS.INVENTORY_ADJUSTMENTS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Transfers
  listTransfers: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<StockTransfer>>(API_ENDPOINTS.INVENTORY_TRANSFERS, {
      params,
    }),
  getTransfer: (id: string) =>
    apiClient<StockTransfer>(API_ENDPOINTS.INVENTORY_TRANSFER_BY_ID(id)),
  createTransfer: (payload: CreateTransferPayload) =>
    apiClient<StockTransfer>(API_ENDPOINTS.INVENTORY_TRANSFERS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirmTransfer: (id: string) =>
    apiClient<StockTransfer>(API_ENDPOINTS.INVENTORY_TRANSFER_CONFIRM(id), {
      method: 'POST',
    }),

  // Movements
  listMovements: (params?: Record<string, any>) =>
    apiClient<PaginatedResult<StockMovement>>(API_ENDPOINTS.INVENTORY_MOVEMENTS, {
      params,
    }),
  getMovement: (id: string) =>
    apiClient<StockMovement>(API_ENDPOINTS.INVENTORY_MOVEMENT_BY_ID(id)),
};
