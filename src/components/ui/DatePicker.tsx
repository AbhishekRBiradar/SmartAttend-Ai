import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  selected?: Date | string | null;
  value?: Date | string | null;
  onChange: (date: any) => void;
  placeholder?: string;
  placeholderText?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  dateFormat?: string;
  [key: string]: any;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  value,
  onChange,
  placeholder,
  placeholderText,
  className = '',
  disabled = false,
  minDate,
  maxDate,
  ...rest
}) => {
  const dateVal = selected || value;
  let formattedValue = '';

  if (dateVal instanceof Date) {
    formattedValue = dateVal.toISOString().split('T')[0];
  } else if (typeof dateVal === 'string') {
    formattedValue = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
  }

  const minStr = minDate instanceof Date ? minDate.toISOString().split('T')[0] : minDate;
  const maxStr = maxDate instanceof Date ? maxDate.toISOString().split('T')[0] : maxDate;

  return (
    <div className="relative inline-flex items-center w-full">
      <input
        type="date"
        value={formattedValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={minStr}
        max={maxStr}
        placeholder={placeholder || placeholderText || 'Select date'}
        className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${className}`}
        {...rest}
      />
    </div>
  );
};
