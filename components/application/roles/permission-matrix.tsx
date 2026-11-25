'use client';

import React, { useMemo, useState } from 'react';
import { RiCheckboxLine, RiSearchLine } from '@remixicon/react';
import type { PermissionDefinition } from '@/lib/api/types';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { cx } from '@/utils/cx';

export interface PermissionMatrixGroup {
  module: string;
  moduleName: string;
  description: string;
  permissions: PermissionDefinition[];
}

export interface PermissionMatrixProps {
  groups: PermissionMatrixGroup[];
  selectedPermissions: string[];
  onChange: (nextPermissions: string[]) => void;
  title?: string;
}

export function PermissionMatrix({
  groups,
  selectedPermissions,
  onChange,
  title = 'Assign Permissions',
}: PermissionMatrixProps) {
  const [filterText, setFilterText] = useState('');

  const filteredGroups = useMemo(() => {
    const q = filterText.toLowerCase().trim();
    if (!q) return groups;
    return groups
      .map((grp) => ({
        ...grp,
        permissions: grp.permissions.filter(
          (p) =>
            p.id.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            grp.moduleName.toLowerCase().includes(q)
        ),
      }))
      .filter((grp) => grp.permissions.length > 0);
  }, [groups, filterText]);

  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.permissions.length, 0),
    [groups]
  );

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      onChange(selectedPermissions.filter((p) => p !== permId));
    } else {
      onChange([...selectedPermissions, permId]);
    }
  };

  const toggleModulePermissions = (modulePerms: PermissionDefinition[]) => {
    const ids = modulePerms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermissions.includes(id));
    if (allSelected) {
      onChange(selectedPermissions.filter((id) => !ids.includes(id)));
    } else {
      onChange(Array.from(new Set([...selectedPermissions, ...ids])));
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-separator-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-caption-1-semibold text-text-primary">{title}</p>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-background-secondary-default border border-separator-border text-text-secondary">
            {selectedPermissions.length} / {totalCount} selected
          </span>
        </div>
        <div className="relative flex items-center w-full sm:w-52">
          <RiSearchLine className="absolute start-2.5 size-3.5 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Filter permissions..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full h-8 ps-8 pe-3 rounded-full bg-background-secondary-default border border-border-button-default text-caption-1-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-separator-border text-center text-caption-1-medium text-text-tertiary">
          No permissions match &quot;{filterText}&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((grp) => {
            const allSelected = grp.permissions.every((p) =>
              selectedPermissions.includes(p.id)
            );
            const selectedInGroup = grp.permissions.filter((p) =>
              selectedPermissions.includes(p.id)
            ).length;

            return (
              <div
                key={grp.module}
                className="p-3 bg-background-secondary-default/70 rounded-xl space-y-2.5 border border-separator-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-caption-2-medium text-text-primary uppercase font-bold tracking-wider truncate">
                      {grp.moduleName}
                      <span className="ms-1.5 font-mono font-normal text-text-tertiary">
                        ({selectedInGroup}/{grp.permissions.length})
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleModulePermissions(grp.permissions)}
                    className="text-[11px] font-semibold text-accent-700 dark:text-accent-300 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <RiCheckboxLine className="size-3.5" />
                    <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grp.permissions.map((perm) => {
                    const checked = selectedPermissions.includes(perm.id);
                    return (
                      <Checkbox
                        key={perm.id}
                        size="sm"
                        aria-label={perm.name}
                        isSelected={checked}
                        onChange={() => togglePermission(perm.id)}
                        className={cx(
                          'w-full items-start p-2.5 rounded-lg border transition-colors',
                          checked
                            ? 'bg-accent-100/50 dark:bg-accent-950/50 border-accent-300 dark:border-accent-800'
                            : 'bg-background-primary-default border-border-button-default hover:bg-background-secondary-hover'
                        )}
                      >
                        <div className="flex flex-col min-w-0 leading-tight -mt-0.5">
                          <span className="text-caption-1-semibold text-text-primary">
                            {perm.name}
                          </span>
                          <span className="text-[10px] font-mono text-text-tertiary mt-0.5">
                            {perm.id}
                          </span>
                          <span className="text-[11px] text-text-secondary mt-1 line-clamp-2 font-normal">
                            {perm.description}
                          </span>
                        </div>
                      </Checkbox>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
