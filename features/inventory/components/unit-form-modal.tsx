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
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '../api/inventory-api';
import type { UnitOfMeasurement } from '../types/inventory';

export interface UnitFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingUnit?: UnitOfMeasurement | null;
  onSaved: () => void;
}

export function UnitFormModal({
  isOpen,
  onOpenChange,
  editingUnit,
  onSaved,
}: UnitFormModalProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingUnit) {
      setName(editingUnit.name);
      setSymbol(editingUnit.symbol);
      setDescription(editingUnit.description || '');
      setIsActive(editingUnit.isActive);
    } else {
      setName('');
      setSymbol('');
      setDescription('');
      setIsActive(true);
    }
  }, [isOpen, editingUnit]);

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) {
      setError('Both unit name and symbol are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        symbol: symbol.trim(),
        description: description.trim(),
        isActive,
      };
      if (editingUnit) {
        await inventoryApi.updateUnit(editingUnit._id, payload);
        toast.success(`Unit "${payload.name}" (${payload.symbol}) updated`);
      } else {
        await inventoryApi.createUnit(payload);
        toast.success(`Unit "${payload.name}" (${payload.symbol}) created`);
      }
      onSaved();
      close();
    } catch (err: any) {
      setError(err.message || 'Failed to save unit of measurement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      {({ close }) => (
        <form onSubmit={(e) => handleSubmit(e, close)}>
          <ModalHeader
            title={editingUnit ? 'Edit Unit of Measurement' : 'Add Unit of Measurement'}
            description="Define standard quantity units assigned to products across warehouses."
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
                  label="Unit Name"
                  placeholder="e.g., Carton"
                  value={name}
                  onChange={setName}
                  isRequired
                />
              </div>
              <Input
                label="Symbol"
                placeholder="e.g., ctn"
                value={symbol}
                onChange={setSymbol}
                isRequired
              />
            </div>

            <Textarea
              label="Description"
              placeholder="Optional note describing packaging or scale"
              value={description}
              onChange={setDescription}
              rows={2}
            />

            <div className="flex items-center justify-between rounded-2lg border border-separator-border bg-background-secondary-default px-3 py-2.5">
              <div>
                <p className="text-body-medium text-text-primary">Active Status</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Archived units remain on existing products but are hidden for new items.
                </p>
              </div>
              <Switch
                isSelected={isActive}
                onChange={setIsActive}
                aria-label="Toggle unit active status"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" type="button" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingUnit ? 'Save Changes' : 'Create Unit'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
