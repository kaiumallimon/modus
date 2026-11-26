'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { Switch } from '@/components/base/switch/switch';
import { Divider } from '@/components/base/divider/divider';
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '../api/inventory-api';
import type { Warehouse } from '../types/inventory';

export interface WarehouseFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingWarehouse?: Warehouse | null;
  onSaved: () => void;
}

export function WarehouseFormModal({
  isOpen,
  onOpenChange,
  editingWarehouse,
  onSaved,
}: WarehouseFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingWarehouse) {
      setName(editingWarehouse.name);
      setCode(editingWarehouse.code);
      setDescription(editingWarehouse.description || '');
      setStreet(editingWarehouse.address?.street || '');
      setCity(editingWarehouse.address?.city || '');
      setState(editingWarehouse.address?.state || '');
      setPostalCode(editingWarehouse.address?.postalCode || '');
      setCountry(editingWarehouse.address?.country || '');
      setIsActive(editingWarehouse.isActive);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setStreet('');
      setCity('');
      setState('');
      setPostalCode('');
      setCountry('');
      setIsActive(true);
    }
  }, [isOpen, editingWarehouse]);

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!name.trim()) {
      setError('Warehouse name is required.');
      return;
    }
    if (!cleanCode || !/^[A-Za-z0-9_-]+$/.test(cleanCode)) {
      setError('Valid warehouse code is required (letters, numbers, hyphens, underscores).');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        code: cleanCode,
        description: description.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        },
        isActive,
      };
      if (editingWarehouse) {
        await inventoryApi.updateWarehouse(editingWarehouse._id, payload);
        toast.success(`Warehouse "${payload.name}" (${payload.code}) updated`);
      } else {
        await inventoryApi.createWarehouse(payload);
        toast.success(`Warehouse "${payload.name}" (${payload.code}) created`);
      }
      onSaved();
      close();
    } catch (err: any) {
      setError(err.message || 'Failed to save warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      {({ close }) => (
        <form onSubmit={(e) => handleSubmit(e, close)} className="flex min-h-0 flex-1 flex-col gap-2">
          <ModalHeader
            title={editingWarehouse ? 'Edit Warehouse' : 'Register Warehouse'}
            description="Configure storage facility details for per-warehouse stock tracking."
          />
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Warehouse Name"
                  placeholder="e.g., Main Distribution Center"
                  value={name}
                  onChange={setName}
                  isRequired
                />
              </div>
              <Input
                label="Unique Code"
                placeholder="WH-MAIN"
                value={code}
                onChange={(val) => setCode(val.toUpperCase())}
                isRequired
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Facility purpose, storage notes, or temperature controls"
              value={description}
              onChange={setDescription}
              rows={2}
            />

            <Divider>Address & Location</Divider>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Street Address"
                  placeholder="120 Logistics Pkwy"
                  value={street}
                  onChange={setStreet}
                />
              </div>
              <Input label="City" placeholder="Austin" value={city} onChange={setCity} />
              <Input label="State / Region" placeholder="TX" value={state} onChange={setState} />
              <Input
                label="Postal Code"
                placeholder="78701"
                value={postalCode}
                onChange={setPostalCode}
              />
              <Input label="Country" placeholder="USA" value={country} onChange={setCountry} />
            </div>

            <div className="flex items-center justify-between rounded-2lg border border-separator-border bg-background-secondary-default px-3 py-2.5">
              <div>
                <p className="text-body-medium text-text-primary">Operational Status</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Deactivated warehouses cannot receive adjustments or transfers.
                </p>
              </div>
              <Switch
                isSelected={isActive}
                onChange={setIsActive}
                aria-label="Toggle warehouse operational status"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" type="button" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
