'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { NumberField } from '@/components/base/number-field/number-field';
import { Textarea } from '@/components/base/textarea/textarea';
import { Select, SelectItem } from '@/components/base/select/select';
import { ComboBox, ComboBoxItem } from '@/components/base/combobox/combobox';
import { Switch } from '@/components/base/switch/switch';
import { Divider } from '@/components/base/divider/divider';
import { FileUpload } from '@/components/base/file-upload/file-upload';
import { toast } from '@/components/base/toast/toast';
import { inventoryApi } from '../api/inventory-api';
import { validateProductForm } from '../schemas/validation';
import type {
  Product,
  ProductCategory,
  UnitOfMeasurement,
} from '../types/inventory';

export interface ProductFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct?: Product | null;
  categories: ProductCategory[];
  units: UnitOfMeasurement[];
  onSaved: () => void;
}

export function ProductFormModal({
  isOpen,
  onOpenChange,
  editingProduct,
  categories,
  units,
  onSaved,
}: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [minStockThreshold, setMinStockThreshold] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeCategories = categories.filter(
    (c) => c.isActive || (editingProduct && typeof editingProduct.categoryId === 'object' && editingProduct.categoryId._id === c._id),
  );
  const activeUnits = units.filter(
    (u) => u.isActive || (editingProduct && typeof editingProduct.unitId === 'object' && editingProduct.unitId._id === u._id),
  );
  const lastInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastInitKeyRef.current = null;
      return;
    }
    const initKey = editingProduct?._id ?? 'new';
    if (lastInitKeyRef.current === initKey) return;
    lastInitKeyRef.current = initKey;
    setError('');
    setImageFile(null);
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setBarcode(editingProduct.barcode || '');
      setDescription(editingProduct.description || '');
      const cat =
        typeof editingProduct.categoryId === 'object'
          ? editingProduct.categoryId._id
          : editingProduct.categoryId;
      const unt =
        typeof editingProduct.unitId === 'object'
          ? editingProduct.unitId._id
          : editingProduct.unitId;
      setCategoryId(cat || '');
      setUnitId(unt || '');
      setCostPrice(editingProduct.costPrice ?? 0);
      setSellingPrice(
        editingProduct.sellingPrice !== null && editingProduct.sellingPrice !== undefined
          ? String(editingProduct.sellingPrice)
          : '',
      );
      setMinStockThreshold(editingProduct.minStockThreshold ?? 0);
      setIsActive(editingProduct.isActive);
      setImageUrl(editingProduct.imageUrl || '');
    } else {
      setName('');
      setSku('');
      setBarcode('');
      setDescription('');
      setCategoryId(activeCategories[0]?._id || '');
      setUnitId(activeUnits[0]?._id || '');
      setCostPrice(0);
      setSellingPrice('');
      setMinStockThreshold(0);
      setIsActive(true);
      setImageUrl('');
    }
  }, [isOpen, editingProduct, activeCategories, activeUnits]);

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    const parsedSelling =
      sellingPrice.trim() === '' ? null : Number(sellingPrice.trim());

    const validation = validateProductForm({
      name,
      sku,
      categoryId,
      unitId,
      costPrice,
      sellingPrice: parsedSelling,
      minStockThreshold,
    });

    if (!validation.valid || !validation.payload) {
      setError(validation.error || 'Please verify product inputs.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...validation.payload,
        barcode: barcode.trim() || null,
        description: description.trim(),
        imageUrl: imageUrl.trim() || null,
        isActive,
      };

      let saved: Product;
      if (editingProduct) {
        saved = await inventoryApi.updateProduct(editingProduct._id, payload);
      } else {
        saved = await inventoryApi.createProduct(payload);
      }

      if (imageFile) {
        await inventoryApi.uploadProductImage(saved._id, imageFile);
      }

      toast.success(
        editingProduct
          ? `Product "${payload.name}" updated`
          : `Product "${payload.name}" created`,
      );
      onSaved();
      close();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
      {({ close }) => (
        <form onSubmit={(e) => handleSubmit(e, close)}>
          <ModalHeader
            title={editingProduct ? `Edit Product — ${editingProduct.sku}` : 'Create New Product'}
            description="Define product catalog attributes, base unit, pricing, and stock alert thresholds. Stock quantities are controlled through Adjustments & Transfers."
          />
          <ModalBody className="space-y-4">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Product Name"
                placeholder="e.g., Sterile Surgical Gloves (Medium)"
                value={name}
                onChange={setName}
                isRequired
              />
              <Input
                label="SKU (Unique)"
                placeholder="e.g., MED-GLV-M"
                value={sku}
                onChange={(v) => setSku(v.toUpperCase())}
                isRequired
              />
              <Input
                label="Barcode (Optional, Unique)"
                placeholder="e.g., 8901234567890"
                value={barcode}
                onChange={setBarcode}
              />
              <ComboBox
                label="Category"
                placeholder="Select product category"
                items={activeCategories}
                selectedKey={categoryId || null}
                onSelectionChange={(key) => setCategoryId(key ? String(key) : '')}
                isRequired
              >
                {(cat) => (
                  <ComboBoxItem id={cat._id} textValue={cat.name}>
                    <span className="truncate">{cat.name}</span>
                  </ComboBoxItem>
                )}
              </ComboBox>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Base Unit of Measurement"
                placeholder="Select unit"
                selectedKey={unitId || null}
                onSelectionChange={(k) => setUnitId(k ? String(k) : '')}
                isRequired
                className="w-full"
              >
                {activeUnits.map((u) => (
                  <SelectItem key={u._id} id={u._id} textValue={`${u.name} (${u.symbol})`}>
                    {u.name} ({u.symbol})
                  </SelectItem>
                ))}
              </Select>

              <NumberField
                label="Cost Price (USD)"
                value={costPrice}
                onChange={(val) => setCostPrice(Number.isFinite(val) ? val : 0)}
                minValue={0}
                step={0.01}
                formatOptions={{ style: 'currency', currency: 'USD' }}
                isRequired
              />

              <Input
                label="Selling Price (Optional)"
                type="number"
                placeholder="Leave blank if internal"
                value={sellingPrice}
                onChange={setSellingPrice}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <NumberField
                label="Minimum Stock Threshold"
                hint="Triggers Low Stock alerts when active total falls at or below this quantity."
                value={minStockThreshold}
                onChange={(val) => setMinStockThreshold(Number.isFinite(val) ? val : 0)}
                minValue={0}
                step={1}
              />

              <Textarea
                label="Description"
                placeholder="Specifications, storage requirements, or handling notes"
                value={description}
                onChange={setDescription}
                rows={3}
              />
            </div>

            <Divider>Product Image (Cloudflare R2 CDN)</Divider>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-2">
                {imageUrl && (
                  <div className="flex items-center gap-3 rounded-2lg border border-separator-border bg-background-secondary-default p-2.5">
                    <img
                      src={imageUrl}
                      alt={name || 'Product'}
                      className="size-12 rounded-lg object-cover border border-separator-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-caption-1-semibold text-text-primary">
                        Current Product Image
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setImageFile(null);
                        }}
                        className="text-caption-1-medium text-status-rose-text hover:underline cursor-pointer"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}
                <Input
                  label="Direct Image URL (Optional)"
                  placeholder="https://... or upload via panel on the right"
                  type="url"
                  value={imageUrl}
                  onChange={setImageUrl}
                />
              </div>

              <div className="space-y-1.5">
                <FileUpload
                  allowedExtensions={['jpg', 'jpeg', 'png', 'webp', 'gif']}
                  maxBytes={5 * 1024 * 1024}
                  onUploadComplete={(file) => {
                    setImageFile(file);
                    toast(`Ready to upload "${file.name}" on save`, { status: 'information' });
                  }}
                />
                {imageFile && (
                  <p className="text-caption-1-medium text-accent-700">
                    Queued upload: {imageFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2lg border border-separator-border bg-background-secondary-default px-3 py-2.5">
              <div>
                <p className="text-body-medium text-text-primary">Active Catalog Status</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Archived products remain in movement history and cannot receive new stock adjustments.
                </p>
              </div>
              <Switch
                isSelected={isActive}
                onChange={setIsActive}
                aria-label="Toggle product active status"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" type="button" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
