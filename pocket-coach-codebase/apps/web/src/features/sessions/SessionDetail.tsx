import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AssignmentTrack, EnrichedSessionAssignment } from '@pocket-coach/shared-types';
import { Button, Dialog, Notice, Section, Tag } from '../../components/ui';
import { usePageTitle } from '../../components/layout/pageTitle';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDayMonth, formatTimeRange } from '../../lib/dates';
import { AuthError } from '../auth/AuthLayout';
import { initialsOf } from '../trainers/roleTags';
import { currentRows, OpenSlotDialog } from './components/OpenSlotDialog';
import { SessionOverrideModal } from './components/SessionOverrideModal';
import { MAX_REQUIRED, sessionCoverage } from './coverage';
import { useAssignTrainer } from './hooks/useAssignTrainer';
import { useSession } from './hooks/useSession';

const mapUrl = (name: string, address: string) =>
  `https://maps.google.com/?q=${encodeURIComponent(`${name}, ${address}`)}`;

interface SlotProps {
  assignment?: EnrichedSessionAssignment;
  me: string | undefined;
  /** Head-trainers and above: an open slot opens the list of available people */
  onAssign?: () => void;
  /** Head-trainers and above: take a person off the session */
  onRemove?: () => void;
  /** Head-trainers and above: this session does not need the slot, so it is taken away */
  onReduce?: () => void;
}

/** One position on a track: a person, a person who is out, or an open slot. */
const Slot: React.FC<SlotProps> = ({ assignment, me, onAssign, onRemove, onReduce }) => {
  const { t } = useTranslation();

  if (!assignment) {
    const content = (
      <>
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center border-[1.5px] border-dashed border-accent font-heading text-xs font-extrabold text-accent"
        >
          +
        </span>
        <span className="text-sm font-semibold text-accent-700">
          {t('sessions.detail.openSlot')}
        </span>
        {onAssign && (
          <span aria-hidden="true" className="text-[13px] font-extrabold text-accent">
            {t('sessions.detail.assignAction')}
          </span>
        )}
      </>
    );
    const grid = 'grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5';
    return (
      <li
        data-testid="slot-open"
        className={`border-b border-divider ${onReduce ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2' : ''}`}
      >
        {onAssign ? (
          <button
            type="button"
            aria-label={`${t('sessions.detail.openSlot')}: ${t('sessions.detail.assignSlot')}`}
            onClick={onAssign}
            className={`${grid} w-full cursor-pointer bg-transparent text-left hover:bg-neutral-100`}
          >
            {content}
          </button>
        ) : (
          <div className={grid}>{content}</div>
        )}
        {onReduce && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('sessions.detail.removeSlotLabel')}
            onClick={onReduce}
          >
            {t('sessions.detail.removeSlot')}
          </Button>
        )}
      </li>
    );
  }

  const name = assignment.profile?.display_name ?? '';
  const isMe = !!me && assignment.profile_id === me;
  const out = assignment.status === 'absent_pending_sub';
  const role =
    assignment.track === 'junior_coach'
      ? t('sessions.detail.roleJunior')
      : assignment.session_role === 'assistant_coach'
        ? t('sessions.detail.roleAssistant')
        : t('sessions.detail.roleTrainer');

  return (
    <li
      data-testid={out ? 'slot-out' : 'slot-person'}
      className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-divider py-2.5"
    >
      <span
        aria-hidden="true"
        className={`grid size-8 place-items-center font-heading text-xs font-extrabold ${
          out
            ? 'border-[1.5px] border-neutral-400 text-neutral-600'
            : isMe
              ? 'bg-accent text-bg'
              : 'bg-text text-bg'
        }`}
      >
        {initialsOf(name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={`text-sm font-semibold ${out ? 'text-neutral-600' : ''}`}>{name}</span>
        <span className="text-xs text-neutral-700">{out ? t('sessions.detail.out') : role}</span>
      </span>
      <span className="flex items-center gap-1.5">
        {!out && isMe && <Tag>{t('sessions.detail.you')}</Tag>}
        {!out && assignment.is_substitute && <Tag>{t('sessions.detail.substitute')}</Tag>}
        {!out &&
          assignment.session_role === 'assistant_coach' &&
          assignment.track === 'regular' && <Tag>{t('sessions.detail.assistant')}</Tag>}
        {!out && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('sessions.detail.removeLabel', { name })}
            onClick={onRemove}
          >
            {t('sessions.detail.remove')}
          </Button>
        )}
      </span>
    </li>
  );
};

const byPrimaryFirst = (a: EnrichedSessionAssignment, b: EnrichedSessionAssignment) =>
  Number(b.session_role === 'primary') - Number(a.session_role === 'primary') ||
  a.assigned_at.localeCompare(b.assigned_at);

/**
 * One session: time, hall with address and note, groups, and per track who is on it and which
 * slots are open. Head-trainers and above assign trainers, change the time or hall, or delete
 * the session. Volunteering and "Can't make it" arrive with Sub-Phase 1.5.
 */
export const SessionDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isHeadTrainer } = usePermissions();
  const {
    session,
    loading,
    notFound,
    error,
    refetch,
    updateOverride,
    updateRequirements,
    deleteSession,
  } = useSession(sessionId);
  const [slotTrack, setSlotTrack] = useState<AssignmentTrack | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const closeNotice = useCallback(() => setNotice(null), []);
  const { saveAssignments } = useAssignTrainer();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  usePageTitle(session ? formatDayMonth(session.session_date, language) : undefined);

  const back = (
    <Link
      to="/sessions"
      className="self-start text-sm font-extrabold text-accent no-underline hover:underline"
    >
      {t('profile.back')}
    </Link>
  );

  if (loading) {
    return (
      <p role="status" className="text-sm text-neutral-700">
        {t('sessions.loading')}
      </p>
    );
  }

  if (error || notFound || !session) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <AuthError
          message={notFound ? t('sessions.detail.notFound') : t('sessions.detail.loadError')}
        />
      </div>
    );
  }

  const coverage = sessionCoverage(session);
  const all = session.assignments ?? [];
  const slotsFor = (track: 'regular' | 'junior_coach', required: number) => {
    const active = all
      .filter((a) => a.track === track && a.status === 'active')
      .sort(byPrimaryFirst);
    const out = all.filter((a) => a.track === track && a.status === 'absent_pending_sub');
    const open = Math.max(0, required - active.length);
    return { active, out, open };
  };
  const tracks = [
    {
      key: 'regular' as const,
      label: t('sessions.detail.regularTrack'),
      cov: coverage.regular,
      ...slotsFor('regular', session.required_regular),
    },
    {
      key: 'junior' as const,
      label: t('sessions.detail.juniorTrack'),
      cov: coverage.junior,
      ...slotsFor('junior_coach', session.required_junior),
    },
  ].filter(
    // Head-trainers always see both tracks, so a slot that was taken away can be added back
    (track) =>
      isHeadTrainer || track.cov.required > 0 || track.active.length > 0 || track.out.length > 0,
  );

  const hall = session.location;
  const groups = (session.player_groups ?? []).map((g) => g.name).join(' · ');
  const shortLabel = coverage.regular.missing
    ? t('sessions.detail.needRegular', { count: coverage.regular.missing })
    : coverage.junior.missing
      ? t('sessions.detail.needJunior', { count: coverage.junior.missing })
      : null;

  const handleRemove = async (assignment: EnrichedSessionAssignment) => {
    const rows = currentRows(session).filter((r) => r.profile_id !== assignment.profile_id);
    try {
      await saveAssignments(session.id, rows);
      await refetch();
      setNotice({
        type: 'success',
        message: t('sessions.slot.removed', { name: assignment.profile?.display_name ?? '' }),
      });
    } catch {
      setNotice({ type: 'error', message: t('sessions.detail.removeFailed') });
    }
  };

  /** Take one open slot away from a track, or add one back (this session only). */
  const changeTarget = async (key: 'regular' | 'junior', delta: -1 | 1) => {
    const field = key === 'regular' ? 'required_regular' : 'required_junior';
    try {
      await updateRequirements({ [field]: session[field] + delta });
      setNotice({
        type: 'success',
        message: t(delta < 0 ? 'sessions.detail.slotRemoved' : 'sessions.detail.slotAdded'),
      });
    } catch {
      setNotice({ type: 'error', message: t('sessions.detail.slotChangeFailed') });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSession();
      navigate('/sessions');
    } catch {
      setDeleteError(t('sessions.deleteSession.failed'));
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      {back}

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-[26px] font-extrabold tabular-nums">
            {formatTimeRange(session.start_time, session.end_time)}
          </span>
          {session.is_time_overridden && <Tag variant="outline">{t('sessions.changed')}</Tag>}
          {!session.published_at && <Tag variant="accent-2">{t('sessions.draft')}</Tag>}
          {shortLabel && <Tag variant="accent">{shortLabel}</Tag>}
        </div>
        <span className="text-[14.5px]">
          {hall
            ? `${hall.name}${hall.district_area ? ` (${hall.district_area})` : ''}`
            : t('sessions.noHall')}
        </span>
        {hall?.address && (
          <a
            href={mapUrl(hall.name, hall.address)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('sessions.detail.mapLink', { name: hall.name })}
            className="self-start text-[13.5px] font-semibold"
          >
            {hall.address} ↗
          </a>
        )}
        {hall?.trainer_note && (
          <span className="text-[12.5px] text-neutral-700">{hall.trainer_note}</span>
        )}
        <span className="text-[13px] text-neutral-700">
          {t('sessions.detail.groups')}: {groups || t('sessions.allGroups')}
        </span>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-9">
        <div className="flex min-w-0 flex-col gap-5">
          {tracks.map((track) => (
            <Section
              key={track.key}
              title={track.label}
              action={
                <span className="flex items-baseline gap-3">
                  {isHeadTrainer && track.cov.required < MAX_REQUIRED[track.key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!min-h-0 !py-0"
                      aria-label={t('sessions.detail.addSlotLabel', { track: track.label })}
                      onClick={() => void changeTarget(track.key, 1)}
                    >
                      + {t('sessions.detail.addSlot')}
                    </Button>
                  )}
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      track.cov.missing > 0 ? 'text-accent-700' : 'text-neutral-700'
                    }`}
                  >
                    {track.cov.filled}/{track.cov.required}
                  </span>
                </span>
              }
            >
              <ul data-testid={`track-${track.key}`} className="-mt-1 flex flex-col">
                {track.active.map((a) => (
                  <Slot
                    key={a.id}
                    assignment={a}
                    me={user?.id}
                    onRemove={isHeadTrainer ? () => void handleRemove(a) : undefined}
                  />
                ))}
                {Array.from({ length: track.open }, (_, i) => (
                  <Slot
                    key={`open-${i}`}
                    me={user?.id}
                    onAssign={
                      isHeadTrainer
                        ? () => setSlotTrack(track.key === 'junior' ? 'junior_coach' : 'regular')
                        : undefined
                    }
                    onReduce={isHeadTrainer ? () => void changeTarget(track.key, -1) : undefined}
                  />
                ))}
                {track.out.map((a) => (
                  <Slot key={a.id} assignment={a} me={user?.id} />
                ))}
              </ul>
            </Section>
          ))}
        </div>

        {isHeadTrainer && (
          <div className="flex min-w-0 flex-col gap-2 border-t-2 border-divider pt-3">
            <Button variant="secondary" onClick={() => setOverrideOpen(true)}>
              {t('sessions.detail.override')}
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
              {t('sessions.detail.delete')}
            </Button>
          </div>
        )}
      </div>

      {notice && <Notice message={notice.message} type={notice.type} onClose={closeNotice} />}

      {isHeadTrainer && (
        <>
          <OpenSlotDialog
            session={session}
            track={slotTrack ?? 'regular'}
            isOpen={slotTrack !== null}
            onClose={() => setSlotTrack(null)}
            onAssigned={(name) => {
              void refetch();
              setNotice({ type: 'success', message: t('sessions.slot.assigned', { name }) });
            }}
          />
          <SessionOverrideModal
            session={session}
            isOpen={overrideOpen}
            onClose={() => setOverrideOpen(false)}
            onSave={(_id, updates) => updateOverride(updates)}
          />
          <Dialog
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title={t('sessions.deleteSession.title')}
            closeLabel={t('actions.close')}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  {t('sessions.deleteSession.cancel')}
                </Button>
                <Button isLoading={deleting} onClick={handleDelete}>
                  {deleting
                    ? t('sessions.deleteSession.deleting')
                    : t('sessions.deleteSession.confirm')}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              {deleteError && <AuthError message={deleteError} />}
              <p className="text-sm">
                {t('sessions.deleteSession.body', {
                  date: formatDayMonth(session.session_date, language),
                  time: formatTimeRange(session.start_time, session.end_time),
                })}
              </p>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
};
