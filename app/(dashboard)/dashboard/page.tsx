'use client';

import React, { useState, useMemo } from 'react';
import {
  RiInformationLine,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiEqualizer2Line,
  RiDownload2Line,
  RiAddLine,
  RiTableLine,
  RiLayoutMasonryLine,
  RiStarFill,
  RiCheckLine,
  RiEditLine,
  RiDeleteBinLine,
  RiMoreFill,
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiArrowDownSLine,
  RiShareForwardLine,
  RiNotification3Line,
  RiUserAddLine,
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';
import { Chip, ChipColor } from '@/components/base/badges/chip';
import { Avatar } from '@/components/base/avatar/avatar';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/base/table/table';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { toast } from '@/components/base/toast/toast';
import { cx } from '@/utils/cx';

interface ProductItem {
  id: string;
  name: string;
  price: string;
  sales: string;
  revenue: string;
  stock: number;
  status: 'In Stock' | 'Out of Stock' | 'Restock';
  rating: number;
}

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Uxerflow T-Shirt #10 - White',
    price: '$1.35',
    sales: '471 pcs',
    revenue: '$635.85',
    stock: 100,
    status: 'In Stock',
    rating: 5.0,
  },
  {
    id: 'prod-2',
    name: 'Uxerflow T-Shirt #10 - Black',
    price: '$1.35',
    sales: '402 pcs',
    revenue: '$544.05',
    stock: 0,
    status: 'Out of Stock',
    rating: 5.0,
  },
  {
    id: 'prod-3',
    name: 'Uxerflow T-Shirt #19 - White',
    price: '$1.35',
    sales: '455 pcs',
    revenue: '$645.25',
    stock: 20,
    status: 'Restock',
    rating: 4.9,
  },
  {
    id: 'prod-4',
    name: 'SmartHome Hub',
    price: '$150',
    sales: '7 pcs',
    revenue: '$1,050.00',
    stock: 12,
    status: 'In Stock',
    rating: 4.8,
  },
  {
    id: 'prod-5',
    name: 'UltraSound Wireless Earbuds',
    price: '$200',
    sales: '5 pcs',
    revenue: '$1,000.00',
    stock: 0,
    status: 'Out of Stock',
    rating: 4.8,
  },
  {
    id: 'prod-6',
    name: 'ProVision 4K Monitor',
    price: '$400.25',
    sales: '1 pcs',
    revenue: '$400.25',
    stock: 3,
    status: 'Restock',
    rating: 5.0,
  },
  {
    id: 'prod-7',
    name: 'Uxerflow Retro Wave Shirt',
    price: '$1.35',
    sales: '120 pcs',
    revenue: '$162.40',
    stock: 20,
    status: 'In Stock',
    rating: 4.7,
  },
  {
    id: 'prod-8',
    name: 'Uxerflow Graphic Art T-Shirt',
    price: '$1.35',
    sales: '200 pcs',
    revenue: '$270.15',
    stock: 0,
    status: 'Out of Stock',
    rating: 4.9,
  },
  {
    id: 'prod-9',
    name: 'Uxerflow Classic Fit Crewneck',
    price: '$28.5',
    sales: '130 pcs',
    revenue: '$3,705.25',
    stock: 11,
    status: 'In Stock',
    rating: 5.0,
  },
  {
    id: 'prod-10',
    name: 'EchoWave Bluetooth Speaker',
    price: '$55.5',
    sales: '10 pcs',
    revenue: '$555.00',
    stock: 20,
    status: 'In Stock',
    rating: 5.0,
  },
];

const STATUS_CHIP_MAP: Record<ProductItem['status'], { color: ChipColor; label: string }> = {
  'In Stock': { color: 'lime', label: 'In Stock' },
  'Out of Stock': { color: 'rose', label: 'Out of Stock' },
  Restock: { color: 'yellow', label: 'Restock' },
};

export default function DashboardPage() {
  // State
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['prod-2', 'prod-4'])); // default 2 selected as in reference
  const [showStats, setShowStats] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New product form
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('$25.00');
  const [newStock, setNewStock] = useState('50');

  // Multi-row selection handlers
  const allSelected = useMemo(() => {
    return products.length > 0 && products.every((p) => selectedIds.has(p.id));
  }, [products, selectedIds]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const remaining = products.filter((p) => !selectedIds.has(p.id));
    setProducts(remaining);
    toast.success(`Removed ${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a product title');
      return;
    }

    const created: ProductItem = {
      id: `prod-${Date.now()}`,
      name: newTitle.trim(),
      price: newPrice.startsWith('$') ? newPrice : `$${newPrice}`,
      sales: '0 pcs',
      revenue: '$0.00',
      stock: parseInt(newStock, 10) || 10,
      status: 'In Stock',
      rating: 5.0,
    };

    setProducts([created, ...products]);
    setAddModalOpen(false);
    setNewTitle('');
    toast.success(`Product "${created.name}" created successfully`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-1-medium text-text-primary tracking-tight">Product</h1>
        </div>

        {/* Right Action Cluster matching reference */}
        <div className="flex items-center gap-2.5">
          {/* Share */}
          <button
            type="button"
            className="size-9 rounded-xl border border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors shadow-2xs"
            title="Share view"
            aria-label="Share view"
          >
            <RiShareForwardLine className="size-4" />
          </button>

          {/* Notification bell */}
          <button
            type="button"
            className="size-9 rounded-xl border border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors shadow-2xs"
            title="Notifications"
            aria-label="Notifications"
          >
            <RiNotification3Line className="size-4" />
          </button>

          {/* Team avatar cluster */}
          <div className="flex items-center ps-1">
            <Avatar size="sm" initials="AK" color="neutral" className="ring-2 ring-background-primary-default shadow-2xs" />
            <Avatar size="sm" initials="MR" color="lime" className="ring-2 ring-background-primary-default -ms-2 shadow-2xs" />
            <Avatar size="sm" initials="SP" color="pink" className="ring-2 ring-background-primary-default -ms-2 shadow-2xs" />
            <span className="size-6 -ms-2 rounded-full bg-background-secondary-default border border-border-button-default text-[10px] font-semibold text-text-secondary flex items-center justify-center ring-2 ring-background-primary-default">
              +3
            </span>
            <button
              type="button"
              className="size-6 -ms-1 rounded-full border border-dashed border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
              title="Add collaborator"
              aria-label="Add collaborator"
            >
              <RiUserAddLine className="size-3" />
            </button>
          </div>

          {/* Customize Widget Button */}
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiLayoutMasonryLine}
            className="shadow-2xs ms-1"
          >
            Customize Widget
          </Button>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left side controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View switcher dropdown */}
          <button
            type="button"
            className="h-9 px-3 rounded-xl border border-border-button-default bg-background-primary-default text-body-medium font-medium text-text-primary hover:bg-background-secondary-default flex items-center gap-2 shadow-2xs transition-colors"
          >
            <RiTableLine className="size-4 text-text-secondary" />
            <span>Table View</span>
            <RiArrowDownSLine className="size-4 text-text-tertiary ms-0.5" />
          </button>

          {/* Filter button */}
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiFilter3Line}
            className="shadow-2xs"
          >
            Filter
          </Button>

          {/* Sort button */}
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiArrowUpDownLine}
            className="shadow-2xs"
          >
            Sort
          </Button>

          {/* Show Statistics Switch */}
          <div className="flex items-center gap-2.5 ps-2 border-s border-separator-border">
            <span className="text-body-medium font-medium text-text-primary">Show Statistics</span>
            <Switch
              isSelected={showStats}
              onChange={setShowStats}
              size="md"
              aria-label="Toggle statistics row"
            />
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiEqualizer2Line}
            className="shadow-2xs"
          >
            Customize
          </Button>

          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiDownload2Line}
            className="shadow-2xs"
            onClick={() => toast.info('Exporting inventory data (CSV)...')}
          >
            Export
          </Button>

          {/* Primary CTA in Modus Electric Lime */}
          <Button
            variant="primary"
            size="small"
            leadingIcon={RiAddLine}
            onClick={() => setAddModalOpen(true)}
            className="shadow-2xs font-semibold"
          >
            Add New Product
          </Button>
        </div>
      </div>

      {/* 3. Connected 4-Column KPI Stats Row */}
      {showStats && (
        <div className="bg-background-primary-default border border-border-button-default rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-separator-border overflow-hidden transition-all duration-300">
          {/* Card 1: Total Product */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Total Product
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Total Product" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Total number of active and registered product SKUs in workspace.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                250
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">vs last month</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  + 3 product
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Product Revenue */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Product Revenue
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Product Revenue" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Gross product sales revenue generated across all store channels.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                $15,490
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">vs last month</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  ↑ 9%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Product Sold */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Product Sold
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Product Sold" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Total aggregate units fulfilled and shipped to customers this month.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                2,355
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">vs last month</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  ↑ 7%
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Avg. Monthly Sales */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="flex items-center gap-1.5 text-body-medium font-medium text-text-secondary">
                Avg. Monthly Sales
                <TooltipTrigger delay={150}>
                  <button type="button" aria-label="About Avg Monthly Sales" className="outline-none">
                    <RiInformationLine className="size-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" />
                  </button>
                  <Tooltip size="md">Average rolling monthly units sold across all operational product lines.</Tooltip>
                </TooltipTrigger>
              </span>
            </div>
            <div className="mt-3">
              <span className="text-display-4-medium text-text-primary tracking-tight font-semibold">
                890
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium">
                <span className="text-text-tertiary">vs last month</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-status-lime-background text-status-lime-text font-semibold">
                  ↑ 5%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Data Table with Floating Actions */}
      <div className="bg-background-primary-default border border-border-button-default rounded-2xl shadow-xs overflow-hidden relative">
        <Table aria-label="Product inventory table" size="md" selectionMode="none">
          <TableHeader>
            {/* Checkbox column */}
            <TableColumn id="selection" className="w-12 px-3">
              <Checkbox
                slot={null}
                isSelected={allSelected}
                isIndeterminate={isIndeterminate}
                onChange={toggleSelectAll}
                aria-label="Select all rows"
              />
            </TableColumn>
            <TableColumn id="product" isRowHeader className="min-w-[240px]">
              Product
            </TableColumn>
            <TableColumn id="price" className="w-28">
              Price
            </TableColumn>
            <TableColumn id="sales" className="w-28">
              Sales
            </TableColumn>
            <TableColumn id="revenue" className="w-32">
              Revenue
            </TableColumn>
            <TableColumn id="stock" className="w-24">
              Stock
            </TableColumn>
            <TableColumn id="status" className="w-32">
              Status
            </TableColumn>
            <TableColumn id="rating" className="w-24">
              Rating
            </TableColumn>
            <TableColumn id="actions" className="w-12 text-center">
              +
            </TableColumn>
          </TableHeader>

          <TableBody>
            {products.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const chipInfo = STATUS_CHIP_MAP[item.status];

              return (
                <TableRow
                  key={item.id}
                  id={item.id}
                  className={cx(
                    'transition-colors duration-150 cursor-pointer',
                    isSelected
                      ? 'bg-accent-50/70 dark:bg-accent-950/25'
                      : 'hover:bg-background-secondary-hover/50'
                  )}
                  onClick={() => toggleSelectRow(item.id)}
                >
                  {/* Checkbox Cell with Left Accent Indicator when selected */}
                  <TableCell
                    className={cx(
                      'relative px-3 py-3.5',
                      isSelected &&
                        'before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:bg-accent-500'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      slot={null}
                      isSelected={isSelected}
                      onChange={() => toggleSelectRow(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>

                  {/* Product Name */}
                  <TableCell className="font-medium text-text-primary">
                    <span className="truncate">{item.name}</span>
                  </TableCell>

                  {/* Price */}
                  <TableCell className="text-text-secondary font-mono">{item.price}</TableCell>

                  {/* Sales */}
                  <TableCell className="text-text-secondary">{item.sales}</TableCell>

                  {/* Revenue */}
                  <TableCell className="text-text-secondary font-mono">{item.revenue}</TableCell>

                  {/* Stock */}
                  <TableCell className="text-text-secondary font-mono">{item.stock}</TableCell>

                  {/* Status Chip */}
                  <TableCell>
                    <Chip variant="caption" color={chipInfo.color} className="font-medium">
                      {chipInfo.label}
                    </Chip>
                  </TableCell>

                  {/* Rating with Star */}
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-body-medium text-text-primary font-medium">
                      <RiStarFill className="size-3.5 text-amber-500 shrink-0" />
                      {item.rating.toFixed(1)}
                    </span>
                  </TableCell>

                  {/* Row Context Menu */}
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
                      title="Row options"
                      aria-label="Row options"
                    >
                      <RiMoreFill className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Add column bottom helper */}
        <div className="p-3 border-t border-separator-border bg-background-primary-default">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-body-2-medium text-text-tertiary hover:text-text-primary transition-colors ps-1"
          >
            <RiAddLine className="size-4" />
            <span>Add Column</span>
          </button>
        </div>

        {/* Floating Bulk Action Bar (Dock) */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-4 inset-x-0 mx-auto w-fit z-40 bg-background-primary-default/95 backdrop-blur-md border border-border-button-default shadow-xl rounded-2xl px-3.5 py-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
            <span className="text-body-2-medium font-semibold text-text-primary px-2 py-0.5 rounded-lg bg-background-secondary-default border border-border-button-default">
              {selectedIds.size} Selected
            </span>

            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiCheckLine}
              onClick={() => {
                toast.success(`Applied discount code to ${selectedIds.size} products`);
              }}
            >
              Apply Code
            </Button>

            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiEditLine}
              onClick={() => {
                toast.info(`Editing info for ${selectedIds.size} selected items`);
              }}
            >
              Edit Info
            </Button>

            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiDeleteBinLine}
              className="text-status-rose-text hover:bg-background-tertiary-error hover:border-border-error-default"
              onClick={handleDeleteSelected}
            >
              Delete
            </Button>

            <div className="h-4 w-px bg-separator-border" />

            <button
              type="button"
              className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
              title="More options"
              aria-label="More options"
            >
              <RiMoreFill className="size-4" />
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
        )}

        {/* 5. Pagination Bar matching reference design */}
        <div className="px-4 py-3 border-t border-separator-border bg-background-primary-default flex flex-wrap items-center justify-between gap-4">
          {/* Left: Showing per page */}
          <div className="flex items-center gap-2 text-body-medium text-text-secondary">
            <span>Showing per page</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 ps-2.5 pe-7 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <RiArrowDownSLine className="absolute end-1.5 top-2 size-4 text-text-tertiary pointer-events-none" />
            </div>
          </div>

          {/* Center: Pagination numbers with Electric Lime active pill */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors disabled:opacity-40"
              disabled
              title="First page"
              aria-label="First page"
            >
              <RiArrowLeftDoubleLine className="size-4" />
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors disabled:opacity-40"
              disabled
              title="Previous page"
              aria-label="Previous page"
            >
              <RiArrowLeftSLine className="size-4" />
            </button>

            {/* Pagination buttons with Electric Lime active pill */}
            {[1, 2, 3].map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cx(
                  'size-8 rounded-lg flex items-center justify-center text-body-medium transition-colors font-medium',
                  currentPage === pageNum
                    ? 'bg-accent-500 text-text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
                )}
              >
                {pageNum}
              </button>
            ))}
            <span className="size-8 flex items-center justify-center text-text-tertiary text-body-medium">
              ...
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(25)}
              className={cx(
                'size-8 rounded-lg flex items-center justify-center text-body-medium transition-colors font-medium',
                currentPage === 25
                  ? 'bg-accent-500 text-text-primary font-bold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
              )}
            >
              25
            </button>

            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
              title="Next page"
              aria-label="Next page"
            >
              <RiArrowRightSLine className="size-4" />
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
              title="Last page"
              aria-label="Last page"
            >
              <RiArrowRightDoubleLine className="size-4" />
            </button>
          </div>

          {/* Right: Go to page */}
          <div className="flex items-center gap-1.5 text-body-medium text-text-secondary">
            <span>Go to page</span>
            <input
              type="text"
              defaultValue="1"
              className="w-10 h-8 text-center rounded-lg border border-border-button-default bg-background-primary-default text-text-primary text-body-medium outline-none focus:border-accent-500"
            />
            <button
              type="button"
              className="px-2 py-1 rounded-lg border border-border-button-default text-body-medium text-text-primary hover:bg-background-secondary-default transition-colors flex items-center gap-0.5"
            >
              <span>Go</span>
              <RiArrowRightSLine className="size-3.5 text-text-tertiary" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Add New Product Modal */}
      <Modal isOpen={addModalOpen} onOpenChange={setAddModalOpen} size="md">
        {({ close }) => (
          <form onSubmit={handleCreateProduct}>
            <ModalHeader
              title="Add New Product"
              description="Register a new item or module SKU in your workspace inventory."
            />
            <ModalBody className="space-y-4 py-4">
              <Input
                label="Product Name"
                placeholder="e.g. Uxerflow Athletic Tee - Sage"
                value={newTitle}
                onChange={setNewTitle}
                autoFocus
                isRequired
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Unit Price"
                  placeholder="$24.50"
                  value={newPrice}
                  onChange={setNewPrice}
                />
                <Input
                  label="Initial Stock"
                  type="number"
                  placeholder="50"
                  value={newStock}
                  onChange={setNewStock}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Product
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </div>
  );
}
