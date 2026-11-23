"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RiBuildingLine,
  RiMailLine,
  RiPhoneLine,
  RiGlobalLine,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiTimeLine,
  RiShieldCheckLine,
  RiSaveLine,
} from "@remixicon/react";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { OrganizationSettings } from "@/lib/api/types";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Spinner } from "@/components/base/spinner/spinner";
import { toast } from "@/components/base/toast/toast";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

export function SettingsOrganization({ onSaved }: { onSaved?: () => void }) {
  const { isSuperAdmin, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General profile
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // Regional
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [locale, setLocale] = useState("en-US");

  const canEdit = isSuperAdmin && hasPermission("organization.update");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<OrganizationSettings>(API_ENDPOINTS.ORGANIZATION);
      if (data) {
        setName(data.name || "");
        setLegalName(data.legalName || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setWebsite(data.website || "");
        setCurrency(data.currency || "USD");
        setTimezone(data.timezone || "UTC");
        setLocale(data.locale || "en-US");

        if (data.address) {
          setStreet(data.address.street || "");
          setCity(data.address.city || "");
          setState(data.address.state || "");
          setPostalCode(data.address.postalCode || "");
          setCountry(data.address.country || "");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, loadData]);

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="size-12 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3">
          <RiShieldCheckLine className="size-6 text-accent-600" />
        </div>
        <h3 className="text-title-3-semibold text-text-primary">Super Admin Access Required</h3>
        <p className="text-body-2-regular text-text-secondary max-w-sm mt-1">
          Organization settings are restricted strictly to Super Administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="md" className="text-accent-600" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      await apiClient(API_ENDPOINTS.ORGANIZATION, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim() || undefined,
          legalName: legalName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          currency: currency.toUpperCase().trim() || undefined,
          timezone: timezone.trim() || undefined,
          locale: locale.trim() || undefined,
          address: {
            street: street.trim() || undefined,
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            country: country.trim() || undefined,
          },
        }),
      });

      toast.success("Organization profile updated successfully");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update organization profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex w-full flex-col gap-6">
      {/* Organization Identity */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Organization Profile</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Organization name" description="Primary operational brand name">
            <div className="w-56">
              <Input
                aria-label="Organization name"
                value={name}
                onChange={(val) => setName(val)}
                isDisabled={!canEdit}
                leadingIcon={RiBuildingLine}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Legal entity name" description="Official registered business entity">
            <div className="w-56">
              <Input
                aria-label="Legal name"
                value={legalName}
                onChange={(val) => setLegalName(val)}
                isDisabled={!canEdit}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Contact email" description="Primary corporate communication email">
            <div className="w-56">
              <Input
                aria-label="Contact email"
                type="email"
                value={email}
                onChange={(val) => setEmail(val)}
                isDisabled={!canEdit}
                leadingIcon={RiMailLine}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Telephone number" description="Primary contact phone number">
            <div className="w-56">
              <Input
                aria-label="Phone"
                value={phone}
                onChange={(val) => setPhone(val)}
                isDisabled={!canEdit}
                leadingIcon={RiPhoneLine}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Website URL" description="Public website address">
            <div className="w-56">
              <Input
                aria-label="Website"
                value={website}
                onChange={(val) => setWebsite(val)}
                isDisabled={!canEdit}
                leadingIcon={RiGlobalLine}
              />
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Address Details */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Headquarters Address</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Street address">
            <div className="w-56">
              <Input
                aria-label="Street"
                value={street}
                onChange={(val) => setStreet(val)}
                isDisabled={!canEdit}
                leadingIcon={RiMapPinLine}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="City & State">
            <div className="flex w-56 gap-2">
              <Input
                aria-label="City"
                placeholder="City"
                value={city}
                onChange={(val) => setCity(val)}
                isDisabled={!canEdit}
              />
              <Input
                aria-label="State"
                placeholder="State"
                value={state}
                onChange={(val) => setState(val)}
                isDisabled={!canEdit}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Postal code & Country">
            <div className="flex w-56 gap-2">
              <Input
                aria-label="Postal code"
                placeholder="Postal"
                value={postalCode}
                onChange={(val) => setPostalCode(val)}
                isDisabled={!canEdit}
              />
              <Input
                aria-label="Country"
                placeholder="Country"
                value={country}
                onChange={(val) => setCountry(val)}
                isDisabled={!canEdit}
              />
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Regional & Financial Preferences */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Regional & Localization Defaults</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow label="Base currency" description="Default ledger currency (e.g. USD, EUR, GBP)">
            <div className="w-56">
              <Input
                aria-label="Currency"
                value={currency}
                onChange={(val) => setCurrency(val.toUpperCase())}
                isDisabled={!canEdit}
                leadingIcon={RiMoneyDollarCircleLine}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Timezone" description="Canonical operational timezone">
            <div className="w-56">
              <Input
                aria-label="Timezone"
                value={timezone}
                onChange={(val) => setTimezone(val)}
                isDisabled={!canEdit}
                leadingIcon={RiTimeLine}
              />
            </div>
          </SettingsRow>
          <SettingsRow label="Locale format" description="BCP 47 language code (e.g. en-US, en-GB)">
            <div className="w-56">
              <Input
                aria-label="Locale"
                value={locale}
                onChange={(val) => setLocale(val)}
                isDisabled={!canEdit}
              />
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            leadingIcon={RiSaveLine}
            className="font-bold"
          >
            {saving ? "Saving Changes..." : "Save Organization Settings"}
          </Button>
        </div>
      )}
    </form>
  );
}
