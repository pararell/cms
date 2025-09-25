export interface CalendarDay {
  value: number;
  valueTwoDigits: string;
  hasNote?: boolean;
  today?: boolean;
}

export interface CalendarMonth {
  month: number;
  monthTwoDigits: string;
  monthLabel: string;
  year: number;
  placeholders: number[];
  days: CalendarDay[];
}

export interface CalendarNoteLike {
  date?: string | null;
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  new Date(0, index).toLocaleString('default', { month: 'long' })
);

const padNumber = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

export function createCalendar(monthCount = 13): CalendarMonth[] {
  const start = new Date();
  const months: CalendarMonth[] = [];

  for (let offset = 0; offset < monthCount; offset += 1) {
    const current = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    const year = current.getFullYear();
    const monthIndex = current.getMonth();
    const month = monthIndex + 1;
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const placeholders = Array(firstDay === 0 ? 6 : firstDay - 1).fill(0);
    const days = Array.from({ length: daysInMonth }, (_, dayIndex) => {
      const value = dayIndex + 1;
      return {
        value,
        valueTwoDigits: padNumber(value),
      } satisfies CalendarDay;
    });

    months.push({
      month,
      monthTwoDigits: padNumber(month),
      monthLabel: MONTH_NAMES[monthIndex] ?? `${month}`,
      year,
      placeholders,
      days,
    });
  }

  return months;
}

export function markCalendarsWithNotes(
  calendars: CalendarMonth[],
  notes: CalendarNoteLike[]
): CalendarMonth[] {
  const noteDates = new Set<string>();
  notes.forEach((note) => {
    const date = note?.date;
    if (!date) {
      return;
    }
    const normalized = String(date).slice(0, 10);
    if (normalized) {
      noteDates.add(normalized);
    }
  });

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  return calendars.map((calendar) => {
    const isCurrentMonth = calendar.year === todayYear && calendar.month === todayMonth;
    return {
      ...calendar,
      days: calendar.days.map((day) => {
        const dateKey = `${calendar.year}-${calendar.monthTwoDigits}-${day.valueTwoDigits}`;
        return {
          ...day,
          hasNote: noteDates.has(dateKey),
          today: isCurrentMonth && day.value === todayDay,
        } satisfies CalendarDay;
      }),
    } satisfies CalendarMonth;
  });
}
