import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import {
  updateFirestoreBookingStatus,
  getFirestoreBookings,
  deleteFirestoreBooking,
} from '@/lib/firestore-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get('sport') || undefined;
    const date = searchParams.get('date') || undefined;
    const status = searchParams.get('status') || undefined;

    try {
      const firestoreBookings = await getFirestoreBookings({ sport, date });
      if (Array.isArray(firestoreBookings)) {
        if (!sport && !date && !status) {
          StorageService.setBookings(firestoreBookings);
        } else if (firestoreBookings.length > 0) {
          StorageService.mergeBookings(firestoreBookings);
        }
      }
    } catch (fsErr) {
      console.warn('Notice syncing admin bookings from Firestore:', fsErr);
    }

    const bookings = StorageService.getBookings({ sport, date, status });
    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, status, paymentStatus, verifiedBy } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'bookingId is required' },
        { status: 400 }
      );
    }

    let updated = null;
    if (paymentStatus) {
      updated = StorageService.updateBookingPaymentStatus(bookingId, paymentStatus, status, verifiedBy);
    } else if (status) {
      updated = StorageService.updateBookingStatus(bookingId, status);
    }

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const paymentUpdates: Record<string, any> = {};
    if (updated.paymentStatus) paymentUpdates.paymentStatus = updated.paymentStatus;
    if (updated.verifiedAt) paymentUpdates.verifiedAt = updated.verifiedAt;
    if (updated.verifiedBy) paymentUpdates.verifiedBy = updated.verifiedBy;

    try {
      await updateFirestoreBookingStatus(bookingId, updated.status, paymentUpdates);
    } catch (err) {
      console.warn('Firestore booking status update sync error:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${bookingId} updated successfully`,
      booking: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }
    const deleted = StorageService.deleteBooking(id);
    try {
      await deleteFirestoreBooking(id);
    } catch (err) {
      console.warn('Firestore booking delete notice:', err);
    }
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
