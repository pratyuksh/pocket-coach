import React from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from '../../components/ui';
import { formatDayMonth, timeAgo } from '../../lib/dates';
import { useRecentlyFilled } from './hooks/useRecentlyFilled';

/**
 * "Recently filled": who covered for whom and how long ago. Filled requests exist from Sub-Phase
 * 1.5 on; until then the list says that nothing has been filled yet.
 */
export const RecentlyFilledSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { filled } = useRecentlyFilled(true);

  return (
    <Section title={t('dashboard.recentlyFilled')}>
      {filled.length === 0 ? (
        <p className="text-sm text-neutral-700">{t('dashboard.recentlyFilledEmpty')}</p>
      ) : (
        <ul className="-mt-1 flex flex-col">
          {filled.map((item) => (
            <li
              key={item.id}
              data-testid="filled-row"
              className="flex justify-between gap-3 border-b border-divider py-2.5 text-[13.5px]"
            >
              <span>
                {t('dashboard.covered', {
                  who: item.volunteer,
                  for: item.original,
                  date: formatDayMonth(item.sessionDate, language),
                })}
              </span>
              <span className="whitespace-nowrap text-xs text-neutral-700">
                {timeAgo(item.filledAt, language)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};
