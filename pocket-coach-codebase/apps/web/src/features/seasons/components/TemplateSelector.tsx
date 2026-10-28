import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SeasonTemplate } from '@pocket-coach/shared-types';
import { Tag } from '../../../components/ui';

interface TemplateSelectorProps {
  templates: SeasonTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: SeasonTemplate | null) => void;
}

const card = (selected: boolean) =>
  `relative flex w-full cursor-pointer flex-col gap-1 border bg-transparent p-3.5 text-left text-text ${
    selected ? 'border-2 border-text bg-neutral-100' : 'border-divider hover:bg-neutral-100'
  }`;

/** The two ways to start a season: the default template, or an empty weekly schedule. */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const { t } = useTranslation();
  const template = templates.find((tpl) => tpl.is_default) || templates[0];
  const days = template?.template_data?.training_days ?? [];
  const hallCount = new Set(days.map((d) => d.location_name.toLowerCase())).size;
  const groupCount = template?.template_data?.player_groups?.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
        {t('seasonWizard.template.heading')}
      </span>
      <div
        role="radiogroup"
        aria-label={t('seasonWizard.template.group')}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {template && (
          <button
            type="button"
            role="radio"
            aria-checked={selectedTemplateId === template.id}
            onClick={() => onSelectTemplate(template)}
            className={card(selectedTemplateId === template.id)}
          >
            <span className="flex items-center justify-between gap-2">
              <Tag size="sm">{t('seasonWizard.template.defaultBadge')}</Tag>
              {selectedTemplateId === template.id && (
                <span aria-hidden="true" className="text-sm font-extrabold">
                  ✓
                </span>
              )}
            </span>
            <span className="font-heading text-base font-extrabold">{template.name}</span>
            {template.description && (
              <span className="text-xs text-neutral-700">{template.description}</span>
            )}
            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-divider pt-2 text-xs text-neutral-700">
              <span>{t('seasonWizard.template.slots', { count: days.length })}</span>
              <span>{t('seasonWizard.template.halls', { count: hallCount })}</span>
              <span>{t('seasonWizard.template.groups', { count: groupCount })}</span>
            </span>
          </button>
        )}

        <button
          type="button"
          role="radio"
          aria-checked={selectedTemplateId === null}
          onClick={() => onSelectTemplate(null)}
          className={card(selectedTemplateId === null)}
        >
          <span className="flex items-center justify-between gap-2">
            <Tag size="sm">{t('seasonWizard.template.customBadge')}</Tag>
            {selectedTemplateId === null && (
              <span aria-hidden="true" className="text-sm font-extrabold">
                ✓
              </span>
            )}
          </span>
          <span className="font-heading text-base font-extrabold">
            {t('seasonWizard.template.customTitle')}
          </span>
          <span className="text-xs text-neutral-700">{t('seasonWizard.template.customBody')}</span>
          <span className="mt-2 border-t border-divider pt-2 text-xs text-neutral-700">
            {t('seasonWizard.template.customHint')}
          </span>
        </button>
      </div>
    </div>
  );
};
