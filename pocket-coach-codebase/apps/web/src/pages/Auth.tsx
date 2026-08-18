import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button } from '../components/ui';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card variant="glass" className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Sign in to PocketCoach</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-300">
            Authentication flow will be integrated in Sub-Phase 1.2.
          </p>
          <Link to="/dashboard">
            <Button variant="primary" className="w-full">
              Enter Dashboard Demo
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card variant="glass" className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Complete Registration</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-300">
            Registration flow will be integrated in Sub-Phase 1.2.
          </p>
          <Link to="/dashboard">
            <Button variant="primary" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
};

export const InvitePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card variant="glass" className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Accept Trainer Invitation</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-300">
            Invitation acceptance flow will be integrated in Sub-Phase 1.2.
          </p>
          <Link to="/dashboard">
            <Button variant="primary" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
};
