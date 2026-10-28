import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, Input } from '../../../components/ui';
import { addDaysToDate, toLocalDateString } from '../../../lib/dates';
import { AuthError } from '../../auth/AuthLayout';
import type { EnrichedSession } from '../hooks/useSessions';

interface PublishSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: EnrichedSession[];
  onPublish: (from: string, to: string) => Promise<number>;
  onUnpublish: (from: string, to: string) => Promise<{ unpublished: number; skipped: number }>;
}

/** Publish (or return to draft) the sessions in a date range. */
export const PublishSessionsModal: React.FC<PublishSessionsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onPublish,
  onUnpublish,
}) => {
  const { t } = useTranslation();
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
    setTo(addDaysToDate(start, 27));
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
      setError(err instanceof Error && err.message ? err.message : t('sessions.publish.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = () =>
    run(async () => t('sessions.publish.published', { count: await onPublish(from, to) }));

  const handleUnpublish = () =>
    run(async () => {
      const { unpublished, skipped } = await onUnpublish(from, to);
      const skippedText =
        skipped > 0 ? ` ${t('sessions.publish.skipped', { count: skipped })}` : '';
      return `${t('sessions.publish.unpublished', { count: unpublished })}${skippedText}`;
    });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('sessions.publish.title')}
      closeLabel={t('actions.close')}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-800">{t('sessions.publish.intro')}</p>
        {error && <AuthError message={error} />}
        {message && (
          <p role="status" className="border-l-2 border-text bg-neutral-100 px-3 py-2 text-sm">
            {message}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('sessions.publish.from')}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('sessions.publish.to')}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        {!rangeValid && from && to && (
          <p className="text-xs text-accent-700">{t('sessions.publish.badRange')}</p>
        )}

        <p className="text-xs text-neutral-700" data-testid="publish-preview">
          {t('sessions.publish.preview', {
            drafts: t('sessions.publish.draftsCount', { count: draftCount }),
            published: t('sessions.publish.publishedCount', { count: publishedCount }),
          })}
        </p>

        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sessions.publish.close')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleUnpublish}
            disabled={busy || !rangeValid || publishedCount === 0}
          >
            {t('sessions.publish.unpublish')}
          </Button>
          <Button onClick={handlePublish} disabled={busy || !rangeValid || draftCount === 0}>
            {draftCount > 0
              ? t('sessions.publishDrafts', { count: draftCount })
              : t('sessions.publishButton')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
