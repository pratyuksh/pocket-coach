import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SeasonTemplate } from '@pocket-coach/shared-types';
import { Button, CheckRow, Dialog, Field, Input } from '../../../components/ui';
import { formatTimeRange, weekdayLong } from '../../../lib/dates';
import { AuthError } from '../../auth/AuthLayout';
import { useLocations } from '../../locations/hooks/useLocations';
import { useSeasons } from '../hooks/useSeasons';
import { TemplateSelector } from './TemplateSelector';
import { TrainingDayRow, SlotConfig, defaultTargets } from './TrainingDayRow';

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
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedTemplateIdRef = React.useRef<string | null>(null);
  // The user chose the blank schedule on purpose, so the default template must not come back
  const [customChosen, setCustomChosen] = useState(false);

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate && !customChosen) {
      const def = templates.find((t) => t.is_default) || templates[0];
      setSelectedTemplate(def);
    }
  }, [templates, selectedTemplate, customChosen]);

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
              required_regular:
                td.required_regular ?? defaultTargets(td.day_of_week).required_regular,
              required_junior: td.required_junior ?? defaultTargets(td.day_of_week).required_junior,
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

  const handleSelectTemplate = (template: SeasonTemplate | null) => {
    setCustomChosen(template === null);
    setSelectedTemplate(template);
    if (template === null) {
      // A blank schedule starts without slots; choosing a template again fills them in
      setSlots([]);
      setGroups(DEFAULT_JUNIOR_GROUPS);
      loadedTemplateIdRef.current = null;
    }
  };

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
        ...defaultTargets(2),
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
          required_regular: s.required_regular,
          required_junior: s.required_junior,
        })),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : t('seasonWizard.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeHalls = locations.filter((l) => l.is_active);
  const steps = [
    t('seasonWizard.steps.dates'),
    t('seasonWizard.steps.schedule'),
    t('seasonWizard.steps.review'),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('seasonWizard.title')}
      closeLabel={t('actions.close')}
      maxWidth="xl"
    >
      <div className="flex flex-col gap-5">
        <ol
          aria-label={t('seasonWizard.steps.label')}
          className="flex items-center gap-2 border-b-2 border-divider pb-3"
        >
          {steps.map((label, index) => {
            const number = index + 1;
            const current = step === number;
            const done = step > number;
            return (
              <li
                key={label}
                aria-current={current ? 'step' : undefined}
                className="flex min-w-0 items-center gap-2"
              >
                {index > 0 && <span aria-hidden="true" className="h-0.5 w-5 bg-divider sm:w-8" />}
                <span
                  aria-hidden="true"
                  className={`grid size-6 flex-none place-items-center text-xs font-extrabold ${
                    current
                      ? 'bg-text text-bg'
                      : done
                        ? 'border border-text text-text'
                        : 'border border-divider text-neutral-700'
                  }`}
                >
                  {done ? '✓' : number}
                </span>
                <span
                  className={`truncate text-xs font-semibold ${
                    current ? 'text-text' : 'text-neutral-700'
                  } ${current ? '' : 'hidden sm:inline'}`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {error && <AuthError message={error} />}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('seasonWizard.name')} className="sm:col-span-2">
                <Input
                  required
                  value={seasonName}
                  placeholder={t('seasonWizard.namePlaceholder')}
                  onChange={(e) => setSeasonName(e.target.value)}
                />
              </Field>
              <Field label={t('seasonWizard.start')}>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label={t('seasonWizard.end')}>
                <Input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>
            <CheckRow
              label={t('seasonWizard.active')}
              description={t('seasonWizard.activeHint')}
              checked={isActive}
              onChange={setIsActive}
            />

            <TemplateSelector
              templates={templates}
              selectedTemplateId={selectedTemplate?.id || null}
              onSelectTemplate={handleSelectTemplate}
            />

            <div className="flex justify-end border-t border-divider pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!seasonName.trim() || !startDate || !endDate}
              >
                {t('seasonWizard.next1')} →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-extrabold">
                  {t('seasonWizard.slotsHeading', { count: slots.length })}
                </h3>
                <p className="text-xs text-neutral-700">{t('seasonWizard.slotsIntro')}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleAddSlot}>
                + {t('seasonWizard.addSlot')}
              </Button>
            </div>

            {activeHalls.length === 0 && (
              <p className="border-l-2 border-accent bg-accent-100 px-3 py-2 text-sm">
                {t('seasonWizard.noHalls')}
              </p>
            )}

            <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto">
              {slots.length === 0 ? (
                <p className="border border-dashed border-divider py-8 text-center text-sm text-neutral-700">
                  {t('seasonWizard.noSlots')}
                </p>
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

            <div className="flex items-center justify-between border-t border-divider pt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← {t('seasonWizard.back')}
              </Button>
              <Button onClick={() => setStep(3)} disabled={slots.length === 0}>
                {t('seasonWizard.next2')} →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 border-y-2 border-divider py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-700">
                {t('seasonWizard.ready')}
              </span>
              <h3 className="font-heading text-[22px] font-extrabold">{seasonName}</h3>
              <span className="text-[12.5px] text-neutral-700">
                {startDate} – {endDate}
              </span>
              <dl className="mt-2 grid grid-cols-3 border-t border-divider">
                {[
                  [t('seasonWizard.figSlots'), String(slots.length)],
                  [t('seasonWizard.figHalls'), String(activeHalls.length)],
                  [t('seasonWizard.figSessions'), `~${estimatedSessionCount}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col border-l border-divider px-3 py-2 first:border-l-0 first:pl-0"
                  >
                    <dt className="text-xs text-neutral-700">{label}</dt>
                    <dd className="font-heading text-2xl font-extrabold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
                {t('seasonWizard.summary')}
              </h4>
              <ul>
                {slots.map((s) => {
                  const loc = locations.find((l) => l.id === s.location_id);
                  return (
                    <li
                      key={s.id}
                      data-testid="slot-summary"
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-divider py-2.5 text-sm"
                    >
                      <span className="flex items-baseline gap-2 font-semibold">
                        {weekdayLong(s.day_of_week, language)}
                        <span className="text-xs font-normal tabular-nums text-neutral-700">
                          {formatTimeRange(s.default_start_time, s.default_end_time)}
                        </span>
                      </span>
                      <span className="text-xs text-neutral-700">
                        {[
                          loc?.name,
                          s.player_group_names.join(', '),
                          t('seasonWizard.needed', {
                            regular: s.required_regular,
                            junior: s.required_junior,
                          }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex items-center justify-between border-t border-divider pt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← {t('seasonWizard.back')}
              </Button>
              <Button onClick={handleSubmit} isLoading={submitting}>
                {t('seasonWizard.confirm', { count: estimatedSessionCount })}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
