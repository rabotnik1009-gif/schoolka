export interface Lesson {
  subject: string;
  room: string;
  icon: string;
  color: string;
}

export const SCHEDULE: Record<number, Lesson[]> = {
  0: [
    { subject: "Труды", room: "30", icon: "hammer-outline", color: "#FF9F0A" },
    { subject: "Труды", room: "30", icon: "hammer-outline", color: "#FF9F0A" },
    { subject: "Физика", room: "26", icon: "flask-outline", color: "#5E5CE6" },
    { subject: "История Беларуси", room: "23", icon: "book-outline", color: "#32ADE6" },
    { subject: "Бел. Лит", room: "29", icon: "book-outline", color: "#30D158" },
    { subject: "География", room: "24", icon: "earth-outline", color: "#4F8EF7" },
  ],
  1: [
    { subject: "Биология", room: "22", icon: "leaf-outline", color: "#30D158" },
    { subject: "Информатика", room: "11", icon: "desktop-outline", color: "#5E5CE6" },
    { subject: "Физкультура", room: "сп. зал", icon: "fitness-outline", color: "#FF9F0A" },
    { subject: "Алгебра", room: "16", icon: "calculator-outline", color: "#32ADE6" },
    { subject: "Немецкий язык", room: "20", icon: "globe-outline", color: "#FF453A" },
    { subject: "Физика", room: "32", icon: "flask-outline", color: "#5E5CE6" },
    { subject: "Астрономия", room: "32", icon: "planet-outline", color: "#4F8EF7" },
  ],
  2: [
    { subject: "Труды", room: "30", icon: "hammer-outline", color: "#FF9F0A" },
    { subject: "Труды", room: "30", icon: "hammer-outline", color: "#FF9F0A" },
    { subject: "Алгебра", room: "32", icon: "calculator-outline", color: "#32ADE6" },
    { subject: "Русская литература", room: "29", icon: "book-outline", color: "#30D158" },
    { subject: "Русский язык", room: "29", icon: "pencil-outline", color: "#FF9F0A" },
    { subject: "Химия", room: "28", icon: "flask-outline", color: "#FF453A" },
    { subject: "Общество", room: "10", icon: "people-outline", color: "#32ADE6" },
  ],
  3: [
    { subject: "Физкультура", room: "сп. зал", icon: "fitness-outline", color: "#FF9F0A" },
    { subject: "Труды", room: "30", icon: "hammer-outline", color: "#FF9F0A" },
    { subject: "Труды", room: "30", icon: "hammer-outline", color: "#FF9F0A" },
    { subject: "Бел. Лит", room: "27", icon: "book-outline", color: "#30D158" },
    { subject: "Бел. Яз", room: "27", icon: "create-outline", color: "#4F8EF7" },
    { subject: "Геометрия", room: "24", icon: "shapes-outline", color: "#5E5CE6" },
    { subject: "Физкультура", room: "сп. зал", icon: "fitness-outline", color: "#FF9F0A" },
  ],
  4: [
    { subject: "Русский язык", room: "29", icon: "pencil-outline", color: "#FF9F0A" },
    { subject: "Биология", room: "22", icon: "leaf-outline", color: "#30D158" },
    { subject: "История Беларуси", room: "23", icon: "book-outline", color: "#32ADE6" },
    { subject: "Физкультура", room: "сп. зал", icon: "fitness-outline", color: "#FF9F0A" },
    { subject: "Геометрия", room: "24", icon: "shapes-outline", color: "#5E5CE6" },
    { subject: "Немецкий язык", room: "20", icon: "globe-outline", color: "#FF453A" },
    { subject: "Химия", room: "28", icon: "flask-outline", color: "#FF453A" },
  ],
  5: [],
  6: [],
};

export const DAY_NAMES: Record<number, string> = {
  0: "Понедельник",
  1: "Вторник",
  2: "Среда",
  3: "Четверг",
  4: "Пятница",
  5: "Суббота",
  6: "Воскресенье",
};

export const LESSON_START_HOUR = 8;
export const LESSON_START_MIN = 0;
export const LESSON_DURATION = 45;
export const BREAK_DURATION = 15;

/** Returns current time in Europe/Moscow (UTC+3), regardless of device timezone */
export function getMoscowNow(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 3 * 3600000); // UTC+3
}

/** Total minutes from midnight for lesson start */
export function lessonStartTotalMins(index: number): number {
  return LESSON_START_HOUR * 60 + LESSON_START_MIN + index * (LESSON_DURATION + BREAK_DURATION);
}

export function lessonStartTime(index: number): { h: number; m: number } {
  const total = lessonStartTotalMins(index);
  return { h: Math.floor(total / 60), m: total % 60 };
}

export function lessonEndTime(index: number): { h: number; m: number } {
  const start = lessonStartTime(index);
  const totalMins = start.h * 60 + start.m + LESSON_DURATION;
  return { h: Math.floor(totalMins / 60), m: totalMins % 60 };
}

export function fmt(t: { h: number; m: number }): string {
  return `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`;
}

/** Seconds from midnight for lesson start */
export function lessonStartSecs(index: number): number {
  return lessonStartTotalMins(index) * 60;
}

/** Seconds from midnight for lesson end */
export function lessonEndSecs(index: number): number {
  return lessonStartSecs(index) + LESSON_DURATION * 60;
}

export type LessonStatus =
  | { type: "weekend" }
  | { type: "before_school" }
  | { type: "after_school" }
  | {
      type: "lesson";
      index: number;
      lesson: Lesson;
      endsAt: string;
      secondsLeft: number;
    }
  | {
      type: "break";
      nextIndex: number;
      nextLesson: Lesson;
      startsAt: string;
      secondsLeft: number;
    };

export function getCurrentStatus(now: Date): LessonStatus {
  // Convert JS weekday: Sun=0 → 6, Mon=1 → 0, ...
  const jsDay = now.getDay();
  const day = jsDay === 0 ? 6 : jsDay - 1;
  const lessons = SCHEDULE[day];
  if (!lessons || lessons.length === 0) return { type: "weekend" };

  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const firstStart = lessonStartSecs(0);
  if (nowSecs < firstStart) return { type: "before_school" };

  for (let i = 0; i < lessons.length; i++) {
    const startSecs = lessonStartSecs(i);
    const endSecs = lessonEndSecs(i);
    const breakEndSecs = endSecs + BREAK_DURATION * 60;

    if (nowSecs >= startSecs && nowSecs < endSecs) {
      return {
        type: "lesson",
        index: i,
        lesson: lessons[i],
        endsAt: fmt(lessonEndTime(i)),
        secondsLeft: endSecs - nowSecs,
      };
    }
    if (i < lessons.length - 1 && nowSecs >= endSecs && nowSecs < breakEndSecs) {
      return {
        type: "break",
        nextIndex: i + 1,
        nextLesson: lessons[i + 1],
        startsAt: fmt(lessonStartTime(i + 1)),
        secondsLeft: lessonStartSecs(i + 1) - nowSecs,
      };
    }
  }

  return { type: "after_school" };
}

/** Format seconds as MM:SS */
export function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Get today's day index (Mon=0 ... Sun=6) in Moscow time */
export function getMoscowDayIndex(): number {
  const now = getMoscowNow();
  const jsDay = now.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}
