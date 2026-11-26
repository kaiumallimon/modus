'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RiFolderCloudLine,
  RiCloudLine,
  RiUpload2Line,
  RiDeleteBinLine,
  RiEyeLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiRefreshLine,
  RiGridLine,
  RiTableLine,
  RiSearchLine,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiInformationLine,
  RiFolder3Line,
  RiFile3Line,
  RiImageLine,
  RiFilePdfLine,
  RiFileTextLine,
  RiFileCodeLine,
  RiMovieLine,
  RiMusicLine,
  RiCloseLine,
  RiCheckLine,
  RiArrowRightSLine,
  RiBarChartLine,
  RiPieChartLine,
  RiShieldCheckLine,
} from '@remixicon/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from 'react-aria-components';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  StorageObject,
  StorageListResponse,
  StorageStatsResponse,
  StorageStatsFormatItem,
  StorageTimelinePoint,
} from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip, ChipColor } from '@/components/base/badges/chip';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Modal, ModalHeader, ModalBody, ModalFooter, AlertDialog } from '@/components/base/modal/modal';
import {
  CardGridSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from '@/components/application/loading/page-skeletons';
import { toast } from '@/components/base/toast/toast';
import { Select, SelectItem } from '@/components/base/select/select';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { CdnActivityChartCard } from '@/components/application/dashboard/cdn-activity-chart-card';
import { CdnFormatChartCard } from '@/components/application/dashboard/cdn-format-chart-card';
import { cx } from '@/utils/cx';

export default function CdnExplorerPage() {
  const { user: currentUser, isSuperAdmin, hasPermission, isLoading: authLoading } = useAuth();

  const canRead = isSuperAdmin || hasPermission('cdn.read');
  const canManage = isSuperAdmin || hasPermission('cdn.manage');

  // Core Data States
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [stats, setStats] = useState<StorageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Navigation
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showMetrics, setShowMetrics] = useState(true);

  // TanStack table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Modals & Dialogs
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewObject, setPreviewObject] = useState<StorageObject | null>(null);
  const [deleteKeys, setDeleteKeys] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState<string>('assets');
  const [uploading, setUploading] = useState(false);

  // Load Storage Statistics
  const loadStats = useCallback(async () => {
    if (!canRead) return;
    setStatsLoading(true);
    try {
      const res = await apiClient<StorageStatsResponse>(API_ENDPOINTS.STORAGE_STATS);
      setStats(res);
    } catch {
      // Non-critical fallback
    } finally {
      setStatsLoading(false);
    }
  }, [canRead]);

  // Load Bucket Objects & Folders
  const loadObjects = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await apiClient<StorageListResponse>(API_ENDPOINTS.STORAGE_OBJECTS, {
        params: {
          prefix: currentPrefix || undefined,
          search: search.trim() || undefined,
          limit: 100,
        },
      });
      setObjects(res.objects || []);
      if (!currentPrefix) {
        setFolders(res.folders || []);
      } else if (res.folders?.length) {
        setFolders((prev) => Array.from(new Set([...prev, ...res.folders])).sort());
      }
      setRowSelection({});
    } catch (err: any) {
      toast.error(err.message || 'Failed to list CDN objects');
    } finally {
      setLoading(false);
    }
  }, [canRead, currentPrefix, search]);

  useEffect(() => {
    if (canRead) {
      loadStats();
      loadObjects();
    }
  }, [canRead, loadStats, loadObjects]);

  // Filtered Objects by Category
  const filteredObjects = useMemo(() => {
    if (formatFilter === 'all') return objects;
    return objects.filter((o) => {
      const ext = o.extension.toLowerCase();
      if (formatFilter === 'images') return o.isImage;
      if (formatFilter === 'documents') return ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx'].includes(ext);
      if (formatFilter === 'media') return ['mp4', 'webm', 'mov', 'mp3', 'wav'].includes(ext);
      if (formatFilter === 'data') return ['json', 'js', 'ts', 'html', 'css', 'xml'].includes(ext);
      return true;
    });
  }, [objects, formatFilter]);

  // Copy helper
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Public CDN URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // Upload Asset handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please choose a file to upload');
      return;
    }

    if (uploadFile.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('folder', uploadFolder || 'assets');

      const res = await apiClient<{ url: string; key: string }>(API_ENDPOINTS.STORAGE_UPLOAD, {
        method: 'POST',
        body: formData,
      });

      toast.success('File uploaded to CDN successfully');
      setUploadModalOpen(false);
      setUploadFile(null);
      await loadObjects();
      await loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload asset');
    } finally {
      setUploading(false);
    }
  };

  // Delete Asset handler
  const handleDeleteConfirm = async () => {
    if (!deleteKeys.length) return;
    try {
      await apiClient<{ deleted: number }>(API_ENDPOINTS.STORAGE_DELETE, {
        method: 'DELETE',
        body: JSON.stringify({ keys: deleteKeys }),
      });

      toast.success(`Deleted ${deleteKeys.length} asset${deleteKeys.length > 1 ? 's' : ''}`);
      setDeleteDialogOpen(false);
      setDeleteKeys([]);
      if (previewObject && deleteKeys.includes(previewObject.key)) {
        setPreviewObject(null);
      }
      await loadObjects();
      await loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete asset(s)');
    }
  };

  // TanStack Table Setup
  const columns = useMemo<ColumnDef<StorageObject>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            isSelected={table.getIsAllPageRowsSelected()}
            isIndeterminate={table.getIsSomePageRowsSelected()}
            onChange={(checked) => table.toggleAllPageRowsSelected(checked)}
            aria-label="Select all assets"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            isSelected={row.getIsSelected()}
            onChange={(checked) => row.toggleSelected(checked)}
            aria-label={`Select ${row.original.name}`}
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        id: 'preview',
        header: 'Asset',
        size: 60,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              onClick={() => setPreviewObject(item)}
              className="size-10 rounded-lg border border-border-button-default bg-background-secondary-default flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent-500 transition-all shrink-0"
              title="Click to preview"
            >
              {item.isImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt={item.name} className="size-full object-cover" />
              ) : (
                <FileIcon ext={item.extension} className="size-5 text-text-tertiary" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 font-semibold text-text-secondary hover:text-text-primary text-caption-1-medium uppercase tracking-wider"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            File Name & Key
            {column.getIsSorted() === 'asc' ? (
              <RiArrowUpLine className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <RiArrowDownLine className="size-3.5" />
            ) : (
              <RiArrowUpDownLine className="size-3.5 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-col min-w-0 max-w-md">
              <span
                onClick={() => setPreviewObject(item)}
                className="text-body-2-medium font-semibold text-text-primary hover:text-accent-600 transition-colors cursor-pointer truncate"
              >
                {item.name}
              </span>
              <span className="text-caption-1-regular text-text-tertiary font-mono truncate">
                {item.key}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'folder',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 font-semibold text-text-secondary hover:text-text-primary text-caption-1-medium uppercase tracking-wider"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Folder
            {column.getIsSorted() === 'asc' ? (
              <RiArrowUpLine className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <RiArrowDownLine className="size-3.5" />
            ) : (
              <RiArrowUpDownLine className="size-3.5 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-1-medium bg-background-secondary-default border border-border-button-default text-text-secondary">
            <RiFolder3Line className="size-3 text-text-tertiary" />
            {row.original.folder || 'root'}
          </span>
        ),
      },
      {
        accessorKey: 'size',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 font-semibold text-text-secondary hover:text-text-primary text-caption-1-medium uppercase tracking-wider"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Size
            {column.getIsSorted() === 'asc' ? (
              <RiArrowUpLine className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <RiArrowDownLine className="size-3.5" />
            ) : (
              <RiArrowUpDownLine className="size-3.5 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-body-2-regular font-mono text-text-secondary">
            {row.original.formattedSize}
          </span>
        ),
      },
      {
        accessorKey: 'extension',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 font-semibold text-text-secondary hover:text-text-primary text-caption-1-medium uppercase tracking-wider"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Format
            {column.getIsSorted() === 'asc' ? (
              <RiArrowUpLine className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <RiArrowDownLine className="size-3.5" />
            ) : (
              <RiArrowUpDownLine className="size-3.5 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const chipColor: ChipColor = item.isImage ? 'lime' : 'blue';
          return (
            <Chip color={chipColor} variant="caption" className="font-mono uppercase">
              {item.extension || 'FILE'}
            </Chip>
          );
        },
      },
      {
        accessorKey: 'lastModified',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1.5 font-semibold text-text-secondary hover:text-text-primary text-caption-1-medium uppercase tracking-wider"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Modified
            {column.getIsSorted() === 'asc' ? (
              <RiArrowUpLine className="size-3.5" />
            ) : column.getIsSorted() === 'desc' ? (
              <RiArrowDownLine className="size-3.5" />
            ) : (
              <RiArrowUpDownLine className="size-3.5 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const val = row.original.lastModified;
          if (!val) return <span className="text-text-tertiary text-caption-1-regular">-</span>;
          const d = new Date(val);
          return (
            <span className="text-caption-1-regular text-text-secondary">
              {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        size: 90,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => handleCopyUrl(item.url)}
                className="size-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
                title="Copy Public CDN URL"
              >
                <RiFileCopyLine className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewObject(item)}
                className="size-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
                title="Inspect / Preview"
              >
                <RiEyeLine className="size-4" />
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteKeys([item.key]);
                    setDeleteDialogOpen(true);
                  }}
                  className="size-8 rounded-lg text-text-tertiary hover:text-text-error-primary hover:bg-background-secondary-default flex items-center justify-center transition-colors"
                  title="Delete Asset"
                >
                  <RiDeleteBinLine className="size-4" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [canManage]
  );

  const table = useReactTable({
    data: filteredObjects,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.key,
  });

  const selectedKeys = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  // Breadcrumbs calculation
  const pathParts = currentPrefix.split('/').filter(Boolean);

  if (authLoading) {
    return <PageShellSkeleton statsCount={4} view={viewMode === 'grid' ? 'cards' : 'table'} />;
  }

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="size-14 rounded-full bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary mb-3 shadow-2xs">
          <RiFolderCloudLine className="size-7" />
        </div>
        <h2 className="text-title-1-bold text-text-primary">Access Restricted</h2>
        <p className="text-body-2-regular text-text-secondary max-w-md mt-1 mb-5">
          Cloudflare CDN Explorer is restricted to Super Administrators or accounts with the &quot;cdn.read&quot; permission. Access can be granted by editing roles under Roles & Access.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* 1. Page Header (Full-width border with 0 side margins) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-5 border-b border-border-button-default bg-background-primary-default">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-title-1-medium font-bold text-text-primary tracking-tight">Cloudflare CDN Explorer</h1>
            <p className="text-body-medium text-text-secondary mt-0.5">
              Browse bucket objects, monitor usage metrics, and distribute assets via Cloudflare CDN
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="medium"
              leadingIcon={RiBarChartLine}
              onClick={() => setShowMetrics((v) => !v)}
              className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
            >
              {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
            </Button>

            <Button
              variant="secondary"
              size="medium"
              leadingIcon={RiRefreshLine}
              onClick={() => {
                loadStats();
                loadObjects();
              }}
              className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-medium shadow-2xs hover:shadow-xs transition-all"
            >
              Refresh
            </Button>

            {canManage && (
              <Button
                variant="primary"
                size="medium"
                leadingIcon={RiUpload2Line}
                onClick={() => setUploadModalOpen(true)}
                className="h-10 px-5 gap-2.5 rounded-full text-body-medium font-semibold text-[#171B18] shadow-2xs hover:shadow-xs transition-all"
              >
                Upload Asset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards Section (Single unified segmented container with hover tooltips) */}
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs overflow-hidden animate-in fade-in duration-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-separator-border">
          {/* Card 1: Bucket Storage */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-caption-1-medium text-text-secondary font-medium">
              <span className="flex items-center gap-1.5">
                Bucket Storage
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Bucket storage information"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Total storage volume of stored files and media currently held in this R2 bucket.
                  </Tooltip>
                </TooltipTrigger>
              </span>
              <RiCloudLine className="size-4 text-accent-600" />
            </div>
            <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
              {stats?.formattedTotalSize || '0 B'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
              <span>vs last month</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                +12%
              </span>
            </div>
          </div>

          {/* Card 2: Total Objects */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-caption-1-medium text-text-secondary font-medium">
              <span className="flex items-center gap-1.5">
                Total Objects
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Total objects information"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Total count of distinct files, assets, and folders across this bucket.
                  </Tooltip>
                </TooltipTrigger>
              </span>
              <RiFolderCloudLine className="size-4 text-blue-500" />
            </div>
            <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono">
              {stats?.totalObjects ?? objects.length}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
              <span>vs last month</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                + {objects.length} assets
              </span>
            </div>
          </div>

          {/* Card 3: Egress Savings */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-caption-1-medium text-text-secondary font-medium">
              <span className="flex items-center gap-1.5">
                Egress Savings
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Egress savings information"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Estimated monthly egress bandwidth cost saved by using Cloudflare R2 zero-egress architecture.
                  </Tooltip>
                </TooltipTrigger>
              </span>
              <RiShieldCheckLine className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-title-1-medium font-bold text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
              {stats?.bandwidthSavedEstimated || '$0.00 saved'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
              <span>vs last month</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60">
                100% saved
              </span>
            </div>
          </div>

          {/* Card 4: Public CDN Status */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-caption-1-medium text-text-secondary font-medium">
              <span className="flex items-center gap-1.5">
                Public CDN Status
                <TooltipTrigger delay={80}>
                  <AriaButton
                    className="inline-flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer rounded-full p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    aria-label="Public CDN status information"
                  >
                    <RiInformationLine className="size-3.5" />
                  </AriaButton>
                  <Tooltip size="sm">
                    Public edge delivery status and active edge subdomain for serving assets globally.
                  </Tooltip>
                </TooltipTrigger>
              </span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="mt-2 text-title-1-medium font-bold text-text-primary tracking-tight font-mono truncate">
              {stats?.bucketName || 'modus'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-caption-2-medium text-text-tertiary">
              <span>status</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold text-accent-800 dark:text-accent-300 bg-accent-100 dark:bg-accent-950/60">
                Active & Cached
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BoardUI Charts Section */}
      {showMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CdnActivityChartCard
            timeline={stats?.timeline}
            className="lg:col-span-2"
          />
          <CdnFormatChartCard
            formats={stats?.formatDistribution}
            className="lg:col-span-1"
          />
        </div>
      )}

      {/* Main Asset Explorer Container */}
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs overflow-hidden">
        {/* Explorer Header: Folder Breadcrumbs & Controls Toolbar */}
        <div className="p-4 border-b border-border-button-default flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background-secondary-default/40">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCurrentPrefix('')}
              className={cx(
                'px-3 py-1.5 rounded-xl text-caption-1-medium transition-colors flex items-center gap-1.5 cursor-pointer',
                currentPrefix === ''
                  ? 'bg-background-primary-default shadow-2xs text-text-primary font-bold border border-border-button-default'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
              )}
            >
              <RiFolderCloudLine className="size-3.5 text-accent-600" />
              <span>All Files</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-background-secondary-default font-mono text-text-secondary">
                {objects.length}
              </span>
            </button>

            {/* Subfolders Chips */}
            {folders.map((f) => {
              const cleanFolder = f.replace(/\/$/, '');
              const isSelected = currentPrefix === cleanFolder || currentPrefix === f;
              const countInFolder = objects.filter((o) => o.folder === f || o.key.startsWith(f)).length;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCurrentPrefix(cleanFolder)}
                  className={cx(
                    'px-3 py-1.5 rounded-xl text-caption-1-medium transition-colors flex items-center gap-1.5 cursor-pointer',
                    isSelected
                      ? 'bg-background-primary-default shadow-2xs text-text-primary font-bold border border-border-button-default'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary-default'
                  )}
                >
                  <RiFolder3Line className="size-3.5 text-accent-600" />
                  <span>{cleanFolder}</span>
                  {countInFolder > 0 && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-background-secondary-default font-mono text-text-secondary">
                      {countInFolder}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: Search, Format Filter, Sort, Layout Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="w-full sm:w-56">
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={setSearch}
                leadingIcon={RiSearchLine}
                size="small"
              />
            </div>

            {/* Type Filter */}
            <Select
              aria-label="Filter asset category"
              selectedKey={formatFilter}
              onSelectionChange={(key) => setFormatFilter(String(key))}
              className="w-36"
              size="sm"
            >
              <SelectItem id="all" textValue="All Formats">All Formats</SelectItem>
              <SelectItem id="images" textValue="Images">Images</SelectItem>
              <SelectItem id="documents" textValue="Documents">Documents</SelectItem>
              <SelectItem id="media" textValue="Media">Media</SelectItem>
              <SelectItem id="data" textValue="Data/Code">Data/Code</SelectItem>
            </Select>

            {/* Sort Popover Button */}
            <AriaDialogTrigger>
              <AriaButton
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default text-body-2-medium text-text-secondary hover:bg-background-secondary-default transition-colors shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <RiArrowUpDownLine className="size-4 text-text-tertiary" />
                <span>Sort</span>
              </AriaButton>
              <AriaPopover
                placement="bottom end"
                offset={8}
                className="z-50 w-52 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xl outline-none"
              >
                <AriaDialog className="outline-none flex flex-col gap-0.5">
                  {({ close }) => (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'lastModified', desc: true }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Newest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'lastModified', desc: false }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Oldest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'name', desc: false }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Name (A-Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'name', desc: true }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Name (Z-A)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'size', desc: true }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Size (Largest)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'size', desc: false }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Size (Smallest)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSorting([{ id: 'extension', desc: false }]);
                          close();
                        }}
                        className="w-full text-start px-2.5 py-1.5 rounded-lg text-body-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
                      >
                        Sort by Format
                      </button>
                    </>
                  )}
                </AriaDialog>
              </AriaPopover>
            </AriaDialogTrigger>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-border-button-default bg-background-primary-default shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'table' ? 'bg-background-secondary-default text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}
                title="Table view"
              >
                <RiTableLine className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-background-secondary-default text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}
                title="Grid view"
              >
                <RiGridLine className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Batch Action Floating Strip */}
        {selectedKeys.length > 0 && (
          <div className="px-4 py-2.5 bg-accent-50 dark:bg-accent-950/40 border-b border-accent-200 dark:border-accent-900 flex items-center justify-between text-caption-1-medium text-accent-900 dark:text-accent-100">
            <span className="flex items-center gap-2">
              <span className="font-semibold">{selectedKeys.length}</span> asset{selectedKeys.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiFileCopyLine}
                onClick={() => {
                  const urls = selectedKeys
                    .map((k) => objects.find((o) => o.key === k)?.url)
                    .filter(Boolean)
                    .join('\n');
                  handleCopyUrl(urls);
                }}
              >
                Copy URLs
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="small"
                  leadingIcon={RiDeleteBinLine}
                  className="text-text-error-primary hover:text-text-error-hover"
                  onClick={() => {
                    setDeleteKeys(selectedKeys);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content View: Table or Grid */}
        {loading ? (
          viewMode === 'grid' ? (
            <CardGridSkeleton count={6} className="p-4" />
          ) : (
            <TableRowsSkeleton rows={6} columns={5} showCheckbox />
          )
        ) : filteredObjects.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="size-12 rounded-full bg-background-secondary-default border border-border-button-default flex items-center justify-center text-text-tertiary mb-3">
              <RiFolderCloudLine className="size-6" />
            </div>
            <h3 className="text-body-1-bold text-text-primary">No assets found</h3>
            <p className="text-caption-1-regular text-text-secondary max-w-sm mt-1 mb-4">
              {search ? 'No objects match your current search query.' : 'This bucket prefix has no uploaded files.'}
            </p>
            {canManage && (
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiUpload2Line}
                onClick={() => setUploadModalOpen(true)}
              >
                Upload First File
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border-button-default bg-background-secondary-default/30">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        className="px-4 py-3 text-start text-caption-1-medium text-text-tertiary uppercase font-semibold"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border-button-default">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cx(
                      'hover:bg-background-secondary-default/50 transition-colors',
                      row.getIsSelected() && 'bg-background-secondary-default/80'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-body-2-regular text-text-primary align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View (Synchronized with active table sorting, filters, and row selection) */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {table.getRowModel().rows.map((row) => {
              const item = row.original;
              const isSelected = row.getIsSelected();
              return (
                <div
                  key={item.key}
                  className={cx(
                    'group relative rounded-xl border border-border-button-default bg-background-primary-default overflow-hidden hover:shadow-card transition-all flex flex-col',
                    isSelected && 'ring-2 ring-accent-500'
                  )}
                >
                  {/* Grid Preview Box */}
                  <div
                    onClick={() => setPreviewObject(item)}
                    className="relative w-full aspect-square bg-background-secondary-default border-b border-border-button-default flex items-center justify-center overflow-hidden cursor-pointer"
                  >
                    {item.isImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.url}
                        alt={item.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                        <FileIcon ext={item.extension} className="size-10 text-text-tertiary" />
                        <span className="text-[11px] font-mono uppercase text-text-tertiary font-bold">
                          .{item.extension}
                        </span>
                      </div>
                    )}

                    {/* Checkbox overlay */}
                    <div
                      className="absolute top-2 start-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        isSelected={isSelected}
                        onChange={(checked) => {
                          row.toggleSelected(checked);
                        }}
                        aria-label={`Select ${item.name}`}
                      />
                    </div>

                    {/* Size Pill */}
                    <div className="absolute bottom-2 end-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono">
                      {item.formattedSize}
                    </div>
                  </div>

                  {/* Card Info & Quick Actions */}
                  <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                    <div className="min-w-0">
                      <p
                        onClick={() => setPreviewObject(item)}
                        className="text-body-2-medium font-semibold text-text-primary hover:text-accent-600 transition-colors truncate cursor-pointer"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <p className="text-[11px] text-text-tertiary font-mono truncate">
                        {item.folder || 'root'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border-button-default text-caption-2-regular text-text-tertiary">
                      <span>{item.extension.toUpperCase()}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item.url)}
                          className="size-7 rounded-md hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary flex items-center justify-center transition-colors"
                          title="Copy CDN URL"
                        >
                          <RiFileCopyLine className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewObject(item)}
                          className="size-7 rounded-md hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary flex items-center justify-center transition-colors"
                          title="Preview"
                        >
                          <RiEyeLine className="size-3.5" />
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteKeys([item.key]);
                              setDeleteDialogOpen(true);
                            }}
                            className="size-7 rounded-md hover:bg-background-secondary-default text-text-tertiary hover:text-text-error-primary flex items-center justify-center transition-colors"
                            title="Delete"
                          >
                            <RiDeleteBinLine className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asset Inspector & Preview Modal */}
      <Modal isOpen={Boolean(previewObject)} onOpenChange={(open) => !open && setPreviewObject(null)}>
        {({ close }) => {
          if (!previewObject) return null;
          return (
            <div>
              <ModalHeader
                title={previewObject.name}
                description={`Cloudflare R2 Object: ${previewObject.key}`}
              />
              <ModalBody className="space-y-4">
                {/* Visual Preview */}
                <div className="w-full max-h-80 rounded-xl bg-background-secondary-default border border-border-button-default flex items-center justify-center overflow-hidden p-2">
                  {previewObject.isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewObject.url}
                      alt={previewObject.name}
                      className="max-h-76 max-w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-text-tertiary">
                      <FileIcon ext={previewObject.extension} className="size-16" />
                      <span className="text-body-2-medium font-mono uppercase font-semibold">
                        {previewObject.mimeType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details Table */}
                <div className="space-y-2 text-body-2-regular">
                  <div className="p-3 rounded-xl border border-border-button-default bg-background-secondary-default/50 space-y-2">
                    <div className="flex items-center justify-between text-caption-1-medium">
                      <span className="text-text-tertiary">Public CDN URL:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(previewObject.url)}
                        className="text-accent-600 hover:text-accent-700 flex items-center gap-1 font-semibold"
                      >
                        <RiFileCopyLine className="size-3.5" /> Copy Link
                      </button>
                    </div>
                    <p className="text-caption-1-regular font-mono break-all text-text-primary bg-background-primary-default p-2 rounded-lg border border-border-button-default select-all">
                      {previewObject.url}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-border-button-default bg-background-secondary-default/50">
                      <span className="text-caption-1-medium text-text-tertiary block">File Size</span>
                      <span className="text-body-2-medium font-mono text-text-primary">{previewObject.formattedSize}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-border-button-default bg-background-secondary-default/50">
                      <span className="text-caption-1-medium text-text-tertiary block">MIME Type</span>
                      <span className="text-body-2-medium font-mono text-text-primary truncate block">{previewObject.mimeType}</span>
                    </div>
                  </div>

                  {previewObject.lastModified && (
                    <div className="p-3 rounded-xl border border-border-button-default bg-background-secondary-default/50 flex justify-between">
                      <span className="text-caption-1-medium text-text-tertiary">Last Modified</span>
                      <span className="text-caption-1-medium text-text-primary font-mono">
                        {new Date(previewObject.lastModified).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <div className="flex items-center justify-between w-full">
                  {canManage ? (
                    <Button
                      variant="ghost"
                      leadingIcon={RiDeleteBinLine}
                      className="text-text-error-primary hover:text-text-error-hover"
                      onClick={() => {
                        setDeleteKeys([previewObject.key]);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  ) : <div />}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      leadingIcon={RiExternalLinkLine}
                      onClick={() => window.open(previewObject.url, '_blank')}
                    >
                      Open in New Tab
                    </Button>
                    <Button variant="primary" onClick={close}>
                      Done
                    </Button>
                  </div>
                </div>
              </ModalFooter>
            </div>
          );
        }}
      </Modal>

      {/* Upload Asset Modal */}
      <Modal isOpen={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        {({ close }) => (
          <form onSubmit={handleUploadSubmit} className="flex min-h-0 flex-1 flex-col gap-2">
            <ModalHeader
              title="Upload Asset to Cloudflare CDN"
              description="Deploy files to the R2 bucket with global CDN distribution and zero egress fees."
            />
            <ModalBody className="space-y-4">
              <Select
                label="Target Folder"
                aria-label="Target folder"
                selectedKey={uploadFolder}
                onSelectionChange={(key) => setUploadFolder(String(key))}
                className="w-full"
              >
                <SelectItem id="assets" textValue="assets">assets/</SelectItem>
                <SelectItem id="avatars" textValue="avatars">avatars/</SelectItem>
                <SelectItem id="uploads" textValue="uploads">uploads/</SelectItem>
                <SelectItem id="documents" textValue="documents">documents/</SelectItem>
              </Select>

              {/* File Dropzone / Picker */}
              <label className="border-2 border-dashed border-border-button-default hover:border-accent-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-background-secondary-default/30">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                />
                <div className="size-12 rounded-full bg-background-primary-default border border-border-button-default flex items-center justify-center text-accent-600 shadow-2xs mb-2">
                  <RiUpload2Line className="size-6" />
                </div>
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-body-2-medium font-semibold text-text-primary">{uploadFile.name}</p>
                    <p className="text-caption-1-regular text-text-tertiary">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Ready to upload
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-body-2-medium font-semibold text-text-primary">
                      Click to choose file, or drag and drop
                    </p>
                    <p className="text-caption-1-regular text-text-tertiary mt-0.5">
                      PNG, JPG, WEBP, GIF, PDF, MP4, JSON up to 25MB
                    </p>
                  </div>
                )}
              </label>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!uploadFile || uploading}>
                {uploading ? 'Uploading...' : 'Upload Asset'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete CDN Asset(s)"
        description={`Are you sure you want to permanently delete ${deleteKeys.length} asset(s) from Cloudflare CDN? This action cannot be reversed.`}
        confirmLabel="Permanently Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function FileIcon({ ext, className }: { ext: string; className?: string }) {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(e)) {
    return <RiImageLine className={className} />;
  }
  if (['pdf'].includes(e)) {
    return <RiFilePdfLine className={className} />;
  }
  if (['txt', 'md', 'doc', 'docx'].includes(e)) {
    return <RiFileTextLine className={className} />;
  }
  if (['json', 'js', 'ts', 'html', 'css', 'xml'].includes(e)) {
    return <RiFileCodeLine className={className} />;
  }
  if (['mp4', 'webm', 'mov'].includes(e)) {
    return <RiMovieLine className={className} />;
  }
  if (['mp3', 'wav', 'ogg'].includes(e)) {
    return <RiMusicLine className={className} />;
  }
  return <RiFile3Line className={className} />;
}
