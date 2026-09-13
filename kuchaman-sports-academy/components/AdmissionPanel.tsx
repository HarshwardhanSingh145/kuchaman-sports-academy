'use client';

import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  School,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Sparkles,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Phone,
  MapPin,
  KeyRound,
  IdCard,
} from 'lucide-react';
import { Student, StudentCategory } from '@/lib/types';

interface AdmissionPanelProps {
  onBackToHome?: () => void;
  onOpenMentorPanel?: (credentials?: { username: string; pass: string }) => void;
}

type EntryMode = 'SELECT' | 'SOLO' | 'ACADEMIC' | 'SCHOOL';

interface DynamicStudentForm {
  name: string;
  age: string;
  fatherName: string;
  address: string;
  contact: string;
}

export default function AdmissionPanel({ onBackToHome, onOpenMentorPanel }: AdmissionPanelProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>('SELECT');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ----------------------------------------------------
  // SOLO ENTRY STATE
  // ----------------------------------------------------
  const [soloForm, setSoloForm] = useState({
    name: '',
    age: '',
    fatherName: '',
    address: '',
    contact: '',
    tenureDurationMonths: '6',
  });
  const [soloSuccessStudent, setSoloSuccessStudent] = useState<Student | null>(null);

  // ----------------------------------------------------
  // ACADEMIC ENTRY STATE
  // ----------------------------------------------------
  const [acadStep, setAcadStep] = useState<1 | 2 | 3 | 4>(1);
  const [acadOrgDetails, setAcadOrgDetails] = useState({
    academyName: '',
    mentorName: '',
    mentorContact: '',
    tenureDurationMonths: '6',
  });
  const [acadStudentCount, setAcadStudentCount] = useState<number>(5);
  const [acadStudents, setAcadStudents] = useState<DynamicStudentForm[]>([]);
  const [acadBatchResult, setAcadBatchResult] = useState<{
    students: Student[];
    mentorCredentials: { username: string; tempPassword: string; mentorName: string; orgName: string } | null;
  } | null>(null);

  // ----------------------------------------------------
  // SCHOOL ENTRY STATE
  // ----------------------------------------------------
  const [schoolStep, setSchoolStep] = useState<1 | 2 | 3>(1);
  const [schoolOrgDetails, setSchoolOrgDetails] = useState({
    schoolName: '',
    schoolContact: '',
    mentorName: '',
    mentorContact: '',
    tenureDurationMonths: '3',
  });
  const [schoolStudentCount, setSchoolStudentCount] = useState<number>(5);
  const [schoolStudents, setSchoolStudents] = useState<DynamicStudentForm[]>([]);
  const [schoolBatchResult, setSchoolBatchResult] = useState<{
    students: Student[];
    mentorCredentials: { username: string; tempPassword: string; mentorName: string; orgName: string } | null;
  } | null>(null);

  // ----------------------------------------------------
  // SOLO SUBMISSION
  // ----------------------------------------------------
  const handleSoloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!soloForm.name || !soloForm.fatherName || !soloForm.contact || !soloForm.age || !soloForm.address) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: soloForm.name,
          age: Number(soloForm.age),
          fatherName: soloForm.fatherName,
          address: soloForm.address,
          contact: soloForm.contact,
          category: 'SOLO',
          tenureDurationMonths: Number(soloForm.tenureDurationMonths),
          admissionDate: new Date().toISOString().split('T')[0],
          admissionTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          performedBy: 'Admission Portal (Solo Entry)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit solo registration');
      }

      setSoloSuccessStudent(data.student);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // ACADEMIC SUBMISSION
  // ----------------------------------------------------
  const handleAcadStep1Continue = () => {
    setErrorMessage('');
    if (!acadOrgDetails.academyName || !acadOrgDetails.mentorName || !acadOrgDetails.mentorContact) {
      setErrorMessage('Please provide Academy Name, Mentor Name, and Mentor Contact.');
      return;
    }
    setAcadStep(2);
  };

  const handleAcadStep2Continue = (count: number) => {
    setAcadStudentCount(count);
    // Initialize student forms
    const forms: DynamicStudentForm[] = [];
    for (let i = 0; i < count; i++) {
      forms.push({
        name: '',
        age: '16',
        fatherName: '',
        address: acadOrgDetails.academyName + ' Hostel / Campus',
        contact: '',
      });
    }
    setAcadStudents(forms);
    setAcadStep(3);
  };

  const handleAcadSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate that at least one student is filled
    const validStudents = acadStudents.filter((s) => s.name.trim() && s.fatherName.trim() && s.contact.trim());
    if (validStudents.length === 0) {
      setErrorMessage('Please fill in at least one valid student record.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create mentor account
      const mentorRes = await fetch('/api/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: acadOrgDetails.mentorName,
          contact: acadOrgDetails.mentorContact,
          organizationName: acadOrgDetails.academyName,
          category: 'ACADEMIC',
        }),
      });
      const mentorData = await mentorRes.json();
      if (!mentorRes.ok || !mentorData.success) {
        throw new Error(mentorData.error || 'Failed to initialize mentor credentials');
      }

      // 2. Submit bulk students linked to mentor
      const studentsRes = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          students: validStudents,
          category: 'ACADEMIC',
          academyName: acadOrgDetails.academyName,
          mentorId: mentorData.mentor.id,
          mentorName: mentorData.mentor.name,
          mentorContact: mentorData.mentor.contact,
          tenureDurationMonths: Number(acadOrgDetails.tenureDurationMonths),
          admissionDate: new Date().toISOString().split('T')[0],
          admissionTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          performedBy: `${acadOrgDetails.mentorName} (Academic Mentor)`,
        }),
      });

      const studentsData = await studentsRes.json();
      if (!studentsRes.ok || !studentsData.success) {
        throw new Error(studentsData.error || 'Failed to register students batch');
      }

      setAcadBatchResult({
        students: studentsData.students,
        mentorCredentials: {
          username: mentorData.mentor.username,
          tempPassword: mentorData.tempPassword,
          mentorName: acadOrgDetails.mentorName,
          orgName: acadOrgDetails.academyName,
        },
      });

      setAcadStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error completing Academic registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // SCHOOL SUBMISSION
  // ----------------------------------------------------
  const handleSchoolStep1Continue = () => {
    setErrorMessage('');
    if (!schoolOrgDetails.schoolName || !schoolOrgDetails.mentorName || !schoolOrgDetails.mentorContact) {
      setErrorMessage('Please fill in all School and Mentor details.');
      return;
    }
    // Initialize student forms
    const forms: DynamicStudentForm[] = [];
    for (let i = 0; i < schoolStudentCount; i++) {
      forms.push({
        name: '',
        age: '14',
        fatherName: '',
        address: schoolOrgDetails.schoolName + ', Kuchaman City',
        contact: '',
      });
    }
    setSchoolStudents(forms);
    setSchoolStep(2);
  };

  const handleSchoolSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const validStudents = schoolStudents.filter((s) => s.name.trim() && s.fatherName.trim() && s.contact.trim());
    if (validStudents.length === 0) {
      setErrorMessage('Please fill in at least one student record.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create mentor account for school
      const mentorRes = await fetch('/api/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolOrgDetails.mentorName,
          contact: schoolOrgDetails.mentorContact,
          organizationName: schoolOrgDetails.schoolName,
          category: 'SCHOOL',
        }),
      });
      const mentorData = await mentorRes.json();
      if (!mentorRes.ok || !mentorData.success) {
        throw new Error(mentorData.error || 'Failed to initialize school mentor credentials');
      }

      // 2. Submit bulk students
      const studentsRes = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          students: validStudents,
          category: 'SCHOOL',
          schoolName: schoolOrgDetails.schoolName,
          mentorId: mentorData.mentor.id,
          mentorName: mentorData.mentor.name,
          mentorContact: mentorData.mentor.contact,
          tenureDurationMonths: Number(schoolOrgDetails.tenureDurationMonths),
          admissionDate: new Date().toISOString().split('T')[0],
          admissionTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          performedBy: `${schoolOrgDetails.mentorName} (School Mentor)`,
        }),
      });

      const studentsData = await studentsRes.json();
      if (!studentsRes.ok || !studentsData.success) {
        throw new Error(studentsData.error || 'Failed to register school students');
      }

      setSchoolBatchResult({
        students: studentsData.students,
        mentorCredentials: {
          username: mentorData.mentor.username,
          tempPassword: mentorData.tempPassword,
          mentorName: schoolOrgDetails.mentorName,
          orgName: schoolOrgDetails.schoolName,
        },
      });

      setSchoolStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error completing School registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'id' | 'creds') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2000);
    }
  };

  // =========================================================================
  // VIEW: MAIN ADMISSION PANEL SELECTION (3 CARDS)
  // =========================================================================
  if (entryMode === 'SELECT') {
    return (
      <div id="admission-panel-container" className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8C5A32]/10 border border-[#8C5A32]/30 text-[#8C5A32] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#8C5A32]" />
            Official KSA Admission Gateway
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-[#2C1A0E] tracking-tight">
            ADMISSION PANEL
          </h1>
          <p className="text-stone-600 text-sm sm:text-base font-sans leading-relaxed">
            Select your registration category below to initiate enrollment, generate guaranteed unique student IDs, configure mentor tracking, and start training at Kuchaman Sports Academy.
          </p>
        </div>

        {/* 3 Main Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {/* Card A: SOLO ENTRY */}
          <div
            id="solo-entry-card"
            onClick={() => setEntryMode('SOLO')}
            className="group relative bg-white rounded-2xl border-2 border-[#2C1A0E]/10 hover:border-[#8C5A32] p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#8C5A32]/30 flex items-center justify-center text-[#8C5A32] group-hover:bg-[#8C5A32] group-hover:text-white transition-colors duration-300">
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                  Option A
                </span>
                <h3 className="text-2xl font-serif font-bold text-[#2C1A0E] group-hover:text-[#8C5A32] transition-colors">
                  SOLO ENTRY
                </h3>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Individual athlete admission. Perfect for independent players enrolling for personalized coaching, training tenure, and official KSA certification.
              </p>
              <ul className="text-xs text-stone-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Instant Unique Student ID
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Single-step Digital Admission Pass
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Direct Admin Roster Enrollment
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-[#8C5A32] group-hover:translate-x-1 transition-transform">
              <span>Start Solo Admission</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card B: ACADEMIC ENTRY */}
          <div
            id="academic-entry-card"
            onClick={() => setEntryMode('ACADEMIC')}
            className="group relative bg-white rounded-2xl border-2 border-[#2C1A0E]/10 hover:border-[#8C5A32] p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#8C5A32]/30 flex items-center justify-center text-[#8C5A32] group-hover:bg-[#8C5A32] group-hover:text-white transition-colors duration-300">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                  Option B
                </span>
                <h3 className="text-2xl font-serif font-bold text-[#2C1A0E] group-hover:text-[#8C5A32] transition-colors">
                  ACADEMIC ENTRY
                </h3>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Sports academy or club batch enrollment. Add multiple students simultaneously with auto-generated mentor credentials for isolated attendance tracking.
              </p>
              <ul className="text-xs text-stone-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dynamic Multi-Student Entry
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Auto Mentor Login & Credentials
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Isolated Attendance & Tenure Tracking
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-[#8C5A32] group-hover:translate-x-1 transition-transform">
              <span>Start Academic Batch</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card C: SCHOOL ENTRY */}
          <div
            id="school-entry-card"
            onClick={() => setEntryMode('SCHOOL')}
            className="group relative bg-white rounded-2xl border-2 border-[#2C1A0E]/10 hover:border-[#8C5A32] p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#8C5A32]/30 flex items-center justify-center text-[#8C5A32] group-hover:bg-[#8C5A32] group-hover:text-white transition-colors duration-300">
                <School className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                  Option C
                </span>
                <h3 className="text-2xl font-serif font-bold text-[#2C1A0E] group-hover:text-[#8C5A32] transition-colors">
                  SCHOOL ENTRY
                </h3>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Institutional school delegation enrollment. Register student cohorts with dedicated faculty mentors and structured seasonal sports training programs.
              </p>
              <ul className="text-xs text-stone-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  School Delegation Registration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dedicated Physical Trainer Portal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Official School Completion Certificates
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between text-sm font-semibold text-[#8C5A32] group-hover:translate-x-1 transition-transform">
              <span>Start School Entry</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        {onBackToHome && (
          <div className="text-center mt-12">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#2C1A0E] transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Slots & Facilities
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: SOLO ENTRY REGISTRATION
  // =========================================================================
  if (entryMode === 'SOLO') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setEntryMode('SELECT');
            setSoloSuccessStudent(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#2C1A0E] transition-colors uppercase tracking-wider mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admission Options
        </button>

        {!soloSuccessStudent ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10 shadow-sm space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                Step 1 of 1 • Solo Registration
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1A0E] mt-1">
                Individual Student Enrollment
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Fill in the athlete&apos;s personal details. A guaranteed unique Student ID will be generated upon submission.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSoloSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Student Full Name *
                  </label>
                  <input
                    id="solo-name-input"
                    type="text"
                    required
                    placeholder="e.g. Rahul Choudhary"
                    value={soloForm.name}
                    onChange={(e) => setSoloForm({ ...soloForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32] focus:ring-1 focus:ring-[#8C5A32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Age *
                  </label>
                  <input
                    id="solo-age-input"
                    type="number"
                    min="6"
                    max="60"
                    required
                    placeholder="e.g. 16"
                    value={soloForm.age}
                    onChange={(e) => setSoloForm({ ...soloForm, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32] focus:ring-1 focus:ring-[#8C5A32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Father&apos;s Name *
                  </label>
                  <input
                    id="solo-father-input"
                    type="text"
                    required
                    placeholder="e.g. Sh. Suresh Choudhary"
                    value={soloForm.fatherName}
                    onChange={(e) => setSoloForm({ ...soloForm, fatherName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32] focus:ring-1 focus:ring-[#8C5A32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Contact Number *
                  </label>
                  <input
                    id="solo-contact-input"
                    type="tel"
                    required
                    placeholder="+91 98290 XXXXX"
                    value={soloForm.contact}
                    onChange={(e) => setSoloForm({ ...soloForm, contact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32] focus:ring-1 focus:ring-[#8C5A32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Residential Address *
                </label>
                <textarea
                  id="solo-address-input"
                  required
                  rows={2}
                  placeholder="Street / Colony, Kuchaman City, Rajasthan"
                  value={soloForm.address}
                  onChange={(e) => setSoloForm({ ...soloForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32] focus:ring-1 focus:ring-[#8C5A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Tenure Duration (Training Period)
                </label>
                <select
                  value={soloForm.tenureDurationMonths}
                  onChange={(e) => setSoloForm({ ...soloForm, tenureDurationMonths: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                >
                  <option value="1">1 Month Training</option>
                  <option value="3">3 Months Foundation</option>
                  <option value="6">6 Months Professional (Recommended)</option>
                  <option value="12">12 Months Elite Athletic Program</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEntryMode('SELECT')}
                  className="px-5 py-2.5 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  id="solo-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    'Processing Admission...'
                  ) : (
                    <>
                      Register & Generate ID
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Solo Registration Success Digital Pass */
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-6 sm:p-10 shadow-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1A0E]">
                Admission Confirmed!
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                The student has been officially enrolled under the <strong className="text-[#2C1A0E]">SOLO</strong> category.
              </p>
            </div>

            {/* Pass Card */}
            <div className="p-6 bg-[#FAF8F5] rounded-xl border border-[#8C5A32]/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-stone-200 pb-3 gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
                    Kuchaman Sports Academy
                  </span>
                  <p className="font-serif font-bold text-lg text-[#2C1A0E]">
                    Digital Student Admission Pass
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-600/10 text-emerald-700 text-xs font-semibold border border-emerald-600/20">
                  Status: ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-stone-500 uppercase font-semibold text-[10px]">
                    Student Name
                  </span>
                  <p className="font-serif font-bold text-base text-[#2C1A0E]">
                    {soloSuccessStudent.name}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500 uppercase font-semibold text-[10px]">
                    Father&apos;s Name
                  </span>
                  <p className="font-semibold text-stone-800 text-sm">
                    {soloSuccessStudent.fatherName}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500 uppercase font-semibold text-[10px]">
                    Age & Contact
                  </span>
                  <p className="font-medium text-stone-800">
                    {soloSuccessStudent.age} Yrs • {soloSuccessStudent.contact}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500 uppercase font-semibold text-[10px]">
                    Admission Date & Time
                  </span>
                  <p className="font-medium text-stone-800">
                    {soloSuccessStudent.admissionDate} ({soloSuccessStudent.admissionTime})
                  </p>
                </div>
              </div>

              {/* Unique Student ID Card */}
              <div className="p-4 bg-white rounded-lg border-2 border-dashed border-[#8C5A32] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500">
                    Guaranteed Unique Student ID
                  </span>
                  <p className="font-mono text-xl sm:text-2xl font-black text-[#8C5A32]">
                    {soloSuccessStudent.id}
                  </p>
                </div>
                <button
                  id="copy-student-id-btn"
                  onClick={() => copyToClipboard(soloSuccessStudent.id, 'id')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 text-xs font-semibold text-[#8C5A32] border border-[#8C5A32]/30 transition-colors"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedId ? 'Copied' : 'Copy ID'}
                </button>
              </div>

              <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1">
                <span>Category: SOLO</span>
                <span>Tenure Duration: {soloSuccessStudent.tenureDurationMonths} Months</span>
                <span>Location: KSA Campus</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setSoloSuccessStudent(null);
                  setSoloForm({
                    name: '',
                    age: '',
                    fatherName: '',
                    address: '',
                    contact: '',
                    tenureDurationMonths: '6',
                  });
                }}
                className="px-4 py-2 text-xs font-semibold text-[#8C5A32] hover:underline"
              >
                + Register Another Solo Student
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <Printer className="w-4 h-4" />
                  Print Pass
                </button>
                <button
                  onClick={() => setEntryMode('SELECT')}
                  className="px-4 py-2 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-xs font-semibold"
                >
                  Back to Admission Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: ACADEMIC ENTRY MULTI-STEP WORKFLOW
  // =========================================================================
  if (entryMode === 'ACADEMIC') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setEntryMode('SELECT');
            setAcadStep(1);
            setAcadBatchResult(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#2C1A0E] transition-colors uppercase tracking-wider mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admission Options
        </button>

        {/* Multi-step progress bar */}
        <div className="mb-8 flex items-center justify-between max-w-2xl mx-auto">
          {[
            { step: 1, label: 'Academy Details' },
            { step: 2, label: 'Student Count' },
            { step: 3, label: 'Add Students' },
            { step: 4, label: 'Mentor Login' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  acadStep >= item.step
                    ? 'bg-[#8C5A32] text-white'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {item.step}
              </div>
              <span className={`text-xs hidden sm:inline font-medium ${acadStep >= item.step ? 'text-[#2C1A0E]' : 'text-stone-400'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 max-w-2xl mx-auto">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: ACADEMY DETAILS */}
        {acadStep === 1 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                Step 1 of 4 • Academy & Mentor Setup
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#2C1A0E] mt-1">
                ACADEMY DETAILS
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Specify the sports academy or club name and the personal mentor responsible for the batch.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Academy / Club Name *
                </label>
                <input
                  id="acad-org-input"
                  type="text"
                  required
                  placeholder="e.g. Kuchaman Cricket Academy"
                  value={acadOrgDetails.academyName}
                  onChange={(e) => setAcadOrgDetails({ ...acadOrgDetails, academyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Personal Mentor Name *
                  </label>
                  <input
                    id="acad-mentor-name-input"
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={acadOrgDetails.mentorName}
                    onChange={(e) => setAcadOrgDetails({ ...acadOrgDetails, mentorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Mentor Contact Number *
                  </label>
                  <input
                    id="acad-mentor-contact-input"
                    type="tel"
                    required
                    placeholder="+91 98291 XXXXX"
                    value={acadOrgDetails.mentorContact}
                    onChange={(e) => setAcadOrgDetails({ ...acadOrgDetails, mentorContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Tenure Duration (Months)
                </label>
                <select
                  value={acadOrgDetails.tenureDurationMonths}
                  onChange={(e) => setAcadOrgDetails({ ...acadOrgDetails, tenureDurationMonths: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                >
                  <option value="3">3 Months</option>
                  <option value="6">6 Months (Standard Academic)</option>
                  <option value="12">12 Months (Full Annual)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  id="acad-step1-btn"
                  onClick={handleAcadStep1Continue}
                  className="px-6 py-2.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  ADD STUDENTS
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: NUMBER OF STUDENTS */}
        {acadStep === 2 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10 shadow-sm max-w-xl mx-auto space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                Step 2 of 4 • Batch Size
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#2C1A0E] mt-1">
                NUMBER OF STUDENTS
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                How many students are enrolling for {acadOrgDetails.academyName}?
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Quick Selection
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleAcadStep2Continue(num)}
                    className="py-3 rounded-lg border border-stone-300 hover:border-[#8C5A32] hover:bg-[#FAF8F5] text-sm font-bold text-[#2C1A0E] transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Or Enter Custom Count:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={acadStudentCount}
                    onChange={(e) => setAcadStudentCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-32 px-3.5 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                  <button
                    onClick={() => handleAcadStep2Continue(acadStudentCount)}
                    className="px-6 py-2 rounded-lg bg-[#8C5A32] hover:bg-[#A36D42] text-white text-xs font-semibold transition-colors"
                  >
                    Generate {acadStudentCount} Student Forms
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DYNAMIC FORM GENERATION FOR STUDENTS */}
        {acadStep === 3 && (
          <form onSubmit={handleAcadSubmitBatch} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#8C5A32]/20">
              <div>
                <p className="font-serif font-bold text-[#2C1A0E] text-base">
                  {acadOrgDetails.academyName} • Batch of {acadStudents.length} Students
                </p>
                <p className="text-xs text-stone-600">
                  Mentor: {acadOrgDetails.mentorName} ({acadOrgDetails.mentorContact})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAcadStep(2)}
                className="text-xs font-semibold text-[#8C5A32] hover:underline"
              >
                Change Count
              </button>
            </div>

            <div className="space-y-4">
              {acadStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4 relative"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-[#8C5A32] uppercase">
                      Student #{idx + 1}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Target ID: KSA-ACAD-2026-XXXX
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Student Name"
                        value={student.name}
                        onChange={(e) => {
                          const updated = [...acadStudents];
                          updated[idx].name = e.target.value;
                          setAcadStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Age *
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="50"
                        required
                        value={student.age}
                        onChange={(e) => {
                          const updated = [...acadStudents];
                          updated[idx].age = e.target.value;
                          setAcadStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Father&apos;s Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Father Name"
                        value={student.fatherName}
                        onChange={(e) => {
                          const updated = [...acadStudents];
                          updated[idx].fatherName = e.target.value;
                          setAcadStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98290 XXXXX"
                        value={student.contact}
                        onChange={(e) => {
                          const updated = [...acadStudents];
                          updated[idx].contact = e.target.value;
                          setAcadStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Address / City
                      </label>
                      <input
                        type="text"
                        value={student.address}
                        onChange={(e) => {
                          const updated = [...acadStudents];
                          updated[idx].address = e.target.value;
                          setAcadStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setAcadStep(2)}
                className="px-5 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  'Creating Students & Mentor Credentials...'
                ) : (
                  <>
                    Save Batch & Generate Mentor Login
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: ACADEMIC MENTOR LOGIN CREDENTIALS DISPLAY */}
        {acadStep === 4 && acadBatchResult && acadBatchResult.mentorCredentials && (
          <div className="bg-white rounded-2xl border-2 border-[#8C5A32]/40 p-6 sm:p-10 shadow-lg space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#8C5A32]/40 text-[#8C5A32] flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1A0E]">
                ACADEMIC MENTOR LOGIN
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                {acadBatchResult.students.length} students have been successfully registered. The personal mentor account has been created:
              </p>
            </div>

            {/* Mentor Credentials Card */}
            <div className="p-6 bg-[#FAF8F5] rounded-xl border border-[#8C5A32]/30 space-y-4">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C5A32]">
                    Organization: {acadBatchResult.mentorCredentials.orgName}
                  </span>
                  <p className="font-serif font-bold text-[#2C1A0E]">
                    Mentor: {acadBatchResult.mentorCredentials.mentorName}
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#8C5A32]/10 text-[#8C5A32] text-xs font-semibold">
                  Academic Mentor
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">
                    Username
                  </span>
                  <span className="font-mono text-base font-bold text-[#2C1A0E]">
                    {acadBatchResult.mentorCredentials.username}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">
                    Temporary Password
                  </span>
                  <span className="font-mono text-base font-bold text-[#8C5A32]">
                    {acadBatchResult.mentorCredentials.tempPassword}
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-500 space-y-1">
                <p>• The mentor must use these credentials to log in to the <strong>Mentor Panel</strong>.</p>
                <p>• On first login, the mentor will be prompted to set a permanent password.</p>
                <p>• All {acadBatchResult.students.length} students are automatically mapped to this mentor.</p>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    `KSA MENTOR CREDENTIALS\nOrganization: ${acadBatchResult.mentorCredentials?.orgName}\nMentor: ${acadBatchResult.mentorCredentials?.mentorName}\nUsername: ${acadBatchResult.mentorCredentials?.username}\nPassword: ${acadBatchResult.mentorCredentials?.tempPassword}`,
                    'creds'
                  )
                }
                className="w-full py-2.5 rounded-lg bg-white hover:bg-stone-50 text-[#8C5A32] border border-[#8C5A32]/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {copiedCreds ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedCreds ? 'Credentials Copied to Clipboard!' : 'Copy Mentor Login Details'}
              </button>
            </div>

            {/* Students Created Summary */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Generated Student IDs:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-stone-200 rounded-lg p-3 bg-white text-xs font-mono">
                {acadBatchResult.students.map((st) => (
                  <div key={st.id} className="flex items-center justify-between py-0.5">
                    <span className="font-bold text-[#2C1A0E]">{st.name}</span>
                    <span className="text-[#8C5A32]">{st.id}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setAcadStep(1);
                  setAcadBatchResult(null);
                }}
                className="text-xs font-semibold text-[#8C5A32] hover:underline"
              >
                + Register Another Academy Batch
              </button>
              {onOpenMentorPanel && (
                <button
                  onClick={() =>
                    onOpenMentorPanel({
                      username: acadBatchResult.mentorCredentials!.username,
                      pass: acadBatchResult.mentorCredentials!.tempPassword,
                    })
                  }
                  className="px-6 py-2.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  Open Mentor Panel
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: SCHOOL ENTRY MULTI-STEP WORKFLOW
  // =========================================================================
  if (entryMode === 'SCHOOL') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setEntryMode('SELECT');
            setSchoolStep(1);
            setSchoolBatchResult(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#2C1A0E] transition-colors uppercase tracking-wider mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admission Options
        </button>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 max-w-2xl mx-auto">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: SCHOOL DETAILS */}
        {schoolStep === 1 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-mono font-bold tracking-widest text-[#8C5A32] uppercase">
                Step 1 of 3 • School Delegation Setup
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#2C1A0E] mt-1">
                SCHOOL DETAILS
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Enter your educational institution details, student count, and personal physical education mentor.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    School Name *
                  </label>
                  <input
                    id="school-name-input"
                    type="text"
                    required
                    placeholder="e.g. Tagore Public School"
                    value={schoolOrgDetails.schoolName}
                    onChange={(e) => setSchoolOrgDetails({ ...schoolOrgDetails, schoolName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    School Contact Number *
                  </label>
                  <input
                    id="school-phone-input"
                    type="tel"
                    required
                    placeholder="+91 94140 XXXXX"
                    value={schoolOrgDetails.schoolContact}
                    onChange={(e) => setSchoolOrgDetails({ ...schoolOrgDetails, schoolContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Personal Mentor / PT Teacher *
                  </label>
                  <input
                    id="school-mentor-input"
                    type="text"
                    required
                    placeholder="e.g. Manish Singh"
                    value={schoolOrgDetails.mentorName}
                    onChange={(e) => setSchoolOrgDetails({ ...schoolOrgDetails, mentorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Mentor Contact *
                  </label>
                  <input
                    id="school-mentor-phone-input"
                    type="tel"
                    required
                    placeholder="+91 98281 XXXXX"
                    value={schoolOrgDetails.mentorContact}
                    onChange={(e) => setSchoolOrgDetails({ ...schoolOrgDetails, mentorContact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    How Many Students?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={schoolStudentCount}
                    onChange={(e) => setSchoolStudentCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Program Duration
                  </label>
                  <select
                    value={schoolOrgDetails.tenureDurationMonths}
                    onChange={(e) => setSchoolOrgDetails({ ...schoolOrgDetails, tenureDurationMonths: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
                  >
                    <option value="3">3 Months (Quarterly School Sports)</option>
                    <option value="6">6 Months (Semester Sports)</option>
                    <option value="12">12 Months (Annual Curriculum)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  id="school-step1-btn"
                  onClick={handleSchoolStep1Continue}
                  className="px-6 py-2.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  ADD STUDENTS
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ADD SCHOOL STUDENTS DYNAMIC FORMS */}
        {schoolStep === 2 && (
          <form onSubmit={handleSchoolSubmitBatch} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#8C5A32]/20">
              <div>
                <p className="font-serif font-bold text-[#2C1A0E] text-base">
                  {schoolOrgDetails.schoolName} • Batch of {schoolStudents.length} Students
                </p>
                <p className="text-xs text-stone-600">
                  Mentor: {schoolOrgDetails.mentorName} ({schoolOrgDetails.mentorContact})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSchoolStep(1)}
                className="text-xs font-semibold text-[#8C5A32] hover:underline"
              >
                Edit School Details
              </button>
            </div>

            <div className="space-y-4">
              {schoolStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-[#8C5A32] uppercase">
                      School Student #{idx + 1}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Target ID: KSA-SCH-2026-XXXX
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Student Name"
                        value={student.name}
                        onChange={(e) => {
                          const updated = [...schoolStudents];
                          updated[idx].name = e.target.value;
                          setSchoolStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Age *
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="22"
                        required
                        value={student.age}
                        onChange={(e) => {
                          const updated = [...schoolStudents];
                          updated[idx].age = e.target.value;
                          setSchoolStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Father&apos;s Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Father Name"
                        value={student.fatherName}
                        onChange={(e) => {
                          const updated = [...schoolStudents];
                          updated[idx].fatherName = e.target.value;
                          setSchoolStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Parent / Emergency Contact *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 94140 XXXXX"
                        value={student.contact}
                        onChange={(e) => {
                          const updated = [...schoolStudents];
                          updated[idx].contact = e.target.value;
                          setSchoolStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase mb-1">
                        Address / Ward
                      </label>
                      <input
                        type="text"
                        value={student.address}
                        onChange={(e) => {
                          const updated = [...schoolStudents];
                          updated[idx].address = e.target.value;
                          setSchoolStudents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setSchoolStep(1)}
                className="px-5 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  'Saving School Cohort...'
                ) : (
                  <>
                    Save Cohort & Generate Mentor Credentials
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SCHOOL MENTOR CREDENTIALS CARD */}
        {schoolStep === 3 && schoolBatchResult && schoolBatchResult.mentorCredentials && (
          <div className="bg-white rounded-2xl border-2 border-[#8C5A32]/40 p-6 sm:p-10 shadow-lg space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#8C5A32]/40 text-[#8C5A32] flex items-center justify-center mx-auto mb-2">
                <School className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1A0E]">
                SCHOOL MENTOR CREATED
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                {schoolBatchResult.students.length} students from <strong>{schoolBatchResult.mentorCredentials.orgName}</strong> have been enrolled.
              </p>
            </div>

            <div className="p-6 bg-[#FAF8F5] rounded-xl border border-[#8C5A32]/30 space-y-4">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C5A32]">
                    Institution: {schoolBatchResult.mentorCredentials.orgName}
                  </span>
                  <p className="font-serif font-bold text-[#2C1A0E]">
                    Teacher / Mentor: {schoolBatchResult.mentorCredentials.mentorName}
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#8C5A32]/10 text-[#8C5A32] text-xs font-semibold">
                  School Mentor
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">
                    Assigned Username
                  </span>
                  <span className="font-mono text-base font-bold text-[#2C1A0E]">
                    {schoolBatchResult.mentorCredentials.username}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">
                    Temporary Password
                  </span>
                  <span className="font-mono text-base font-bold text-[#8C5A32]">
                    {schoolBatchResult.mentorCredentials.tempPassword}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    `KSA SCHOOL MENTOR LOGIN\nSchool: ${schoolBatchResult.mentorCredentials?.orgName}\nMentor: ${schoolBatchResult.mentorCredentials?.mentorName}\nUsername: ${schoolBatchResult.mentorCredentials?.username}\nPassword: ${schoolBatchResult.mentorCredentials?.tempPassword}`,
                    'creds'
                  )
                }
                className="w-full py-2.5 rounded-lg bg-white hover:bg-stone-50 text-[#8C5A32] border border-[#8C5A32]/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {copiedCreds ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedCreds ? 'Credentials Copied!' : 'Copy School Mentor Login'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setSchoolStep(1);
                  setSchoolBatchResult(null);
                }}
                className="text-xs font-semibold text-[#8C5A32] hover:underline"
              >
                + Register Another School Delegation
              </button>
              {onOpenMentorPanel && (
                <button
                  onClick={() =>
                    onOpenMentorPanel({
                      username: schoolBatchResult.mentorCredentials!.username,
                      pass: schoolBatchResult.mentorCredentials!.tempPassword,
                    })
                  }
                  className="px-6 py-2.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  Open Mentor Portal
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
