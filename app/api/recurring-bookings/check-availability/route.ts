import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { checkRecurringAvailability } from '@/lib/recurring-helper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dates, timeRange, sport, resourceId } = body;

    if (!Array.isArray(dates) || dates.length === 0 || !timeRange || !sport || !resourceId) {
      return NextResponse.json(
        { success: false, error: 'Please provide dates array, timeRange, sport, and resourceId.' },
        { status: 400 }
      );
    }

    const config = StorageService.getConfig();
    const bookings = StorageService.getBookings();
    const dateSpecificBlocks = config.bookingTiming?.dateSpecificBlocks || [];
    const blockedHours = config.bookingTiming?.blockedHours || [];
    const disabledDates = config.disabledDates || [];

    const checkResult = checkRecurringAvailability({
      dates,
      timeRange,
      sport,
      resourceId,
      bookings,
      dateSpecificBlocks,
      blockedHours,
      disabledDates,
    });

    return NextResponse.json({
      success: true,
      ...checkResult,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
