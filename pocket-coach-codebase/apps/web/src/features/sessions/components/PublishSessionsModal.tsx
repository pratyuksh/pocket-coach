import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import type { EnrichedSession } from '../hooks/useSessions';
import { toLocalDateString } from '../../../lib/dates';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PublishSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: EnrichedSession[];
  onPublish: (from: string, to: string) => Promise<number>;
  onUnpublish: (from: string, to: string) => Promise<{ unpublished: number; skipped: number }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  return toLocalDateString(new Date(d.getTime() + days * DAY_MS));
}

export const PublishSessionsModal: React.FC<PublishSessionsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onPublish,
  onUnpublish,
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default range when opened: the next four weeks starting at the first draft session
  useEffect(() => {
    if (!isOpen) return;
    const firstDraft = sessions
      .filter((s) => !s.published_at)
      .map((s) => s.session_date)
      .sort()[0];
    const start = firstDraft ?? toLocalDateString();
    setFrom(start);
    setTo(addDays(start, 27));
    setMessage(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const rangeValid = Boolean(from && to && from <= to);

  const { draftCount, publishedCount } = useMemo(() => {
    const inRange = sessions.filter(
      (s) => rangeValid && s.session_date >= from && s.session_date <= to,
    );
    return {
      draftCount: inRange.filter((s) => !s.published_at).length,
      publishedCount: inRange.filter((s) => s.published_at).length,
    };
  }, [sessions, from, to, rangeValid]);

  const run = async (action: () => Promise<string>) => {
    try {
      setBusy(true);
      setError(null);
      setMessage(await action());
    } catch (err: unknown) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = () =>
    run(async () => {
      const n = await onPublish(from, to);
      return `${n} ${n === 1 ? 'session is' : 'sessions are'} now visible to trainers.`;
    });

  const handleUnpublish = () =>
    run(async () => {
      const { unpublished, skipped } = await onUnpublish(from, to);
      const skippedText =
        skipped > 0
          ? ` ${skipped} ${skipped === 1 ? 'session was' : 'sessions were'} skipped because ${
              skipped === 1 ? 'it has' : 'they have'
            } started or ${skipped === 1 ? 'has' : 'have'} substitution requests.`
          : '';
      return `${unpublished} ${unpublished === 1 ? 'session is' : 'sessions are'} back to draft.${skippedText}`;
    });

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish Sessions">
      <div className="space-y-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Drafts are visible to Head-trainers only. Publishing a date range shows its sessions and
          assignments to all trainers. Unpublishing returns sessions to draft as long as they have
          not started and have no substitution requests.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div
            role="status"
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="publish-from"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              From
            </label>
            <input
              id="publish-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="publish-to"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              To
            </label>
            <input
              id="publish-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {!rangeValid && from && to && (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            The end date is before the start date.
          </p>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400" data-testid="publish-preview">
          In this range: {draftCount} {draftCount === 1 ? 'draft' : 'drafts'}, {publishedCount}{' '}
          published.
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handleUnpublish}
            disabled={busy || !rangeValid || publishedCount === 0}
          >
            <EyeOff className="w-4 h-4 mr-1" /> Unpublish
          </Button>
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={busy || !rangeValid || draftCount === 0}
          >
            <Eye className="w-4 h-4 mr-1" /> Publish {draftCount > 0 ? `${draftCount} ` : ''}
            {draftCount === 1 ? 'draft' : 'drafts'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
