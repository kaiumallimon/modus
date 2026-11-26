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
import { Select, SelectItem } from '@/components/base/select/select';
import { Switch } from '@/components/base/switch/switch';
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '../api/inventory-api';
import type { ProductCategory } from '../types/inventory';

export interface CategoryFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory?: ProductCategory | null;
  categories: ProductCategory[];
  onSaved: () => void;
}

export function CategoryFormModal({
  isOpen,
  onOpenChange,
  editingCategory,
  categories,
  onSaved,
}: CategoryFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string>('NONE');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description || '');
      const parentId =
        typeof editingCategory.parentCategoryId === 'object' && editingCategory.parentCategoryId
          ? editingCategory.parentCategoryId._id
          : editingCategory.parentCategoryId || 'NONE';
      setParentCategoryId(parentId);
      setIsActive(editingCategory.isActive);
    } else {
      setName('');
      setDescription('');
      setParentCategoryId('NONE');
      setIsActive(true);
    }
  }, [isOpen, editingCategory]);

  const parentChoices = categories.filter(
    (c) => !editingCategory || c._id !== editingCategory._id,
  );

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        parentCategoryId: parentCategoryId === 'NONE' ? null : parentCategoryId,
        isActive,
      };
      if (editingCategory) {
        await inventoryApi.updateCategory(editingCategory._id, payload);
        toast.success(`Category "${payload.name}" updated`);
      } else {
        await inventoryApi.createCategory(payload);
        toast.success(`Category "${payload.name}" created`);
      }
      onSaved();
      close();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      {({ close }) => (
        <form onSubmit={(e) => handleSubmit(e, close)} className="flex min-h-0 flex-1 flex-col gap-2">
          <ModalHeader
            title={editingCategory ? 'Edit Category' : 'Create Category'}
            description="Organize inventory products into clear searchable groups."
          />
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <Input
              label="Category Name"
              placeholder="e.g., Medical Consumables"
              value={name}
              onChange={setName}
              isRequired
            />

            <Select
              label="Parent Category (Optional)"
              selectedKey={parentCategoryId}
              onSelectionChange={(k) => setParentCategoryId(String(k))}
              className="w-full"
            >
              <SelectItem id="NONE" textValue="None (Top-level)">
                None (Top-level category)
              </SelectItem>
              {parentChoices.map((cat) => (
                <SelectItem key={cat._id} id={cat._id} textValue={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </Select>

            <Textarea
              label="Description"
              placeholder="Short summary of products placed in this category"
              value={description}
              onChange={setDescription}
              rows={3}
            />

            <div className="flex items-center justify-between rounded-2lg border border-separator-border bg-background-secondary-default px-3 py-2.5">
              <div>
                <p className="text-body-medium text-text-primary">Active Status</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Archived categories cannot be assigned to new products.
                </p>
              </div>
              <Switch
                isSelected={isActive}
                onChange={setIsActive}
                aria-label="Toggle category active status"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" type="button" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
