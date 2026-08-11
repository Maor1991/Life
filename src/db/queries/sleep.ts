import { supabase, unwrap, unwrapRows } from '../client';
import type { SleepDaySummary, SleepKind, SleepQuality, SleepSession } from '../../types';

interface SleepRow {
  id: number;
  date: string;
  kind: string;
  hours: number;
  quality: number;
}

function toSession(row: SleepRow): SleepSession {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind as SleepKind,
    hours: row.hours,
    quality: row.quality as SleepQuality,
  };
}

export interface NewSleepSession {
  date: string;
  kind: SleepKind;
  hours: number;
  quality: number;
}

export async function addSleepSession(session: NewSleepSession): Promise<number> {
  const row = unwrap(
    await supabase
      .from('sleep_sessions')
      .insert({
        date: session.date,
        kind: session.kind,
        hours: session.hours,
        quality: session.quality,
      })
      .select('id')
      .single<{ id: number }>()
  );
  return row.id;
}

export async function updateSleepSession(id: number, session: NewSleepSession): Promise<void> {
  unwrap(
    await supabase
      .from('sleep_sessions')
      .update({
        date: session.date,
        kind: session.kind,
        hours: session.hours,
        quality: session.quality,
      })
      .eq('id', id)
  );
}

export async function deleteSleepSession(id: number): Promise<void> {
  unwrap(await supabase.from('sleep_sessions').delete().eq('id', id));
}

export async function getSleepSessionsByDate(date: string): Promise<SleepSession[]> {
  const rows = unwrap(
    await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('date', date)
      // Night sleep first, then naps in insertion order. The old query sorted
      // on `kind = 'nap'` ascending; alphabetically 'nap' < 'night', so the
      // equivalent here is descending.
      .order('kind', { ascending: false })
      .order('id', { ascending: true })
      .returns<SleepRow[]>()
  );
  return rows.map(toSession);
}

/**
 * Aggregates each day's sessions: hours are summed and quality is averaged
 * weighted by hours, so a long night counts more than a short nap.
 * Runs as a Postgres function because PostgREST cannot express GROUP BY.
 */
export async function getSleepDaySummaries(limit = 400): Promise<SleepDaySummary[]> {
  const rows = unwrapRows<{ date: string; hours: number; quality: number }>(
    await supabase.rpc('sleep_day_summaries', { p_limit: limit })
  );
  return rows.map((r) => ({ date: r.date, hours: r.hours, quality: r.quality }));
}
