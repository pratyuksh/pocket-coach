import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

/**
 * Shared end-to-end helpers.
 *
 * Tests that need a season create their own throwaway one through the same API the app uses
 * (signed in as a Head-trainer), give it a unique name, select it explicitly in the UI, and delete
 * it in a `finally` block. They never depend on seasons that already exist and never change which
 * season is active, so they are safe to run in parallel and against a developer's local data.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export const PASSWORD = 'Password123!';

export const ACCOUNTS = {
  admin: 'admin@club.de',
  head: 'headtrainer@club.de',
  trainer: 'trainer1@club.de',
  junior: 'junior1@club.de',
} as const;

/** `YYYY-MM-DD` for today plus an offset in days. */
export function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A name that cannot collide with another run or another worker. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ---------------------------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------------------------

export async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/(trainers|dashboard|sessions|$)/);
}

/** Selects a season by (partial) name in the schedule's season dropdown. */
export async function selectSeason(page: Page, name: string) {
  const select = page.locator('select').filter({ has: page.locator('option', { hasText: name }) });
  await expect(select).toBeVisible();
  const value = await select.locator('option', { hasText: name }).getAttribute('value');
  await select.selectOption(value as string);
}

/** Picks the option whose text contains `text` (option labels also carry emails and specialties). */
export async function selectByText(select: Locator, text: string) {
  const value = await select.locator('option', { hasText: text }).first().getAttribute('value');
  expect(value, `an option containing "${text}"`).toBeTruthy();
  await select.selectOption(value as string);
}

// ---------------------------------------------------------------------------------------------
// API (acts as the signed-in user, exactly like the web app does)
// ---------------------------------------------------------------------------------------------

function headers(token?: string) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token ?? ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function apiSignIn(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: headers(),
    data: { email, password: PASSWORD },
  });
  expect(res.ok(), `sign in as ${email}`).toBeTruthy();
  return (await res.json()).access_token as string;
}

export async function rpc<T = unknown>(
  request: APIRequestContext,
  token: string,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    headers: headers(token),
    data: args,
  });
  const body = await res.text();
  expect(res.ok(), `${fn}: ${body}`).toBeTruthy();
  return (body ? JSON.parse(body) : null) as T;
}

async function rest<T = unknown>(
  request: APIRequestContext,
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const res = await request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { ...headers(token), Prefer: 'return=representation' },
    data,
  });
  const body = await res.text();
  expect(res.ok(), `${method} ${path}: ${body}`).toBeTruthy();
  return (body ? JSON.parse(body) : null) as T;
}

interface TemplateData {
  player_groups: { name: string; description: string; sort_order: number }[];
  training_days: {
    day_of_week: number;
    default_start_time: string;
    default_end_time: string;
    location_name: string;
    groups: string[];
    required_regular?: number;
    required_junior?: number;
  }[];
}

export interface TestSeason {
  id: string;
  name: string;
  /** Dates of the generated sessions, ascending */
  sessionDates: string[];
}

/**
 * Creates an inactive, one-week season from the default template (so it has one session per
 * weekly slot) via the atomic `create_season` function. Sessions start as drafts.
 */
export async function createTestSeason(
  request: APIRequestContext,
  token: string,
  options: { startOffset?: number } = {},
): Promise<TestSeason> {
  const startOffset = options.startOffset ?? 21;
  const name = uniqueName('E2E Season');

  const [template] = await rest<{ template_data: TemplateData }[]>(
    request,
    token,
    'GET',
    'season_templates?is_default=eq.true&select=template_data',
  );
  const halls = await rest<{ id: string; name: string }[]>(
    request,
    token,
    'GET',
    'locations?select=id,name',
  );
  const hallId = (n: string) =>
    halls.find((h) => h.name.toLowerCase() === n.toLowerCase())?.id ?? null;

  const created = await rpc<{ season_id: string }>(request, token, 'create_season', {
    p_name: name,
    p_start_date: isoDate(startOffset),
    p_end_date: isoDate(startOffset + 6),
    p_is_active: false,
    p_groups: template.template_data.player_groups,
    p_slots: template.template_data.training_days.map((td) => ({
      day_of_week: td.day_of_week,
      default_start_time: td.default_start_time,
      default_end_time: td.default_end_time,
      location_id: hallId(td.location_name),
      player_group_names: td.groups,
      required_regular: td.required_regular,
      required_junior: td.required_junior,
    })),
  });

  const sessions = await rest<{ session_date: string }[]>(
    request,
    token,
    'GET',
    `sessions?season_id=eq.${created.season_id}&select=session_date&order=session_date.asc,start_time.asc`,
  );
  return { id: created.season_id, name, sessionDates: sessions.map((s) => s.session_date) };
}

export async function publishTestSeason(
  request: APIRequestContext,
  token: string,
  season: TestSeason,
) {
  await rpc(request, token, 'publish_sessions', {
    p_season_id: season.id,
    p_from: season.sessionDates[0],
    p_to: season.sessionDates[season.sessionDates.length - 1],
  });
}

/** Deleting the season removes its sessions and assignments. Safe to call when already gone. */
export async function deleteTestSeason(
  request: APIRequestContext,
  token: string,
  seasonId: string,
) {
  await request.fetch(`${SUPABASE_URL}/rest/v1/seasons?id=eq.${seasonId}`, {
    method: 'DELETE',
    headers: headers(token),
  });
}

export async function deleteSeasonByName(request: APIRequestContext, token: string, name: string) {
  const found = await rest<{ id: string }[]>(
    request,
    token,
    'GET',
    `seasons?name=eq.${encodeURIComponent(name)}&select=id`,
  );
  for (const s of found) await deleteTestSeason(request, token, s.id);
}

export async function profileIdByEmail(
  request: APIRequestContext,
  token: string,
  email: string,
): Promise<string> {
  const rows = await rest<{ id: string }[]>(
    request,
    token,
    'GET',
    `profiles?email=eq.${encodeURIComponent(email)}&select=id`,
  );
  expect(rows, `profile for ${email}`).toHaveLength(1);
  return rows[0].id;
}

export async function sessionIdByDate(
  request: APIRequestContext,
  token: string,
  seasonId: string,
  date: string,
): Promise<string> {
  const rows = await rest<{ id: string }[]>(
    request,
    token,
    'GET',
    `sessions?season_id=eq.${seasonId}&session_date=eq.${date}&select=id&order=start_time.asc`,
  );
  expect(rows.length, `a session on ${date}`).toBeGreaterThan(0);
  return rows[0].id;
}

/**
 * Registers a plain trainer the way the app's own registration does: sign up, then create the
 * user's own profile and base role as that user. Returns the new user's id.
 */
export async function createTrainer(
  request: APIRequestContext,
  email: string,
  displayName: string,
): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: headers(),
    data: { email, password: PASSWORD, data: { display_name: displayName } },
  });
  const body = await res.json();
  expect(res.ok(), `sign up ${email}: ${JSON.stringify(body)}`).toBeTruthy();
  const token = body.access_token as string;
  const id = body.user.id as string;

  await rest(request, token, 'POST', 'profiles', {
    id,
    display_name: displayName,
    email,
    is_active: true,
    preferred_language: 'de',
  });
  await rest(request, token, 'POST', 'user_roles', { profile_id: id, role: 'trainer' });
  return id;
}

export async function setAssignments(
  request: APIRequestContext,
  token: string,
  sessionId: string,
  rows: {
    profile_id: string;
    track: 'regular' | 'junior_coach';
    session_role: 'primary' | 'assistant_coach';
  }[],
) {
  await rpc(request, token, 'set_session_assignments', { p_session_id: sessionId, p_rows: rows });
}

/** Profile ids with an active assignment on the session. */
export async function activeAssigneeIds(
  request: APIRequestContext,
  token: string,
  sessionId: string,
): Promise<string[]> {
  const rows = await rest<{ profile_id: string }[]>(
    request,
    token,
    'GET',
    `session_assignments?session_id=eq.${sessionId}&status=eq.active&select=profile_id`,
  );
  return rows.map((r) => r.profile_id);
}

/** Session ids of the season for one weekday (0 = Sunday), ascending by date. */
export async function sessionIdsByWeekday(
  request: APIRequestContext,
  token: string,
  seasonId: string,
  dayOfWeek: number,
): Promise<string[]> {
  const rows = await rest<{ id: string }[]>(
    request,
    token,
    'GET',
    `sessions?season_id=eq.${seasonId}&day_of_week=eq.${dayOfWeek}&select=id&order=session_date.asc,start_time.asc`,
  );
  return rows.map((r) => r.id);
}

export async function deleteHallByName(request: APIRequestContext, token: string, name: string) {
  await request.fetch(`${SUPABASE_URL}/rest/v1/locations?name=eq.${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: headers(token),
  });
}
