import React from 'react';
import { Card, CardHeader, CardBody, Badge, Button } from '../components/ui';
import { CalendarDays, Clock, MapPin, Users, Plus } from 'lucide-react';

export const SessionsPage: React.FC = () => {
  const sampleSessions = [
    { id: 1, title: 'Youth U16 Tactics & Passing', time: 'Mon, 17:30 - 19:00', location: 'Pitch A (Main Turf)', trainer: 'Max Trainer', status: 'Scheduled' },
    { id: 2, title: 'Senior First Team Endurance', time: 'Tue, 19:00 - 20:30', location: 'Pitch B (Conditioning Track)', trainer: 'Head Trainer', status: 'Scheduled' },
    { id: 3, title: 'U14 Goalkeeper Fundamentals', time: 'Wed, 16:30 - 18:00', location: 'Training Ground 2', trainer: 'Lukas Junior', status: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-glass)] backdrop-blur-2xl p-5 rounded-3xl border border-[var(--border-glass)] shadow-[var(--shadow-main)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-500">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              Training Sessions Schedule
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9">
            Manage recurring weekly training sessions, locations, and lead coach assignments.
          </p>
        </div>

        <Button variant="gradient" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Schedule Session
        </Button>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {sampleSessions.map((session) => (
          <Card key={session.id} variant="interactive">
            <CardHeader className="flex items-start justify-between pb-3">
              <Badge variant={session.status === 'Scheduled' ? 'success' : 'warning'}>
                {session.status}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">{session.title}</h3>

              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{session.time}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <MapPin className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{session.location}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Users className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{session.trainer}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};
