import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { AttendanceStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || undefined;
    const mentorId = searchParams.get('mentorId') || undefined;
    const date = searchParams.get('date') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const records = StorageService.getAttendance({
      studentId,
      mentorId,
      date,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, records, count: records.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entries, mentorId, date, performedBy } = body;

    if (!Array.isArray(entries) || !mentorId || !date) {
      return NextResponse.json(
        { success: false, error: 'entries (array), mentorId, and date are required' },
        { status: 400 }
      );
    }

    const result = StorageService.markAttendance(
      entries as Array<{ studentId: string; status: AttendanceStatus; notes?: string }>,
      mentorId,
      date,
      performedBy || 'Mentor'
    );

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
