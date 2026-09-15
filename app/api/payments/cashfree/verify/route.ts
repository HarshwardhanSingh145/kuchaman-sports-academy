import { NextRequest, NextResponse } from 'next/server';
import { verifyCashfreeOrder, getCashfreeConfig } from '@/lib/cashfree';
import { StorageService } from '@/lib/storage';
import { createFirestoreBooking, saveFirestoreStudent } from '@/lib/firestore-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, bookingPayload, category, isSimulated } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required for verification.' },
        { status: 400 }
      );
    }

    const config = getCashfreeConfig();

    let isPaid = false;
    let paymentDetails: any = null;
    let orderStatus = 'UNKNOWN';

    if (config) {
      // 1. Verify with live Cashfree API
      const verifyResult = await verifyCashfreeOrder(orderId);
      if (!verifyResult.success) {
        return NextResponse.json(
          {
            success: false,
            isPaid: false,
            error: verifyResult.error || 'Failed to verify order status with Cashfree.',
          },
          { status: 400 }
        );
      }

      isPaid = verifyResult.isPaid;
      orderStatus = verifyResult.orderStatus || 'PENDING';
      paymentDetails = verifyResult.paymentDetails;
    } else if (isSimulated) {
      // Safe sandbox demo simulation when credentials are not yet configured in preview
      isPaid = true;
      orderStatus = 'PAID';
      paymentDetails = {
        cf_payment_id: `CF-SIM-${Date.now().toString().slice(-6)}`,
        payment_method: { upi: { channel: 'gpay' } },
        payment_status: 'SUCCESS',
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          isPaid: false,
          error:
            'Cashfree credentials are not configured and simulation flag was not provided.',
        },
        { status: 400 }
      );
    }

    // STRICT CHECK: ONLY proceed if payment is confirmed as PAID
    if (!isPaid) {
      return NextResponse.json({
        success: false,
        isPaid: false,
        orderStatus,
        error: `भुगतान पूरा नहीं हुआ (Payment status: ${orderStatus})। स्लॉट या एडमिशन केवल सफल भुगतान के बाद ही कन्फर्म होगा।`,
      });
    }

    const transactionId =
      paymentDetails?.cf_payment_id?.toString() ||
      paymentDetails?.payment_id?.toString() ||
      orderId;

    // 2. Complete Booking or Admission on Successful Payment
    if (category === 'admission' || bookingPayload?.category === 'admission') {
      const studentCount = Number(bookingPayload?.studentCount) || 1;
      const mentorName = (bookingPayload?.mentorName || bookingPayload?.userName || 'Enrolled Student').trim();
      const contact = (bookingPayload?.admissionContact || bookingPayload?.userPhone || '').trim();
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      const calculateEndDate = (startDate: string, months: number) => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
      };

      try {
        const student = StorageService.createStudent(
          {
            name: mentorName,
            age: 18,
            fatherName: 'Guardian',
            address: 'Kuchaman City',
            contact,
            category: 'ACADEMIC',
            admissionDate: today,
            admissionTime: nowTime,
            mentorName,
            mentorContact: contact,
            tenureDurationMonths: 6,
            tenureStartDate: today,
            tenureEndDate: calculateEndDate(today, 6),
            tenureStatus: 'IN_PROGRESS',
          },
          `Cashfree Verified Payment (${orderId})`
        );

        try {
          await saveFirestoreStudent(student);
        } catch (fsErr) {
          console.warn('Firestore student save notice:', fsErr);
        }

        return NextResponse.json({
          success: true,
          isPaid: true,
          orderId,
          transactionId,
          message: 'Admission payment verified successfully!',
          admission: student,
          studentCount,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          isPaid: true,
          orderId,
          transactionId,
          message: 'Admission payment verified!',
        });
      }
    } else {
      // Sports Slot Booking (Cricket / Swimming)
      const resourceName =
        bookingPayload.resourceName ||
        (bookingPayload.sport === 'cricket'
          ? bookingPayload.selectedNetType === 'bigbox'
            ? 'Big Box Cricket Turf (160x70 ft)'
            : 'Cricket Practice Net'
          : 'Semi-Olympic Swimming Pool');

      const fullBookingInput = {
        id: orderId,
        sport: bookingPayload.sport,
        category: bookingPayload.category || bookingPayload.sport,
        resourceId: bookingPayload.resourceId,
        resourceName,
        date: bookingPayload.date,
        timeRange: bookingPayload.timeRange,
        startTime: bookingPayload.startTime,
        endTime: bookingPayload.endTime,
        durationHours: bookingPayload.durationHours ? Number(bookingPayload.durationHours) : 1,
        hourlyRate: bookingPayload.hourlyRate ? Number(bookingPayload.hourlyRate) : undefined,
        originalAmount: bookingPayload.originalAmount ? Number(bookingPayload.originalAmount) : undefined,
        discountAmount: bookingPayload.discountAmount ? Number(bookingPayload.discountAmount) : undefined,
        userName: bookingPayload.userName?.trim() || 'KSA Customer',
        userPhone: bookingPayload.userPhone?.trim() || '',
        userEmail: bookingPayload.userEmail?.trim() || undefined,
        playerCount: Number(bookingPayload.playerCount) || 1,
        amountPaid: Number(bookingPayload.amountPaid) || 0,
        paymentStatus: 'APPROVED' as const,
        paymentMethod: 'ONLINE' as const,
        transactionId,
        status: 'COMPLETED' as const,
      };

      const result = StorageService.createBooking(fullBookingInput);

      if (!result.success || !result.booking) {
        return NextResponse.json(
          {
            success: false,
            isPaid: true,
            orderId,
            transactionId,
            error:
              result.error ||
              'Payment was received, but there was an issue allocating the slot. Please contact academy staff with Transaction ID: ' +
                transactionId,
          },
          { status: 409 }
        );
      }

      // Persist to Google Cloud Firestore in real-time
      try {
        await createFirestoreBooking(result.booking);
      } catch (err) {
        console.warn('Firestore booking creation notice:', err);
      }

      return NextResponse.json({
        success: true,
        isPaid: true,
        orderId,
        transactionId,
        message: 'Payment verified and booking confirmed successfully!',
        booking: result.booking,
      });
    }
  } catch (error: any) {
    console.error('API /payments/cashfree/verify error:', error);
    return NextResponse.json(
      { success: false, isPaid: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
