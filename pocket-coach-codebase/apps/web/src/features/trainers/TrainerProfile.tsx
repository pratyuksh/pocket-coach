import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Section, Tag } from '../../components/ui';
import { usePageTitle } from '../../components/layout/pageTitle';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate, formatDayMonth, zurichToday } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import { AuthError } from '../auth/AuthLayout';
import { useLocations } from '../locations/hooks/useLocations';
import { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { usePersonSessions, type LoggedSession } from './hooks/usePersonSessions';
import { usePersonStats } from './hooks/useTeamStats';
import { useTrainerProfile } from './hooks/useTrainerProfile';
import { RoleManagerModal } from './RoleManagerModal';
import { initialsOf, roleTagLabels } from './roleTags';

const LOG_PREVIEW = 8;

/**
 * One person: counts for the current season, upcoming sessions, the session log, details and,
 * for Super-admins, role and removal actions. Counts and the log are shown to Head-trainers and
 * above for anyone and to a trainer for themselves only (the database enforces this too).
 */
export const TrainerProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { profile, roles, loading, notFound, error, refetch } = useTrainerProfile(profileId);
  const { season } = useActiveSeason();
  const { locations } = useLocations();

  const isMe = !!profile && profile.id === user?.id;
  const canSee = permissions.isHeadTrainer || isMe;
  const {
    stats,
    error: statsError,
    refetch: refetchStats,
  } = usePersonStats(season?.id, profile?.id, canSee);
  const { upcoming, log, error: sessionsError } = usePersonSessions(profile?.id, canSee);

  const [showAllLog, setShowAllLog] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  usePageTitle(profile?.display_name);

  const hallName = useMemo(() => {
    const byId = new Map(locations.map((l) => [l.id, l.name]));
    return (id: string | null) => (id ? (byId.get(id) ?? '') : '');
  }, [locations]);

  const back = (
    <Link
      to="/trainers"
      className="self-start text-sm font-extrabold text-accent no-underline hover:underline"
    >
      {t('profile.back')}
    </Link>
  );

  if (loading) {
    return (
      <p role="status" className="text-sm text-neutral-700">
        {t('team.loading')}
      </p>
    );
  }

  if (error || notFound || !profile) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <AuthError message={notFound ? t('profile.notFound') : t('profile.loadError')} />
      </div>
    );
  }

  const tags = roleTagLabels(roles, profile.is_junior_coach, t);
  const elevated = roles.some((r) => r !== 'trainer');
  const canRemove = permissions.canRemoveTrainers && !isMe;

  const roleLabel = (entry: LoggedSession) =>
    entry.track === 'junior_coach'
      ? t('profile.stats.junior')
      : entry.sessionRole === 'assistant_coach'
        ? t('profile.stats.assistant')
        : t('profile.stats.trainer');

  const logShown = showAllLog ? log : log.slice(0, LOG_PREVIEW);
  const tiles = [
    { key: 'trainer', value: stats.asTrainer },
    { key: 'assistant', value: stats.asAssistant },
    { key: 'junior', value: stats.asJunior },
    { key: 'completed', value: stats.completed, highlight: true },
    { key: 'upcoming', value: stats.upcoming, muted: true },
  ] as const;

  const handleRemove = async () => {
    setRemoving(true);
    setRemoveError(null);
    try {
      const { error: rolesDeleteErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('profile_id', profile.id);
      if (rolesDeleteErr) throw rolesDeleteErr;

      // Deactivate the profile (soft delete)
      const { error: deactivateErr } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', profile.id);
      if (deactivateErr) throw deactivateErr;

      navigate('/trainers');
    } catch (err) {
      console.error('Error deactivating account:', err);
      setRemoveError(t('team.deactivateFailed'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {back}

      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-14 flex-none place-items-center bg-text font-heading text-lg font-extrabold text-bg"
        >
          {initialsOf(profile.display_name)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-heading text-2xl font-extrabold leading-[1.1]">
            {profile.display_name}
          </span>
          {tags.length > 0 && (
            <span data-testid="profile-tags" className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-9">
        <div className="flex min-w-0 flex-col gap-5">
          {canSee && (
            <section className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
                  {t('profile.completedHeading', { season: season?.name ?? '' })}
                </h2>
                <span className="text-xs text-neutral-700">
                  {t('profile.asOf', { date: formatDayMonth(zurichToday(), language) })}
                </span>
              </div>
              {statsError && <AuthError message={t('team.statsError')} />}
              <dl className="grid grid-cols-3 border-y-2 border-divider sm:grid-cols-5">
                {tiles.map((tile) => (
                  <div
                    key={tile.key}
                    className={`flex flex-col border-l border-divider py-2.5 pl-2.5 pb-3 ${
                      'highlight' in tile ? 'bg-neutral-100' : ''
                    }`}
                  >
                    <dt className="order-2 text-[11.5px] text-neutral-700">
                      {t(`profile.stats.${tile.key}`)}
                    </dt>
                    <dd
                      className={`order-1 font-heading text-[26px] font-extrabold tabular-nums ${
                        'muted' in tile ? 'text-neutral-700' : ''
                      }`}
                    >
                      {tile.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <Section title={t('profile.upcomingHeading')}>
            {sessionsError && <AuthError message={t('profile.loadError')} />}
            {upcoming.length === 0 ? (
              <p className="text-sm text-neutral-700">{t('profile.noUpcoming')}</p>
            ) : (
              <ul>
                {upcoming.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[96px_minmax(0,1fr)_auto] gap-2.5 border-b border-divider py-2.5 text-sm"
                  >
                    <span className="font-semibold">{formatDayMonth(entry.date, language)}</span>
                    <span className="truncate">{hallName(entry.locationId)}</span>
                    <span className="text-[13px] text-neutral-700 tabular-nums">
                      {entry.startTime.slice(0, 5)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {canSee && (
            <Section
              title={t('profile.log.title')}
              action={
                <span className="text-xs text-neutral-700">
                  {t('profile.log.count', { count: log.length })}
                </span>
              }
            >
              {log.length === 0 ? (
                <p className="text-sm text-neutral-700">{t('profile.log.empty')}</p>
              ) : (
                <ul>
                  {logShown.map((entry, index) => (
                    <li
                      key={entry.assignmentId}
                      className="grid grid-cols-[28px_96px_minmax(0,1fr)_auto] items-baseline gap-2.5 border-b border-divider py-2 text-[13.5px]"
                    >
                      <span
                        className="text-[11.5px] tabular-nums text-neutral-600"
                        aria-label={t('profile.log.number', { n: log.length - index })}
                      >
                        {log.length - index}
                      </span>
                      <span className="font-semibold">{formatDate(entry.date, language)}</span>
                      <span className="truncate">
                        {hallName(entry.locationId)} · {entry.startTime.slice(0, 5)}
                      </span>
                      <span className="flex gap-1">
                        <Tag className="!px-1.5 !py-0">{roleLabel(entry)}</Tag>
                        {entry.isSubstitute && (
                          <Tag variant="outline" className="!px-1.5 !py-0">
                            {t('profile.log.substitute')}
                          </Tag>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {log.length > LOG_PREVIEW && (
                <Button
                  variant="ghost"
                  className="self-start !px-0"
                  onClick={() => setShowAllLog((all) => !all)}
                >
                  {showAllLog
                    ? t('profile.log.showLess')
                    : t('profile.log.showAll', { count: log.length })}
                </Button>
              )}
            </Section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-3 border-t-2 border-divider pt-3 text-sm">
            {elevated && (
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
                  {t('profile.speciality')}
                </h2>
                <p>{profile.specialty || '—'}</p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
                {t('profile.email')}
              </h2>
              <p className="break-all">{profile.email}</p>
            </div>
          </section>

          {(permissions.canManageRoles || canRemove) && (
            <section className="flex flex-col items-start gap-2 border-t-2 border-divider pt-3">
              {permissions.canManageRoles && (
                <Button variant="secondary" size="lg" onClick={() => setRolesOpen(true)}>
                  {t('profile.editRoles')}
                </Button>
              )}
              {canRemove && (
                <Button
                  variant="ghost"
                  className="!px-0"
                  onClick={() => {
                    setRemoveError(null);
                    setRemoveOpen(true);
                  }}
                >
                  {t('profile.deactivate')}
                </Button>
              )}
            </section>
          )}
        </div>
      </div>

      <RoleManagerModal
        isOpen={rolesOpen}
        onClose={() => setRolesOpen(false)}
        trainer={profile}
        onSuccess={() => {
          void refetch();
          void refetchStats();
        }}
      />

      <Dialog
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={t('team.deactivateTitle')}
        closeLabel={t('actions.close')}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t('team.deactivateBody', { name: profile.display_name || profile.email })}
          </p>
          {removeError && <AuthError message={removeError} />}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoveOpen(false)} disabled={removing}>
              {t('team.cancel')}
            </Button>
            <Button onClick={handleRemove} isLoading={removing}>
              {removing ? t('team.deactivating') : t('team.deactivateConfirm')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
