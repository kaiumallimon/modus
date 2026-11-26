'use client';

import React, { useEffect, useState } from 'react';
import { RiFileCopyLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Divider } from '@/components/base/divider/divider';
import { Input } from '@/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Textarea } from '@/components/base/textarea/textarea';
import { toast } from '@/components/base/toast/toast';
import { salesApi } from '../api/sales-api';
import { validateCustomerForm } from '../schemas/validation';
import type { CustomerRecord } from '../types/sales';

export interface CustomerFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer: CustomerRecord | null;
  onSuccess: (customer?: CustomerRecord) => void;
}

export function CustomerFormModal({
  isOpen,
  onOpenChange,
  editingCustomer,
  onSuccess,
}: CustomerFormModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bStreet, setBStreet] = useState('');
  const [bCity, setBCity] = useState('');
  const [bState, setBState] = useState('');
  const [bPostal, setBPostal] = useState('');
  const [bCountry, setBCountry] = useState('');
  const [sStreet, setSStreet] = useState('');
  const [sCity, setSCity] = useState('');
  const [sState, setSState] = useState('');
  const [sPostal, setSPostal] = useState('');
  const [sCountry, setSCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setSubmitError('');

    if (editingCustomer) {
      setCode(editingCustomer.code || '');
      setName(editingCustomer.name || '');
      setPhone(editingCustomer.phone || '');
      setEmail(editingCustomer.email || '');
      setBStreet(editingCustomer.billingAddress?.street || '');
      setBCity(editingCustomer.billingAddress?.city || '');
      setBState(editingCustomer.billingAddress?.state || '');
      setBPostal(editingCustomer.billingAddress?.postalCode || '');
      setBCountry(editingCustomer.billingAddress?.country || '');
      setSStreet(editingCustomer.shippingAddress?.street || '');
      setSCity(editingCustomer.shippingAddress?.city || '');
      setSState(editingCustomer.shippingAddress?.state || '');
      setSPostal(editingCustomer.shippingAddress?.postalCode || '');
      setSCountry(editingCustomer.shippingAddress?.country || '');
      setNotes(editingCustomer.notes || '');
    } else {
      setCode('');
      setName('');
      setPhone('');
      setEmail('');
      setBStreet('');
      setBCity('');
      setBState('');
      setBPostal('');
      setBCountry('');
      setSStreet('');
      setSCity('');
      setSState('');
      setSPostal('');
      setSCountry('');
      setNotes('');
    }
  }, [isOpen, editingCustomer]);

  const copyBillingToShipping = () => {
    setSStreet(bStreet);
    setSCity(bCity);
    setSState(bState);
    setSPostal(bPostal);
    setSCountry(bCountry);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateCustomerForm({ code, name, phone, email });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        billingAddress: {
          street: bStreet.trim(),
          city: bCity.trim(),
          state: bState.trim(),
          postalCode: bPostal.trim(),
          country: bCountry.trim(),
        },
        shippingAddress: {
          street: sStreet.trim(),
          city: sCity.trim(),
          state: sState.trim(),
          postalCode: sPostal.trim(),
          country: sCountry.trim(),
        },
        notes: notes.trim(),
      };

      const saved = editingCustomer
        ? await salesApi.updateCustomer(editingCustomer._id, payload)
        : await salesApi.createCustomer(payload);

      toast.success(
        editingCustomer ? 'Customer Updated' : 'Customer Created',
        { description: `${saved.name} (${saved.code}) saved successfully.` }
      );
      onSuccess(saved);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || 'Unable to save customer.';
      setSubmitError(msg);
      toast.error('Failed to Save Customer', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-2"
      >
        <ModalHeader
          title={editingCustomer ? 'Edit Customer' : 'New Customer'}
          description={
            editingCustomer
              ? `Update details for ${editingCustomer.code}.`
              : 'Create a customer profile for sales orders and fulfillment tracking.'
          }
        />

        <ModalBody className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Customer Name *"
              placeholder="e.g. Apex Retail Trading Co."
              value={name}
              onChange={setName}
              isInvalid={Boolean(fieldErrors.name)}
              errorMessage={fieldErrors.name}
            />
            <Input
              label="Customer Code"
              placeholder="Auto-generated if left blank (CUS-...)"
              value={code}
              onChange={(val) => setCode(val.toUpperCase())}
              isInvalid={Boolean(fieldErrors.code)}
              errorMessage={fieldErrors.code}
            />
            <Input
              label="Phone Number *"
              placeholder="+1 555 210 9900"
              value={phone}
              onChange={setPhone}
              isInvalid={Boolean(fieldErrors.phone)}
              errorMessage={fieldErrors.phone}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="orders@customer.com"
              value={email}
              onChange={setEmail}
              isInvalid={Boolean(fieldErrors.email)}
              errorMessage={fieldErrors.email}
            />
          </div>

          <Divider />

          <div className="space-y-3">
            <p className="text-body-2-semibold text-text-primary">
              Billing Address (Optional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Street"
                  placeholder="120 Market Plaza, Suite 400"
                  value={bStreet}
                  onChange={setBStreet}
                />
              </div>
              <Input
                label="City"
                placeholder="Austin"
                value={bCity}
                onChange={setBCity}
              />
              <Input
                label="State / Province"
                placeholder="TX"
                value={bState}
                onChange={setBState}
              />
              <Input
                label="Postal Code"
                placeholder="78701"
                value={bPostal}
                onChange={setBPostal}
              />
              <Input
                label="Country"
                placeholder="United States"
                value={bCountry}
                onChange={setBCountry}
              />
            </div>
          </div>

          <Divider />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body-2-semibold text-text-primary">
                Shipping Address (Optional)
              </p>
              <Button
                type="button"
                size="small"
                variant="ghost"
                leadingIcon={RiFileCopyLine}
                onClick={copyBillingToShipping}
              >
                Copy Billing Address
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Street"
                  placeholder="Receiving Dock B, 120 Market Plaza"
                  value={sStreet}
                  onChange={setSStreet}
                />
              </div>
              <Input
                label="City"
                placeholder="Austin"
                value={sCity}
                onChange={setSCity}
              />
              <Input
                label="State / Province"
                placeholder="TX"
                value={sState}
                onChange={setSState}
              />
              <Input
                label="Postal Code"
                placeholder="78701"
                value={sPostal}
                onChange={setSPostal}
              />
              <Input
                label="Country"
                placeholder="United States"
                value={sCountry}
                onChange={setSCountry}
              />
            </div>
          </div>

          <Textarea
            label="Internal Notes"
            placeholder="Delivery instructions, credit terms, or account notes..."
            rows={2}
            value={notes}
            onChange={setNotes}
          />
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? 'Saving...'
              : editingCustomer
                ? 'Save Changes'
                : 'Create Customer'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
