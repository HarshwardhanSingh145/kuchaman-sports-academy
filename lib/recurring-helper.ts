import { Booking, AcademyConfig, RecurringPricingConfig, DateSpecificBlock } from './types';
import { parseTimeRange, checkBookingConflict } from './timing-helper';
import { DEFAULT_RECURRING_PRICING, DEFAULT_CONFIG } from './defaults';

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type DayOfWeek = typeof DAY_NAMES[number];

export type RecurrenceType = 'weekly' | 'monthly' | 'preferred_time';

export const DAYS_OF_WEEK = [
  { key: 'Mon', name: 'Monday', hindi: 'सोम' },
  { key: 'Tue', name: 'Tuesday', hindi: 'मंगल' },
  { key: 'Wed', name: 'Wednesday', hindi: 'बुध' },
  { key: 'Thu', name: 'Thursday', hindi: 'गुरु' },
  { key: 'Fri', name: 'Friday', hindi: 'शुक्र' },
  { key: 'Sat', name: 'Saturday', hindi: 'शनि' },
  { key: 'Sun', name: 'Sunday', hindi: 'रवि' },
] as const;

/**
 * Returns the day name (e.g. 'Monday') for a given YYYY-MM-DD string
 */
export function getDayNameFromDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return '';
  const dateObj = new Date(year, month - 1, day);
  return DAY_NAMES[dateObj.getDay()] || '';
}

/**
 * Format date for clean UI display (e.g. "20 Sep 2026")
 */
export function formatDisplayDate(dateStr?: string, isHindi = false): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr || '';
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generate all calendar dates matching recurring days between start date and duration.
 */
export function generateRecurringDates(options: {
  startDate?: string;
  start_date?: string;
  recurrenceType?: RecurrenceType;
  recurrence_type?: RecurrenceType;
  recurrenceDays?: string[];
  recurrence_days?: string[];
  weeksCount?: number;
  duration_weeks?: number;
  monthsCount?: number;
  duration_months?: number;
  endDate?: string;
  end_date?: string;
}): string[] & { dates?: string[]; calculatedEndDate?: string } {
  const sDate = options.startDate || options.start_date || '';
  const rType = options.recurrenceType || options.recurrence_type || 'weekly';
  const rDays = options.recurrenceDays || options.recurrence_days || [];
  const wCount = options.weeksCount ?? options.duration_weeks ?? 4;
  const mCount = options.monthsCount ?? options.duration_months ?? 1;
  const eDate = options.endDate || options.end_date;

  if (!sDate || rDays.length === 0) {
    const res: any = [];
    res.dates = [];
    res.calculatedEndDate = sDate;
    return res;
  }

  const [startYear, startMonth, startDay] = sDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  
  let end: Date;
  if (eDate) {
    const [eYear, eMonth, eDay] = eDate.split('-').map(Number);
    end = new Date(eYear, eMonth - 1, eDay);
  } else if (rType === 'monthly' || (rType === 'preferred_time' && mCount > 0 && !options.weeksCount && !options.duration_weeks)) {
    // Add monthsCount to start date
    end = new Date(startYear, startMonth - 1 + mCount, startDay);
    end.setDate(end.getDate() - 1);
  } else {
    // Weekly or weeks-based preferred time
    const totalDays = wCount * 7;
    end = new Date(start.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);
  }

  // Normalize recurrence days to lowercase for matching (handles 'Mon', 'monday', etc.)
  const targetDays = rDays.map((d) => d.trim().toLowerCase());

  const matchedDates: string[] = [];
  const current = new Date(start.getTime());

  // Loop through all dates in range
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;

    const currentDayName = DAY_NAMES[current.getDay()].toLowerCase();
    const shortKey = DAYS_OF_WEEK.find(
      (item) => item.name.toLowerCase() === currentDayName
    )?.key.toLowerCase();

    if (
      targetDays.includes(currentDayName) ||
      (shortKey && targetDays.includes(shortKey))
    ) {
      matchedDates.push(iso);
    }

    current.setDate(current.getDate() + 1);
  }

  const lastDate = matchedDates.length > 0 ? matchedDates[matchedDates.length - 1] : sDate;
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(
    end.getDate()
  ).padStart(2, '0')}`;

  const finalArr: any = matchedDates;
  finalArr.dates = matchedDates;
  finalArr.calculatedEndDate = matchedDates.length > 0 ? lastDate : endIso;

  return finalArr;
}

/**
 * Calculates recurring pricing dynamically based on Admin configuration.
 * Do NOT hardcode prices - relies on AcademyConfig.
 */
export function calculateRecurringPricing(options: {
  sport: 'cricket' | 'swimming';
  category?: string;
  resourceId?: string;
  totalSessions?: number;
  total_sessions?: number;
  durationHours?: number;
  duration_hours?: number;
  playerCount?: number;
  player_count?: number;
  recurrenceType?: RecurrenceType;
  recurrence_type?: RecurrenceType;
  config?: AcademyConfig;
  customPricing?: RecurringPricingConfig;
}): {
  ratePerSession: number;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  finalTotalAmount: number;
  totalOriginalPrice: number;
  finalPayableAmount: number;
} {
  const {
    sport,
    category,
    resourceId,
    config,
    customPricing,
  } = options;

  const totalSessions = options.totalSessions ?? options.total_sessions ?? 1;
  const durationHours = options.durationHours ?? options.duration_hours ?? 1;
  const playerCount = options.playerCount ?? options.player_count ?? 1;
  const recurrenceType = options.recurrenceType || options.recurrence_type || 'weekly';

  const recurringPricing = customPricing || config?.recurringPricing || DEFAULT_RECURRING_PRICING;
  const hourlyRates = config?.hourlyRates || DEFAULT_CONFIG.hourlyRates!;

  const isBigBox =
    resourceId === 'net-big-box' ||
    category === 'cricket_bigbox' ||
    category === 'BOX-TURF' ||
    category === 'bigbox' ||
    !resourceId;

  let ratePerSession = 0;
  let discountPercent = 0;

  if (recurrenceType === 'weekly') {
    discountPercent = recurringPricing.weeklyDiscountPercent ?? 10;
    if (sport === 'cricket') {
      if (isBigBox) {
        ratePerSession = (recurringPricing.weeklyCricketRatePerSession ?? 900) * durationHours;
      } else {
        const netHourly = hourlyRates.cricketPracticeNet || 100;
        ratePerSession = Math.round(netHourly * Math.max(1, playerCount) * durationHours * 0.9);
      }
    } else {
      const basePool = recurringPricing.weeklySwimmingRatePerSession ?? 90;
      ratePerSession = basePool * Math.max(1, playerCount) * durationHours;
    }
  } else if (recurrenceType === 'monthly') {
    discountPercent = recurringPricing.monthlyDiscountPercent ?? 15;
    if (sport === 'cricket') {
      if (isBigBox) {
        ratePerSession = (recurringPricing.monthlyCricketRatePerSession ?? 800) * durationHours;
      } else {
        const netHourly = hourlyRates.cricketPracticeNet || 100;
        ratePerSession = Math.round(netHourly * Math.max(1, playerCount) * durationHours * 0.85);
      }
    } else {
      const basePool = recurringPricing.monthlySwimmingRatePerSession ?? 80;
      ratePerSession = basePool * Math.max(1, playerCount) * durationHours;
    }
  } else {
    // Preferred Time Booking
    discountPercent = recurringPricing.preferredTimeDiscountPercent ?? 10;
    if (sport === 'cricket') {
      if (isBigBox) {
        ratePerSession = (recurringPricing.preferredTimeCricketRatePerSession ?? 900) * durationHours;
      } else {
        const netHourly = hourlyRates.cricketPracticeNet || 100;
        ratePerSession = Math.round(netHourly * Math.max(1, playerCount) * durationHours * 0.9);
      }
    } else {
      const basePool = recurringPricing.preferredTimeSwimmingRatePerSession ?? 90;
      ratePerSession = basePool * Math.max(1, playerCount) * durationHours;
    }
  }

  // Calculate standard base and apply recurring plan discount
  const baseAmount = Math.round(ratePerSession * Math.max(1, totalSessions));
  const discountAmount = Math.round((baseAmount * discountPercent) / 100);
  const finalTotalAmount = Math.max(0, baseAmount - discountAmount);

  return {
    ratePerSession,
    baseAmount,
    discountPercent,
    discountAmount,
    finalTotalAmount,
    totalOriginalPrice: baseAmount,
    finalPayableAmount: finalTotalAmount,
  };
}

/**
 * Checks conflict across ALL generated recurring dates against existing bookings and owner blocks.
 * If even one slot conflicts with an existing confirmed booking or blocked time, reports all conflicts.
 */
export function checkRecurringAvailability(options: {
  dates: string[];
  timeRange: string;
  sport: 'cricket' | 'swimming';
  resourceId: string;
  bookings: Booking[];
  dateSpecificBlocks?: DateSpecificBlock[];
  blockedHours?: number[];
  disabledDates?: string[];
}): {
  isAvailable: boolean;
  totalSessions: number;
  dates: string[];
  conflicts: Array<{ date: string; dayName: string; reason: string }>;
  message?: string;
} {
  const {
    dates,
    timeRange,
    sport,
    resourceId,
    bookings,
    dateSpecificBlocks = [],
    blockedHours = [],
    disabledDates = [],
  } = options;

  if (!dates || dates.length === 0) {
    return {
      isAvailable: false,
      totalSessions: 0,
      dates: [],
      conflicts: [],
      message: 'No dates generated for the selected recurrence schedule.',
    };
  }

  const [reqStart, reqEnd] = parseTimeRange(timeRange);
  if (reqStart <= 0 || reqEnd <= reqStart) {
    return {
      isAvailable: false,
      totalSessions: dates.length,
      dates,
      conflicts: [],
      message: 'Invalid time range specified.',
    };
  }

  const conflicts: Array<{ date: string; dayName: string; reason: string }> = [];

  for (const date of dates) {
    // 1. Academy disabled date check
    if (disabledDates.includes(date)) {
      conflicts.push({
        date,
        dayName: getDayNameFromDate(date),
        reason: 'Academy is closed on this date (Holiday / Maintenance)',
      });
      continue;
    }

    // 2. Conflict with existing confirmed/pending bookings and blocks
    const conflictResult = checkBookingConflict({
      date,
      reqStartMinutes: reqStart,
      reqEndMinutes: reqEnd,
      resourceId,
      sport,
      bookings,
      dateSpecificBlocks,
      blockedHours,
    });

    if (conflictResult.hasConflict) {
      conflicts.push({
        date,
        dayName: getDayNameFromDate(date),
        reason: conflictResult.conflictReason || 'Slot already booked or reserved',
      });
    }
  }

  const isAvailable = conflicts.length === 0;

  return {
    isAvailable,
    totalSessions: dates.length,
    dates,
    conflicts,
    message: isAvailable
      ? undefined
      : `⚠️ Schedule Conflict: Your selected recurring schedule is not available for ${conflicts.length} of ${dates.length} requested dates.`,
  };
}
