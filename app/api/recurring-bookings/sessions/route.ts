import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json(
        { success: false, error: 'Parent booking ID is required.' },
        { status: 400 }
      );
    }

    const sessions = StorageService.getRecurringSessions(parentId);
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, updates } = body;

    if (!sessionId || !updates) {
      return NextResponse.json(
        { success: false, error: 'Session ID and updates are required.' },
        { status: 400 }
      );
    }

    const updated = StorageService.updateRecurringSession(sessionId, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Session booking not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
