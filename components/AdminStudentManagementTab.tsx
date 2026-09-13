'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  FileSignature,
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  Edit2,
  Save,
  Check,
  Building2,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  KeyRound,
  Plus,
} from 'lucide-react';
import { Student, Mentor, Certificate, SignatureConfig, AuditLog, StudentCategory, StudentStatus } from '@/lib/types';
import CertificateModal from './CertificateModal';

interface AdminStudentManagementTabProps {
  onRefreshParent?: () => void;
}

export function AdminStudentManagementTab({ onRefreshParent }: AdminStudentManagementTabProps) {
  // Sub-tabs: 'students' | 'mentors' | 'certificates' | 'signatures' | 'audit'
  const [subTab, setSubTab] = useState<'students' | 'mentors' | 'certificates' | 'signatures' | 'audit'>('students');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [signatureConfig, setSignatureConfig] = useState<SignatureConfig>({
    ownerName: 'JAY PRAKASH BHAKAR',
    ownerTitle: 'Founder & Director, Kuchaman Sports Academy',
    ownerSignatureUrl: '',
    academySealUrl: '',
    updatedAt: '',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Filters for Students
  const [studentCategoryFilter, setStudentCategoryFilter] = useState<'ALL' | StudentCategory>('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | StudentStatus>('ALL');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals state
  const [viewStudentProfile, setViewStudentProfile] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [rejectingCertId, setRejectingCertId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Replacement / Removal modals
  const [removeTargetStudent, setRemoveTargetStudent] = useState<Student | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [replaceTargetStudent, setReplaceTargetStudent] = useState<Student | null>(null);
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceForm, setReplaceForm] = useState({
    name: '',
    age: '16',
    fatherName: '',
    address: '',
    contact: '',
  });

  // Signature editing
  const [ownerNameInput, setOwnerNameInput] = useState('');
  const [ownerTitleInput, setOwnerTitleInput] = useState('');
  const [ownerSigUrlInput, setOwnerSigUrlInput] = useState('');

  // Load all admin data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stRes, mRes, certRes, sigRes, logRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/mentors'),
        fetch('/api/certificates'),
        fetch('/api/signatures'),
        fetch('/api/audit-logs'),
      ]);

      const [stData, mData, certData, sigData, logData] = await Promise.all([
        stRes.json(),
        mRes.json(),
        certRes.json(),
        sigRes.json(),
        logRes.json(),
      ]);

      if (stData.success) setStudents(stData.students || []);
      if (mData.success) setMentors(mData.mentors || []);
      if (certData.success) setCertificates(certData.certificates || []);
      if (sigData.success) {
        setSignatureConfig(sigData.config);
        setOwnerNameInput(sigData.config.ownerName);
        setOwnerTitleInput(sigData.config.ownerTitle);
        setOwnerSigUrlInput(sigData.config.ownerSignatureUrl || '');
      }
      if (logData.success) setAuditLogs(logData.logs || []);
    } catch (err) {
      console.error('Error loading admin student management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // ----------------------------------------------------
  // CERTIFICATE APPROVAL ACTIONS (OWNER WORKFLOW)
  // ----------------------------------------------------
  const handleApproveCertificate = async (certificateId: string) => {
    try {
      const res = await fetch('/api/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId,
          action: 'approve',
          performedBy: signatureConfig.ownerName || 'JAY PRAKASH BHAKAR',
          userRole: 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve certificate');
      }

      showFeedback(`Certificate approved by Owner ${signatureConfig.ownerName}! Ready to issue.`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleIssueCertificate = async (certificateId: string) => {
    try {
      const res = await fetch('/api/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId,
          action: 'issue',
          performedBy: signatureConfig.ownerName || 'JAY PRAKASH BHAKAR',
          userRole: 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to issue certificate');
      }

      showFeedback(`Certificate officially ISSUED! Certificate No: ${data.certificate.certificateNumber}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectCertificate = async () => {
    if (!rejectingCertId || !rejectionReason.trim()) return;
    try {
      const res = await fetch('/api/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: rejectingCertId,
          action: 'reject',
          reason: rejectionReason.trim(),
          performedBy: signatureConfig.ownerName || 'JAY PRAKASH BHAKAR',
          userRole: 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject certificate');
      }

      showFeedback(`Certificate rejected. Mentor has been notified with reason.`);
      setRejectingCertId(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------
  // STUDENT MODIFICATIONS
  // ----------------------------------------------------
  const handleRemoveStudentConfirm = async () => {
    if (!removeTargetStudent || !removalReason.trim()) return;
    try {
      const res = await fetch(`/api/students/${removeTargetStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          reason: removalReason.trim(),
          performedBy: 'Owner / Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove student');
      }

      showFeedback(`Student ${removeTargetStudent.name} deactivated. Full audit trail preserved.`);
      setRemoveTargetStudent(null);
      setRemovalReason('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReplaceStudentConfirm = async () => {
    if (!replaceTargetStudent || !replaceReason.trim() || !replaceForm.name.trim() || !replaceForm.contact.trim()) {
      alert('Please fill in replacement name, contact, and reason.');
      return;
    }

    try {
      const res = await fetch(`/api/students/${replaceTargetStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          reason: replaceReason.trim(),
          newStudent: {
            ...replaceForm,
            age: Number(replaceForm.age) || 16,
          },
          performedBy: 'Owner / Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to replace student');
      }

      showFeedback(`Student replaced successfully! New Student ID: ${data.newStudent.id}`);
      setReplaceTargetStudent(null);
      setReplaceReason('');
      setReplaceForm({ name: '', age: '16', fatherName: '', address: '', contact: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStudentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            name: editingStudent.name,
            age: Number(editingStudent.age),
            fatherName: editingStudent.fatherName,
            contact: editingStudent.contact,
            address: editingStudent.address,
            tenureDurationMonths: Number(editingStudent.tenureDurationMonths),
            status: editingStudent.status,
            tenureStatus: editingStudent.tenureStatus,
          },
          performedBy: 'Owner / Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update student');
      }

      showFeedback(`Student ${editingStudent.name} updated successfully.`);
      setEditingStudent(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTenureComplete = async (student: Student) => {
    const newStatus = student.tenureStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tenure',
          tenureStatus: newStatus,
          performedBy: 'Owner / Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update tenure');
      }

      showFeedback(`Tenure status for ${student.name} set to ${newStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------
  // SIGNATURE CONFIG SAVE
  // ----------------------------------------------------
  const handleSaveSignatures = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: ownerNameInput.trim(),
          ownerTitle: ownerTitleInput.trim(),
          ownerSignatureUrl: ownerSigUrlInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update signature settings');
      }

      setSignatureConfig(data.config);
      showFeedback('Signature configuration updated successfully.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchCat = studentCategoryFilter === 'ALL' || s.category === studentCategoryFilter;
    const matchStatus = studentStatusFilter === 'ALL' || s.status === studentStatusFilter;
    const matchSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.contact.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.fatherName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.academyName && s.academyName.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.schoolName && s.schoolName.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.mentorName && s.mentorName.toLowerCase().includes(studentSearch.toLowerCase()));

    return matchCat && matchStatus && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
      {/* Sub-tabs bar */}
      <div className="bg-[#2C1A0E] text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#8C5A32]/30">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {[
            { id: 'students', label: `Students (${students.length})`, icon: Users },
            { id: 'mentors', label: `Mentors (${mentors.length})`, icon: UserCheck },
            { id: 'certificates', label: `Owner Approvals (${certificates.filter((c) => c.status === 'PENDING_APPROVAL').length} Pending)`, icon: Award },
            { id: 'signatures', label: 'Signatures & Seal', icon: FileSignature },
            { id: 'audit', label: `Audit Log (${auditLogs.length})`, icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = subTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-[#8C5A32] text-white'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={loadData}
          className="text-xs text-[#E6AF6E] hover:underline font-semibold flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {feedbackMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage('')}>✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* =================================================================== */}
        {/* SUBTAB 1: STUDENTS DIRECTORY */}
        {/* =================================================================== */}
        {subTab === 'students' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by student ID, name, contact, mentor, organization..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category filters */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
                  {(['ALL', 'SOLO', 'ACADEMIC', 'SCHOOL'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setStudentCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        studentCategoryFilter === cat
                          ? 'bg-[#2C1A0E] text-white'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Status filters */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
                  {(['ALL', 'ACTIVE', 'COMPLETED', 'REMOVED', 'REPLACED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStudentStatusFilter(st)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        studentStatusFilter === st
                          ? 'bg-[#8C5A32] text-white'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Students Full Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead className="bg-[#FAF8F5] border-b border-stone-200 text-stone-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Student Name & Age</th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Organization / Mentor</th>
                    <th className="py-3 px-4">Admission</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tenure</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-stone-400">
                        No student records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#8C5A32]">
                          {st.id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-900 block">{st.name}</span>
                          <span className="text-[10px] text-stone-400">{st.age} Yrs • {st.contact}</span>
                        </td>
                        <td className="py-3 px-4 text-stone-700">{st.fatherName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-stone-100 text-stone-700">
                            {st.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {st.academyName || st.schoolName ? (
                            <div>
                              <span className="font-semibold block">{st.academyName || st.schoolName}</span>
                              <span className="text-[10px] text-stone-400">{st.mentorName || 'Mentor'}</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">Direct Solo</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {st.admissionDate}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-800">
                            {st.attendanceStats?.percentage || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              st.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : st.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-700'
                                : st.status === 'REPLACED'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleTenureComplete(st)}
                            title="Click to toggle Completed / In Progress"
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              st.tenureStatus === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}
                          >
                            {st.tenureStatus}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="View Full History & Profile"
                              onClick={() => setViewStudentProfile(st)}
                              className="p-1 rounded hover:bg-stone-100 text-stone-600"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Edit Details"
                              onClick={() => setEditingStudent(st)}
                              className="p-1 rounded hover:bg-stone-100 text-blue-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {st.status === 'ACTIVE' && (
                              <>
                                <button
                                  title="Replace Student in Batch"
                                  onClick={() => setReplaceTargetStudent(st)}
                                  className="p-1 rounded hover:bg-amber-50 text-amber-600"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Remove Student Record"
                                  onClick={() => setRemoveTargetStudent(st)}
                                  className="p-1 rounded hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBTAB 2: MENTORS DIRECTORY */}
        {/* =================================================================== */}
        {subTab === 'mentors' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-[#FAF8F5] border-b border-stone-200 text-stone-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mentor ID / Username</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Assigned Students</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Registered On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {mentors.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#8C5A32] block">{m.username}</span>
                        <span className="text-[10px] text-stone-400">{m.id}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-900">{m.name}</td>
                      <td className="py-3 px-4 text-stone-700">{m.organizationName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{m.contact}</td>
                      <td className="py-3 px-4 font-bold text-stone-800">
                        {students.filter((s) => s.mentorId === m.id).length} Students
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-stone-500">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBTAB 3: CERTIFICATES & OWNER APPROVAL WORKFLOW */}
        {/* =================================================================== */}
        {subTab === 'certificates' && (
          <div className="space-y-6">
            <div className="bg-[#FAF8F5] border border-[#8C5A32]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
                  Owner Certificate Approval Gateway
                </h3>
                <p className="text-xs text-stone-600">
                  Logged in as Academy Owner: <strong className="text-[#2C1A0E]">{signatureConfig.ownerName}</strong>.
                  Mentors cannot approve their own student certificates. All requests must receive your official sign-off.
                </p>
              </div>
            </div>

            {/* Certificate list */}
            <div className="space-y-3">
              {certificates.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400 text-xs">
                  No certificate requests currently in the system.
                </div>
              ) : (
                certificates.map((cert) => {
                  const isPending = cert.status === 'PENDING_APPROVAL';
                  const isApproved = cert.status === 'APPROVED';
                  const isIssued = cert.status === 'ISSUED';
                  const isRejected = cert.status === 'REJECTED';

                  return (
                    <div
                      key={cert.id}
                      className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-base text-[#2C1A0E]">
                            {cert.studentName}
                          </span>
                          <span className="font-mono text-xs text-[#8C5A32]">
                            {cert.studentId}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isIssued
                                ? 'bg-emerald-100 text-emerald-800'
                                : isApproved
                                ? 'bg-blue-100 text-blue-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : isRejected
                                ? 'bg-red-100 text-red-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {cert.status}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600">
                          Son of {cert.fatherName} • Category: <strong>{cert.category}</strong>
                          {cert.organizationName && <> • Organization: <strong>{cert.organizationName}</strong></>}
                          {cert.mentorName && <> • Mentor: <strong>{cert.mentorName}</strong></>}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 pt-1">
                          <span>Tenure: {cert.tenureStartDate} to {cert.tenureEndDate}</span>
                          <span>•</span>
                          <span>Attendance: <strong className="text-emerald-700">{cert.attendancePercentage}%</strong></span>
                          <span>•</span>
                          <span>Cert No: <code className="font-mono text-stone-700">{cert.certificateNumber}</code></span>
                        </div>

                        {cert.rejectionReason && (
                          <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                            Rejection Note: {cert.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Owner Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setPreviewCert(cert)}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApproveCertificate(cert.id)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve Certificate
                            </button>
                            <button
                              onClick={() => setRejectingCertId(cert.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
                            >
                              Reject...
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => handleIssueCertificate(cert.id)}
                            className="px-4 py-1.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5 text-[#E6AF6E]" />
                            Issue Official Certificate
                          </button>
                        )}

                        {isIssued && (
                          <button
                            onClick={() => setPreviewCert(cert)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print Issued Cert
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBTAB 4: SIGNATURES & ACADEMY SEAL MANAGEMENT */}
        {/* =================================================================== */}
        {subTab === 'signatures' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
                Academy Owner Signature & Credentials
              </h3>
              <p className="text-xs text-stone-500">
                Configure the official signature stamped on all sports completion certificates issued by Kuchaman Sports Academy.
              </p>

              <form onSubmit={handleSaveSignatures} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Academy Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerNameInput}
                    onChange={(e) => setOwnerNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Official Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerTitleInput}
                    onChange={(e) => setOwnerTitleInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Custom Signature Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... or leave blank for default calligraphy"
                    value={ownerSigUrlInput}
                    onChange={(e) => setOwnerSigUrlInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-xs font-bold transition-colors"
                  >
                    Save Signature Settings
                  </button>
                </div>
              </form>
            </div>

            {/* Live Certificate Signature Preview */}
            <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
                Official Certificate Seal & Preview
              </h3>

              <div className="p-6 bg-[#FAF8F5] rounded-xl border-2 border-dashed border-[#8C5A32]/40 text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-[#8C5A32] flex items-center justify-center p-1 bg-white shadow-sm">
                    <div className="w-full h-full rounded-full border border-dashed border-[#E6AF6E] flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold tracking-widest text-[#8C5A32] uppercase">KSA</span>
                      <span className="text-[10px] font-black text-[#2C1A0E]">SEAL</span>
                      <span className="text-[8px] text-stone-500 font-mono">2026</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-12 flex items-center justify-center">
                    {ownerSigUrlInput ? (
                      <img src={ownerSigUrlInput} alt="Owner Signature" className="max-h-10 object-contain" />
                    ) : (
                      <span className="font-serif italic font-bold text-xl text-stone-800 tracking-wider">
                        {ownerNameInput || 'Jay Prakash Bhakar'}
                      </span>
                    )}
                  </div>
                  <div className="w-32 border-b border-stone-400 mx-auto" />
                  <p className="font-serif font-bold text-xs text-[#2C1A0E]">
                    {ownerNameInput || 'JAY PRAKASH BHAKAR'}
                  </p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider">
                    {ownerTitleInput || 'Founder & Director, KSA'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBTAB 5: CENTRAL AUDIT & ACTIVITY LOGS */}
        {/* =================================================================== */}
        {subTab === 'audit' && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-[#FAF8F5] border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type / ID</th>
                  <th className="py-3 px-4">Details & Reason</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4 font-bold text-[#8C5A32]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {log.entityType || 'STUDENT'} • {log.entityId || log.studentId || '-'}
                      </td>
                      <td className="py-3 px-4 text-stone-800">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-700">
                        {log.performedBy}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-400 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL: VIEW STUDENT PROFILE */}
      {/* =================================================================== */}
      {viewStudentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C5A32]">
                  {viewStudentProfile.category} Student Profile
                </span>
                <h3 className="font-serif font-bold text-2xl text-[#2C1A0E]">
                  {viewStudentProfile.name}
                </h3>
              </div>
              <button
                onClick={() => setViewStudentProfile(null)}
                className="text-stone-400 hover:text-stone-800 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Student ID</span>
                <p className="font-mono font-bold text-[#8C5A32]">{viewStudentProfile.id}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Father&apos;s Name</span>
                <p className="font-semibold text-stone-800">{viewStudentProfile.fatherName}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Age & Contact</span>
                <p className="text-stone-800">{viewStudentProfile.age} Yrs • {viewStudentProfile.contact}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Category</span>
                <p className="font-semibold text-stone-800">{viewStudentProfile.category}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Status</span>
                <p className="font-bold text-emerald-700">{viewStudentProfile.status}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Tenure Progress</span>
                <p className="text-stone-800">{viewStudentProfile.tenureStatus}</p>
              </div>
            </div>

            {/* Attendance Snapshot */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C5A32] block mb-2">
                Attendance Statistics
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded">
                  <span className="text-[10px] text-stone-400 block">Total Days</span>
                  <span className="font-bold">{viewStudentProfile.attendanceStats?.totalDays || 0}</span>
                </div>
                <div className="bg-white p-2 rounded text-emerald-700">
                  <span className="text-[10px] text-stone-400 block">Present</span>
                  <span className="font-bold">{viewStudentProfile.attendanceStats?.present || 0}</span>
                </div>
                <div className="bg-white p-2 rounded text-red-700">
                  <span className="text-[10px] text-stone-400 block">Absent</span>
                  <span className="font-bold">{viewStudentProfile.attendanceStats?.absent || 0}</span>
                </div>
                <div className="bg-white p-2 rounded text-[#8C5A32]">
                  <span className="text-[10px] text-stone-400 block">Attendance Rate</span>
                  <span className="font-bold">{viewStudentProfile.attendanceStats?.percentage || 0}%</span>
                </div>
              </div>
            </div>

            {/* Audit & Modification History */}
            <div>
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Full Audit History (Permanent Record)
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {viewStudentProfile.history?.map((h, i) => (
                  <div key={i} className="p-2.5 bg-stone-50 rounded-lg text-xs space-y-0.5 border border-stone-100">
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span className="font-semibold text-[#8C5A32]">{h.action}</span>
                      <span>{h.date} {h.time}</span>
                    </div>
                    <p className="text-stone-700">{h.details}</p>
                    <p className="text-[10px] text-stone-400 italic">Performed By: {h.performedBy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewStudentProfile(null)}
                className="px-5 py-2 bg-[#2C1A0E] text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT STUDENT DETAILS */}
      {/* =================================================================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-xl text-[#2C1A0E]">
                Edit Student Details
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-stone-400">✕</button>
            </div>

            <form onSubmit={handleUpdateStudentDetails} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Student Name</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={editingStudent.age}
                    onChange={(e) => setEditingStudent({ ...editingStudent, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Father&apos;s Name</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fatherName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Contact</label>
                  <input
                    type="tel"
                    required
                    value={editingStudent.contact}
                    onChange={(e) => setEditingStudent({ ...editingStudent, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Address</label>
                <input
                  type="text"
                  value={editingStudent.address}
                  onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Status</label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REMOVED">REMOVED</option>
                    <option value="REPLACED">REPLACED</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tenure Status</label>
                  <select
                    value={editingStudent.tenureStatus}
                    onChange={(e) => setEditingStudent({ ...editingStudent, tenureStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  >
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="EXTENDED">EXTENDED</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-stone-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2C1A0E] text-white rounded-lg font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: REJECT CERTIFICATE WITH REASON */}
      {/* =================================================================== */}
      {rejectingCertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-200">
            <h3 className="font-serif font-bold text-xl text-[#2C1A0E]">
              Reject Certificate Request
            </h3>
            <p className="text-xs text-stone-500">
              Provide a clear reason for rejecting this certificate request so the mentor can address the discrepancy.
            </p>

            <div>
              <label className="font-semibold text-xs block mb-1">Rejection Reason *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Attendance criteria not met / Incomplete tenure period"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingCertId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleRejectCertificate}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CERTIFICATE PREVIEW MODAL */}
      {/* =================================================================== */}
      {previewCert && (
        <CertificateModal
          certificate={previewCert}
          isOpen={!!previewCert}
          onClose={() => setPreviewCert(null)}
        />
      )}
    </div>
  );
}
