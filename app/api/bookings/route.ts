import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { createFirestoreBooking, getFirestoreBookings } from '@/lib/firestore-service';
import { notifyOwnerOfPendingVerification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sport,
      category,
      resourceId,
      resourceName,
      date,
      timeRange,
      startTime,
      endTime,
      durationHours,
      hourlyRate,
      originalAmount,
      discountAmount,
      userName,
      userPhone,
      userEmail,
      playerCount,
      experienceLevel,
      notes,
      amountPaid,
      paymentStatus,
      paymentScreenshot,
      transactionId,
      paymentMethod,
      status,
    } = body;

    if (!sport || !resourceId || !resourceName || !date || !timeRange || !userName || !userPhone) {
      return NextResponse.json(
        { success: false, error: 'Please provide all required booking details.' },
        { status: 400 }
      );
    }

    const bookingInput: any = {
      ...(body.id ? { id: String(body.id) } : {}),
      sport,
      category: category || sport,
      resourceId,
      resourceName,
      date,
      timeRange,
      startTime,
      endTime,
      durationHours: durationHours ? Number(durationHours) : undefined,
      hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      originalAmount: originalAmount ? Number(originalAmount) : undefined,
      discountAmount: discountAmount ? Number(discountAmount) : undefined,
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      playerCount: Number(playerCount) || 1,
      amountPaid: Number(amountPaid) || 0,
      paymentMethod: paymentMethod || 'UPI_QR',
    };

    if (userEmail && typeof userEmail === 'string' && userEmail.trim()) {
      bookingInput.userEmail = userEmail.trim();
    }
    if (experienceLevel && typeof experienceLevel === 'string') {
      bookingInput.experienceLevel = experienceLevel;
    }
    if (notes && typeof notes === 'string' && notes.trim()) {
      bookingInput.notes = notes.trim();
    }
    if (status && typeof status === 'string') {
      bookingInput.status = status;
    }
    if (paymentStatus && typeof paymentStatus === 'string') {
      bookingInput.paymentStatus = paymentStatus;
    }
    if (paymentScreenshot && typeof paymentScreenshot === 'string') {
      bookingInput.paymentScreenshot = paymentScreenshot;
    }
    if (transactionId && typeof transactionId === 'string' && transactionId.trim()) {
      bookingInput.transactionId = transactionId.trim();
    }

    const result = StorageService.createBooking(bookingInput);

    if (!result.success || !result.booking) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to complete booking' },
        { status: 409 }
      );
    }

    // Persist to Firestore
    try {
      await createFirestoreBooking(result.booking);
    } catch (err: any) {
      console.error('Firestore booking creation error in POST /api/bookings:', err);
    }

    // If booking is awaiting verification, immediately trigger owner notification
    let notificationResult = null;
    if (
      result.booking.status === 'AWAITING_VERIFICATION' ||
      result.booking.paymentStatus === 'PENDING_VERIFICATION'
    ) {
      try {
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const proto = req.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = host ? `${proto}://${host}` : undefined;

        const cfg = StorageService.getConfig();
        const targetOwnerWhatsApp = cfg.ownerWhatsAppNumber || cfg.phone;
        notificationResult = await notifyOwnerOfPendingVerification({
          id: result.booking.id,
          userName: result.booking.userName,
          userPhone: result.booking.userPhone,
          userEmail: result.booking.userEmail,
          amountPaid: result.booking.amountPaid || 0,
          sport: result.booking.sport,
          resourceName: result.booking.resourceName,
          date: result.booking.date,
          timeRange: result.booking.timeRange,
          durationHours: result.booking.durationHours,
          transactionId: result.booking.transactionId,
          createdAt: result.booking.createdAt,
        }, baseUrl, targetOwnerWhatsApp);
      } catch (notifyErr) {
        console.warn('Owner notification notice:', notifyErr);
      }
    }

    const isPending =
      result.booking.status === 'AWAITING_VERIFICATION' ||
      result.booking.paymentStatus === 'PENDING_VERIFICATION';

    return NextResponse.json({
      success: true,
      message: isPending
        ? 'Booking request submitted for verification. Academy is verifying payment.'
        : 'Booking confirmed successfully at Kuchaman Sports Academy!',
      booking: result.booking,
      notification: notificationResult,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const id = searchParams.get('id');

    // Sync from Firestore to get real-time approvals across all devices
    try {
      const firestoreBookings = await getFirestoreBookings({
        phone: phone || undefined,
      });
      if (Array.isArray(firestoreBookings)) {
        StorageService.mergeBookings(firestoreBookings);
        // Ensure local bookings are also saved to Firestore
        const localList = StorageService.getBookings();
        const fsIds = new Set(firestoreBookings.map((b) => b.id));
        for (const b of localList) {
          if (!fsIds.has(b.id)) {
            createFirestoreBooking(b).catch(() => {});
          }
        }
      }
    } catch (fsErr) {
      console.warn('Notice syncing bookings from Firestore:', fsErr);
    }

    let bookings = StorageService.getBookings();
    if (phone) {
      bookings = bookings.filter((b) => b.userPhone.includes(phone));
    }
    if (id) {
      bookings = bookings.filter((b) => b.id.toLowerCase() === id.toLowerCase());
    }

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
