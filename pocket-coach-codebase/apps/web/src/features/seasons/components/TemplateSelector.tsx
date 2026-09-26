import React from 'react';
import { Badge } from '../../../components/ui';
import type { SeasonTemplate } from '@pocket-coach/shared-types';
import { Sparkles, Calendar, MapPin, Users, Check } from 'lucide-react';

interface TemplateSelectorProps {
  templates: SeasonTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: SeasonTemplate | null) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Choose Schedule Template
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Default Junior Season Template */}
        {defaultTemplate && (
          <div
            onClick={() => onSelectTemplate(defaultTemplate)}
            className={`cursor-pointer relative p-4 rounded-2xl border transition-all duration-200 ${
              selectedTemplateId === defaultTemplate.id
                ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 dark:bg-emerald-950/40'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            {selectedTemplateId === defaultTemplate.id && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <Badge variant="gradient">
                <Sparkles className="w-3 h-3 text-emerald-400 mr-1" /> Default Template
              </Badge>
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {defaultTemplate.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {defaultTemplate.description}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" /> 5 Weekly Slots
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" /> 3 Hall Locations
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-500" /> 3 Player Groups
              </span>
            </div>
          </div>
        )}

        {/* Custom Blank Schedule Option */}
        <div
          onClick={() => onSelectTemplate(null)}
          className={`cursor-pointer relative p-4 rounded-2xl border transition-all duration-200 ${
            selectedTemplateId === null
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 dark:bg-emerald-950/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
          }`}
        >
          {selectedTemplateId === null && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
          )}

          <div className="mb-1">
            <Badge variant="neutral">Custom Setup</Badge>
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            Custom Blank Schedule
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build your training days, time slots, and hall locations from scratch.
          </p>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400">
            Configure custom slots manually
          </div>
        </div>
      </div>
    </div>
  );
};
