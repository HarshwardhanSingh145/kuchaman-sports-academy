import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { getFirestoreBookings } from '@/lib/firestore-service';
import { notifyOwnerOfPendingVerification } from '@/lib/notifications';
import { checkRecurringAvailability } from '@/lib/recurring-helper';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || undefined;
    const id = searchParams.get('id');

    // Sync from Firestore for up-to-date data
    try {
      const firestoreBookings = await getFirestoreBookings({ phone });
      if (Array.isArray(firestoreBookings) && firestoreBookings.length > 0) {
        StorageService.mergeBookings(firestoreBookings);
      }
    } catch (fsErr) {
      console.warn('Notice syncing bookings in recurring GET:', fsErr);
    }

    let recurringBookings = StorageService.getRecurringBookings(phone);

    if (id) {
      recurringBookings = recurringBookings.filter(
        (b) => b.id.toLowerCase() === id.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      recurringBookings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sport,
      category,
      resourceId,
      resourceName,
      recurrence_type,
      recurrence_days,
      preferred_time,
      startTime,
      endTime,
      duration,
      start_date,
      end_date,
      recurring_dates,
      userName,
      userPhone,
      userEmail,
      playerCount,
      notes,
      amountPaid,
      recurring_price,
      paymentMethod,
      paymentScreenshot,
      transactionId,
      paymentStatus,
      status,
    } = body;

    if (
      !sport ||
      !resourceId ||
      !resourceName ||
      !recurrence_type ||
      !Array.isArray(recurrence_days) ||
      recurrence_days.length === 0 ||
      !preferred_time ||
      !start_date ||
      !Array.isArray(recurring_dates) ||
      recurring_dates.length === 0 ||
      !userName ||
      !userPhone
    ) {
      return NextResponse.json(
        { success: false, error: 'Please provide all required recurring booking details.' },
        { status: 400 }
      );
    }

    // Availability validation before final save
    const config = StorageService.getConfig();
    const existingBookings = StorageService.getBookings();
    const availCheck = checkRecurringAvailability({
      dates: recurring_dates,
      timeRange: preferred_time,
      sport,
      resourceId,
      bookings: existingBookings,
      dateSpecificBlocks: config.bookingTiming?.dateSpecificBlocks || [],
      blockedHours: config.bookingTiming?.blockedHours || [],
      disabledDates: config.disabledDates || [],
    });

    if (!availCheck.isAvailable) {
      return NextResponse.json(
        {
          success: false,
          error: availCheck.message || 'One or more slots in the recurring schedule are unavailable.',
          conflicts: availCheck.conflicts,
        },
        { status: 409 }
      );
    }

    // Create master recurring booking and session records
    const result = StorageService.createRecurringBooking({
      sport,
      category: category || sport,
      resourceId,
      resourceName,
      recurrence_type,
      recurrence_days,
      preferred_time,
      startTime,
      endTime,
      duration: Number(duration) || 1,
      start_date,
      end_date: end_date || recurring_dates[recurring_dates.length - 1],
      recurring_dates,
      userName,
      userPhone,
      userEmail,
      playerCount: Number(playerCount) || 1,
      notes,
      amountPaid: Number(amountPaid) || 0,
      recurring_price: Number(recurring_price) || Number(amountPaid) || 0,
      paymentMethod: paymentMethod || 'UPI_QR',
      paymentScreenshot,
      transactionId,
      paymentStatus: paymentStatus || 'PENDING_VERIFICATION',
      status: status || 'AWAITING_VERIFICATION',
    });

    if (!result.success || !result.parentBooking) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create recurring booking' },
        { status: 500 }
      );
    }

    // Notify owner via WhatsApp
    let notificationResult = null;
    const parent = result.parentBooking;
    if (
      parent.status === 'AWAITING_VERIFICATION' ||
      parent.paymentStatus === 'PENDING_VERIFICATION'
    ) {
      try {
        const typeLabel =
          recurrence_type === 'weekly'
            ? 'Weekly Recurring'
            : recurrence_type === 'monthly'
            ? 'Monthly Recurring'
            : 'Preferred Time Recurring';

        const targetOwnerWhatsApp = config.ownerWhatsAppNumber || config.phone;

        notificationResult = await notifyOwnerOfPendingVerification({
          id: parent.id,
          userName: parent.userName,
          userPhone: parent.userPhone,
          userEmail: parent.userEmail,
          amountPaid: parent.amountPaid || 0,
          sport: parent.sport,
          resourceName: `${parent.resourceName} [${typeLabel}: ${recurring_dates.length} Sessions]`,
          date: `${parent.start_date} to ${parent.end_date}`,
          timeRange: `${parent.preferred_time} (${parent.recurrence_days?.join(', ')})`,
          durationHours: parent.duration,
          transactionId: parent.transactionId,
        }, undefined, targetOwnerWhatsApp);
      } catch (notifyErr) {
        console.warn('Owner notification notice for recurring booking:', notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recurring booking created successfully and scheduled for verification.',
      parentBooking: result.parentBooking,
      sessionsCount: result.sessions?.length || 0,
      notification: notificationResult,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
