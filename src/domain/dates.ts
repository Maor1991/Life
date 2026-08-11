export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return formatDate(new Date());
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** Monday-based day index of the week: Monday = 1 ... Sunday = 7 */
export function isoDayOfWeek(date: string): number {
  const jsDay = parseDate(date).getDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

/** Returns [mondayDate, sundayDate] for the week containing `date` */
export function weekRange(date: string): [string, string] {
  const dow = isoDayOfWeek(date);
  const monday = addDays(date, -(dow - 1));
  const sunday = addDays(monday, 6);
  return [monday, sunday];
}
