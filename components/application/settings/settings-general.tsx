"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RiTimeLine,
  RiGlobalLine,
  RiMoneyDollarCircleLine,
  RiCalendarLine,
  RiListOrdered2,
  RiShieldLine,
  RiSaveLine,
} from "@remixicon/react";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { SystemSettings } from "@/lib/api/types";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Switch } from "@/components/base/switch/switch";
import { Spinner } from "@/components/base/spinner/spinner";
import { toast } from "@/components/base/toast/toast";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

export function SettingsGeneral({
  planArtSrc: _planArtSrc,
  onSaved,
}: {
  planArtSrc?: string;
  onSaved?: () => void;
}) {
  const { isSuperAdmin, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // System settings state
  const [defaultTimezone, setDefaultTimezone] = useState("UTC");
  const [defaultLocale, setDefaultLocale] = useState("en-US");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [timeFormat, setTimeFormat] = useState("HH:mm:ss");
  const [defaultPaginationLimit, setDefaultPaginationLimit] = useState(10);
  const [allowPasswordReset, setAllowPasswordReset] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);

  const canEdit = isSuperAdmin && hasPermission("settings.update");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<SystemSettings>(API_ENDPOINTS.SETTINGS);
      if (data) {
        setDefaultTimezone(data.defaultTimezone || "UTC");
        setDefaultLocale(data.defaultLocale || "en-US");
        setDefaultCurrency(data.defaultCurrency || "USD");
        setDateFormat(data.dateFormat || "YYYY-MM-DD");
        setTimeFormat(data.timeFormat || "HH:mm:ss");
        setDefaultPaginationLimit(data.defaultPaginationLimit || 10);
        setAllowPasswordReset(data.allowPasswordReset ?? true);
        setSessionTimeoutMinutes(data.sessionTimeoutMinutes || 60);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load system preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      await apiClient(API_ENDPOINTS.SETTINGS, {
        method: "PATCH",
        body: JSON.stringify({
          defaultTimezone: defaultTimezone.trim(),
          defaultLocale: defaultLocale.trim(),
          defaultCurrency: defaultCurrency.toUpperCase().trim(),
          dateFormat: dateFormat.trim(),
          timeFormat: timeFormat.trim(),
          defaultPaginationLimit: Number(defaultPaginationLimit),
          allowPasswordReset,
          sessionTimeoutMinutes: Number(sessionTimeoutMinutes),
        }),
      });

      toast.success("System preferences saved successfully");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save system preferences");
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
    <form onSubmit={handleSave} className="flex w-full flex-col gap-6">
      {/* Localization & Display Formats */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Localization & Display Defaults</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="System timezone"
            description="Default canonical timezone for logs and timestamps"
          >
            <div className="w-52">
              <Input
                aria-label="Default timezone"
                size="small"
                value={defaultTimezone}
                onChange={setDefaultTimezone}
                isDisabled={!canEdit}
                leadingIcon={RiTimeLine}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Default locale"
            description="BCP 47 language and region formatting code"
          >
            <div className="w-52">
              <Input
                aria-label="Default locale"
                size="small"
                value={defaultLocale}
                onChange={setDefaultLocale}
                isDisabled={!canEdit}
                leadingIcon={RiGlobalLine}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Base currency"
            description="Default monetary currency representation"
          >
            <div className="w-52">
              <Input
                aria-label="Default currency"
                size="small"
                value={defaultCurrency}
                onChange={(val) => setDefaultCurrency(val.toUpperCase())}
                isDisabled={!canEdit}
                leadingIcon={RiMoneyDollarCircleLine}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Date format"
            description="Format used to render calendar dates (e.g. YYYY-MM-DD)"
          >
            <div className="w-52">
              <Input
                aria-label="Date format"
                size="small"
                value={dateFormat}
                onChange={setDateFormat}
                isDisabled={!canEdit}
                leadingIcon={RiCalendarLine}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Time format"
            description="Format used to render clock times (e.g. HH:mm:ss)"
          >
            <div className="w-52">
              <Input
                aria-label="Time format"
                size="small"
                value={timeFormat}
                onChange={setTimeFormat}
                isDisabled={!canEdit}
              />
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Security & Application Policies */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Security Policies & Pagination</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Default pagination limit"
            description="Number of records returned per page by default in lists"
          >
            <div className="w-52">
              <Input
                aria-label="Pagination limit"
                size="small"
                type="number"
                value={String(defaultPaginationLimit)}
                onChange={(val) => setDefaultPaginationLimit(Number(val) || 10)}
                isDisabled={!canEdit}
                leadingIcon={RiListOrdered2}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Session timeout (Minutes)"
            description="Minutes of inactivity before a session token expires"
          >
            <div className="w-52">
              <Input
                aria-label="Session timeout"
                size="small"
                type="number"
                value={String(sessionTimeoutMinutes)}
                onChange={(val) => setSessionTimeoutMinutes(Number(val) || 60)}
                isDisabled={!canEdit}
                leadingIcon={RiShieldLine}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Self-service password reset"
            description="Allow users to initiate password recovery via email"
          >
            <Switch
              aria-label="Allow self-service password reset"
              isSelected={allowPasswordReset}
              onChange={setAllowPasswordReset}
              isDisabled={!canEdit}
            />
          </SettingsRow>
        </SettingsCard>
      </div>

      {!canEdit && (
        <p className="text-caption-1-regular text-text-tertiary px-1">
          System-level preferences can only be updated by Super Administrators.
        </p>
      )}

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            leadingIcon={RiSaveLine}
            className="font-bold"
          >
            {saving ? "Saving Preferences..." : "Save System Preferences"}
          </Button>
        </div>
      )}
    </form>
  );
}
