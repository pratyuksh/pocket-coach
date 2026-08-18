import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Button,
  Badge,
  Modal,
  Toast,
} from '../components/ui';
import { Calendar, Users, CheckCircle2, Clock, AlertTriangle, Play } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/20 p-6 shadow-xl">
        <div className="relative z-10 space-y-2">
          <Badge variant="info">Sub-Phase 1.1 Foundation Active</Badge>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to PocketCoach</h2>
          <p className="text-slate-300 max-w-2xl text-sm">
            Monorepo foundation, design system tokens, responsive layout primitives, and local
            database environment are ready for Phase 1 session & trainer operations.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Season
              </p>
              <h4 className="text-xl font-bold text-white mt-1">2026/2027</h4>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Registered Trainers
              </p>
              <h4 className="text-xl font-bold text-white mt-1">4 Test Accounts</h4>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                System Status
              </p>
              <div className="mt-1">
                <Badge variant="success">All Systems Operational</Badge>
              </div>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Supabase DB
              </p>
              <div className="mt-1">
                <Badge variant="info">Local Port 54321</Badge>
              </div>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Component Primitive Showcase */}
      <Card variant="solid">
        <CardHeader>
          <CardTitle>UI Primitives & Interactive Controls</CardTitle>
          <Badge variant="neutral">Design Tokens Test</Badge>
        </CardHeader>

        <CardBody className="space-y-4">
          <p className="text-sm text-slate-300">
            Test UI primitives (Buttons, Badges, Modals, Toasts) rendered directly with responsive
            glassmorphic design variables:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={() => setToastMessage('Action triggered successfully!')}
            >
              Trigger Success Toast
            </Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Open Test Modal
            </Button>
            <Button variant="outline" leftIcon={<Play className="w-4 h-4" />}>
              Outline Button
            </Button>
            <Button variant="danger" leftIcon={<AlertTriangle className="w-4 h-4" />}>
              Danger Action
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-slate-400 mr-2">Status Badges:</span>
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Absent Pending Sub</Badge>
            <Badge variant="danger">Sub Required</Badge>
            <Badge variant="info">Head Trainer</Badge>
            <Badge variant="neutral">Regular</Badge>
          </div>
        </CardBody>

        <CardFooter>
          <p className="text-xs text-slate-400">
            PocketCoach UI Primitive Verification • Responsive Shell Active
          </p>
        </CardFooter>
      </Card>

      {/* Interactive Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Sub-Phase 1.1 Verification Modal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm & Close
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            This modal verifies accessible dialog overlay behavior, ESC key dismiss, backdrop blur,
            and responsive mobile rendering.
          </p>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-emerald-400 font-mono">
            Status: React 19 + React Router v7 + Turborepo
          </div>
        </div>
      </Modal>

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
          <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};
