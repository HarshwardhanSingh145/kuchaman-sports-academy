import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { StudentCategory, StudentStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') as StudentCategory) || undefined;
    const mentorId = searchParams.get('mentorId') || undefined;
    const status = (searchParams.get('status') as StudentStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const students = StorageService.getStudents({
      category,
      mentorId,
      status,
      search,
    });

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if bulk admission (Academic or School entry with multiple students)
    if (body.bulk && Array.isArray(body.students)) {
      const createdStudents = [];
      const performedBy = body.performedBy || (body.mentorName ? `${body.mentorName} (Mentor)` : 'Admission Flow');

      for (const st of body.students) {
        if (!st.name || !st.contact || !st.fatherName) continue;
        const student = StorageService.createStudent(
          {
            name: st.name.trim(),
            age: Number(st.age) || 16,
            fatherName: st.fatherName.trim(),
            address: st.address?.trim() || 'Kuchaman City',
            contact: st.contact.trim(),
            category: body.category || 'ACADEMIC',
            admissionDate: body.admissionDate || new Date().toISOString().split('T')[0],
            admissionTime: body.admissionTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            academyName: body.academyName || undefined,
            schoolName: body.schoolName || undefined,
            mentorId: body.mentorId || undefined,
            mentorName: body.mentorName || undefined,
            mentorContact: body.mentorContact || undefined,
            tenureDurationMonths: Number(body.tenureDurationMonths) || 6,
            tenureStartDate: body.admissionDate || new Date().toISOString().split('T')[0],
            tenureEndDate: body.tenureEndDate || calculateEndDate(body.admissionDate, Number(body.tenureDurationMonths) || 6),
            tenureStatus: 'IN_PROGRESS',
          },
          performedBy
        );
        createdStudents.push(student);
      }

      return NextResponse.json({ success: true, students: createdStudents, count: createdStudents.length });
    }

    // Single student admission (Solo Entry or single Academic/School student)
    const {
      name,
      age,
      fatherName,
      address,
      contact,
      category,
      admissionDate,
      admissionTime,
      academyName,
      schoolName,
      mentorId,
      mentorName,
      mentorContact,
      tenureDurationMonths,
      performedBy,
    } = body;

    if (!name || !fatherName || !contact || !category) {
      return NextResponse.json(
        { success: false, error: 'Student Name, Father Name, Contact, and Category are required' },
        { status: 400 }
      );
    }

    const duration = Number(tenureDurationMonths) || (category === 'SOLO' ? 6 : category === 'SCHOOL' ? 3 : 6);
    const startDate = admissionDate || new Date().toISOString().split('T')[0];
    const endDate = calculateEndDate(startDate, duration);

    const student = StorageService.createStudent(
      {
        name: name.trim(),
        age: Number(age) || 16,
        fatherName: fatherName.trim(),
        address: address?.trim() || 'Kuchaman City',
        contact: contact.trim(),
        category,
        admissionDate: startDate,
        admissionTime: admissionTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        academyName: academyName || undefined,
        schoolName: schoolName || undefined,
        mentorId: mentorId || undefined,
        mentorName: mentorName || undefined,
        mentorContact: mentorContact || undefined,
        tenureDurationMonths: duration,
        tenureStartDate: startDate,
        tenureEndDate: endDate,
        tenureStatus: 'IN_PROGRESS',
      },
      performedBy || (category === 'SOLO' ? 'Solo Entry Portal' : 'Admission Portal')
    );

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function calculateEndDate(startDateStr?: string, months: number = 6): string {
  const d = startDateStr ? new Date(startDateStr) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}
