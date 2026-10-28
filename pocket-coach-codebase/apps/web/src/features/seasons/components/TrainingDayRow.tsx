import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '@pocket-coach/shared-types';
import { Button, Field, Input, Select } from '../../../components/ui';
import { weekdayLong } from '../../../lib/dates';

export interface SlotConfig {
  id: string;
  day_of_week: number;
  default_start_time: string;
  default_end_time: string;
  location_id: string | null;
  player_group_names: string[];
  required_regular: number;
  required_junior: number;
}

/** Default trainers needed for a weekday: Wednesday 2 regular, every other day 3; one 14/18 coach. */
export function defaultTargets(dayOfWeek: number): {
  required_regular: number;
  required_junior: number;
} {
  return { required_regular: dayOfWeek === 3 ? 2 : 3, required_junior: 1 };
}

interface TrainingDayRowProps {
  slot: SlotConfig;
  locations: Location[];
  availableGroups: string[];
  onChange: (updated: SlotConfig) => void;
  onRemove: () => void;
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const numberInput = 'w-16 font-mono';

/** One recurring weekday slot of the season: day, time, hall, staffing targets and groups. */
export const TrainingDayRow: React.FC<TrainingDayRowProps> = ({
  slot,
  locations,
  availableGroups,
  onChange,
  onRemove,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';

  const toggleGroup = (groupName: string) => {
    const exists = slot.player_group_names.includes(groupName);
    onChange({
      ...slot,
      player_group_names: exists
        ? slot.player_group_names.filter((g) => g !== groupName)
        : [...slot.player_group_names, groupName],
    });
  };

  const halls = locations.filter((loc) => loc.is_active || loc.id === slot.location_id);

  return (
    <div className="flex flex-col gap-3 border border-divider p-3.5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_96px_96px_1.4fr_auto] sm:items-end">
        <Field label={t('seasonWizard.row.weekday')} className="col-span-2 sm:col-span-1">
          <Select
            value={slot.day_of_week}
            onChange={(e) => onChange({ ...slot, day_of_week: parseInt(e.target.value, 10) })}
          >
            {WEEKDAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {weekdayLong(d, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('seasonWizard.row.start')}>
          <Input
            type="time"
            className="font-mono"
            value={slot.default_start_time.slice(0, 5)}
            onChange={(e) => onChange({ ...slot, default_start_time: `${e.target.value}:00` })}
          />
        </Field>
        <Field label={t('seasonWizard.row.end')}>
          <Input
            type="time"
            className="font-mono"
            value={slot.default_end_time.slice(0, 5)}
            onChange={(e) => onChange({ ...slot, default_end_time: `${e.target.value}:00` })}
          />
        </Field>
        <Field label={t('seasonWizard.row.hall')} className="col-span-2 sm:col-span-1">
          <Select
            value={slot.location_id || ''}
            onChange={(e) => onChange({ ...slot, location_id: e.target.value || null })}
          >
            <option value="">{t('seasonWizard.row.noHall')}</option>
            {halls.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.district_area ? ` (${loc.district_area})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="ghost" size="sm" className="col-span-2 sm:col-span-1" onClick={onRemove}>
          {t('seasonWizard.row.remove')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-divider pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
          {t('seasonWizard.row.needed')}
        </span>
        <label className="flex items-center gap-2 text-xs">
          {t('seasonWizard.row.regular')}
          <Input
            type="number"
            min={0}
            max={3}
            aria-label={t('seasonWizard.row.regularLabel')}
            className={numberInput}
            value={slot.required_regular}
            onChange={(e) =>
              onChange({
                ...slot,
                required_regular: Math.min(3, Math.max(0, parseInt(e.target.value, 10) || 0)),
              })
            }
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          {t('seasonWizard.row.junior')}
          <Input
            type="number"
            min={0}
            max={2}
            aria-label={t('seasonWizard.row.juniorLabel')}
            className={numberInput}
            value={slot.required_junior}
            onChange={(e) =>
              onChange({
                ...slot,
                required_junior: Math.min(2, Math.max(0, parseInt(e.target.value, 10) || 0)),
              })
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
          {t('seasonWizard.row.groups')}
        </span>
        {availableGroups.map((groupName) => {
          const selected = slot.player_group_names.includes(groupName);
          return (
            <button
              key={groupName}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleGroup(groupName)}
              className={`cursor-pointer border border-text px-2.5 py-1 text-xs font-semibold ${
                selected ? 'bg-text text-bg' : 'bg-transparent text-text hover:bg-text/7'
              }`}
            >
              {selected ? '✓ ' : '+ '}
              {groupName}
            </button>
          );
        })}
      </div>
    </div>
  );
};
