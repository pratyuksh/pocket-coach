import { execFileSync } from 'child_process';

/**
 * End-to-end tests create throwaway accounts (`e2e…@club.de`). On a developer's machine they would
 * pile up on the Team page, so they are deleted after the run (the profile, roles and sign-in
 * go with the account). CI starts from an empty database and needs no cleanup. If Docker or the
 * local database is not reachable this is skipped silently.
 */
export default async function globalTeardown() {
  if (process.env.CI) return;
  const container = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_pocket-coach';
  try {
    execFileSync(
      'docker',
      [
        'exec',
        container,
        'psql',
        '-U',
        'postgres',
        '-c',
        "delete from auth.users where email like 'e2e%@club.de'",
      ],
      { stdio: 'ignore', timeout: 20_000 },
    );
  } catch {
    // Cleanup is a convenience only.
  }
}
