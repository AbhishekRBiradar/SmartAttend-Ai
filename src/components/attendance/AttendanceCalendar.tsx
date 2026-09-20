import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { Attendance } from '../../types';

interface AttendanceCalendarProps {
  attendances?: Attendance[];
  records?: any[];
  onSelectDate?: (dateStr: string) => void;
  onDateClick?: (dateStr: string, records: any[]) => void;
  selectedDate?: string;
  className?: string;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  attendances,
  records,
  onSelectDate,
  onDateClick,
  selectedDate,
  className = ''
}) => {
  const activeRecords: Attendance[] = (records || attendances || []) as Attendance[];
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Build matrix of days
  const rows: React.ReactNode[] = [];
  let days: React.ReactNode[] = [];
  let day = startDate;

  // Map attendance by date string
  const attendanceByDate = new Map<string, Attendance[]>();
  activeRecords.forEach(att => {
    const dStr = att.date || (att.timestamp ? att.timestamp.split('T')[0] : '');
    if (dStr) {
      const list = attendanceByDate.get(dStr) || [];
      list.push(att);
      attendanceByDate.set(dStr, list);
    }
  });

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const formattedDate = format(cloneDay, 'd');
      const dateKey = format(cloneDay, 'yyyy-MM-dd');
      const dayAttendances = attendanceByDate.get(dateKey) || [];

      const isCurrentMonth = isSameMonth(cloneDay, monthStart);
      const isSelected = selectedDate === dateKey;
      const isCurrentToday = isSameDay(cloneDay, new Date());

      const presentCount = dayAttendances.filter(a => a.status === 'PRESENT').length;
      const lateCount = dayAttendances.filter(a => a.status === 'LATE').length;
      const absentCount = dayAttendances.filter(a => a.status === 'ABSENT').length;

      days.push(
        <button
          key={dateKey}
          type="button"
          onClick={() => {
            if (onSelectDate) onSelectDate(dateKey);
            if (onDateClick) onDateClick(dateKey, dayAttendances);
          }}
          className={`h-16 sm:h-20 p-1.5 border border-slate-100 dark:border-slate-800/80 rounded-xl flex flex-col justify-between text-left transition-all ${
            !isCurrentMonth ? 'opacity-30 bg-slate-50/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-800/50'
          } ${
            isSelected
              ? 'ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
              : 'hover:border-indigo-300 dark:hover:border-indigo-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                isCurrentToday
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {formattedDate}
            </span>
            {dayAttendances.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400">
                {dayAttendances.length}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-auto">
            {presentCount > 0 && (
              <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {presentCount}P
              </span>
            )}
            {lateCount > 0 && (
              <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {lateCount}L
              </span>
            )}
            {absentCount > 0 && (
              <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {absentCount}A
              </span>
            )}
          </div>
        </button>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toISOString()} className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className={`glass-card p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
        {dayHeaders.map(d => (
          <div key={d} className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="space-y-1.5 sm:space-y-2">
        {rows}
      </div>
    </div>
  );
};

export default AttendanceCalendar;
