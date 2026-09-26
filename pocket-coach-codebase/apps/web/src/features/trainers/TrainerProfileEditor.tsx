import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Toast } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  User,
  Globe,
  Tag,
  AlertCircle,
  LogOut,
  Calendar,
  Copy,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TrainerProfileEditor: React.FC = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'de' | 'en'>('de');
  const [isJuniorCoach, setIsJuniorCoach] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setSpecialty(profile.specialty || '');
      setPreferredLanguage(profile.preferred_language || 'de');
      setIsJuniorCoach(profile.is_junior_coach || false);
    }
  }, [profile]);

  const calendarToken = profile?.calendar_token || '';
  const calendarFeedUrl = calendarToken
    ? `${window.location.origin}/functions/v1/calendar-feed?token=${calendarToken}`
    : 'No active token';

  const handleCopyFeedUrl = () => {
    if (calendarToken) {
      navigator.clipboard.writeText(calendarFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setToastMessage('Calendar feed URL copied to clipboard!');
    }
  };

  const handleRegenerateCalendarToken = async () => {
    if (!profile) return;
    setRegeneratingToken(true);
    setError(null);
    try {
      const newToken = crypto.randomUUID();
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          calendar_token: newToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateErr) {
        throw updateErr;
      }

      await refreshProfile();
      setToastMessage(
        'Calendar subscription token regenerated! Previous subscription links are now invalidated.',
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to regenerate calendar token');
    } finally {
      setRegeneratingToken(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl || null,
          specialty: specialty || null,
          preferred_language: preferredLanguage,
          is_junior_coach: isJuniorCoach,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateErr) {
        throw updateErr;
      }

      await refreshProfile();
      setToastMessage('Profile settings updated successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) {
    return (
      <Card variant="glass">
        <CardBody className="p-6 text-center text-slate-400">
          Please log in to edit profile settings.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Trainer Profile & Settings
          </CardTitle>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage your public trainer profile, specialty focus, and app language preferences.
          </p>
        </CardHeader>

        <CardBody className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-extrabold flex items-center justify-center text-lg overflow-hidden shrink-0 border border-[var(--border-glass)] shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{displayName ? displayName.charAt(0).toUpperCase() : 'T'}</span>
                )}
              </div>
              <div className="flex-1">
                <label
                  htmlFor="settings-avatar"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
                >
                  Avatar Image URL
                </label>
                <input
                  id="settings-avatar"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-name"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--input-icon)] absolute left-3 top-3" />
                <input
                  id="settings-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-email"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Account Email (Read-Only)
              </label>
              <input
                id="settings-email"
                type="text"
                disabled
                value={profile.email}
                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] text-[var(--text-secondary)] rounded-xl px-4 py-2.5 text-sm cursor-not-allowed font-mono text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="settings-specialty"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Responsibility / Specialty Focus
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-[var(--input-icon)] absolute left-3 top-3" />
                <input
                  id="settings-specialty"
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. U14 Head Coach / Athletics & Conditioning"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="settings-lang"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
                >
                  Preferred App Language
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[var(--input-icon)] absolute left-3 top-3" />
                  <select
                    id="settings-lang"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as 'de' | 'en')}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option
                      value="de"
                      className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    >
                      Deutsch (German)
                    </option>
                    <option
                      value="en"
                      className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    >
                      English
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Coaching Track Status
                </label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="juniorTrack"
                    checked={isJuniorCoach}
                    onChange={(e) => setIsJuniorCoach(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] text-emerald-500 focus:ring-emerald-500 bg-[var(--input-bg)]"
                  />
                  <label
                    htmlFor="juniorTrack"
                    className="text-xs text-[var(--text-secondary)] cursor-pointer select-none"
                  >
                    Junior Coach / 14-18 Assistant Track
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-glass)] flex justify-end">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile Settings'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Calendar Subscription Feed Integration */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-[var(--text-primary)] font-heading">
                Live Calendar Feed Sync (WebCal)
              </CardTitle>
              <p className="text-xs text-[var(--text-secondary)]">
                Subscribe to your personal session schedule in Apple Calendar, Google Calendar, or
                Outlook.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="calendar-feed-url"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Personal WebCal Feed URL
            </label>
            <div className="flex items-center gap-2">
              <input
                id="calendar-feed-url"
                type="text"
                readOnly
                value={calendarFeedUrl}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-3.5 py-2.5 text-xs font-mono select-all focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs gap-1.5"
                onClick={handleCopyFeedUrl}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy Feed Link'}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-glass)] text-xs text-[var(--text-secondary)]">
            <p className="text-[11px] leading-relaxed max-w-lg">
              Need to revoke calendar access? Generating a new link immediately invalidates the
              previous URL across all external calendar apps.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={regeneratingToken}
              onClick={handleRegenerateCalendarToken}
              className="shrink-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-xs"
              leftIcon={
                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingToken ? 'animate-spin' : ''}`} />
              }
            >
              {regeneratingToken ? 'Regenerating...' : 'Regenerate Link'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Account Session Actions */}
      <Card variant="glass" className="border-rose-500/30 bg-rose-500/10">
        <CardBody className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] font-heading">
              Active Session & Sign Out
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Revoke session credentials on this device and return to sign in screen.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out Account
          </Button>
        </CardBody>
      </Card>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};
