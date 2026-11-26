'use client';

import React, { useEffect, useState } from 'react';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Input } from '@/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/components/base/modal/modal';
import { Switch } from '@/components/base/switch/switch';
import { Textarea } from '@/components/base/textarea/textarea';
import { toast } from '@/components/base/toast/toast';
import { procurementApi } from '../api/procurement-api';
import { validateSupplierForm } from '../schemas/validation';
import type { Supplier, SupplierContact } from '../types/procurement';

export interface SupplierFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingSupplier: Supplier | null;
  onSuccess: () => void;
}

export function SupplierFormModal({
  isOpen,
  onOpenChange,
  editingSupplier,
  onSuccess,
}: SupplierFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingSupplier) {
      setName(editingSupplier.name || '');
      setCode(editingSupplier.code || '');
      setContactPerson(editingSupplier.contactPerson || '');
      setEmail(editingSupplier.email || '');
      setPhone(editingSupplier.phone || '');
      setAlternativePhone(editingSupplier.alternativePhone || '');
      setWebsite(editingSupplier.website || '');
      setTaxId(editingSupplier.taxId || '');
      setStreet(editingSupplier.address?.street || '');
      setCity(editingSupplier.address?.city || '');
      setState(editingSupplier.address?.state || '');
      setPostalCode(editingSupplier.address?.postalCode || '');
      setCountry(editingSupplier.address?.country || '');
      setNotes(editingSupplier.notes || '');
      setContacts(editingSupplier.contacts || []);
      setIsActive(editingSupplier.isActive);
    } else {
      setName('');
      setCode('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAlternativePhone('');
      setWebsite('');
      setTaxId('');
      setStreet('');
      setCity('');
      setState('');
      setPostalCode('');
      setCountry('');
      setNotes('');
      setContacts([]);
      setIsActive(true);
    }
  }, [isOpen, editingSupplier]);

  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: '', role: '', email: '', phone: '', isPrimary: false },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent, close: () => void) => {
    e.preventDefault();
    const errMsg = validateSupplierForm({
      name,
      code,
      contactPerson,
      email,
      phone,
      alternativePhone,
      website,
    });
    if (errMsg) {
      setError(errMsg);
      return;
    }

    const cleanedContacts = contacts
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        role: c.role?.trim() || '',
        email: c.email?.trim() || undefined,
        phone: c.phone?.trim() || undefined,
        isPrimary: Boolean(c.isPrimary),
      }));

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        alternativePhone: alternativePhone.trim() || undefined,
        website: website.trim() || undefined,
        taxId: taxId.trim() || undefined,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        },
        notes: notes.trim(),
        contacts: cleanedContacts,
        isActive,
      };

      if (editingSupplier) {
        await procurementApi.updateSupplier(editingSupplier._id, {
          ...payload,
          alternativePhone: alternativePhone.trim(),
          website: website.trim(),
          taxId: taxId.trim(),
        });
        toast.success(`Supplier "${payload.name}" updated.`);
      } else {
        await procurementApi.createSupplier(payload);
        toast.success(`Supplier "${payload.name}" registered.`);
      }
      onSuccess();
      close();
    } catch (err: any) {
      setError(err?.message || 'Unable to save supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
      {({ close }) => (
        <form
          onSubmit={(e) => handleSubmit(e, close)}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <ModalHeader
            title={editingSupplier ? 'Edit Supplier' : 'Register Supplier'}
            description="Maintain vendor identity, primary contact details, address, and procurement status."
          />
          <ModalBody className="space-y-4 max-h-[65vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl border border-border-error-default bg-status-rose-background px-3 py-2 text-body-2-medium text-status-rose-text">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Supplier Name"
                  placeholder="MediCore Pharmaceuticals Ltd."
                  value={name}
                  onChange={setName}
                  isRequired
                />
              </div>
              <Input
                label="Supplier Code"
                placeholder="SUP-MEDI"
                value={code}
                onChange={(val) =>
                  setCode(val.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                }
                isRequired
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Primary Contact Person"
                placeholder="Sarah Jenkins"
                value={contactPerson}
                onChange={setContactPerson}
                isRequired
              />
              <Input
                label="Email"
                type="email"
                placeholder="orders@vendor.com"
                value={email}
                onChange={setEmail}
                isRequired
              />
              <Input
                label="Phone"
                placeholder="+1 555 014 7788"
                value={phone}
                onChange={setPhone}
                isRequired
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Alternative Phone"
                placeholder="+1 555 014 7799"
                value={alternativePhone}
                onChange={setAlternativePhone}
              />
              <Input
                label="Website"
                placeholder="https://vendor.com"
                value={website}
                onChange={setWebsite}
              />
              <Input
                label="Tax ID / TIN"
                placeholder="TIN-9482011"
                value={taxId}
                onChange={setTaxId}
              />
            </div>

            <div className="space-y-2.5 rounded-2xl border border-separator-border bg-background-secondary-default/40 p-3.5">
              <p className="text-caption-1-semibold text-text-primary">
                Address
              </p>
              <Input
                label="Street"
                placeholder="420 Commerce Way"
                value={street}
                onChange={setStreet}
              />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input label="City" placeholder="Boston" value={city} onChange={setCity} />
                <Input label="State" placeholder="MA" value={state} onChange={setState} />
                <Input
                  label="Postal Code"
                  placeholder="02110"
                  value={postalCode}
                  onChange={setPostalCode}
                />
                <Input
                  label="Country"
                  placeholder="USA"
                  value={country}
                  onChange={setCountry}
                />
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-separator-border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-caption-1-semibold text-text-primary">
                    Additional Contacts
                  </p>
                  <p className="text-caption-1-regular text-text-tertiary">
                    Optional secondary representatives (dispatch, billing, escalation)
                  </p>
                </div>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  leadingIcon={RiAddLine}
                  onClick={handleAddContact}
                >
                  Add Contact
                </Button>
              </div>
              {contacts.length > 0 && (
                <div className="space-y-2">
                  {contacts.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-xl border border-separator-border bg-background-secondary-default/30 p-2.5"
                    >
                      <div className="sm:col-span-3">
                        <Input
                          label="Name"
                          placeholder="Contact name"
                          value={c.name}
                          onChange={(val) =>
                            setContacts((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, name: val } : row,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          label="Role"
                          placeholder="Logistics"
                          value={c.role || ''}
                          onChange={(val) =>
                            setContacts((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, role: val } : row,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          label="Email"
                          placeholder="name@vendor.com"
                          value={c.email || ''}
                          onChange={(val) =>
                            setContacts((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, email: val } : row,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          label="Phone"
                          placeholder="+1 555..."
                          value={c.phone || ''}
                          onChange={(val) =>
                            setContacts((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, phone: val } : row,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <IconButton
                          aria-label="Remove contact"
                          size="small"
                          icon={RiDeleteBinLine}
                          onClick={() =>
                            setContacts((prev) => prev.filter((_, i) => i !== idx))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Textarea
              label="Notes"
              placeholder="Lead time terms, delivery dock notes, or compliance references..."
              value={notes}
              onChange={setNotes}
            />

            <div className="flex items-center justify-between rounded-xl border border-separator-border bg-background-secondary-default/40 p-3">
              <div>
                <p className="text-body-2-medium font-semibold text-text-primary">
                  Active Supplier
                </p>
                <p className="text-caption-1-regular text-text-secondary">
                  Only active suppliers can be selected when creating purchase orders.
                </p>
              </div>
              <Switch
                isSelected={isActive}
                onChange={setIsActive}
                aria-label="Active supplier status"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="text-[#171B18]"
            >
              {submitting
                ? 'Saving...'
                : editingSupplier
                  ? 'Save Changes'
                  : 'Register Supplier'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
