import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { AuthError } from '../auth/AuthLayout';
import { Section } from '../../components/ui';

interface Props {
  onNotice: (message: string) => void;
}

/**
 * Personal calendar link. The link can be copied and regenerated now; the feed behind it ships
 * in Sub-Phase 1.6b (known issue C5).
 */
export const CalendarSection: React.FC<Props> = ({ onNotice }) => {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const token = profile.calendar_token || '';
  const feedUrl = token
    ? `${window.location.origin}/functions/v1/calendar-feed?token=${token}`
    : t('settings.calendar.noLink');

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      onNotice(t('settings.notices.linkCopied'));
    } catch {
      // Clipboard access can be refused; the link stays visible and selectable.
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ calendar_token: crypto.randomUUID(), updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (updateErr) throw updateErr;

      await refreshProfile();
      onNotice(t('settings.notices.linkRegenerated'));
    } catch {
      setError(t('settings.errors.calendar'));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Section title={t('settings.calendar.title')}>
      <p className="text-sm text-neutral-800">{t('settings.calendar.body')}</p>
      {error && <AuthError message={error} />}
      <div
        id="calendar-feed-url"
        aria-label={t('settings.calendar.link')}
        className="select-all break-all border border-divider bg-surface px-2.5 py-2 text-[12.5px] tabular-nums"
      >
        {feedUrl}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleCopy} disabled={!token}>
          {t('settings.calendar.copy')}
        </Button>
        <Button variant="ghost" onClick={handleRegenerate} isLoading={regenerating}>
          {regenerating ? t('settings.calendar.regenerating') : t('settings.calendar.regenerate')}
        </Button>
      </div>
    </Section>
  );
};
