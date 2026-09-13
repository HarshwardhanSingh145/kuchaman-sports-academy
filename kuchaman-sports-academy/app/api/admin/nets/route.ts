import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { saveFirestoreNet, deleteFirestoreNet } from '@/lib/firestore-service';

export async function GET() {
  try {
    const nets = StorageService.getNets();
    return NextResponse.json({ success: true, nets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, description, turfType, capacityPerSlot } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Net name is required' }, { status: 400 });
    }

    const currentNets = StorageService.getNets();
    const newNet = StorageService.addNet({
      name,
      code: code || `NET-0${currentNets.length + 1}`,
      description: description || 'High-performance cricket practice net',
      turfType: turfType || 'Astro-Turf Elite',
      capacityPerSlot: Number(capacityPerSlot) || 4,
      isActive: true,
      order: currentNets.length + 1,
    });

    saveFirestoreNet(newNet).catch((err) => console.warn('Firestore net sync:', err));

    return NextResponse.json({ success: true, net: newNet });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Net ID is required' }, { status: 400 });
    }

    const updated = StorageService.updateNet(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Net not found' }, { status: 404 });
    }

    saveFirestoreNet(updated).catch((err) => console.warn('Firestore net sync:', err));

    return NextResponse.json({ success: true, net: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Net ID is required' }, { status: 400 });
    }

    const deleted = StorageService.deleteNet(id);
    if (deleted) {
      deleteFirestoreNet(id).catch((err) => console.warn('Firestore net delete sync:', err));
    }
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
