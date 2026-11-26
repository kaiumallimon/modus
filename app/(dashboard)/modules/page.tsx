'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RiInformationLine,
  RiGitMergeLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { ModuleRegistration, Role } from '@/lib/api/types';
import { Chip } from '@/components/base/badges/chip';
import { Switch } from '@/components/base/switch/switch';
import { AlertDialog } from '@/components/base/modal/modal';
import { CardGridSkeleton } from '@/components/application/loading/page-skeletons';
import { toast } from '@/components/base/toast/toast';

export default function ModulesPage() {
  const { user: currentUser } = useAuth();

  const [modules, setModules] = useState<ModuleRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivatingModule, setDeactivatingModule] = useState<ModuleRegistration | null>(null);

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<ModuleRegistration[]>(API_ENDPOINTS.MODULES);
      setModules(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load module registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleToggleActivation = async (mod: ModuleRegistration) => {
    // Prevent deactivation of core modules
    if (mod.isCore && mod.isActivated) {
      toast.error(`Core module "${mod.name}" is essential to system integrity and cannot be deactivated.`);
      return;
    }

    if (mod.isActivated) {
      // Prompt confirmation before deactivating
      setDeactivatingModule(mod);
    } else {
      // Direct activation
      await executeActivation(mod, true);
    }
  };

  const executeActivation = async (mod: ModuleRegistration, isActivated: boolean) => {
    try {
      await apiClient(API_ENDPOINTS.MODULE_ACTIVATION(mod.id), {
        method: 'PATCH',
        body: JSON.stringify({ isActivated }),
      });
      toast.success(
        `Module "${mod.name}" successfully ${isActivated ? 'activated' : 'deactivated'}`
      );
      setDeactivatingModule(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('modus:modules-updated'));
      }
      loadModules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update module activation state');
    }
  };

  const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-2-medium text-text-primary">Module Registry</h1>
          <p className="text-body-medium text-text-secondary">
            Manage locally integrated system capabilities and installation-level activation state
          </p>
        </div>
      </div>

      {/* Architecture Disclaimer */}
      <div className="p-4 bg-background-primary-default border border-border-button-default rounded-xl shadow-sm text-body-medium flex items-start gap-3">
        <RiInformationLine className="size-5 text-accent-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-caption-1-medium text-text-secondary">
          <p className="font-semibold text-text-primary">Modular Monolith Architecture</p>
          <p>
            Modus modules are verified and compiled locally in the repository. Module activation controls
            runtime accessibility and navigation visibility across this installation.
          </p>
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className={`bg-background-primary-default border rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all ${
                mod.isActivated ? 'border-border-button-default' : 'border-dashed border-separator-border opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-caption-1-semibold text-text-secondary bg-background-secondary-default px-2 py-0.5 rounded">
                      v{mod.version}
                    </span>
                    {mod.isCore ? (
                      <Chip color="neutral" variant="caption">
                        Core System
                      </Chip>
                    ) : (
                      <Chip color="blue" variant="caption">
                        Business Module
                      </Chip>
                    )}
                  </div>
                  <Chip color={mod.isActivated ? 'lime' : 'neutral'} variant="caption">
                    {mod.isActivated ? 'Active' : 'Inactive'}
                  </Chip>
                </div>

                <div>
                  <h2 className="text-title-3-semibold text-text-primary">{mod.name}</h2>
                  <p className="text-caption-1-medium text-text-secondary mt-1 line-clamp-3">
                    {mod.description}
                  </p>
                </div>

                {/* Dependencies */}
                {mod.dependencies && mod.dependencies.length > 0 && (
                  <div className="pt-2 border-t border-separator-border">
                    <p className="text-[11px] text-text-tertiary uppercase font-semibold flex items-center gap-1 mb-1">
                      <RiGitMergeLine className="size-3" /> Dependencies
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {mod.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="text-[11px] font-mono bg-background-secondary-default text-text-secondary px-1.5 py-0.5 rounded border border-separator-border"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Activation Switch / Control */}
              <div className="pt-3 border-t border-separator-border flex items-center justify-between">
                <span className="text-caption-1-medium text-text-secondary">
                  {mod.isCore ? 'Core Protection' : 'Installation Activation'}
                </span>
                {isSuperAdmin && !mod.isCore ? (
                  <Switch
                    isSelected={mod.isActivated}
                    onChange={() => handleToggleActivation(mod)}
                    aria-label={`Toggle activation for ${mod.name}`}
                  />
                ) : (
                  <span className="text-caption-2-medium text-text-tertiary italic">
                    {mod.isCore ? 'Always Active' : 'Restricted'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog
        isOpen={!!deactivatingModule}
        onOpenChange={(open) => !open && setDeactivatingModule(null)}
        title={`Deactivate ${deactivatingModule?.name}?`}
        description={`Deactivating this module will disable its navigation and APIs for all users. Any other modules that depend on ${deactivatingModule?.name} must also be deactivated first.`}
        confirmLabel="Deactivate Module"
        variant="danger"
        onConfirm={() => {
          if (deactivatingModule) {
            return executeActivation(deactivatingModule, false);
          }
        }}
      />
    </div>
  );
}
