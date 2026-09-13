import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Mentor Login
    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
      }

      const result = StorageService.verifyMentorAuth(username.trim(), password.trim());
      if (!result.success || !result.mentor) {
        return NextResponse.json({ success: false, error: result.error || 'Authentication failed' }, { status: 401 });
      }

      const mentor = result.mentor;
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
          assignedStudentIds: mentor.assignedStudentIds,
          signatureUrl: mentor.signatureUrl,
        },
        requiresPasswordChange: result.requiresPasswordChange,
      });
    }

    // Change Password (required on first login or voluntarily)
    if (action === 'changePassword') {
      const { mentorId, newPassword } = body;
      if (!mentorId || !newPassword) {
        return NextResponse.json({ success: false, error: 'Mentor ID and new password are required' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const success = StorageService.changeMentorPassword(mentorId, newPassword);
      if (!success) {
        return NextResponse.json({ success: false, error: 'Failed to update password. Mentor not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    // Update Signature
    if (action === 'updateSignature') {
      const { mentorId, signatureUrl } = body;
      if (!mentorId || !signatureUrl) {
        return NextResponse.json({ success: false, error: 'Mentor ID and signature URL are required' }, { status: 400 });
      }

      const updated = StorageService.updateMentor(mentorId, { signatureUrl });
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Mentor not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Signature updated successfully', mentor: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid auth action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in mentor auth:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
