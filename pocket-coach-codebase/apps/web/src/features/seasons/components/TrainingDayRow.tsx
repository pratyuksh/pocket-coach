import React from 'react';
import type { Location } from '@pocket-coach/shared-types';
import { Trash2, MapPin, Clock, Users } from 'lucide-react';

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface SlotConfig {
  id: string;
  day_of_week: number;
  default_start_time: string;
  default_end_time: string;
  location_id: string | null;
  player_group_names: string[];
}

interface TrainingDayRowProps {
  slot: SlotConfig;
  locations: Location[];
  availableGroups: string[];
  onChange: (updated: SlotConfig) => void;
  onRemove: () => void;
}

export const TrainingDayRow: React.FC<TrainingDayRowProps> = ({
  slot,
  locations,
  availableGroups,
  onChange,
  onRemove,
}) => {
  const handleGroupToggle = (groupName: string) => {
    const exists = slot.player_group_names.includes(groupName);
    const updatedGroups = exists
      ? slot.player_group_names.filter((g) => g !== groupName)
      : [...slot.player_group_names, groupName];
    onChange({ ...slot, player_group_names: updatedGroups });
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Day of Week */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Weekday
          </label>
          <select
            value={slot.day_of_week}
            onChange={(e) => onChange({ ...slot, day_of_week: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range */}
        <div className="sm:col-span-4 flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" /> Start
            </label>
            <input
              type="time"
              value={slot.default_start_time.slice(0, 5)}
              onChange={(e) => onChange({ ...slot, default_start_time: `${e.target.value}:00` })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <span className="text-slate-400 mt-5">–</span>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End
            </label>
            <input
              type="time"
              value={slot.default_end_time.slice(0, 5)}
              onChange={(e) => onChange({ ...slot, default_end_time: `${e.target.value}:00` })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Sports Hall Location */}
        <div className="sm:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-500" /> Sports Hall Location
          </label>
          <select
            value={slot.location_id || ''}
            onChange={(e) => onChange({ ...slot, location_id: e.target.value || null })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">-- No Location Assigned --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.district_area ? `(${loc.district_area})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Delete Slot Action */}
        <div className="sm:col-span-1 flex justify-end sm:mt-5">
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
            title="Remove Slot"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attending Player Groups */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Users className="w-3 h-3 text-emerald-500" /> Groups:
        </span>
        {availableGroups.map((groupName) => {
          const isSelected = slot.player_group_names.includes(groupName);
          return (
            <button
              key={groupName}
              type="button"
              onClick={() => handleGroupToggle(groupName)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isSelected ? '✓ ' : '+ '}
              {groupName}
            </button>
          );
        })}
      </div>
    </div>
  );
};
