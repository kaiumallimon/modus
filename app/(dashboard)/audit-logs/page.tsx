'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RiSearchLine,
  RiEyeLine,
} from '@remixicon/react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AuditLogEntry, PaginatedResult, QueryAuditLogsParams } from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Chip } from '@/components/base/badges/chip';
import { Pagination } from '@/components/base/pagination/pagination';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: QueryAuditLogsParams = {
        page,
        limit,
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        resource: resourceFilter || undefined,
      };

      const res = await apiClient<PaginatedResult<AuditLogEntry>>(API_ENDPOINTS.AUDIT_LOGS, { params });
      setLogs(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, actionFilter, resourceFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-title-2-medium text-text-primary">Audit Logs</h1>
        <p className="text-body-medium text-text-secondary">
          Immutable historical record of security and administrative operations ({total} recorded events)
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-background-primary-default border border-border-button-default rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search description, action, or actor email..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            leadingIcon={RiSearchLine}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
            aria-label="Filter by action"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN">Login</option>
            <option value="USER_CREATE">User Create</option>
            <option value="ROLE_CREATE">Role Create</option>
            <option value="MODULE_ACTIVATION">Module Activation</option>
          </select>
          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border-button-default bg-background-primary-default text-body-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
            aria-label="Filter by resource"
          >
            <option value="">All Resources</option>
            <option value="auth">Auth</option>
            <option value="users">Users</option>
            <option value="roles">Roles</option>
            <option value="modules">Modules</option>
            <option value="organization">Organization</option>
            <option value="installation">Installation</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-background-primary-default border border-border-button-default rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="md" className="text-accent-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-body-medium text-text-primary font-semibold">No audit logs found</p>
            <p className="text-caption-1-medium text-text-secondary">
              There are no recorded events matching your current filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body-medium">
              <thead>
                <tr className="border-b border-border-button-default bg-background-secondary-default text-text-secondary text-caption-1-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-button-default">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-background-secondary-default/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary text-caption-1-semibold">
                          {log.actor?.email || 'System'}
                        </span>
                        {log.actor?.humanId && (
                          <span className="font-mono text-[11px] text-text-tertiary">
                            {log.actor.humanId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Chip color="neutral" variant="caption" className="font-mono text-[11px]">
                        {log.action}
                      </Chip>
                    </td>
                    <td className="py-3 px-4 text-caption-1-medium text-text-secondary capitalize">
                      {log.resource}
                    </td>
                    <td className="py-3 px-4 text-body-medium text-text-primary max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setInspectLog(log)}
                        leadingIcon={RiEyeLine}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-button-default flex items-center justify-between">
            <span className="text-caption-1-medium text-text-secondary">
              Page {page} of {totalPages} ({total} events)
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      <Modal isOpen={!!inspectLog} onOpenChange={(open) => !open && setInspectLog(null)}>
        {({ close }) => (
          <div>
            <ModalHeader
              title={`Audit Event: ${inspectLog?.action}`}
              description={`Recorded on ${inspectLog ? new Date(inspectLog.createdAt).toLocaleString() : ''}`}
            />
            <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-background-secondary-default p-4 rounded-xl space-y-2 text-caption-1-medium">
                <div>
                  <span className="text-text-tertiary uppercase">Description:</span>
                  <p className="font-semibold text-text-primary text-body-medium mt-0.5">{inspectLog?.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-separator-border">
                  <div>
                    <span className="text-text-tertiary uppercase text-[11px]">Actor:</span>
                    <p className="text-text-primary">{inspectLog?.actor?.email} ({inspectLog?.actor?.role || 'system'})</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary uppercase text-[11px]">Resource / ID:</span>
                    <p className="text-text-primary">{inspectLog?.resource} {inspectLog?.resourceId ? `(${inspectLog.resourceId})` : ''}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary uppercase text-[11px]">IP Address:</span>
                    <p className="font-mono text-text-secondary">{inspectLog?.ipAddress || 'Internal'}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary uppercase text-[11px]">User Agent:</span>
                    <p className="font-mono text-[11px] text-text-secondary truncate">{inspectLog?.userAgent || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-caption-1-semibold text-text-primary mb-1">Sanitized Metadata Payload</p>
                <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-xl text-caption-2-medium font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(inspectLog?.metadata || {}, null, 2)}
                </pre>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
