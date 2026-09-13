import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button } from '../components/ui';
import { ClipboardCheck, CheckCircle, Clock, Calendar } from 'lucide-react';

export const AvailabilityPage: React.FC = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-glass)] backdrop-blur-2xl p-5 rounded-3xl border border-[var(--border-glass)] shadow-[var(--shadow-main)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              Availability Survey & Matrix
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9">
            Collect trainer weekly availability responses date-by-date for head trainer review.
          </p>
        </div>

        <Button variant="gradient" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
          Submit Availability
        </Button>
      </div>

      {/* Days Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {days.map((day, idx) => (
          <Card key={day} variant="interactive">
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-base font-bold font-heading">{day}</CardTitle>
              <Badge variant={idx % 2 === 0 ? 'success' : 'info'}>
                {idx % 2 === 0 ? 'Available' : 'Conditional'}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)]">
                <span className="text-[var(--text-primary)] font-medium">Evening Session (17:30 - 20:00)</span>
                {idx % 2 === 0 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};
