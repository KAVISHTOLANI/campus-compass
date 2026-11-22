import { describe, expect, it } from 'vitest';
import { filterResources, hoursLabel, openState, toMin, validateResource, type Hours, type Resource } from './campus';

const weekdays: Hours = [[540, 1020], [540, 1020], [540, 1020], [540, 1020], [540, 1020], null, null];
const late: Hours = [[480, 1560], [480, 1560], [480, 1560], [480, 1560], [480, 1560], [600, 1080], null];
const always: Hours = Array(7).fill([0, 1440]);
// 2026-03-02 is a Monday
const at = (day: number, h: number, m = 0) => new Date(2026, 2, 2 + day, h, m);

describe('open status', () => {
  it('handles open, closing soon and closed', () => {
    expect(openState(weekdays, at(0, 10)).state).toBe('open');
    expect(openState(weekdays, at(0, 16, 30))).toEqual({ state: 'closing', label: 'Closes soon · 17:00' });
    expect(openState(weekdays, at(0, 8))).toEqual({ state: 'closed', label: 'Closed · opens 09:00' });
    expect(openState(weekdays, at(0, 18)).label).toBe('Closed · opens tomorrow 09:00');
    expect(openState(weekdays, at(5, 12)).label).toBe('Closed · opens Mon 09:00');
  });
  it('handles hours past midnight from the previous day', () => {
    expect(openState(late, at(1, 0, 30)).label).toBe('Open until 02:00');
    expect(openState(late, at(6, 1)).state).toBe('closed'); // Saturday closes 18:00, no spill into Sunday
  });
  it('recognises 24-hour places', () => {
    expect(openState(always, at(3, 3)).state).toBe('always');
    expect(hoursLabel([0, 1440])).toBe('24 hours');
    expect(hoursLabel([480, 1560])).toBe('08:00 – 02:00 (next day)');
    expect(hoursLabel(null)).toBe('Closed');
  });
});

describe('filtering and validation', () => {
  const r = (o: Partial<Resource>): Resource => ({ id: Math.random().toString(), name: 'X', category: 'Library', description: '', building: 'Main', hours: weekdays, ...o });
  const list = [r({ id: 'a', name: 'Main Library' }), r({ id: 'b', name: 'Health Centre', category: 'Health', hours: always }), r({ id: 'c', name: 'Café', category: 'Food', description: 'coffee and soup' })];
  it('filters by query, category, open now and favourites', () => {
    const base = { query: '', categories: [], openNow: false, favoritesOnly: false };
    expect(filterResources(list, { ...base, query: 'soup' }, [], at(0, 10)).map((x) => x.id)).toEqual(['c']);
    expect(filterResources(list, { ...base, categories: ['Health', 'Food'] }, [], at(0, 10))).toHaveLength(2);
    expect(filterResources(list, { ...base, openNow: true }, [], at(0, 20)).map((x) => x.id)).toEqual(['b']);
    expect(filterResources(list, { ...base, favoritesOnly: true }, ['a'], at(0, 10)).map((x) => x.id)).toEqual(['a']);
  });
  it('validates new resources', () => {
    expect(toMin('24:00')).toBe(1440);
    expect(toMin('25:00')).toBeNull();
    const e = validateResource({ name: '', category: '', building: '', email: 'nope', phone: 'abc', open: '9', close: '9', days: [] });
    expect(Object.keys(e).sort()).toEqual(['building', 'category', 'close', 'days', 'email', 'name', 'open', 'phone']);
  });
});
