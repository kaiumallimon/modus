'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RiSettings4Line,
  RiSaveLine,
  RiShieldLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { SystemSettings, Role } from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Switch } from '@/components/base/switch/switch';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';

export default function SettingsPage() {
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en-US');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('HH:mm:ss');
  const [paginationLimit, setPaginationLimit] = useState(10);
  const [allowPasswordReset, setAllowPasswordReset] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(60);

  const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<SystemSettings>(API_ENDPOINTS.SETTINGS);
      if (data) {
        setTimezone(data.defaultTimezone || 'UTC');
        setLocale(data.defaultLocale || 'en-US');
        setCurrency(data.defaultCurrency || 'USD');
        setDateFormat(data.dateFormat || 'YYYY-MM-DD');
        setTimeFormat(data.timeFormat || 'HH:mm:ss');
        setPaginationLimit(data.defaultPaginationLimit || 10);
        setAllowPasswordReset(data.allowPasswordReset ?? true);
        setSessionTimeout(data.sessionTimeoutMinutes || 60);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setSaving(true);
    try {
      await apiClient(API_ENDPOINTS.SETTINGS, {
        method: 'PATCH',
        body: JSON.stringify({
          defaultTimezone: timezone.trim(),
          defaultLocale: locale.trim(),
          defaultCurrency: currency.toUpperCase().trim(),
          dateFormat: dateFormat.trim(),
          timeFormat: timeFormat.trim(),
          defaultPaginationLimit: Number(paginationLimit),
          allowPasswordReset,
          sessionTimeoutMinutes: Number(sessionTimeout),
        }),
      });
      toast.success('System preferences saved successfully');
      loadSettings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" className="text-accent-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-title-2-medium text-text-primary">System Settings</h1>
          <p className="text-body-medium text-text-secondary">
            Global application configuration, security parameters, and defaults
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Localization & Formatting */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
            <RiSettings4Line className="size-5 text-accent-600" />
            Application Defaults & Formats
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Timezone"
              value={timezone}
              onChange={(val) => setTimezone(val)}
              isDisabled={!isSuperAdmin}
            />
            <Input
              label="Default Locale"
              value={locale}
              onChange={(val) => setLocale(val)}
              isDisabled={!isSuperAdmin}
            />
            <Input
              label="Default Currency"
              value={currency}
              onChange={(val) => setCurrency(val.toUpperCase())}
              isDisabled={!isSuperAdmin}
            />
            <Input
              label="Default Table Page Size"
              type="number"
              value={String(paginationLimit)}
              onChange={(val) => setPaginationLimit(Number(val) || 10)}
              isDisabled={!isSuperAdmin}
            />
            <Input
              label="Date Display Format"
              value={dateFormat}
              onChange={(val) => setDateFormat(val)}
              isDisabled={!isSuperAdmin}
            />
            <Input
              label="Time Display Format"
              value={timeFormat}
              onChange={(val) => setTimeFormat(val)}
              isDisabled={!isSuperAdmin}
            />
          </div>
        </div>

        {/* Security & Sessions */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
            <RiShieldLine className="size-5 text-accent-600" />
            Security & Authentication
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary-default border border-separator-border">
              <div>
                <p className="font-semibold text-body-medium text-text-primary">
                  Allow Self-Service Password Reset
                </p>
                <p className="text-caption-1-medium text-text-secondary">
                  Permits users to request single-use password reset tokens via email
                </p>
              </div>
              <Switch
                isSelected={allowPasswordReset}
                onChange={setAllowPasswordReset}
                isDisabled={!isSuperAdmin}
                aria-label="Allow self-service password reset"
              />
            </div>

            <div className="max-w-xs">
              <Input
                label="Session Timeout (Minutes)"
                type="number"
                value={String(sessionTimeout)}
                onChange={(val) => setSessionTimeout(Number(val) || 60)}
                isDisabled={!isSuperAdmin}
              />
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              leadingIcon={RiSaveLine}
              className="font-bold"
            >
              {saving ? 'Saving...' : 'Save System Settings'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
