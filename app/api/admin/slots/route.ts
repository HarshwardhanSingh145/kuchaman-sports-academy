import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { saveFirestoreSlotOverride } from '@/lib/firestore-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === 'update_cricket_slot') {
      const { slotKey, updates } = payload;
      if (!slotKey) {
        return NextResponse.json({ success: false, error: 'slotKey required' }, { status: 400 });
      }
      StorageService.updateCricketSlot(slotKey, updates);
      saveFirestoreSlotOverride(slotKey, 'cricket', updates).catch((err) =>
        console.warn('Firestore slot override sync:', err)
      );
      return NextResponse.json({ success: true, message: 'Cricket slot updated' });
    }

    if (action === 'update_swimming_session') {
      const { sessionKey, updates } = payload;
      if (!sessionKey) {
        return NextResponse.json({ success: false, error: 'sessionKey required' }, { status: 400 });
      }
      StorageService.updateSwimmingSession(sessionKey, updates);
      saveFirestoreSlotOverride(sessionKey, 'swimming', updates).catch((err) =>
        console.warn('Firestore swimming session sync:', err)
      );
      return NextResponse.json({ success: true, message: 'Swimming session updated' });
    }

    if (action === 'toggle_date') {
      const { date } = payload;
      const config = StorageService.getConfig();
      let disabledDates = [...config.disabledDates];

      if (disabledDates.includes(date)) {
        disabledDates = disabledDates.filter((d) => d !== date);
      } else {
        disabledDates.push(date);
      }

      StorageService.updateConfig({ disabledDates });
      return NextResponse.json({
        success: true,
        disabledDates,
        message: `Date ${date} ${disabledDates.includes(date) ? 'disabled' : 'enabled'}`,
      });
    }

    if (action === 'update_config') {
      const updatedConfig = StorageService.updateConfig(payload.config || {});
      return NextResponse.json({ success: true, config: updatedConfig });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
