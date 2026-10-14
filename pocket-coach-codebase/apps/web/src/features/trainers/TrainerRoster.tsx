import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isHeadTrainer } from '@pocket-coach/shared-types';
import type { Profile, UserRole } from '@pocket-coach/shared-types';
import { Button, SegmentedControl, Tag } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import { AuthError } from '../auth/AuthLayout';
import { InviteModal } from '../auth/InviteModal';
import { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { EMPTY_STATS, useTeamStats, type MemberStats } from './hooks/useTeamStats';
import { roleTagLabels, type TrainerWithRoles } from './roleTags';

type TeamFilter = 'everyone' | 'trainers' | 'heads' | 'juniors';

const matchesFilter = (member: TrainerWithRoles, filter: TeamFilter): boolean => {
  switch (filter) {
    case 'trainers':
      return !member.is_junior_coach;
    case 'heads':
      return isHeadTrainer(member.roles);
    case 'juniors':
      return member.is_junior_coach;
    default:
      return true;
  }
};

/**
 * Column layout of the roster for Head-trainers and above (from the design): name, then Trainer,
 * Assistant, 14/18, Completed and Upcoming. On a phone only the name and Completed remain.
 */
const STATS_COLUMNS =
  'grid grid-cols-[minmax(0,1fr)_84px] md:grid-cols-[minmax(0,1fr)_88px_88px_88px_88px_96px]';

const STAT_HEAD =
  'items-end justify-end self-stretch border-l border-divider pr-3.5 text-right text-[10px] tracking-[0.04em]';

const StatCell: React.FC<{
  value: number;
  label: string;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}> = ({ value, label, strong, muted, className = '' }) => (
  <span
    role="cell"
    aria-label={`${label}: ${value}`}
    className={`flex items-center justify-end self-stretch border-l border-divider pr-3.5 tabular-nums ${
      strong ? 'font-heading text-[17px] font-extrabold' : 'text-[15px] font-semibold'
    } ${value === 0 && !strong ? 'text-neutral-500' : muted ? 'text-neutral-700' : ''} ${className}`}
  >
    {value === 0 && !strong ? '–' : value}
  </span>
);

const SummaryStrip: React.FC<{
  members: TrainerWithRoles[];
  stats: Record<string, MemberStats>;
  language: string;
}> = ({ members, stats, language }) => {
  const { t } = useTranslation();
  const counts = members.map((m) => stats[m.id] ?? EMPTY_STATS);
  const completed = counts.reduce((sum, m) => sum + m.completed, 0);
  const upcoming = counts.reduce((sum, m) => sum + m.upcoming, 0);
  const substitute = counts.reduce((sum, m) => sum + m.asSubstitute, 0);
  const average = members.length > 0 ? completed / members.length : 0;
  const tiles = [
    { key: 'completed', value: String(completed) },
    { key: 'upcoming', value: String(upcoming) },
    { key: 'substitute', value: String(substitute) },
    {
      key: 'average',
      value: new Intl.NumberFormat(language.startsWith('de') ? 'de-CH' : 'en-GB', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(average),
    },
  ] as const;

  return (
    <dl
      aria-label={t('team.strip.label')}
      className="grid grid-cols-2 border-y-2 border-divider md:grid-cols-4"
    >
      {tiles.map((tile) => (
        <div key={tile.key} className="flex flex-col gap-0.5 border-l border-divider px-3.5 py-2.5">
          <dt className="text-xs text-neutral-700">{t(`team.strip.${tile.key}`)}</dt>
          <dd className="whitespace-nowrap font-heading text-[26px] font-extrabold leading-[1.1] tabular-nums">
            {tile.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * The team: who is on it, with their roles. Filters carry counts. A row opens the person's
 * profile (counts, sessions, roles). Head-trainers and above also see the session counts.
 */
export const TrainerRoster: React.FC = () => {
  const { t, i18n } = useTranslation();
  const permissions = usePermissions();
  // Head-trainers and above see the session counts (the database enforces this too)
  const showStats = permissions.isHeadTrainer;
  const { season } = useActiveSeason();
  const { stats, error: statsError } = useTeamStats(season?.id, showStats);
  const [members, setMembers] = useState<TrainerWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<TeamFilter>('everyone');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name', { ascending: true });
      if (profErr) throw profErr;

      const { data: rolesData, error: rolesErr } = await supabase.from('user_roles').select('*');
      if (rolesErr) throw rolesErr;

      const rolesByProfile = (rolesData || []).reduce(
        (acc: Record<string, UserRole[]>, row: { profile_id: string; role: string }) => {
          (acc[row.profile_id] ??= []).push(row.role as UserRole);
          return acc;
        },
        {},
      );

      setMembers(
        (profilesData || []).map((p: Profile) => ({
          ...p,
          roles: rolesByProfile[p.id] || ['trainer'],
        })),
      );
    } catch (err) {
      console.error('Error fetching roster:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const counts = useMemo(
    () => ({
      everyone: members.length,
      trainers: members.filter((m) => matchesFilter(m, 'trainers')).length,
      heads: members.filter((m) => matchesFilter(m, 'heads')).length,
      juniors: members.filter((m) => matchesFilter(m, 'juniors')).length,
    }),
    [members],
  );
  const visible = members.filter((m) => matchesFilter(m, filter));

  const filterOptions: ReadonlyArray<{ value: TeamFilter; label: string }> = (
    ['everyone', 'trainers', 'heads', 'juniors'] as const
  ).map((value) => ({
    value,
    label: `${t(`team.filters.${value}`)} (${counts[value]})`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel={t('team.filters.label')}
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
        {permissions.canInviteTrainers && (
          <Button onClick={() => setIsInviteOpen(true)}>+ {t('team.invite')}</Button>
        )}
      </div>

      {loadError && <AuthError message={t('team.loadError')} />}

      {showStats && (
        <>
          {statsError && <AuthError message={t('team.statsError')} />}
          <SummaryStrip members={members} stats={stats} language={i18n.resolvedLanguage ?? 'de'} />
          <p className="-mt-1.5 text-[12.5px] text-neutral-700">
            {t('team.countedNote', { season: season?.name ?? '' })}
          </p>
        </>
      )}

      <section
        aria-label={t('team.listLabel')}
        role={showStats ? 'table' : 'list'}
        className="border-t-2 border-divider"
      >
        {showStats && (
          <div
            role="row"
            className={`${STATS_COLUMNS} items-end border-b-2 border-text pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700`}
          >
            <span role="columnheader" className="self-end">
              {t('team.filters.trainers')}
            </span>
            {(['trainer', 'assistant', 'junior'] as const).map((key) => (
              <span key={key} role="columnheader" className={`${STAT_HEAD} hidden md:flex`}>
                {t(`team.columns.${key}`)}
              </span>
            ))}
            <span role="columnheader" className={`${STAT_HEAD} text-text`}>
              {t('team.columns.completed')}
            </span>
            <span role="columnheader" className={`${STAT_HEAD} hidden md:flex`}>
              {t('team.columns.upcoming')}
            </span>
          </div>
        )}

        {loading ? (
          <p role="status" className="py-4 text-sm text-neutral-700">
            {t('team.loading')}
          </p>
        ) : visible.length === 0 ? (
          <p className="py-4 text-sm text-neutral-700">
            {members.length === 0 ? t('team.empty') : t('team.noMatch')}
          </p>
        ) : (
          <div role={showStats ? 'rowgroup' : undefined}>
            {visible.map((member) => {
              const tags = roleTagLabels(member.roles, member.is_junior_coach, t);
              const elevated = member.roles.some((r) => r !== 'trainer');
              const memberStats = stats[member.id] ?? EMPTY_STATS;
              return (
                <div
                  key={member.id}
                  role={showStats ? 'row' : 'listitem'}
                  data-testid="team-member"
                  data-email={member.email}
                  className={`relative ${showStats ? STATS_COLUMNS : 'grid grid-cols-1'} min-h-14 items-stretch border-b border-divider hover:bg-neutral-100`}
                >
                  <div
                    role={showStats ? 'cell' : undefined}
                    className="flex min-w-0 flex-col justify-center gap-0.5 py-2.5 pr-3"
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      {/* The link's ::after covers the whole row, so the row opens the profile */}
                      <Link
                        to={`/trainers/${member.id}`}
                        className="text-sm font-semibold text-text no-underline after:absolute after:inset-0 hover:no-underline focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
                      >
                        {member.display_name}
                      </Link>
                      {tags.map((tag) => (
                        <Tag key={tag} className="!px-1.5 !py-px">
                          {tag}
                        </Tag>
                      ))}
                    </span>
                    {elevated && member.specialty && (
                      <Tag variant="accent" className="max-w-full self-start !px-1.5 !py-px">
                        <span className="truncate">{member.specialty}</span>
                      </Tag>
                    )}
                  </div>

                  {showStats && (
                    <>
                      <StatCell
                        value={memberStats.asTrainer}
                        label={t('team.columns.trainer')}
                        className="hidden md:flex"
                      />
                      <StatCell
                        value={memberStats.asAssistant}
                        label={t('team.columns.assistant')}
                        className="hidden md:flex"
                      />
                      <StatCell
                        value={memberStats.asJunior}
                        label={t('team.columns.junior')}
                        className="hidden md:flex"
                      />
                      <StatCell
                        value={memberStats.completed}
                        label={t('team.columns.completed')}
                        strong
                      />
                      <StatCell
                        value={memberStats.upcoming}
                        label={t('team.columns.upcoming')}
                        muted
                        className="hidden md:flex"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchRoster}
      />
    </div>
  );
};
