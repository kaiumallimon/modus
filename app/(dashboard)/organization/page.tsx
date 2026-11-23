'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  RiBuildingLine,
  RiSaveLine,
  RiGlobalLine,
  RiMapPinLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { OrganizationSettings } from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Spinner } from '@/components/base/spinner/spinner';
import { toast } from '@/components/base/toast/toast';

export default function OrganizationPage() {
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [logo, setLogo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en-US');

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const canEdit = hasPermission('organization.update');

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<OrganizationSettings>(API_ENDPOINTS.ORGANIZATION);
      if (data) {
        setName(data.name || '');
        setLegalName(data.legalName || '');
        setLogo(data.logo || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setWebsite(data.website || '');
        setCurrency(data.currency || 'USD');
        setTimezone(data.timezone || 'UTC');
        setLocale(data.locale || 'en-US');

        if (data.address) {
          setStreet(data.address.street || '');
          setCity(data.address.city || '');
          setState(data.address.state || '');
          setPostalCode(data.address.postalCode || '');
          setCountry(data.address.country || '');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      await apiClient(API_ENDPOINTS.ORGANIZATION, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() || undefined,
          legalName: legalName.trim() || undefined,
          logo: logo.trim() || undefined,
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
      toast.success('Organization profile updated successfully');
      loadOrg();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization profile');
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
          <h1 className="text-title-2-medium text-text-primary">Organization Settings</h1>
          <p className="text-body-medium text-text-secondary">
            Single-organization workspace profile and operational localization
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
            <RiBuildingLine className="size-5 text-accent-600" />
            General Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Organization Display Name"
              value={name}
              onChange={(val) => setName(val)}
              isDisabled={!canEdit}
              isRequired
            />
            <Input
              label="Legal Entity Name"
              value={legalName}
              onChange={(val) => setLegalName(val)}
              isDisabled={!canEdit}
            />
            <Input
              label="Official Contact Email"
              type="email"
              value={email}
              onChange={(val) => setEmail(val)}
              isDisabled={!canEdit}
              isRequired
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(val) => setPhone(val)}
              isDisabled={!canEdit}
            />
            <Input
              label="Website URL"
              value={website}
              onChange={(val) => setWebsite(val)}
              isDisabled={!canEdit}
            />
            <Input
              label="Logo Image URL"
              placeholder="https://..."
              value={logo}
              onChange={(val) => setLogo(val)}
              isDisabled={!canEdit}
            />
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
            <RiMapPinLine className="size-5 text-accent-600" />
            Physical Address
          </h2>
          <div className="space-y-3">
            <Input
              label="Street Address"
              value={street}
              onChange={(val) => setStreet(val)}
              isDisabled={!canEdit}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="City"
                value={city}
                onChange={(val) => setCity(val)}
                isDisabled={!canEdit}
              />
              <Input
                label="State / Region"
                value={state}
                onChange={(val) => setState(val)}
                isDisabled={!canEdit}
              />
              <Input
                label="Postal Code"
                value={postalCode}
                onChange={(val) => setPostalCode(val)}
                isDisabled={!canEdit}
              />
              <Input
                label="Country"
                value={country}
                onChange={(val) => setCountry(val)}
                isDisabled={!canEdit}
              />
            </div>
          </div>
        </div>

        {/* Localization Card */}
        <div className="bg-background-primary-default border border-border-button-default rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
            <RiGlobalLine className="size-5 text-accent-600" />
            Localization & Standards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Default Currency Code"
              placeholder="USD"
              value={currency}
              onChange={(val) => setCurrency(val.toUpperCase())}
              isDisabled={!canEdit}
            />
            <Input
              label="Default Timezone"
              placeholder="UTC"
              value={timezone}
              onChange={(val) => setTimezone(val)}
              isDisabled={!canEdit}
            />
            <Input
              label="Default Locale"
              placeholder="en-US"
              value={locale}
              onChange={(val) => setLocale(val)}
              isDisabled={!canEdit}
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              leadingIcon={RiSaveLine}
              className="font-bold"
            >
              {saving ? 'Saving...' : 'Save Organization Settings'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
