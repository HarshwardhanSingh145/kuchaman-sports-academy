import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const mentors = StorageService.getMentors();
    // Return sanitized mentor list (without raw passwords in public payload)
    const sanitized = mentors.map((m) => ({
      id: m.id,
      username: m.username,
      name: m.name,
      contact: m.contact,
      organizationName: m.organizationName,
      category: m.category,
      isFirstLogin: m.isFirstLogin,
      assignedStudentIds: m.assignedStudentIds,
      status: m.status,
      signatureUrl: m.signatureUrl,
      createdAt: m.createdAt,
    }));
    return NextResponse.json({ success: true, mentors: sanitized });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contact, organizationName, category, preferredUsername } = body;

    if (!name || !contact || !organizationName || !category) {
      return NextResponse.json(
        { success: false, error: 'Name, contact, organizationName, and category are required' },
        { status: 400 }
      );
    }

    const { mentor, tempPassword } = StorageService.createMentor({
      name,
      contact,
      organizationName,
      category,
      preferredUsername,
    });

    return NextResponse.json({
      success: true,
      mentor: {
        id: mentor.id,
        username: mentor.username,
        name: mentor.name,
        contact: mentor.contact,
        organizationName: mentor.organizationName,
        category: mentor.category,
        isFirstLogin: mentor.isFirstLogin,
      },
      tempPassword,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
