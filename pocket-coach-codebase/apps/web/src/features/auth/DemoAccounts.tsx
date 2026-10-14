import React from 'react';
import { Button } from '../../components/ui';

/**
 * Quick-fill buttons for the seeded local accounts and their shared password. Rendered only in
 * development builds (`import.meta.env.DEV`); the production bundle must not contain them.
 * Developer tooling, so deliberately not translated.
 */
const DEV_PASSWORD = 'Password123!';

const ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@club.de' },
  { label: 'Head Trainer', email: 'headtrainer@club.de' },
  { label: 'Trainer', email: 'trainer1@club.de' },
] as const;

export const DemoAccounts: React.FC<{ onPick: (email: string, password: string) => void }> = ({
  onPick,
}) => (
  <div className="border-t-2 border-divider pt-4">
    <p className="mb-2 text-xs text-neutral-700">Demo accounts (development only)</p>
    <div className="flex flex-wrap gap-2">
      {ACCOUNTS.map((account) => (
        <Button
          key={account.email}
          variant="secondary"
          size="sm"
          onClick={() => onPick(account.email, DEV_PASSWORD)}
        >
          {account.label}
        </Button>
      ))}
    </div>
  </div>
);
