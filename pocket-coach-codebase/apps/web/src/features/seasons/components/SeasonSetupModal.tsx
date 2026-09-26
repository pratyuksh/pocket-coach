import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Badge } from '../../../components/ui';
import { useSeasons } from '../hooks/useSeasons';
import { useLocations } from '../../locations/hooks/useLocations';
import { TemplateSelector } from './TemplateSelector';
import { TrainingDayRow, SlotConfig } from './TrainingDayRow';
import { LocationManagerModal } from '../../locations/components/LocationManagerModal';
import type { SeasonTemplate } from '@pocket-coach/shared-types';
import {
  Sparkles,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';

interface SeasonSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_JUNIOR_GROUPS = [
  { name: 'Kids / Basic', description: 'Beginners & younger players', sort_order: 1 },
  { name: 'Advanced-1', description: 'Intermediate-level players', sort_order: 2 },
  { name: 'Advanced-2', description: 'Advanced players', sort_order: 3 },
];

export const SeasonSetupModal: React.FC<SeasonSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { templates, createSeason } = useSeasons();
  const { locations } = useLocations();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [seasonName, setSeasonName] = useState('Season 2026/2027');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2027-07-31');
  const [isActive, setIsActive] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<SeasonTemplate | null>(null);
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [groups, setGroups] = useState(DEFAULT_JUNIOR_GROUPS);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedTemplateIdRef = React.useRef<string | null>(null);

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const def = templates.find((t) => t.is_default) || templates[0];
      setSelectedTemplate(def);
    }
  }, [templates, selectedTemplate]);

  // Pre-fill slots from template when selected template changes (only once per template ID)
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.id !== loadedTemplateIdRef.current) {
      loadedTemplateIdRef.current = selectedTemplate.id;
      const data = selectedTemplate.template_data;
      if (data) {
        if (data.player_groups && data.player_groups.length > 0) {
          setGroups(data.player_groups);
        }

        if (data.training_days && data.training_days.length > 0) {
          const prefilledSlots: SlotConfig[] = data.training_days.map((td, index) => {
            const matchedLocation = locations.find(
              (l) => l.name.toLowerCase() === td.location_name.toLowerCase(),
            );
            return {
              id: `slot-${index}`,
              day_of_week: td.day_of_week,
              default_start_time: td.default_start_time,
              default_end_time: td.default_end_time,
              location_id: matchedLocation ? matchedLocation.id : locations[0]?.id || null,
              player_group_names: td.groups,
            };
          });
          setSlots(prefilledSlots);
        }
      }
    }
  }, [selectedTemplate, locations]);

  // Calculate estimated total sessions generated based on dates and configured weekday slots
  const estimatedSessionCount = useMemo(() => {
    if (!startDate || !endDate || slots.length === 0) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) return 0;

      const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      const fullWeeks = Math.floor(totalDays / 7);
      const remainderDays = totalDays % 7;

      let count = fullWeeks * slots.length;

      const startDow = start.getDay();
      for (let i = 0; i < remainderDays; i++) {
        const dow = (startDow + i) % 7;
        const matchingSlots = slots.filter((s) => s.day_of_week === dow);
        count += matchingSlots.length;
      }

      return count;
    } catch {
      return 0;
    }
  }, [startDate, endDate, slots]);

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-custom-${Date.now()}`,
        day_of_week: 2, // Tuesday
        default_start_time: '17:30:00',
        default_end_time: '19:00:00',
        location_id: locations[0]?.id || null,
        player_group_names: groups.map((g) => g.name),
      },
    ]);
  };

  const handleUpdateSlot = (id: string, updated: SlotConfig) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const handleRemoveSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      await createSeason({
        name: seasonName.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        player_groups: groups,
        slots: slots.map((s) => ({
          day_of_week: s.day_of_week,
          default_start_time: s.default_start_time,
          default_end_time: s.default_end_time,
          location_id: s.location_id,
          player_group_names: s.player_group_names,
        })),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create season');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Create New Season" maxWidth="xl">
        <div className="space-y-6">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                1
              </span>
              <span
                className={`text-xs font-semibold ${step === 1 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                Dates & Template
              </span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : step > 2
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                2
              </span>
              <span
                className={`text-xs font-semibold ${step === 2 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                Schedule & Halls
              </span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 3
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                3
              </span>
              <span
                className={`text-xs font-semibold ${step === 3 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                Generate
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Basic Info & Template */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Season Name *
                  </label>
                  <input
                    type="text"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g. Season 2026/2027"
                    required
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Set as Active Season
                    </span>
                  </label>
                </div>
              </div>

              <TemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplate?.id || null}
                onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
              />

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  disabled={!seasonName.trim() || !startDate || !endDate}
                >
                  Next: Configure Schedule <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Slots & Halls */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                    Weekly Training Slots ({slots.length})
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure time, sports hall location, and attending groups for each recurring
                    weekday slot.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocationModalOpen(true)}>
                    <Building2 className="w-4 h-4 mr-1 text-emerald-500" /> Manage Halls
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleAddSlot}>
                    <Plus className="w-4 h-4 mr-1" /> Add Slot
                  </Button>
                </div>
              </div>

              {/* Slot Rows */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {slots.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                    No weekly training slots configured. Click "Add Slot" to add one.
                  </div>
                ) : (
                  slots.map((slot) => (
                    <TrainingDayRow
                      key={slot.id}
                      slot={slot}
                      locations={locations}
                      availableGroups={groups.map((g) => g.name)}
                      onChange={(updated) => handleUpdateSlot(slot.id, updated)}
                      onRemove={() => handleRemoveSlot(slot.id)}
                    />
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button variant="primary" onClick={() => setStep(3)} disabled={slots.length === 0}>
                  Next: Review & Confirm <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="gradient">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 mr-1" /> Ready for Generation
                  </Badge>
                  <span className="text-xs font-medium text-emerald-200">
                    {startDate} to {endDate}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white">{seasonName}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                    <div className="text-xs text-emerald-200">Weekly Slots</div>
                    <div className="text-lg font-bold text-white">{slots.length} Slots</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                    <div className="text-xs text-emerald-200">Hall Locations</div>
                    <div className="text-lg font-bold text-white">{locations.length} Halls</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                    <div className="text-xs text-emerald-200">Estimated Sessions</div>
                    <div className="text-lg font-bold text-emerald-300">
                      ~{estimatedSessionCount} Sessions
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Configured Schedule Summary
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {slots.map((s) => {
                    const loc = locations.find((l) => l.id === s.location_id);
                    const dayNames = [
                      'Sunday',
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                    ];
                    return (
                      <div
                        key={s.id}
                        className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{dayNames[s.day_of_week]}</span>
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                            {s.default_start_time.slice(0, 5)} - {s.default_end_time.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {loc && (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              📍 {loc.name}
                            </span>
                          )}
                          <span className="text-slate-400">|</span>
                          <span>{s.player_group_names.join(', ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm & Generate{' '}
                  {estimatedSessionCount} Sessions
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Hall Locations Manager Dialog */}
      <LocationManagerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
      />
    </>
  );
};
