import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input, Tag } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import { AuthError } from '../auth/AuthLayout';
import { SettingsSection } from './SettingsSection';

interface Props {
  onNotice: (message: string) => void;
}

export const ProfileSection: React.FC<Props> = ({ onNotice }) => {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const { isHeadTrainer } = usePermissions();
  const [displayName, setDisplayName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setSpecialty(profile.specialty || '');
    }
  }, [profile]);

  if (!profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          // The speciality is only shown, and so only saved, for Head-trainers and above.
          ...(isHeadTrainer ? { specialty: specialty.trim() || null } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (updateErr) throw updateErr;

      await refreshProfile();
      onNotice(t('settings.notices.profileSaved'));
    } catch {
      setError(t('settings.errors.profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title={t('settings.profile.title')}>
      {error && <AuthError message={error} />}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <Field label={t('settings.profile.name')}>
          <Input
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        {/* Not an input: the email is the sign-in and cannot be changed here. */}
        <dl>
          <dt className="mb-1.5 text-xs text-text/70">{t('settings.profile.email')}</dt>
          <dd className="flex items-center gap-1.5 text-sm">
            <span
              role="img"
              aria-label={t('settings.profile.emailLocked')}
              title={t('settings.profile.emailLocked')}
              className="flex text-neutral-700"
            >
              <Lock aria-hidden="true" className="size-3.5" />
            </span>
            <span className="break-all">{profile.email}</span>
          </dd>
        </dl>
        {isHeadTrainer && (
          <Field label={t('settings.profile.speciality')}>
            <Input
              value={specialty}
              placeholder={t('settings.profile.specialityPlaceholder')}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </Field>
        )}
        {profile.is_junior_coach && (
          <div>
            <p className="mb-1.5 text-xs text-text/70">{t('settings.profile.label')}</p>
            <Tag variant="accent">{t('roles.junior')}</Tag>
            <p className="mt-1.5 text-xs text-neutral-700">{t('settings.profile.labelHint')}</p>
          </div>
        )}
        <Button type="submit" isLoading={saving} className="self-start">
          {saving ? t('settings.profile.saving') : t('settings.profile.save')}
        </Button>
      </form>
    </SettingsSection>
  );
};
