import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '@pocket-coach/shared-types';
import { Button, Tag } from '../../components/ui';
import { useLocations } from '../locations/hooks/useLocations';
import { HallDialog, type HallFormValues } from './HallDialog';
import { Section } from '../../components/ui';

interface Props {
  onNotice: (message: string) => void;
}

const mapUrl = (hall: Location) =>
  `https://maps.google.com/?q=${encodeURIComponent(`${hall.name}, ${hall.address ?? ''}`)}`;

/** Head-trainer and above: halls with address and the note trainers see on every session. */
export const HallsSection: React.FC<Props> = ({ onNotice }) => {
  const { t } = useTranslation();
  const { locations, loading, addLocation, updateLocation } = useLocations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  const open = (hall: Location | null) => {
    setEditing(hall);
    setDialogOpen(true);
  };

  const handleToggleActive = async (hall: Location) => {
    await updateLocation(hall.id, { is_active: !hall.is_active });
    onNotice(
      t(hall.is_active ? 'settings.notices.hallDeactivated' : 'settings.notices.hallActivated'),
    );
  };

  const handleSave = async (values: HallFormValues) => {
    if (editing) {
      await updateLocation(editing.id, {
        name: values.name.trim(),
        district_area: values.district_area.trim() || null,
        address: values.address.trim() || null,
        trainer_note: values.trainer_note.trim() || null,
      });
    } else {
      await addLocation(values.name, values.district_area, {
        address: values.address,
        trainer_note: values.trainer_note,
      });
    }
    onNotice(t('settings.notices.hallSaved'));
  };

  return (
    <Section
      title={t('settings.halls.title')}
      action={
        <Button variant="ghost" className="!px-0" onClick={() => open(null)}>
          + {t('settings.halls.add')}
        </Button>
      }
    >
      {!loading && locations.length === 0 && (
        <p className="text-sm text-neutral-700">{t('settings.halls.none')}</p>
      )}
      <ul>
        {locations.map((hall) => (
          <li
            key={hall.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 border-b border-divider py-2.5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-x-2 text-[13.5px] font-semibold">
                <span>
                  {hall.name}
                  {hall.district_area && (
                    <span className="font-normal text-neutral-700"> · {hall.district_area}</span>
                  )}
                </span>
                {!hall.is_active && <Tag size="sm">{t('settings.halls.inactive')}</Tag>}
              </span>
              {hall.address ? (
                <a
                  href={mapUrl(hall)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('settings.halls.mapLink', { name: hall.name })}
                  className="text-[12.5px]"
                >
                  {hall.address} ↗
                </a>
              ) : (
                <span className="text-[12.5px] text-neutral-700">
                  {t('settings.halls.noAddress')}
                </span>
              )}
              {hall.trainer_note && (
                <span className="text-xs text-neutral-700">{hall.trainer_note}</span>
              )}
            </div>
            <div className="flex items-start">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('settings.halls.editLabel', { name: hall.name })}
                onClick={() => open(hall)}
              >
                {t('settings.halls.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t(
                  hall.is_active
                    ? 'settings.halls.deactivateLabel'
                    : 'settings.halls.activateLabel',
                  { name: hall.name },
                )}
                onClick={() => void handleToggleActive(hall)}
              >
                {t(hall.is_active ? 'settings.halls.deactivate' : 'settings.halls.activate')}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <HallDialog
        isOpen={dialogOpen}
        hall={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </Section>
  );
};
