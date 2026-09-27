import { vi } from 'vitest';

export const mockSupabaseFrom = vi.fn();
export const mockSupabaseRpc = vi.fn();
export const mockSupabaseAuth = {
  getUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

export const mockSupabaseClient = {
  from: (...args: any[]) => mockSupabaseFrom(...args),
  rpc: (...args: any[]) => mockSupabaseRpc(...args),
  auth: mockSupabaseAuth,
};

export function createQueryMock(data: any = null, error: any = null) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
}

export function resetSupabaseMocks() {
  mockSupabaseFrom.mockReset();
  mockSupabaseRpc.mockReset();
}
