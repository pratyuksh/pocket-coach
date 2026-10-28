import { execFileSync } from 'child_process';

/**
 * End-to-end tests create throwaway accounts (`e2e…@club.de`) and throwaway seasons (`E2E …`),
 * and some of them make their season the active one for a while. On a developer's machine these
 * would pile up (accounts on the Team page, seasons everywhere) and a test that times out cannot
 * clean up after itself, because its API client is already closed. So after the run:
 *   1. the throwaway accounts and seasons are deleted, and
 *   2. if that leaves no active season, the most recent one becomes active again.
 * CI starts from an empty database and needs no cleanup. If Docker or the local database is not
 * reachable this is skipped silently.
 */
const STATEMENTS = [
  "delete from auth.users where email like 'e2e%@club.de'",
  "delete from public.seasons where name like 'E2E %'",
  'update public.seasons set is_active = true where id = (select id from public.seasons order by start_date desc limit 1) and not exists (select 1 from public.seasons where is_active)',
];

export default async function globalTeardown() {
  if (process.env.CI) return;
  const container = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_pocket-coach';
  for (const statement of STATEMENTS) {
    try {
      execFileSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-c', statement], {
        stdio: 'ignore',
        timeout: 20_000,
      });
    } catch {
      // Cleanup is a convenience only.
    }
  }
}
