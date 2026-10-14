import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile, UserRole } from '@pocket-coach/shared-types';
import { Button, CheckRow, Dialog } from '../../components/ui';
import { describeDbError } from '../../lib/dbErrors';
import { supabase } from '../../lib/supabase';
import { AuthError } from '../auth/AuthLayout';

interface RoleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainer: Profile | null;
  onSuccess?: () => void;
}

export const RoleManagerModal: React.FC<RoleManagerModalProps> = ({
  isOpen,
  onClose,
  trainer,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [currentRoles, setCurrentRoles] = useState<UserRole[]>([]);
  const [isJuniorCoach, setIsJuniorCoach] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainer || !isOpen) return;
    setIsJuniorCoach(trainer.is_junior_coach);
    setLoading(true);
    setError(null);
    const loadRoles = async () => {
      try {
        const { data, error: loadErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('profile_id', trainer.id);
        if (loadErr) throw loadErr;
        setCurrentRoles((data ?? []).map((r: { role: string }) => r.role as UserRole));
      } catch {
        setError(t('rolesDialog.loadFailed'));
      } finally {
        setLoading(false);
      }
    };
    void loadRoles();
  }, [trainer, isOpen, t]);

  const setRole = (role: UserRole, on: boolean) =>
    setCurrentRoles((roles) =>
      on ? [...new Set([...roles, role])] : roles.filter((r) => r !== role),
    );

  const handleSave = async () => {
    if (!trainer) return;
    setSaving(true);
    setError(null);

    try {
      // One atomic database call: roles and the Super-admin-managed 14/18 Coach label are saved
      // together, or not at all (the base Trainer role is always kept, you cannot remove your own
      // Super-admin role, and the label cannot change while upcoming assignments are on the
      // track the change would make invalid).
      const { error: rpcErr } = await supabase.rpc('set_user_roles', {
        p_profile_id: trainer.id,
        p_roles: currentRoles,
        p_is_junior_coach: isJuniorCoach,
      });
      if (rpcErr) throw rpcErr;

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(describeDbError(err, t('rolesDialog.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (!trainer) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('rolesDialog.title', { name: trainer.display_name })}
      closeLabel={t('actions.close')}
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <p className="text-[13.5px] text-neutral-800">{t('rolesDialog.body')}</p>
          <p className="mt-1 text-xs text-neutral-700">{trainer.email}</p>
        </div>

        {error && <AuthError message={error} />}

        <div className="border-t-2 border-divider">
          <CheckRow
            locked
            checked
            label={t('roles.trainer')}
            description={t('rolesDialog.trainerD')}
          />
          <CheckRow
            checked={currentRoles.includes('head_trainer')}
            onChange={(on) => setRole('head_trainer', on)}
            label={t('roles.headTrainer')}
            description={t('rolesDialog.headD')}
          />
          <CheckRow
            checked={currentRoles.includes('super_admin')}
            onChange={(on) => setRole('super_admin', on)}
            label={t('roles.superAdmin')}
            description={t('rolesDialog.superD')}
          />
          <CheckRow
            checked={isJuniorCoach}
            onChange={setIsJuniorCoach}
            label={t('roles.junior')}
            description={t('rolesDialog.juniorD')}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('rolesDialog.cancel')}
          </Button>
          <Button onClick={handleSave} isLoading={saving} disabled={loading}>
            {saving ? t('rolesDialog.saving') : t('rolesDialog.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
