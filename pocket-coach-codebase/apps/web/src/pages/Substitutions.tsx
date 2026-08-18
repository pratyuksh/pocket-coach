import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Badge } from '../components/ui';

export const SubstitutionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Substitution Requests & Open Gaps</CardTitle>
          <Badge variant="warning">Sub-Phase 1.6 Target</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-300">
            Smart substitution requests, open gap alerts, and atomic PostgreSQL volunteer locks will
            be implemented in Sub-Phase 1.6.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};
