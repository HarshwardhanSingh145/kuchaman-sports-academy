import { NextRequest, NextResponse } from 'next/server';
import { notifyOwnerOfPendingVerification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      userName,
      userPhone,
      userEmail,
      amountPaid,
      sport,
      resourceName,
      date,
      timeRange,
      durationHours,
      transactionId,
    } = body;

    if (!id || !userName || !userPhone || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required notification fields' },
        { status: 400 }
      );
    }

    const result = await notifyOwnerOfPendingVerification({
      id,
      userName,
      userPhone,
      userEmail,
      amountPaid: Number(amountPaid) || 0,
      sport: sport || 'cricket',
      resourceName,
      date,
      timeRange: timeRange || '',
      durationHours,
      transactionId,
    });

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      channel: result.channel,
      reason: result.reason,
      messageText: result.messageText,
      whatsappLink: result.whatsappLink,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
