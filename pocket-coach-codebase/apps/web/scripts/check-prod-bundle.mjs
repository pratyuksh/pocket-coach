// Fails when the production bundle contains development-only content: the demo accounts on the
// sign-in screen and the "Test Credentials" card (seed emails and the shared dev password).
// Run after `pnpm --filter @pocket-coach/web build`.
//
// Not covered here: the invite flow still uses a temporary password (known issue S1); that goes
// away with server-side invites in Sub-Phase 1.6a, when this check can also look for the password.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  'Demo accounts (development only)',
  'Test Credentials',
  'admin@club.de',
  'headtrainer@club.de',
  'trainer1@club.de',
];

const dist = new URL('../dist', import.meta.url).pathname;

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const hits = [];
for (const file of files(dist).filter((f) => /\.(js|css|html)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  for (const needle of FORBIDDEN) if (text.includes(needle)) hits.push(`${file}: "${needle}"`);
}

if (hits.length > 0) {
  console.error('Development-only content found in the production bundle:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('Production bundle contains no development-only accounts.');
