import React, { useState, useMemo } from 'react';
import { Button, Badge, Card } from '../../../components/ui';
import { useSeasons } from '../../seasons/hooks/useSeasons';
import { useLocations } from '../../locations/hooks/useLocations';
import { useSessions, EnrichedSession } from '../hooks/useSessions';
import { SessionCard } from './SessionCard';
import { SessionOverrideModal } from './SessionOverrideModal';
import { SeasonSetupModal } from '../../seasons/components/SeasonSetupModal';
import { LocationManagerModal } from '../../locations/components/LocationManagerModal';
import { usePermissions } from '../../../hooks/usePermissions';
import { Modal } from '../../../components/ui';
import {
  CalendarDays,
  Plus,
  Building2,
  Filter,
  Calendar,
  Sparkles,
  RefreshCw,
  Layers,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// Helper functions for ISO Calendar Week & Month grouping
function getISOWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekRangeLabel(dateStr: string): { weekNum: number; label: string } {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMon));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekNum = getISOWeekNumber(dateStr);
  const formatMD = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    weekNum,
    label: `KW ${weekNum} (${formatMD(monday)} – ${formatMD(sunday)})`,
  };
}

interface WeekGroup {
  weekNum: number;
  weekLabel: string;
  sessions: EnrichedSession[];
}

interface MonthGroup {
  monthKey: string;
  monthName: string;
  weeks: WeekGroup[];
  totalSessions: number;
}

export const SessionScheduleView: React.FC = () => {
  const { isHeadTrainer, isSuperAdmin } = usePermissions();
  const canDeleteSeason = isHeadTrainer || isSuperAdmin;
  const { seasons, activeSeason, refetch: refetchSeasons, deleteSeason } = useSeasons();
  const { locations } = useLocations();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);
  const currentSeasonId = selectedSeasonId || activeSeason?.id;

  const {
    sessions,
    loading: sessionsLoading,
    filters,
    setFilters,
    refetch: refetchSessions,
    updateSessionOverride,
    deleteSession,
  } = useSessions({ seasonId: currentSeasonId });

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentMonthKey);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [overrideTargetSession, setOverrideTargetSession] = useState<EnrichedSession | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [sessionToDelete, setSessionToDelete] = useState<EnrichedSession | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [sessionDeleteError, setSessionDeleteError] = useState<string | null>(null);

  // Sync active season when loaded
  React.useEffect(() => {
    if (activeSeason && !selectedSeasonId) {
      setFilters((prev) => ({ ...prev, seasonId: activeSeason.id }));
    }
  }, [activeSeason, selectedSeasonId, setFilters]);

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setFilters((prev) => ({ ...prev, seasonId }));
  };

  const handleDeleteSeasonConfirm = async () => {
    if (!currentSeasonId) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteSeason(currentSeasonId);
      setSelectedSeasonId(undefined);
      setDeleteConfirmOpen(false);
      await refetchSeasons();
      await refetchSessions();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete season');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingleSessionConfirm = async () => {
    if (!sessionToDelete) return;
    try {
      setDeletingSession(true);
      setSessionDeleteError(null);
      await deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } catch (err: any) {
      setSessionDeleteError(err.message || 'Failed to delete session');
    } finally {
      setDeletingSession(false);
    }
  };

  const handleLocationFilterChange = (locationId: string) => {
    setFilters((prev) => ({
      ...prev,
      locationId: locationId || undefined,
    }));
  };

  const handleDayFilterChange = (dowString: string) => {
    setFilters((prev) => ({
      ...prev,
      dayOfWeek: dowString !== '' ? parseInt(dowString, 10) : undefined,
    }));
  };

  const handleSeasonCreatedSuccess = async () => {
    await refetchSeasons();
    await refetchSessions();
  };

  const selectedSeason = seasons.find((s) => s.id === currentSeasonId) || activeSeason;

  // Group sessions by Month -> Calendar Week (KW)
  const groupedMonths = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const monthMap = new Map<string, { monthName: string; sessions: EnrichedSession[] }>();

    sessions.forEach((session) => {
      const date = new Date(session.session_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { monthName, sessions: [] });
      }
      monthMap.get(monthKey)!.sessions.push(session);
    });

    const result: MonthGroup[] = [];

    // Sort month keys chronologically
    const sortedMonthKeys = Array.from(monthMap.keys()).sort();

    sortedMonthKeys.forEach((monthKey) => {
      const { monthName, sessions: monthSessions } = monthMap.get(monthKey)!;

      // Group month sessions by Calendar Week (KW)
      const weekMap = new Map<number, { weekLabel: string; sessions: EnrichedSession[] }>();

      monthSessions.forEach((session) => {
        const { weekNum, label } = getWeekRangeLabel(session.session_date);
        if (!weekMap.has(weekNum)) {
          weekMap.set(weekNum, { weekLabel: label, sessions: [] });
        }
        weekMap.get(weekNum)!.sessions.push(session);
      });

      const weeks: WeekGroup[] = Array.from(weekMap.entries())
        .map(([weekNum, data]) => ({
          weekNum,
          weekLabel: data.weekLabel,
          sessions: data.sessions.sort((a, b) => {
            const dateCompare = a.session_date.localeCompare(b.session_date);
            if (dateCompare !== 0) return dateCompare;
            return a.start_time.localeCompare(b.start_time);
          }),
        }))
        .sort((a, b) => a.weekNum - b.weekNum);

      result.push({
        monthKey,
        monthName,
        weeks,
        totalSessions: monthSessions.length,
      });
    });

    return result;
  }, [sessions]);

  // Auto-select current month if available in season, fallback to first month if current month is not in season
  React.useEffect(() => {
    if (groupedMonths.length > 0) {
      const monthExists = groupedMonths.some((g) => g.monthKey === selectedMonthFilter);
      if (!monthExists) {
        const currentExists = groupedMonths.some((g) => g.monthKey === currentMonthKey);
        setSelectedMonthFilter(currentExists ? currentMonthKey : groupedMonths[0].monthKey);
      }
    }
  }, [groupedMonths, currentMonthKey, selectedMonthFilter]);

  // Filtered month groups based on month tab selection
  const visibleMonthGroups = useMemo(() => {
    return groupedMonths.filter((g) => g.monthKey === selectedMonthFilter);
  }, [groupedMonths, selectedMonthFilter]);

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-glass)] backdrop-blur-2xl p-6 md:p-7 rounded-3xl border border-[var(--border-glass)] shadow-[var(--shadow-main)]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-500">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              Training Sessions Schedule
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9">
            Manage training seasons, sports hall locations, weekly slots, and session time overrides
            organized by Calendar Week (KW) and Month.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setLocationModalOpen(true)}>
            <Building2 className="w-4 h-4 mr-1 text-emerald-500" /> Manage Halls
          </Button>
          <Button variant="primary" size="sm" onClick={() => setSetupModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Season
          </Button>
        </div>
      </div>

      {/* Season Banner & Filter Toolbar */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Season:
            </label>
            <select
              value={currentSeasonId || ''}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="px-3 py-1.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_date} – {s.end_date}) {s.is_active ? '★ Active' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedSeason && (
            <div className="flex items-center gap-2">
              <Badge variant="gradient">
                <Sparkles className="w-3 h-3 text-emerald-300 mr-1" />
                {selectedSeason.name}
              </Badge>
              <Badge variant="neutral">{sessions.length} Total Sessions</Badge>
              {canDeleteSeason && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  title="Delete Season"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Season
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3.5 py-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-emerald-500" /> Filter By:
          </div>

          {/* Hall Location Filter */}
          <select
            value={filters.locationId || ''}
            onChange={(e) => handleLocationFilterChange(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">All Sports Halls ({locations.length})</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                📍 {loc.name} {loc.district_area ? `(${loc.district_area})` : ''}
              </option>
            ))}
          </select>

          {/* Weekday Filter */}
          <select
            value={filters.dayOfWeek !== undefined ? filters.dayOfWeek : ''}
            onChange={(e) => handleDayFilterChange(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">All Weekdays</option>
            <option value="2">Tuesdays</option>
            <option value="3">Wednesdays</option>
            <option value="4">Thursdays</option>
            <option value="5">Fridays</option>
          </select>

          {(filters.locationId || filters.dayOfWeek !== undefined) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentExists = groupedMonths.some((g) => g.monthKey === currentMonthKey);
                if (groupedMonths.length > 0) {
                  setSelectedMonthFilter(
                    currentExists ? currentMonthKey : groupedMonths[0].monthKey,
                  );
                }
                setFilters({ seasonId: currentSeasonId });
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Reset Filters
            </Button>
          )}
        </div>

        {/* Month Quick Navigation Tabs */}
        {groupedMonths.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-500" /> Month:
            </span>
            {groupedMonths.map((m) => (
              <button
                key={m.monthKey}
                onClick={() => setSelectedMonthFilter(m.monthKey)}
                className={`px-3 py-1 text-xs rounded-xl font-medium shrink-0 transition-all ${
                  selectedMonthFilter === m.monthKey
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.monthName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grouped Month & Calendar Week Schedule Grid */}
      {sessionsLoading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading training schedule...</div>
      ) : visibleMonthGroups.length === 0 ? (
        <Card className="py-16 text-center space-y-4">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Sessions Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No sessions match the selected filters or month. Click "Create Season" to setup a season
            with default Junior schedule templates.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setSetupModalOpen(true)}
            className="mt-2"
          >
            <Plus className="w-4 h-4 mr-1" /> Create Season & Generate Sessions
          </Button>
        </Card>
      ) : (
        <div className="space-y-10 md:space-y-12">
          {visibleMonthGroups.map((monthGroup) => (
            <div key={monthGroup.monthKey} className="space-y-6">
              {/* Month Header Banner */}
              <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                    {monthGroup.monthName}
                  </h3>
                </div>
                <Badge variant="neutral">{monthGroup.totalSessions} Sessions</Badge>
              </div>

              {/* Calendar Weeks within Month */}
              <div className="space-y-7 sm:space-y-8 pl-3 sm:pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                {monthGroup.weeks.map((weekGroup) => (
                  <div key={weekGroup.weekNum} className="space-y-4 sm:space-y-5">
                    {/* Calendar Week (KW) Badge Header */}
                    <div className="flex items-center gap-2 py-0.5">
                      <Badge variant="gradient">
                        <Layers className="w-3 h-3 text-emerald-300 mr-1" />
                        {weekGroup.weekLabel}
                      </Badge>
                      <span className="text-xs text-slate-400 font-medium">
                        • {weekGroup.sessions.length}{' '}
                        {weekGroup.sessions.length === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>

                    {/* Session Cards Vertical Chronological List */}
                    <div className="flex flex-col space-y-4 sm:space-y-4.5">
                      {weekGroup.sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          canEdit={canDeleteSeason}
                          onEditOverride={(s) => setOverrideTargetSession(s)}
                          onDeleteSession={canDeleteSeason ? (s) => setSessionToDelete(s) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Season Setup Wizard Modal */}
      <SeasonSetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onSuccess={handleSeasonCreatedSuccess}
      />

      {/* Location Manager Dialog */}
      <LocationManagerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
      />

      {/* Session Override Dialog */}
      <SessionOverrideModal
        session={overrideTargetSession}
        isOpen={Boolean(overrideTargetSession)}
        onClose={() => setOverrideTargetSession(null)}
        onSave={async (sessionId, updates) => {
          await updateSessionOverride(sessionId, updates);
        }}
      />

      {/* Delete Season Confirmation Dialog */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Season"
      >
        <div className="space-y-4 py-2">
          {deleteError && (
            <div className="p-3 text-xs font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
              {deleteError}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold font-heading">Permanently Delete Season?</h4>
              <p className="text-xs opacity-90">
                Are you sure you want to delete <span className="font-bold">{selectedSeason?.name}</span>? This action cannot be undone and will permanently delete all training sessions and assignments associated with this season.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleting}
              onClick={handleDeleteSeasonConfirm}
            >
              Delete Season
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Single Session Confirmation Dialog */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Delete Session"
      >
        <div className="space-y-4 py-2">
          {sessionDeleteError && (
            <div className="p-3 text-xs font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
              {sessionDeleteError}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold font-heading">Permanently Delete Training Session?</h4>
              <p className="text-xs opacity-90">
                Are you sure you want to delete the training session on{' '}
                <span className="font-bold">{sessionToDelete?.session_date}</span> ({sessionToDelete?.start_time.slice(0, 5)} – {sessionToDelete?.end_time.slice(0, 5)})? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSessionToDelete(null)}
              disabled={deletingSession}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deletingSession}
              onClick={handleDeleteSingleSessionConfirm}
            >
              Delete Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

