'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  RiSettings3Line,
  RiShieldCheckLine,
  RiCheckLine,
  RiArrowRightLine,
  RiArrowLeftLine,
} from '@remixicon/react';
import { apiClient, setAuthTokens } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { InstallationSetupResponse } from '@/lib/api/types';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { toast } from '@/components/base/toast/toast';

export default function SetupWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // System Regional Defaults Form Data
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en-US');

  // Admin Form Data
  const [adminFirstName, setAdminFirstName] = useState('Super');
  const [adminLastName, setAdminLastName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('admin@modus.local');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  const validateStep1 = () => {
    if (!currency.trim() || !timezone.trim() || !locale.trim()) {
      setErrorMsg('Default currency, timezone, and locale are required.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep2 = () => {
    if (!adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim()) {
      setErrorMsg('All administrator name and email fields are required.');
      return false;
    }
    if (!adminPassword || adminPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return false;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setErrorMsg('Passwords do not match.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleCompleteSetup = async () => {
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload = {
        administrator: {
          firstName: adminFirstName.trim(),
          lastName: adminLastName.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
        },
        settings: {
          defaultCurrency: currency.toUpperCase().trim() || 'USD',
          defaultTimezone: timezone.trim() || 'UTC',
          defaultLocale: locale.trim() || 'en-US',
        },
      };

      const res = await apiClient<InstallationSetupResponse>(
        API_ENDPOINTS.INSTALLATION_SETUP,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          skipAuth: true,
        }
      );

      if (res.tokens) {
        setAuthTokens(res.tokens);
      }

      toast.success('Modus initialized successfully!');
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Setup initialization failed. Please check inputs.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-full">
      <div className="w-full max-w-2xl bg-background-primary-default border border-border-button-default rounded-2xl shadow-xl p-8 space-y-6">
        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-separator-border pb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-[#171B18] flex items-center justify-center p-2 border border-border-button-default">
              <Image
                src="/logo.svg"
                alt="Modus Logo"
                width={32}
                height={28}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-title-2-medium text-text-primary">Modus Installation Setup</h1>
              <p className="text-caption-1-medium text-text-secondary">Step {step} of 3</p>
            </div>
          </div>
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`size-7 rounded-full flex items-center justify-center text-caption-1-semibold ${
                  s === step
                    ? 'bg-accent-500 text-graphite-950 font-bold'
                    : s < step
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-background-secondary-default text-text-tertiary'
                }`}
              >
                {s < step ? <RiCheckLine className="size-4" /> : s}
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-caption-1-medium rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Step 1: System Regional Defaults */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
              <RiSettings3Line className="size-5 text-accent-600" />
              System Preferences
            </h2>
            <p className="text-body-medium text-text-secondary">
              Configure default regional formatting and localization for this Modus instance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Currency Code"
                placeholder="USD"
                value={currency}
                onChange={(val) => setCurrency(val)}
                isRequired
              />
              <Input
                label="Timezone"
                placeholder="UTC"
                value={timezone}
                onChange={(val) => setTimezone(val)}
                isRequired
              />
              <Input
                label="Locale"
                placeholder="en-US"
                value={locale}
                onChange={(val) => setLocale(val)}
                isRequired
              />
            </div>
          </div>
        )}

        {/* Step 2: Super Administrator Account */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-title-3-semibold text-text-primary flex items-center gap-2">
              <RiShieldCheckLine className="size-5 text-accent-600" />
              Initial Super Administrator
            </h2>
            <p className="text-body-medium text-text-secondary">
              This account has unrestricted full administrative authority over the entire Modus system.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                value={adminFirstName}
                onChange={(val) => setAdminFirstName(val)}
                isRequired
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                value={adminLastName}
                onChange={(val) => setAdminLastName(val)}
                isRequired
              />
              <div className="md:col-span-2">
                <Input
                  label="Administrator Email"
                  placeholder="admin@modus.local"
                  type="email"
                  value={adminEmail}
                  onChange={(val) => setAdminEmail(val)}
                  isRequired
                />
              </div>
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={adminPassword}
                onChange={(val) => setAdminPassword(val)}
                isRequired
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={adminPasswordConfirm}
                onChange={(val) => setAdminPasswordConfirm(val)}
                isRequired
              />
            </div>
          </div>
        )}

        {/* Step 3: Review & Finalize */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-title-3-semibold text-text-primary">Review & Bootstrap</h2>
            <div className="bg-background-secondary-default p-4 rounded-xl space-y-3 text-body-medium">
              <div>
                <p className="text-caption-2-medium text-text-tertiary uppercase">System Preferences</p>
                <p className="font-semibold text-text-primary">{currency} · {timezone}</p>
                <p className="text-caption-1-medium text-text-secondary">Locale: {locale}</p>
              </div>
              <div className="border-t border-separator-border pt-2">
                <p className="text-caption-2-medium text-text-tertiary uppercase">Super Administrator</p>
                <p className="font-semibold text-text-primary">{adminFirstName} {adminLastName}</p>
                <p className="text-caption-1-medium text-text-secondary">{adminEmail}</p>
              </div>
              <div className="border-t border-separator-border pt-2">
                <p className="text-caption-2-medium text-text-tertiary uppercase">Core Modules & Defaults</p>
                <p className="text-caption-1-medium text-text-secondary">
                  Default roles (Super Admin, Admin, Manager, Employee), permissions catalog, and core system modules will be initialized.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between border-t border-separator-border pt-4">
          {step > 1 ? (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => (s - 1) as any)}
              leadingIcon={RiArrowLeftLine}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              trailingIcon={RiArrowRightLine}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleCompleteSetup}
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? 'Initializing Modus...' : 'Complete Setup & Launch'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
