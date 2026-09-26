import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Badge, Modal } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import type { Profile, UserRole } from '@pocket-coach/shared-types';
import {
  Users,
  UserPlus,
  Tag,
  Mail,
  RefreshCw,
  ShieldCheck,
  Award,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { InviteModal } from '../auth/InviteModal';
import { RoleManagerModal } from './RoleManagerModal';

interface TrainerWithRoles extends Profile {
  roles: UserRole[];
}

export const TrainerRoster: React.FC = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [trainers, setTrainers] = useState<TrainerWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedTrainerForRole, setSelectedTrainerForRole] = useState<Profile | null>(null);
  const [trainerToRemove, setTrainerToRemove] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const fetchRoster = async () => {
    setLoading(true);
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
        (acc: Record<string, UserRole[]>, row: any) => {
          if (!acc[row.profile_id]) acc[row.profile_id] = [];
          acc[row.profile_id].push(row.role as UserRole);
          return acc;
        },
        {},
      );

      const combined: TrainerWithRoles[] = (profilesData || []).map((p: any) => ({
        ...(p as Profile),
        roles: rolesByProfile[p.id] || ['trainer'],
      }));

      setTrainers(combined);
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrainer = async () => {
    if (!trainerToRemove) return;
    setDeleting(true);
    setRemoveError(null);
    try {
      const { error: rolesDeleteErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('profile_id', trainerToRemove.id);

      if (rolesDeleteErr) throw rolesDeleteErr;

      // Deactivate profile (soft delete)
      const { error: deactivateErr } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', trainerToRemove.id);

      if (deactivateErr) throw deactivateErr;

      setTrainerToRemove(null);
      await fetchRoster();
    } catch (err: any) {
      console.error('Error removing trainer:', err);
      setRemoveError(err?.message || 'Failed to remove trainer from roster.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-glass)] backdrop-blur-2xl p-5 rounded-3xl border border-[var(--border-glass)] shadow-[var(--shadow-main)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              Club Trainer Roster
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9">
            Manage active club trainers, assigned coaching roles, and team specialties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoster}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>

          {permissions.canInviteTrainers && (
            <Button
              variant="gradient"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsInviteOpen(true)}
            >
              Invite Trainer
            </Button>
          )}
        </div>
      </div>

      {/* Roster Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-[var(--bg-surface-elevated)] animate-pulse border border-[var(--border-glass)]"
            />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <Card variant="glass">
          <CardBody className="p-12 text-center text-[var(--text-secondary)] space-y-3">
            <Users className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
            <p className="text-sm font-semibold">No active trainers found in roster.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {trainers.map((t) => (
            <Card key={t.id} variant="interactive">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-extrabold flex items-center justify-center text-base shadow-inner font-heading">
                    {t.display_name ? t.display_name.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[var(--text-primary)] font-heading">
                      {t.display_name}
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5 font-mono">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                      <span className="truncate max-w-[200px]">{t.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {permissions.canManageRoles && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs py-1 px-2.5"
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                      onClick={() => setSelectedTrainerForRole(t)}
                    >
                      Roles
                    </Button>
                  )}
                  {permissions.canRemoveTrainers && t.id !== user?.id && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="text-xs py-1 px-2.5"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setRemoveError(null);
                        setTrainerToRemove(t);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardBody className="space-y-3 pt-2">
                {/* Roles list */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">
                    Roles:
                  </span>
                  {t.roles.map((r) => {
                    if (r === 'super_admin')
                      return (
                        <Badge key={r} variant="warning">
                          Super Admin
                        </Badge>
                      );
                    if (r === 'head_trainer')
                      return (
                        <Badge key={r} variant="info">
                          Head Trainer
                        </Badge>
                      );
                    return (
                      <Badge key={r} variant="neutral">
                        Trainer
                      </Badge>
                    );
                  })}
                  {t.is_junior_coach && (
                    <Badge variant="success">
                      <Award className="w-3 h-3 text-emerald-500" />
                      <span>Junior Coach</span>
                    </Badge>
                  )}
                </div>

                {/* Specialty */}
                {t.specialty && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] bg-[var(--bg-surface-elevated)] p-2.5 rounded-xl border border-[var(--border-glass)]">
                    <Tag className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="truncate font-medium">{t.specialty}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchRoster}
      />

      {/* Role Manager Modal */}
      <RoleManagerModal
        isOpen={!!selectedTrainerForRole}
        onClose={() => setSelectedTrainerForRole(null)}
        trainer={selectedTrainerForRole}
        onSuccess={fetchRoster}
      />

      {/* Remove Trainer Confirmation Modal */}
      <Modal
        isOpen={!!trainerToRemove}
        onClose={() => {
          setTrainerToRemove(null);
          setRemoveError(null);
        }}
        title="Remove Trainer from Roster"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>
              Are you sure you want to remove{' '}
              <strong>{trainerToRemove?.display_name || trainerToRemove?.email}</strong> from the
              club roster? This action will revoke their access.
            </span>
          </div>

          {removeError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs">
              {removeError}
            </div>
          )}

          <div className="pt-3 flex justify-end gap-3 border-t border-[var(--border-glass)]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTrainerToRemove(null);
                setRemoveError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleRemoveTrainer}
              disabled={deleting}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              {deleting ? 'Removing...' : 'Confirm Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
