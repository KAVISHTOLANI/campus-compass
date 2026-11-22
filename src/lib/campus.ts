export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** [open, close] in minutes from midnight; close may exceed 1440 for past-midnight. null = closed. */
export type Hours = ([number, number] | null)[];

export interface Resource {
  id: string;
  name: string;
  category: string;
  description: string;
  building: string;
  room?: string;
  accessibility?: string;
  phone?: string;
  email?: string;
  hours: Hours; // 7 entries, Monday first
  demo?: boolean;
}

export const CATEGORIES = ['Library', 'Study spaces', 'Health', 'Wellbeing', 'Food', 'IT help', 'Careers', 'Accessibility', 'Transport'];

export const toMin = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h > 24 || mm > 59 || (h === 24 && mm > 0)) return null;
  return h * 60 + mm;
};
export const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function dayIndex(d: Date): Day {
  return ((d.getDay() + 6) % 7) as Day;
}

export type OpenState = { state: 'open' | 'closing' | 'closed' | 'always'; label: string };

/** Open status at a given moment, including hours that run past midnight from the previous day. */
export function openState(hours: Hours, now: Date): OpenState {
  const day = dayIndex(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = hours[day];
  const prev = hours[(day + 6) % 7];
  if (today && today[0] === 0 && today[1] >= 1440 && hours.every((h) => h && h[0] === 0 && h[1] >= 1440)) return { state: 'always', label: 'Open 24 hours' };
  let closeAt: number | null = null;
  if (prev && prev[1] > 1440 && mins < prev[1] - 1440) closeAt = prev[1] - 1440;
  if (today && mins >= today[0] && mins < today[1]) closeAt = today[1];
  if (closeAt != null) {
    const left = closeAt - mins;
    return left <= 60 ? { state: 'closing', label: `Closes soon · ${fmt(closeAt)}` } : { state: 'open', label: `Open until ${fmt(closeAt)}` };
  }
  return { state: 'closed', label: nextOpening(hours, now) };
}

function nextOpening(hours: Hours, now: Date): string {
  const day = dayIndex(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const h = hours[d];
    if (!h) continue;
    if (i === 0 && h[0] <= mins) continue;
    return i === 0 ? `Closed · opens ${fmt(h[0])}` : i === 1 ? `Closed · opens tomorrow ${fmt(h[0])}` : `Closed · opens ${DAYS[d].slice(0, 3)} ${fmt(h[0])}`;
  }
  return 'Closed · no hours listed';
}

export function hoursLabel(h: [number, number] | null): string {
  if (!h) return 'Closed';
  if (h[0] === 0 && h[1] >= 1440) return '24 hours';
  return `${fmt(h[0])} – ${fmt(h[1])}${h[1] > 1440 ? ' (next day)' : ''}`;
}

export interface Filters {
  query: string;
  categories: string[];
  openNow: boolean;
  favoritesOnly: boolean;
}

export function filterResources(list: Resource[], f: Filters, favorites: string[], now: Date): Resource[] {
  const q = f.query.trim().toLowerCase();
  return list.filter((r) => {
    if (f.categories.length && !f.categories.includes(r.category)) return false;
    if (f.favoritesOnly && !favorites.includes(r.id)) return false;
    if (f.openNow && openState(r.hours, now).state === 'closed') return false;
    if (!q) return true;
    return [r.name, r.description, r.building, r.room ?? '', r.category].some((s) => s.toLowerCase().includes(q));
  });
}

export function validateResource(input: { name: string; category: string; building: string; email: string; phone: string; open: string; close: string; days: number[] }) {
  const errors: Partial<Record<keyof typeof input, string>> = {};
  if (!input.name.trim()) errors.name = 'Enter the resource name.';
  if (!CATEGORIES.includes(input.category)) errors.category = 'Choose a category.';
  if (!input.building.trim()) errors.building = 'Say which building it is in.';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = 'Use an address like help@example.edu.';
  if (input.phone && !/^[+()\d\s-]{6,20}$/.test(input.phone)) errors.phone = 'Use digits, spaces, +, - or brackets.';
  const o = toMin(input.open), c = toMin(input.close);
  if (o == null) errors.open = 'Use a time like 09:00.';
  if (c == null) errors.close = 'Use a time like 17:30.';
  if (o != null && c != null && o === c) errors.close = 'Closing time must differ from opening time.';
  if (input.days.length === 0) errors.days = 'Pick at least one open day.';
  return errors;
}
