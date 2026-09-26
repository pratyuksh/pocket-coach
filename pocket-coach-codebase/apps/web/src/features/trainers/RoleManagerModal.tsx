import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import type { Profile, UserRole } from '@pocket-coach/shared-types';
import { Shield, ShieldAlert, Check } from 'lucide-react';

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
  const [currentRoles, setCurrentRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trainer && isOpen) {
      setLoading(true);
      setError(null);
      const loadRoles = async () => {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('profile_id', trainer.id);

          if (!error && data) {
            setCurrentRoles(data.map((r: any) => r.role as UserRole));
          }
        } catch (err: any) {
          setError(err?.message || 'Failed to load user roles');
        } finally {
          setLoading(false);
        }
      };
      loadRoles();
    }
  }, [trainer, isOpen]);

  const toggleRole = (role: UserRole) => {
    if (role === 'trainer') return; // Base Trainer role is permanent for all users
    if (currentRoles.includes(role)) {
      setCurrentRoles(currentRoles.filter((r) => r !== role));
    } else {
      setCurrentRoles([...currentRoles, role]);
    }
  };

  const handleSave = async () => {
    if (!trainer) return;
    setSaving(true);
    setError(null);

    try {
      // Clear existing roles
      await supabase.from('user_roles').delete().eq('profile_id', trainer.id);

      // Always include base 'trainer' role plus elevated roles
      const finalRoles = Array.from(new Set(['trainer', ...currentRoles]));

      const roleRecords = finalRoles.map((role) => ({
        profile_id: trainer.id,
        role,
      }));

      const { error: insertErr } = await supabase.from('user_roles').insert(roleRecords);

      if (insertErr) {
        throw insertErr;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  };

  if (!trainer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Roles: ${trainer.display_name}`}>
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[var(--text-secondary)]">
          Configure permissions and access levels for{' '}
          <span className="text-[var(--text-primary)] font-semibold">{trainer.email}</span>.
          Elevated roles take effect immediately.
        </p>

        <div className="space-y-2 pt-1">
          <div className="p-3.5 rounded-xl border flex items-center justify-between bg-emerald-500/15 border-emerald-500/40 opacity-90 cursor-not-allowed select-none">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Trainer</h4>
                  <Badge variant="neutral">Permanent Base Role</Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Mandatory foundational role for all active coaching staff.
                </p>
              </div>
            </div>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>

          <div
            onClick={() => toggleRole('head_trainer')}
            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              currentRoles.includes('head_trainer')
                ? 'bg-cyan-500/15 border-cyan-500/40'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-glass)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-cyan-500" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Head Trainer</h4>
                  <Badge variant="info">Management</Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Can create seasons, launch availability surveys & assign trainers.
                </p>
              </div>
            </div>
            {currentRoles.includes('head_trainer') && <Check className="w-5 h-5 text-cyan-500" />}
          </div>

          <div
            onClick={() => toggleRole('super_admin')}
            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              currentRoles.includes('super_admin')
                ? 'bg-amber-500/15 border-amber-500/40'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-glass)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-500" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Super Admin</h4>
                  <Badge variant="warning">Full Access</Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Full administrative access, user invitation & role management.
                </p>
              </div>
            </div>
            {currentRoles.includes('super_admin') && <Check className="w-5 h-5 text-amber-500" />}
          </div>
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-[var(--border-glass)]">
          <Button variant="ghost" onClick={onClose} disabled={saving || loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
