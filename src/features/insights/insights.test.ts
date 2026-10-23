const insert = vi.hoisted(() => vi.fn());
vi.mock('@/features/account/client', () => ({
  accountsConfigured: true,
  accountClient: { from: () => ({ insert }) },
}));

const { clearPendingInsights, flushInsights, track } = await import('./insights');
const { useSettings } = await import('@/features/settings/settingsStore');

const queued = () =>
  JSON.parse(localStorage.getItem('lampstand.insights.queue') ?? '[]') as unknown[];

beforeEach(() => {
  vi.stubEnv('MODE', 'production');
  vi.useFakeTimers();
  localStorage.clear();
  insert.mockReset().mockResolvedValue({ error: null });
  useSettings.setState({ insights: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it('sends only the event name, a random device code and the date', async () => {
  track('plan_day_completed');
  track('google_chosen');
  await flushInsights();
  const [rows] = insert.mock.calls[0]! as [Record<string, unknown>[]];
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(Object.keys(row).sort()).toEqual(['device', 'name', 'occurred_on']);
    expect(row.device).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.occurred_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
  expect(rows[0]!.device).toBe(rows[1]!.device);
  expect(queued()).toEqual([]);
});

it('counts reading once a day per device', () => {
  track('chapter_read');
  track('chapter_read');
  track('reading_resumed');
  expect(queued()).toHaveLength(2);
});

it('keeps events for later when sending fails', async () => {
  insert.mockResolvedValueOnce({ error: { message: 'FetchError: Failed to fetch' } });
  track('plan_started');
  await flushInsights();
  expect(queued()).toHaveLength(1);
  await flushInsights();
  expect(queued()).toHaveLength(0);
});

it('records and sends nothing when turned off, and drops what was waiting', async () => {
  track('plan_started');
  clearPendingInsights();
  useSettings.setState({ insights: false });
  track('plan_started');
  await flushInsights();
  expect(queued()).toEqual([]);
  expect(insert).not.toHaveBeenCalled();
});

it('never counts in tests', () => {
  vi.stubEnv('MODE', 'test');
  track('plan_started');
  expect(queued()).toEqual([]);
});
