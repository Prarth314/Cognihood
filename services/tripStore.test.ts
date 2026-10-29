import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const range = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range };
  return { query, range, from: vi.fn(() => query) };
});
vi.mock('./supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({ from: mock.from }),
}));
import { getAllTrips, getTripsPage } from './tripStore';

function row(id: number) {
  return {
    id: String(id),
    user_id: 'fixture-user',
    start_time: id,
    end_time: id + 30000,
    duration_ms: 30000,
    avg_score: 80,
    min_score: 80,
    max_score: 80,
    events: [],
    coaching_tips: [],
    score_timeline: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.query.select.mockReturnValue(mock.query);
  mock.query.eq.mockReturnValue(mock.query);
  mock.query.order.mockReturnValue(mock.query);
});

describe('bounded trip retrieval', () => {
  it('fetches all pages rather than relying on the default API row limit', async () => {
    mock.range
      .mockResolvedValueOnce({ data: Array.from({ length: 50 }, (_, i) => row(i)) })
      .mockResolvedValueOnce({ data: [row(50)] });
    expect(await getAllTrips('fixture-user')).toHaveLength(51);
    expect(mock.range.mock.calls).toEqual([
      [0, 49],
      [50, 99],
    ]);
    expect(mock.query.eq).toHaveBeenCalledWith('user_id', 'fixture-user');
  });
  it('fails an oversized export instead of returning a partial success', async () => {
    mock.range.mockResolvedValue({ data: [{ ...row(0), events: [{ message: 'x'.repeat(20_000_001) }] }] });
    await expect(getAllTrips('fixture-user')).rejects.toThrow('Export exceeds');
  });
  it('rejects unauthenticated and invalid page requests before sending a query', async () => {
    await expect(getTripsPage(undefined)).rejects.toThrow('signed in');
    await expect(getTripsPage('fixture-user', -1)).rejects.toThrow('Invalid trip page');
    expect(mock.from).not.toHaveBeenCalled();
  });
});
