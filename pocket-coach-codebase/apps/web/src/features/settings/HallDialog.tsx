import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, Input, Textarea } from '../../components/ui';
import type { Location } from '@pocket-coach/shared-types';
import { AuthError } from '../auth/AuthLayout';

export interface HallFormValues {
  name: string;
  district_area: string;
  address: string;
  trainer_note: string;
}

interface Props {
  isOpen: boolean;
  /** The hall being edited, or null to add a new one. */
  hall: Location | null;
  onClose: () => void;
  onSave: (values: HallFormValues) => Promise<void>;
}

const EMPTY: HallFormValues = { name: '', district_area: '', address: '', trainer_note: '' };

export const HallDialog: React.FC<Props> = ({ isOpen, hall, onClose, onSave }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<HallFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setValues(
        hall
          ? {
              name: hall.name,
              district_area: hall.district_area ?? '',
              address: hall.address ?? '',
              trainer_note: hall.trainer_note ?? '',
            }
          : EMPTY,
      );
    }
  }, [isOpen, hall]);

  const set =
    (key: keyof HallFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch {
      setError(t('settings.errors.hall'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={hall ? t('settings.halls.editTitle') : t('settings.halls.addTitle')}
      closeLabel={t('actions.close')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <AuthError message={error} />}
        <Field label={t('settings.halls.name')}>
          <Input required value={values.name} onChange={set('name')} />
        </Field>
        <Field label={t('settings.halls.area')}>
          <Input value={values.district_area} onChange={set('district_area')} />
        </Field>
        <Field label={t('settings.halls.address')}>
          <Input autoComplete="street-address" value={values.address} onChange={set('address')} />
        </Field>
        <Field label={t('settings.halls.note')} hint={t('settings.halls.noteHint')}>
          <Textarea
            value={values.trainer_note}
            placeholder={t('settings.halls.notePlaceholder')}
            onChange={set('trainer_note')}
          />
        </Field>
        <div className="mt-1 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('settings.halls.cancel')}
          </Button>
          <Button type="submit" isLoading={saving}>
            {saving ? t('settings.halls.saving') : t('settings.halls.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
