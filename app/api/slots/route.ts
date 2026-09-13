import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get('sport') || 'cricket';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (sport === 'cricket') {
      const nets = StorageService.getNets();
      const slots = StorageService.getCricketSlotsForDate(date);
      return NextResponse.json({
        success: true,
        date,
        sport,
        nets,
        slots,
      });
    } else if (sport === 'swimming') {
      const sessions = StorageService.getSwimmingSessionsForDate(date);
      return NextResponse.json({
        success: true,
        date,
        sport,
        sessions,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid sport' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
