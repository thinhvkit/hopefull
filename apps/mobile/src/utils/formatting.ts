import i18n from '@/i18n';

// Locale mapping for Intl API
const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  vi: 'vi-VN',
  ar: 'ar-SA',
};

const getLocale = (): string => {
  return LOCALE_MAP[i18n.language] || 'en-US';
};

// Date formatting
export const formatDate = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(d);
};

export const formatDateShort = (date: Date | string | number): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateNumeric = (date: Date | string | number): string => {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Time formatting
export const formatTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(d);
};

export const formatTime24 = (date: Date | string | number): string => {
  return formatTime(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// Date and time combined
export const formatDateTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(d);
};

// Relative time formatting (e.g., "2 hours ago", "in 3 days")
export const formatRelativeTime = (date: Date | string | number): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale();
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  } else if (Math.abs(diffDay) < 7) {
    return rtf.format(diffDay, 'day');
  } else if (Math.abs(diffWeek) < 4) {
    return rtf.format(diffWeek, 'week');
  } else if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, 'month');
  } else {
    return rtf.format(diffYear, 'year');
  }
};

// Currency formatting
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string => {
  const locale = getLocale();

  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(amount);
};

// Format currency from cents
export const formatCurrencyFromCents = (
  cents: number,
  currency: string = 'USD'
): string => {
  return formatCurrency(cents / 100, currency);
};

// Number formatting
export const formatNumber = (
  num: number,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, options).format(num);
};

export const formatPercent = (num: number, decimals: number = 0): string => {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatCompact = (num: number): string => {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(num);
};

// Weekday and month names
export const getWeekdays = (format: 'long' | 'short' | 'narrow' = 'long'): string[] => {
  const locale = getLocale();
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format });
  const weekdays: string[] = [];

  // Start from a known Sunday (Jan 4, 1970)
  for (let i = 4; i <= 10; i++) {
    const date = new Date(1970, 0, i);
    weekdays.push(formatter.format(date));
  }

  return weekdays;
};

export const getMonths = (format: 'long' | 'short' | 'narrow' = 'long'): string[] => {
  const locale = getLocale();
  const formatter = new Intl.DateTimeFormat(locale, { month: format });
  const months: string[] = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(2000, i, 1);
    months.push(formatter.format(date));
  }

  return months;
};

// Appointment-specific formatting
export const formatAppointmentDate = (date: Date | string | number): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale();

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const formatAppointmentTime = (
  startDate: Date | string | number,
  endDate?: Date | string | number
): string => {
  const start =
    typeof startDate === 'string' || typeof startDate === 'number'
      ? new Date(startDate)
      : startDate;

  const startTime = formatTime(start);

  if (endDate) {
    const end =
      typeof endDate === 'string' || typeof endDate === 'number'
        ? new Date(endDate)
        : endDate;
    const endTime = formatTime(end);
    return `${startTime} - ${endTime}`;
  }

  return startTime;
};

// Duration formatting
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} ${i18n.t('time.minutes')}`;
  } else if (mins === 0) {
    return `${hours} ${i18n.t('time.hours')}`;
  } else {
    return `${hours} ${i18n.t('time.hours')} ${mins} ${i18n.t('time.minutes')}`;
  }
};
