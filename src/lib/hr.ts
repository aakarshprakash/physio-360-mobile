import { time12 } from './format';
import type { Tone } from './theme';
import type { Presence } from './types';

export const LEAVE_TONES: Record<string, Tone> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'neutral' };

export function presenceLabel(p?: Presence): { label: string; tone: Tone } {
  if (!p) return { label: '—', tone: 'neutral' };
  if (p.state === 'in') return { label: `In ${time12(p.check_in)}`, tone: 'success' };
  if (p.state === 'out') return { label: `Left ${time12(p.check_out)}`, tone: 'neutral' };
  if (p.state === 'leave') return { label: 'On leave', tone: 'warning' };
  return { label: 'Not in', tone: 'neutral' };
}
