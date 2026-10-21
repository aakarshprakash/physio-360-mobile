import type { Currency } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Money in minor units → "₹1,200.00" (Indian grouping for INR). */
export function money(minor: number | null | undefined, currency: Currency): string {
  if (minor == null) return '—';
  const major = minor / 10 ** currency.exponent;
  const locale = currency.code === 'INR' ? 'en-IN' : 'en';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.code, minimumFractionDigits: currency.exponent, maximumFractionDigits: currency.exponent }).format(major);
  } catch {
    return `${currency.symbol}${major.toFixed(currency.exponent)}`;
  }
}

/** "₹1.4L" / "₹12.5K" for dashboards. */
export function moneyCompact(minor: number, currency: Currency): string {
  const major = minor / 10 ** currency.exponent;
  const s = currency.symbol;
  if (currency.code === 'INR') {
    if (major >= 1e7) return `${s}${(major / 1e7).toFixed(1)}Cr`;
    if (major >= 1e5) return `${s}${(major / 1e5).toFixed(1)}L`;
  }
  if (major >= 1e6) return `${s}${(major / 1e6).toFixed(1)}M`;
  if (major >= 1e3) return `${s}${(major / 1e3).toFixed(1)}K`;
  return `${s}${Math.round(major)}`;
}

/** Today's date (YYYY-MM-DD) in the clinic's timezone. */
export function todayIn(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + n));
  return dt.toISOString().slice(0, 10);
}

function parts(local: string) {
  const [date, time = '00:00'] = local.split('T');
  const [y, m, d] = date!.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return { y: y!, m: m!, d: d!, hh: hh ?? 0, mm: mm ?? 0, dow: new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() };
}

/** "9:30 AM" from a clinic-local "YYYY-MM-DDTHH:mm" or "HH:mm". */
export function time12(local: string | null | undefined): string {
  if (!local) return '—';
  const t = local.includes('T') ? local.split('T')[1]! : local;
  const [h, m] = t.split(':').map(Number);
  const suffix = (h ?? 0) >= 12 ? 'PM' : 'AM';
  const hour = ((h ?? 0) % 12) || 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

/** "Wed, 21 Oct" (or with year). */
export function dayLabel(local: string, withYear = false): string {
  const p = parts(local);
  return `${DAYS[p.dow]}, ${p.d} ${MONTHS[p.m - 1]}${withYear ? ` ${p.y}` : ''}`;
}

export function dateLabel(local: string | null | undefined): string {
  if (!local) return '—';
  const p = parts(local);
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

export function weekdayShort(date: string): string {
  return DAYS[parts(date).dow]!;
}

export function dayNumber(date: string): number {
  return parts(date).d;
}

export function monthShort(date: string): string {
  return MONTHS[parts(date).m - 1]!;
}

/** UTC ISO instant → clinic-local "d MMM, h:mm a". */
export function instant(iso: string | null | undefined, tz: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: tz, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
}

export function hoursMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function greeting(tz: string): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function initials(name: string): string {
  return name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/** "partially_paid" → "Partially paid", "male" → "Male". */
export function label(value: string | null | undefined): string {
  if (!value) return '';
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Clinic owner', admin: 'Administrator', therapist: 'Physiotherapist', receptionist: 'Front desk', accountant: 'Accountant',
};

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled', confirmed: 'Confirmed', checked_in: 'Checked in', in_progress: 'In session', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};
