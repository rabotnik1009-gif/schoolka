export interface Vacation {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  days: number;
}

export const VACATIONS: Vacation[] = [
  { name: "Осенние", startDate: "2025-11-02", endDate: "2025-11-09", days: 8 },
  { name: "Зимние", startDate: "2025-12-25", endDate: "2026-01-07", days: 14 },
  { name: "Весенние", startDate: "2026-03-22", endDate: "2026-03-29", days: 8 },
  { name: "Летние", startDate: "2026-06-01", endDate: "2026-08-31", days: 92 },
];

export interface VacationStatus {
  vacation: Vacation;
  isCurrent: boolean;
  isPast: boolean;
  daysUntil: number; // negative = past
}

export function getVacationStatuses(today: Date): VacationStatus[] {
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return VACATIONS.map((v) => {
    const [sy, sm, sd] = v.startDate.split("-").map(Number);
    const [ey, em, ed] = v.endDate.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd);
    const endMs = Date.UTC(ey, em - 1, ed);

    const isCurrent = todayMs >= startMs && todayMs <= endMs;
    const isPast = todayMs > endMs;
    const daysUntil = Math.ceil((startMs - todayMs) / 86400000);

    return { vacation: v, isCurrent, isPast, daysUntil };
  });
}

export function getNextVacation(today: Date): VacationStatus | null {
  const statuses = getVacationStatuses(today);
  const upcoming = statuses.filter((s) => !s.isPast && !s.isCurrent);
  if (upcoming.length === 0) return null;
  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil)[0];
}

export function formatVacationDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d} ${months[m - 1]}`;
}
