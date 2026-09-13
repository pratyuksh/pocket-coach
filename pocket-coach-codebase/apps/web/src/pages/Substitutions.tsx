import React from 'react';
import { Card, CardHeader, CardBody, Badge, Button } from '../components/ui';
import { RefreshCw, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';

export const SubstitutionsPage: React.FC = () => {
  const sampleGaps = [
    { id: 1, team: 'Youth U16 Athletics', date: 'Tomorrow, 17:30', reason: 'Trainer illness', status: 'Urgent Gap' },
    { id: 2, team: 'Senior First Team Match', date: 'Saturday, 15:00', reason: 'Coaching seminar', status: 'Open Volunteer' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-glass)] backdrop-blur-2xl p-5 rounded-3xl border border-[var(--border-glass)] shadow-[var(--shadow-main)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              Substitution Requests & Open Gaps
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9">
            Resolve unassigned training sessions with smart substitution requests and atomic volunteer locks.
          </p>
        </div>

        <Button variant="danger" size="sm" leftIcon={<AlertTriangle className="w-4 h-4" />}>
          Request Substitute
        </Button>
      </div>

      {/* Gaps Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sampleGaps.map((gap) => (
          <Card key={gap.id} variant="interactive" className="border-amber-500/20 hover:border-amber-500/40">
            <CardHeader className="flex items-start justify-between pb-3">
              <Badge variant={gap.status === 'Urgent Gap' ? 'danger' : 'warning'}>
                <ShieldAlert className="w-3 h-3 text-rose-500" />
                <span>{gap.status}</span>
              </Badge>
            </CardHeader>

            <CardBody className="space-y-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">{gap.team}</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Session: {gap.date}</p>
              <p className="text-xs text-[var(--text-secondary)] italic">Reason: "{gap.reason}"</p>

              <div className="pt-2 border-t border-[var(--border-glass)] flex justify-end">
                <Button variant="outline" size="sm" leftIcon={<UserCheck className="w-3.5 h-3.5" />}>
                  Volunteer Cover
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};
