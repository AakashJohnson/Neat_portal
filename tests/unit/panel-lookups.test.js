import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ where: vi.fn(), raw: vi.fn(), db: vi.fn() }));
vi.mock('../../src/database/knex.js', () => ({
  db: Object.assign(mocks.db, { raw: mocks.raw }),
  table: name => name,
}));
import { fetchNeatId, getEoiProductDetails } from '../../src/services/panel/panelService.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.mockReturnValue({ select: () => ({ where: mocks.where }) });
});

it('returns an explicit not-found response for an unmatched NEAT ID', async () => {
  mocks.where.mockResolvedValue([]);
  await expect(fetchNeatId({ neat_id: 'missing' })).rejects.toMatchObject({ status: 404, body: { message: 'No results found.' } });
  expect(mocks.where).toHaveBeenCalledWith('neat_id', 'missing');
});

it('preserves matched company fields without changing the success contract', async () => {
  const record = { email: 'company@example.invalid', company: 'Search fixture', phone: '0000000000' };
  mocks.where.mockResolvedValue([record]);
  await expect(fetchNeatId({ neat_id: 'fixture' })).resolves.toEqual({ status: 200, body: { msg: 'succes', data: record } });
});

it('returns not found for an unmatched product, preserving parameter bindings', async () => {
  mocks.raw.mockResolvedValue([[]]);
  await expect(getEoiProductDetails({ code: 'missing' })).rejects.toMatchObject({ status: 404, body: { message: 'No results found.' } });
  expect(mocks.raw.mock.calls[0][1]).toEqual(['missing']);
});

it('does not disguise database failures as empty search results', async () => {
  const error = new Error('database unavailable');
  mocks.where.mockRejectedValue(error);
  mocks.raw.mockRejectedValue(error);
  await expect(fetchNeatId({ neat_id: 'fixture' })).rejects.toBe(error);
  await expect(getEoiProductDetails({ code: 'fixture' })).rejects.toBe(error);
});
