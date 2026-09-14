import { Booking, DateSpecificBlock } from './types';

/**
 * Standard continuous hour representation:
 * Day starts at 6 AM (6.0) and runs through night up to 2 AM next day (26.0).
 */
export function parseTimeToContinuousMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hour = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] || 'AM';

  if (modifier === 'PM' && hour < 12) {
    hour += 12;
  }
  if (modifier === 'AM' && hour === 12) {
    hour = 0;
  }

  // If time is between 00:00 AM and 05:59 AM, it represents the extended night shift
  // of the same operational day (e.g. 1:00 AM = 25:00, 2:00 AM = 26:00)
  let continuousHour = hour;
  if (hour >= 0 && hour <= 5) {
    continuousHour = hour + 24;
  }

  return continuousHour * 60 + minutes;
}

/**
 * Convert continuous hour (6 to 26) to 12-hour formatted string
 */
export function formatContinuousHour(hourValue: number): string {
  const norm = hourValue >= 24 ? hourValue - 24 : hourValue;
  const period = (hourValue >= 12 && hourValue < 24) ? 'PM' : 'AM';
  const displayHour = norm === 0 ? 12 : norm > 12 ? norm - 12 : norm;
  const pad = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  return `${pad}:00 ${period}`;
}

/**
 * Extract [startMinutes, endMinutes] from a timeRange string like "07:00 PM – 09:00 PM"
 */
export function parseTimeRange(timeRange: string): [number, number] {
  if (!timeRange) return [0, 0];
  const parts = timeRange.split(/[–\-—]/);
  if (parts.length < 2) {
    const single = parseTimeToContinuousMinutes(timeRange);
    return [single, single + 60];
  }
  const start = parseTimeToContinuousMinutes(parts[0].trim());
  let end = parseTimeToContinuousMinutes(parts[1].trim());
  if (end <= start) {
    // If end crossed midnight (e.g. 11:00 PM to 01:00 AM)
    end += 24 * 60;
  }
  return [start, end];
}

/**
 * Mathematical overlap test: [startA, endA) overlaps with [startB, endB)
 */
export function isOverlapping(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

/**
 * Get all existing booked and blocked time intervals for a given date and resource
 */
export function getBookedAndBlockedIntervals(options: {
  date: string;
  resourceId?: string;
  sport?: string;
  bookings: Booking[];
  dateSpecificBlocks?: DateSpecificBlock[];
  blockedHours?: number[];
}): {
  timeRange: string;
  startMinutes: number;
  endMinutes: number;
  type: 'BOOKED' | 'BLOCKED_BY_OWNER';
  label: string;
}[] {
  const { date, resourceId, sport, bookings, dateSpecificBlocks = [], blockedHours = [] } = options;
  const intervals: {
    timeRange: string;
    startMinutes: number;
    endMinutes: number;
    type: 'BOOKED' | 'BLOCKED_BY_OWNER';
    label: string;
  }[] = [];

  // 1. Existing Confirmed Bookings
  bookings.forEach((b) => {
    if (b.date !== date) return;
    if (b.status === 'CANCELLED') return;

    // Resource or sport match check
    if (resourceId && b.resourceId && b.resourceId !== resourceId) {
      // Big Box Turf conflict check (if target is big box, or if resource matches)
      const isTargetBigBox = resourceId === 'net-big-box';
      const isBookingBigBox = b.resourceId === 'net-big-box' || b.category === 'cricket_bigbox';
      if (isTargetBigBox !== isBookingBigBox) return;
    } else if (sport && b.sport !== sport) {
      return;
    }

    const [start, end] = parseTimeRange(b.timeRange);
    if (start > 0 && end > start) {
      intervals.push({
        timeRange: b.timeRange,
        startMinutes: start,
        endMinutes: end,
        type: 'BOOKED',
        label: `Booked (${b.userName ? b.userName : 'Customer'})`,
      });
    }
  });

  // 2. Date-specific blocks by Admin/Owner
  dateSpecificBlocks.forEach((block) => {
    if (block.date !== date) return;
    const [start, end] = parseTimeRange(block.timeRange || `${block.startTime} – ${block.endTime}`);
    if (start > 0 && end > start) {
      intervals.push({
        timeRange: block.timeRange || `${block.startTime} – ${block.endTime}`,
        startMinutes: start,
        endMinutes: end,
        type: 'BLOCKED_BY_OWNER',
        label: block.reason || 'Blocked by Owner',
      });
    }
  });

  // 3. Global recurring blocked hours
  blockedHours.forEach((hour) => {
    const continuousHour = (hour >= 0 && hour <= 5) ? hour + 24 : hour;
    const start = continuousHour * 60;
    const end = start + 60;
    intervals.push({
      timeRange: `${formatContinuousHour(continuousHour)} – ${formatContinuousHour(continuousHour + 1)}`,
      startMinutes: start,
      endMinutes: end,
      type: 'BLOCKED_BY_OWNER',
      label: 'Unavailable / Maintenance',
    });
  });

  // Sort chronologically
  return intervals.sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Validate whether a requested time range [reqStart, reqEnd) has any conflict
 */
export function checkBookingConflict(options: {
  date: string;
  reqStartMinutes: number;
  reqEndMinutes: number;
  resourceId?: string;
  sport?: string;
  bookings: Booking[];
  dateSpecificBlocks?: DateSpecificBlock[];
  blockedHours?: number[];
}): {
  hasConflict: boolean;
  conflictReason?: string;
  conflictingRange?: string;
} {
  const { reqStartMinutes, reqEndMinutes } = options;

  if (reqEndMinutes <= reqStartMinutes) {
    return {
      hasConflict: true,
      conflictReason: 'End time must be after start time',
    };
  }

  const intervals = getBookedAndBlockedIntervals(options);

  for (const item of intervals) {
    if (isOverlapping(reqStartMinutes, reqEndMinutes, item.startMinutes, item.endMinutes)) {
      return {
        hasConflict: true,
        conflictReason: item.type === 'BOOKED'
          ? `Time slot overlaps with an already confirmed booking (${item.timeRange})`
          : `Time slot is blocked by Academy Owner (${item.timeRange})`,
        conflictingRange: item.timeRange,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Convert continuous minutes (e.g. 18 * 60 = 1080) to clean 12-hour format string (e.g. "06:00 PM")
 */
export function formatMinutesTo12Hour(continuousMinutes: number): string {
  const totalHours = Math.floor(continuousMinutes / 60);
  const mins = continuousMinutes % 60;
  const normHour = totalHours % 24;
  const period = normHour >= 12 ? 'PM' : 'AM';
  const displayHour = normHour === 0 ? 12 : normHour > 12 ? normHour - 12 : normHour;
  const padH = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  const padM = mins < 10 ? `0${mins}` : `${mins}`;
  return `${padH}:${padM} ${period}`;
}

/**
 * Calculate end time and full timeRange given start time string and duration in hours
 */
export function calculateEndTime(
  startTimeStr: string,
  durationHours: number
): {
  endTimeStr: string;
  timeRangeStr: string;
  startMinutes: number;
  endMinutes: number;
} {
  const startMinutes = parseTimeToContinuousMinutes(startTimeStr);
  const durationMinutes = Math.round(durationHours * 60);
  const endMinutes = startMinutes + durationMinutes;
  const endTimeStr = formatMinutesTo12Hour(endMinutes);
  const timeRangeStr = `${startTimeStr} – ${endTimeStr}`;
  return {
    endTimeStr,
    timeRangeStr,
    startMinutes,
    endMinutes,
  };
}

export type SlotAvailabilityStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED_BY_OWNER' | 'OUTSIDE_HOURS';

/**
 * Inspect availability for a specific time and optional duration
 */
export function inspectSlotAvailability(options: {
  date: string;
  startMinutes: number;
  durationMinutes?: number;
  operatingStartHour?: number;
  operatingEndHour?: number;
  resourceId?: string;
  sport?: string;
  bookings: Booking[];
  dateSpecificBlocks?: DateSpecificBlock[];
  blockedHours?: number[];
}): {
  status: SlotAvailabilityStatus;
  reason?: string;
  conflictingRange?: string;
} {
  const {
    date,
    startMinutes,
    durationMinutes = 60,
    operatingStartHour = 6,
    operatingEndHour = 2,
    resourceId,
    sport,
    bookings,
    dateSpecificBlocks = [],
    blockedHours = [],
  } = options;

  const endMinutes = startMinutes + durationMinutes;

  // Operating window check (e.g. 6:00 AM = 360 to 2:00 AM next day = 26 * 60 = 1560)
  const normEndHour = operatingEndHour <= operatingStartHour ? operatingEndHour + 24 : operatingEndHour;
  const windowStartMin = operatingStartHour * 60;
  const windowEndMin = normEndHour * 60;

  if (startMinutes < windowStartMin || endMinutes > windowEndMin) {
    return {
      status: 'OUTSIDE_HOURS',
      reason: 'Outside operating hours',
    };
  }

  // Conflict check with bookings, date blocks, and blocked hours
  const intervals = getBookedAndBlockedIntervals({
    date,
    resourceId,
    sport,
    bookings,
    dateSpecificBlocks,
    blockedHours,
  });

  for (const item of intervals) {
    if (isOverlapping(startMinutes, endMinutes, item.startMinutes, item.endMinutes)) {
      if (item.type === 'BOOKED') {
        return {
          status: 'BOOKED',
          reason: 'Already Booked',
          conflictingRange: item.timeRange,
        };
      } else {
        return {
          status: 'BLOCKED_BY_OWNER',
          reason: item.label || 'Blocked by Owner',
          conflictingRange: item.timeRange,
        };
      }
    }
  }

  return {
    status: 'AVAILABLE',
  };
}
