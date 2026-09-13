import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { CertificateStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as CertificateStatus) || undefined;
    const studentId = searchParams.get('studentId') || undefined;

    const certificates = StorageService.getCertificates({
      status,
      studentId,
    });

    return NextResponse.json({ success: true, certificates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, requestedBy, action } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'studentId is required' }, { status: 400 });
    }

    if (action === 'submit') {
      // Find or create draft first
      let cert = StorageService.getCertificates({ studentId })[0];
      if (!cert) {
        cert = StorageService.createCertificateDraft(studentId, requestedBy || 'Mentor')!;
      }
      if (!cert) {
        return NextResponse.json({ success: false, error: 'Could not create certificate draft' }, { status: 500 });
      }
      const submitted = StorageService.submitCertificateForApproval(cert.id, requestedBy || 'Mentor');
      return NextResponse.json({ success: true, certificate: submitted });
    }

    const draft = StorageService.createCertificateDraft(studentId, requestedBy || 'Mentor');
    if (!draft) {
      return NextResponse.json({ success: false, error: 'Student not found or draft creation failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, certificate: draft });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { certificateId, action, reason, performedBy, userRole } = body;

    if (!certificateId || !action) {
      return NextResponse.json({ success: false, error: 'certificateId and action are required' }, { status: 400 });
    }

    // STRICT ROLE CHECK: Mentors can NEVER approve or issue certificates!
    if (userRole === 'MENTOR' && (action === 'approve' || action === 'issue')) {
      return NextResponse.json(
        { success: false, error: 'Security Violation: Mentors cannot approve or issue certificates. Only the Academy Owner/Admin can approve.' },
        { status: 403 }
      );
    }

    if (action === 'approve') {
      const approved = StorageService.approveCertificate(certificateId, performedBy || 'JAY PRAKASH BHAKAR');
      if (!approved) {
        return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, certificate: approved, message: 'Certificate approved by Owner' });
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
      }
      const rejected = StorageService.rejectCertificate(certificateId, reason, performedBy || 'JAY PRAKASH BHAKAR');
      if (!rejected) {
        return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, certificate: rejected, message: 'Certificate rejected' });
    }

    if (action === 'issue') {
      const issued = StorageService.issueCertificate(certificateId, performedBy || 'JAY PRAKASH BHAKAR');
      if (!issued) {
        return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, certificate: issued, message: 'Certificate officially issued' });
    }

    return NextResponse.json({ success: false, error: 'Invalid certificate action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
