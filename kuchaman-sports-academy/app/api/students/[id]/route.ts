import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = StorageService.getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, performedBy } = body;

    // Removal flow (Soft delete)
    if (action === 'remove') {
      const reason = body.reason || 'No reason specified';
      const result = StorageService.removeStudent(id, reason, performedBy || 'Admin');
      if (!result) {
        return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, student: result, message: 'Student removed successfully' });
    }

    // Replacement flow
    if (action === 'replace') {
      const { newStudent, reason } = body;
      if (!newStudent || !newStudent.name || !newStudent.contact || !newStudent.fatherName) {
        return NextResponse.json(
          { success: false, error: 'Replacement student requires name, contact, and fatherName' },
          { status: 400 }
        );
      }
      const result = StorageService.replaceStudent(
        id,
        newStudent,
        reason || 'Replaced by mentor',
        performedBy || 'Mentor'
      );
      if (!result) {
        return NextResponse.json({ success: false, error: 'Original student not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        oldStudent: result.oldStudent,
        newStudent: result.newStudent,
        message: 'Student replaced successfully',
      });
    }

    // Tenure update flow
    if (action === 'tenure') {
      const { tenureStatus } = body;
      const result = StorageService.updateTenureStatus(id, tenureStatus, performedBy || 'Admin');
      if (!result) {
        return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, student: result, message: 'Tenure updated successfully' });
    }

    // Standard profile updates
    const updated = StorageService.updateStudent(id, body.updates || body, performedBy || 'Admin');
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, student: updated, message: 'Student updated successfully' });
  } catch (error: any) {
    console.error('Error modifying student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
