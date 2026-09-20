import { format, parseISO, isValid, isToday, isYesterday } from 'date-fns';

export const formatDate = (dateString?: string | null, formatStr: string = 'dd MMM yyyy'): string => {
  if (!dateString) return '-';
  try {
    const d = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(d)) return dateString;
    return format(d, formatStr);
  } catch {
    return dateString || '-';
  }
};

export const formatTime = (timeString?: string | null): string => {
  if (!timeString) return '-';
  if (timeString.includes(':') && (timeString.includes('AM') || timeString.includes('PM'))) {
    return timeString;
  }
  try {
    const [h, m] = timeString.split(':');
    const hours = parseInt(h, 10);
    const mins = m ? m.split(' ')[0] : '00';
    if (isNaN(hours)) return timeString;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${mins} ${ampm}`;
  } catch {
    return timeString;
  }
};

export const formatDateTime = (dateTimeString?: string | null): string => {
  if (!dateTimeString) return '-';
  try {
    const d = parseISO(dateTimeString);
    if (!isValid(d)) return dateTimeString;
    if (isToday(d)) {
      return `Today at ${format(d, 'hh:mm a')}`;
    }
    if (isYesterday(d)) {
      return `Yesterday at ${format(d, 'hh:mm a')}`;
    }
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateTimeString;
  }
};

export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};
