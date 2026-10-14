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
    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 transition-all hover:border-slate-300">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Day of Week */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Weekday</label>
          <select
            value={slot.day_of_week}
            onChange={(e) => onChange({ ...slot, day_of_week: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" /> Start
            </label>
            <input
              type="time"
              value={slot.default_start_time.slice(0, 5)}
              onChange={(e) => onChange({ ...slot, default_start_time: `${e.target.value}:00` })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <span className="text-slate-400 mt-5">–</span>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">End</label>
            <input
              type="time"
              value={slot.default_end_time.slice(0, 5)}
              onChange={(e) => onChange({ ...slot, default_end_time: `${e.target.value}:00` })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Sports Hall Location */}
        <div className="sm:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-500" /> Sports Hall Location
          </label>
          <select
            value={slot.location_id || ''}
            onChange={(e) => onChange({ ...slot, location_id: e.target.value || null })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
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

      {/* Required trainers per track */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          <Users className="w-3 h-3 text-emerald-500" /> Trainers needed:
        </span>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Regular
          <input
            type="number"
            min={0}
            max={3}
            aria-label="Regular trainers needed"
            value={slot.required_regular}
            onChange={(e) =>
              onChange({
                ...slot,
                required_regular: Math.min(3, Math.max(0, parseInt(e.target.value, 10) || 0)),
              })
            }
            className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          14/18 coaches
          <input
            type="number"
            min={0}
            max={2}
            aria-label="14/18 coaches needed"
            value={slot.required_junior}
            onChange={(e) =>
              onChange({
                ...slot,
                required_junior: Math.min(2, Math.max(0, parseInt(e.target.value, 10) || 0)),
              })
            }
            className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </label>
      </div>

      {/* Attending Player Groups */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
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
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
