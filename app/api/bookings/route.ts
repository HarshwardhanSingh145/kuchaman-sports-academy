import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { createFirestoreBooking, getFirestoreBookings } from '@/lib/firestore-service';

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
    } = body;

    if (!sport || !resourceId || !resourceName || !date || !timeRange || !userName || !userPhone) {
      return NextResponse.json(
        { success: false, error: 'Please provide all required booking details.' },
        { status: 400 }
      );
    }

    const bookingInput: any = {
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
    } catch (err) {
      console.warn('Firestore booking creation notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking confirmed successfully at Kuchaman Sports Academy!',
      booking: result.booking,
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
      if (firestoreBookings && firestoreBookings.length > 0) {
        StorageService.mergeBookings(firestoreBookings);
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
