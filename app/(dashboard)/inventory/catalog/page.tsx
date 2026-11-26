'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiFolderLine, RiPriceTag3Line, RiRulerLine } from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Spinner } from '@/components/base/spinner/spinner';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
import { InventoryModuleGate } from '@/features/inventory/components/inventory-module-gate';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { ProductsTab } from '@/features/inventory/components/tabs/products-tab';
import { CategoriesTab } from '@/features/inventory/components/tabs/categories-tab';
import { UnitsTab } from '@/features/inventory/components/tabs/units-tab';
import { inventoryApi } from '@/features/inventory/api/inventory-api';

type CatalogTabKey = 'products' | 'categories' | 'units';

const CATALOG_READ_PERMS = [
  'inventory.products.read',
  'inventory.categories.read',
  'inventory.units.read',
];

function InventoryCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();

  const canProducts = hasPermission('inventory.products.read');
  const canCategories = hasPermission('inventory.categories.read');
  const canUnits = hasPermission('inventory.units.read');

  const allowedTabs = useMemo<CatalogTabKey[]>(() => {
    const tabs: CatalogTabKey[] = [];
    if (canProducts) tabs.push('products');
    if (canCategories) tabs.push('categories');
    if (canUnits) tabs.push('units');
    return tabs;
  }, [canProducts, canCategories, canUnits]);

  const requestedTab = searchParams.get('tab') as CatalogTabKey | null;
  const activeTab: CatalogTabKey =
    requestedTab && allowedTabs.includes(requestedTab)
      ? requestedTab
      : allowedTabs[0] || 'products';

  const [counts, setCounts] = useState<{
    products?: number;
    categories?: number;
    units?: number;
  }>({});

  const updateCount = useCallback((key: CatalogTabKey, count: number) => {
    setCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }));
  }, []);

  const handleProductsCount = useCallback((c: number) => updateCount('products', c), [updateCount]);
  const handleCategoriesCount = useCallback((c: number) => updateCount('categories', c), [updateCount]);
  const handleUnitsCount = useCallback((c: number) => updateCount('units', c), [updateCount]);

  // Preload inactive tab badge counts once on mount
  useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      const [pRes, cRes, uRes] = await Promise.allSettled([
        canProducts ? inventoryApi.listProducts({ page: 1, limit: 1 }) : Promise.resolve(null),
        canCategories ? inventoryApi.listCategories({ page: 1, limit: 1 }) : Promise.resolve(null),
        canUnits ? inventoryApi.listUnits({ page: 1, limit: 1 }) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setCounts((prev) => ({
        products:
          pRes.status === 'fulfilled' && pRes.value ? pRes.value.meta.total : prev.products,
        categories:
          cRes.status === 'fulfilled' && cRes.value ? cRes.value.meta.total : prev.categories,
        units: uRes.status === 'fulfilled' && uRes.value ? uRes.value.meta.total : prev.units,
      }));
    };
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [canProducts, canCategories, canUnits]);

  const handleTabChange = useCallback(
    (key: React.Key) => {
      const next = String(key) as CatalogTabKey;
      router.replace(`/inventory/catalog?tab=${next}`, { scroll: false });
    },
    [router],
  );

  return (
    <InventoryModuleGate anyPermissions={CATALOG_READ_PERMS}>
      <div className="space-y-6">
        <InventoryPageHeader
          title="Catalog"
          description="Unified workspace for managing product SKUs, categories, and base units of measurement."
        />

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={handleTabChange}
          className="gap-5"
        >
          <TabList aria-label="Catalog sections">
            {canProducts && (
              <Tab id="products" icon={RiPriceTag3Line} count={counts.products}>
                Products
              </Tab>
            )}
            {canCategories && (
              <Tab id="categories" icon={RiFolderLine} count={counts.categories}>
                Categories
              </Tab>
            )}
            {canUnits && (
              <Tab id="units" icon={RiRulerLine} count={counts.units}>
                Units
              </Tab>
            )}
          </TabList>

          {canProducts && (
            <TabPanel id="products">
              <ProductsTab onCountChange={handleProductsCount} />
            </TabPanel>
          )}

          {canCategories && (
            <TabPanel id="categories">
              <CategoriesTab onCountChange={handleCategoriesCount} />
            </TabPanel>
          )}

          {canUnits && (
            <TabPanel id="units">
              <UnitsTab onCountChange={handleUnitsCount} />
            </TabPanel>
          )}
        </Tabs>
      </div>
    </InventoryModuleGate>
  );
}

export default function InventoryCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="md" className="text-accent-600" />
        </div>
      }
    >
      <InventoryCatalogContent />
    </Suspense>
  );
}
