'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiArchiveLine,
  RiEditLine,
  RiEyeLine,
  RiGroupLine,
  RiRefreshLine,
  RiShoppingCart2Line,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { AlertDialog } from '@/components/base/modal/modal';
import { Select, SelectItem } from '@/components/base/select/select';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { toast } from '@/components/base/toast/toast';
import { TableRowsSkeleton } from '@/components/application/loading/page-skeletons';
import { InventoryEmptyState } from '@/features/inventory/components/inventory-empty-state';
import { InventoryPageHeader } from '@/features/inventory/components/inventory-page-header';
import { InventoryPaginationFooter } from '@/features/inventory/components/inventory-pagination-footer';
import {
  InventoryStatsBar,
  type InventoryStatItem,
} from '@/features/inventory/components/inventory-stats-bar';
import { InventoryToolbar } from '@/features/inventory/components/inventory-toolbar';
import { downloadCsv } from '@/features/inventory/utils/formatters';
import { salesApi } from '@/features/sales/api/sales-api';
import { CustomerFormModal } from '@/features/sales/components/customer-form-modal';
import { SalesModuleGate } from '@/features/sales/components/sales-module-gate';
import type { CustomerRecord } from '@/features/sales/types/sales';
import { formatSalesCurrency } from '@/features/sales/utils/formatters';

function CustomersContent() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales.customers.create');
  const canUpdate = hasPermission('sales.customers.update');
  const canArchive = hasPermission('sales.customers.archive');

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [sortId, setSortId] = useState<'createdAt:desc' | 'name:asc' | 'code:asc'>('createdAt:desc');
  const [showStats, setShowStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CustomerRecord | null>(null);

  const loadCustomers = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [sortBy, sortOrder] = sortId.split(':') as [string, 'asc' | 'desc'];
      try {
        const res = await salesApi.listCustomers({
          page,
          limit,
          search: search.trim() || undefined,
          isActive:
            statusFilter === 'ALL'
              ? undefined
              : statusFilter === 'ACTIVE',
          sortBy,
          sortOrder,
        });
        setCustomers(res.items || []);
        setTotal(res.pagination?.total ?? 0);
        setTotalPages(res.pagination?.totalPages ?? 1);
      } catch (err: any) {
        toast.error('Failed to Load Customers', {
          description: err?.message || 'Unable to load customer directory.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, search, statusFilter, sortId]
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    const nextActive = !archiveTarget.isActive;
    try {
      await salesApi.archiveCustomer(archiveTarget._id, nextActive);
      toast.success(nextActive ? 'Customer Restored' : 'Customer Archived', {
        description: `${archiveTarget.name} (${archiveTarget.code}) is now ${nextActive ? 'active' : 'archived'}. Historical orders remain preserved.`,
      });
      setArchiveTarget(null);
      loadCustomers(true);
    } catch (err: any) {
      toast.error('Action Failed', {
        description: err?.message || 'Unable to change customer archive status.',
      });
      throw err;
    }
  };

  const activeOnPage = customers.filter((c) => c.isActive).length;
  const pageFulfilledTotal = customers.reduce(
    (sum, c) => sum + (c.stats?.fulfilledValue ?? 0),
    0
  );

  const statItems: InventoryStatItem[] = [
    {
      id: 'customers-total',
      label: 'Total Matching Customers',
      value: String(total),
      tooltip: 'Customers matching your current filter.',
      contextLabel: 'Directory Size',
      badgeText: `${customers.length} on page`,
      badgeTone: 'neutral',
      icon: RiGroupLine,
    },
    {
      id: 'customers-active',
      label: 'Active (Page)',
      value: String(activeOnPage),
      tooltip: 'Customers currently eligible for new sales orders.',
      contextLabel: 'Enabled Accounts',
      badgeText: `${customers.length - activeOnPage} archived`,
      badgeTone: 'accent',
      icon: RiGroupLine,
    },
    {
      id: 'customers-sales',
      label: 'Fulfilled Sales (Page)',
      value: formatSalesCurrency(pageFulfilledTotal),
      tooltip: 'Fulfilled revenue across customers shown on this page.',
      contextLabel: 'Recognized Revenue',
      badgeText: 'Actual Sales',
      badgeTone: 'accent',
      icon: RiShoppingCart2Line,
    },
  ];

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'ALL';

  const handleExport = () => {
    downloadCsv(
      `customers-p${page}.csv`,
      ['Code', 'Name', 'Phone', 'Email', 'Status', 'Orders', 'Fulfilled Value'],
      customers.map((c) => [
        c.code,
        c.name,
        c.phone,
        c.email || '',
        c.isActive ? 'Active' : 'Archived',
        c.stats?.orderCount ?? 0,
        (c.stats?.fulfilledValue ?? 0).toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        title="Customers"
        description="Manage customer profiles, contact information, archive status, and sales order history."
      />

      {showStats && <InventoryStatsBar items={statItems} />}

      <InventoryToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by code, name, phone, or email..."
        filterTitle="Filter Customers"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
        filterContent={
          <Select
            label="Customer Status"
            selectedKey={statusFilter}
            onSelectionChange={(k) => {
              setStatusFilter(String(k) as typeof statusFilter);
              setPage(1);
            }}
          >
            <SelectItem id="ALL" textValue="All Customers">
              All Customers
            </SelectItem>
            <SelectItem id="ACTIVE" textValue="Active Only">
              Active Only
            </SelectItem>
            <SelectItem id="ARCHIVED" textValue="Archived Only">
              Archived Only
            </SelectItem>
          </Select>
        }
        sortOptions={[
          { id: 'createdAt:desc', label: 'Newest First' },
          { id: 'name:asc', label: 'Name (A–Z)' },
          { id: 'code:asc', label: 'Code (A–Z)' },
        ]}
        activeSortId={sortId}
        onSortSelect={(id) => {
          setSortId(id as typeof sortId);
          setPage(1);
        }}
        showStatistics={showStats}
        onShowStatisticsChange={setShowStats}
        onRefresh={() => loadCustomers(true)}
        refreshing={refreshing}
        onExport={handleExport}
        exportDisabled={customers.length === 0}
        primaryAction={
          canCreate
            ? {
                label: 'New Customer',
                icon: RiAddLine,
                onClick: () => {
                  setEditingCustomer(null);
                  setModalOpen(true);
                },
              }
            : undefined
        }
      />

      {loading ? (
        <TableRowsSkeleton rows={5} columns={7} />
      ) : customers.length === 0 ? (
        <InventoryEmptyState
          icon={RiGroupLine}
          title="No Customers Found"
          description={
            hasActiveFilters
              ? 'No customers matched your search or status filter.'
              : 'Add your first customer to start creating sales orders.'
          }
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter('ALL');
            setPage(1);
          }}
          action={
            canCreate ? (
              <Button
                variant="primary"
                leadingIcon={RiAddLine}
                onClick={() => {
                  setEditingCustomer(null);
                  setModalOpen(true);
                }}
              >
                New Customer
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Customers Directory">
              <TableHeader>
                <TableColumn isRowHeader>Customer</TableColumn>
                <TableColumn>Code</TableColumn>
                <TableColumn>Phone &amp; Email</TableColumn>
                <TableColumn>Orders</TableColumn>
                <TableColumn>Fulfilled Sales</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>
                      <Link
                        href={`/sales/customers/${c._id}`}
                        className="font-medium text-text-brand hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-caption-1-medium text-text-secondary">
                        {c.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-body-2-regular text-text-primary">
                          {c.phone}
                        </p>
                        {c.email && (
                          <p className="text-caption-1-regular text-text-tertiary">
                            {c.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {c.stats?.orderCount ?? 0}
                    </TableCell>
                    <TableCell className="font-mono font-semibold tabular-nums">
                      {formatSalesCurrency(c.stats?.fulfilledValue ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Chip variant="caption" color={c.isActive ? 'lime' : 'neutral'}>
                        {c.isActive ? 'Active' : 'Archived'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/sales/customers/${c._id}`}>
                          <IconButton
                            aria-label="View customer details"
                            size="small"
                            icon={RiEyeLine}
                          />
                        </Link>
                        {canUpdate && (
                          <IconButton
                            aria-label="Edit customer"
                            size="small"
                            icon={RiEditLine}
                            onClick={() => {
                              setEditingCustomer(c);
                              setModalOpen(true);
                            }}
                          />
                        )}
                        {canArchive && (
                          <IconButton
                            aria-label={
                              c.isActive ? 'Archive customer' : 'Restore customer'
                            }
                            size="small"
                            icon={c.isActive ? RiArchiveLine : RiRefreshLine}
                            className={
                              c.isActive
                                ? 'text-status-yellow-text'
                                : 'text-status-lime-text'
                            }
                            onClick={() => setArchiveTarget(c)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <InventoryPaginationFooter
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </div>
      )}

      <CustomerFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingCustomer={editingCustomer}
        onSuccess={() => loadCustomers(true)}
      />

      <AlertDialog
        isOpen={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title={
          archiveTarget?.isActive ? 'Archive Customer?' : 'Restore Customer?'
        }
        description={
          archiveTarget?.isActive
            ? `Archiving ${archiveTarget?.name} prevents creating new sales orders for them while safely keeping all historical orders and fulfillments intact.`
            : `Restoring ${archiveTarget?.name} will make them active for new sales orders again.`
        }
        confirmLabel={archiveTarget?.isActive ? 'Archive Customer' : 'Restore Customer'}
        pendingLabel={archiveTarget?.isActive ? 'Archiving...' : 'Restoring...'}
        variant={archiveTarget?.isActive ? 'danger' : 'default'}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <SalesModuleGate permission="sales.customers.read">
      <CustomersContent />
    </SalesModuleGate>
  );
}
