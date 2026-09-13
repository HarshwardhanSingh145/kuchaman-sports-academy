'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Users,
  Calendar,
  Award,
  LogOut,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  ShieldAlert,
  Edit3,
  ChevronRight,
  ArrowLeft,
  FileSignature,
  FileText,
  AlertCircle,
  Printer,
  Sparkles,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { Mentor, Student, AttendanceStatus, Certificate } from '@/lib/types';
import CertificateModal from './CertificateModal';

interface MentorPanelProps {
  initialCredentials?: { username: string; pass: string } | null;
  onBackToHome?: () => void;
}

export default function MentorPanel({ initialCredentials, onBackToHome }: MentorPanelProps) {
  // Authentication state
  const [currentMentor, setCurrentMentor] = useState<Mentor | null>(null);
  const [usernameInput, setUsernameInput] = useState(initialCredentials?.username || '');
  const [passwordInput, setPasswordInput] = useState(initialCredentials?.pass || '');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Force password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Dashboard Tabs: 'roster' | 'attendance' | 'certificates' | 'profile'
  const [activeTab, setActiveTab] = useState<'roster' | 'attendance' | 'certificates' | 'profile'>('roster');

  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'REMOVED' | 'REPLACED'>('ALL');

  // Modals state
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showRemoveStudentModal, setShowRemoveStudentModal] = useState<Student | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [showReplaceStudentModal, setShowReplaceStudentModal] = useState<Student | null>(null);
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementForm, setReplacementForm] = useState({
    name: '',
    age: '16',
    fatherName: '',
    address: '',
    contact: '',
  });

  // Daily Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceFeedback, setAttendanceFeedback] = useState('');

  // Certificate Modal state
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // Mentor Signature state
  const [mentorSignatureDataUrl, setMentorSignatureDataUrl] = useState('');

  // Auto fill credentials from prop if available
  useEffect(() => {
    if (initialCredentials) {
      setUsernameInput(initialCredentials.username);
      setPasswordInput(initialCredentials.pass);
    }
  }, [initialCredentials]);

  // Load active session from localStorage if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ksa_mentor_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentMentor(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchMentorData = useCallback(async () => {
    if (!currentMentor) return;
    setIsLoadingData(true);
    try {
      // 1. Fetch mentor's assigned students
      const res = await fetch(`/api/students?mentorId=${currentMentor.id}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        // Initialize attendance map for today
        const initMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
        data.students.forEach((s: Student) => {
          if (s.status === 'ACTIVE') {
            initMap[s.id] = { status: 'PRESENT', notes: '' };
          }
        });
        setAttendanceMap(initMap);
      }

      // 2. Fetch certificates for this mentor's students
      const certRes = await fetch(`/api/certificates`);
      const certData = await certRes.json();
      if (certData.success) {
        setCertificates(certData.certificates || []);
      }
    } catch (err) {
      console.error('Error fetching mentor data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentMentor]);

  // Fetch mentor data when logged in
  useEffect(() => {
    if (currentMentor) {
      fetchMentorData();
    }
  }, [currentMentor, fetchMentorData]);

  // ----------------------------------------------------
  // LOGIN / LOGOUT
  // ----------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/mentors/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: usernameInput.trim(),
          password: passwordInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      setCurrentMentor(data.mentor);
      localStorage.setItem('ksa_mentor_session', JSON.stringify(data.mentor));

      if (data.requiresPasswordChange) {
        setShowPasswordChangeModal(true);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentMentor(null);
    localStorage.removeItem('ksa_mentor_session');
    setUsernameInput('');
    setPasswordInput('');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/mentors/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          mentorId: currentMentor?.id,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password updated successfully! Welcome to your mentor dashboard.');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    }
  };

  // ----------------------------------------------------
  // STUDENT ACTIONS
  // ----------------------------------------------------
  const handleRemoveStudent = async () => {
    if (!showRemoveStudentModal || !removalReason.trim()) return;
    try {
      const res = await fetch(`/api/students/${showRemoveStudentModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          reason: removalReason.trim(),
          performedBy: `${currentMentor?.name} (Mentor)`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove student');
      }

      setShowRemoveStudentModal(null);
      setRemovalReason('');
      fetchMentorData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReplaceStudent = async () => {
    if (!showReplaceStudentModal || !replacementReason.trim() || !replacementForm.name.trim() || !replacementForm.contact.trim()) {
      alert('Please fill in replacement student name, contact, and reason.');
      return;
    }

    try {
      const res = await fetch(`/api/students/${showReplaceStudentModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          reason: replacementReason.trim(),
          newStudent: {
            ...replacementForm,
            age: Number(replacementForm.age) || 16,
          },
          performedBy: `${currentMentor?.name} (Mentor)`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to replace student');
      }

      alert(`Replacement successful! Old student history preserved. New Student ID generated: ${data.newStudent.id}`);
      setShowReplaceStudentModal(null);
      setReplacementReason('');
      setReplacementForm({ name: '', age: '16', fatherName: '', address: '', contact: '' });
      fetchMentorData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddNewStudent = async (formData: any) => {
    if (!currentMentor) return;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          age: Number(formData.age),
          fatherName: formData.fatherName,
          address: formData.address || currentMentor.organizationName,
          contact: formData.contact,
          category: currentMentor.category,
          academyName: currentMentor.category === 'ACADEMIC' ? currentMentor.organizationName : undefined,
          schoolName: currentMentor.category === 'SCHOOL' ? currentMentor.organizationName : undefined,
          mentorId: currentMentor.id,
          mentorName: currentMentor.name,
          mentorContact: currentMentor.contact,
          tenureDurationMonths: 6,
          performedBy: `${currentMentor.name} (Mentor)`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add student');
      }

      alert(`Student registered successfully with Student ID: ${data.student.id}`);
      setShowAddStudentModal(false);
      fetchMentorData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------
  // DAILY ATTENDANCE MARKING
  // ----------------------------------------------------
  const handleSaveAttendance = async () => {
    if (!currentMentor) return;
    setIsSavingAttendance(true);
    setAttendanceFeedback('');

    const entries = Object.entries(attendanceMap).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      notes: data.notes,
    }));

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          mentorId: currentMentor.id,
          date: attendanceDate,
          performedBy: `${currentMentor.name} (Mentor)`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      setAttendanceFeedback(`Attendance successfully saved for ${data.updatedCount} students on ${attendanceDate}!`);
      setTimeout(() => setAttendanceFeedback(''), 4000);
      fetchMentorData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const markAllAttendanceAs = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students
      .filter((s) => s.status === 'ACTIVE')
      .forEach((s) => {
        updated[s.id] = {
          status,
          notes: attendanceMap[s.id]?.notes || '',
        };
      });
    setAttendanceMap(updated);
  };

  // ----------------------------------------------------
  // CERTIFICATE DRAFT REQUEST
  // ----------------------------------------------------
  const handleRequestCertificate = async (student: Student) => {
    if (!currentMentor) return;
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          action: 'submit',
          requestedBy: `${currentMentor.name} (Mentor)`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit certificate request');
      }

      alert(
        `Certificate request submitted successfully!\n\nNote: In accordance with KSA rules, mentors cannot self-approve certificates. This request has been submitted to Academy Owner Jay Prakash Bhakar for official review and approval.`
      );
      fetchMentorData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter students based on search and status
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fatherName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;
  const removedStudents = students.filter((s) => s.status === 'REMOVED').length;
  const replacedStudents = students.filter((s) => s.status === 'REPLACED').length;
  const completedStudents = students.filter((s) => s.status === 'COMPLETED').length;

  const avgAttendance =
    activeStudents > 0
      ? Math.round(
          students
            .filter((s) => s.status === 'ACTIVE')
            .reduce((acc, s) => acc + (s.attendanceStats?.percentage || 0), 0) / activeStudents
        )
      : 0;

  // =========================================================================
  // VIEW: MENTOR LOGIN SCREEN
  // =========================================================================
  if (!currentMentor) {
    return (
      <div id="mentor-login-view" className="w-full max-w-md mx-auto px-4 py-12">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-[#2C1A0E] transition-colors uppercase tracking-wider mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </button>
        )}

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-[#8C5A32]/30 flex items-center justify-center mx-auto text-[#8C5A32]">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#2C1A0E]">
              MENTOR PANEL
            </h2>
            <p className="text-xs text-stone-600">
              Personal Mentor & Coach Portal • Kuchaman Sports Academy
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Assigned Username
              </label>
              <input
                id="mentor-username-input"
                type="text"
                required
                placeholder="e.g. kuchaman.rahul"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Format: organization.mentorname (e.g. kuchaman.rahul)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="mentor-password-input"
                type="password"
                required
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-[#8C5A32]"
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-lg text-[11px] text-stone-500 space-y-1">
              <p className="font-semibold text-stone-700">Demo Academic Mentor:</p>
              <p>Username: <code className="font-mono text-[#8C5A32]">kuchaman.rahul</code> • Password: <code className="font-mono text-[#8C5A32]">ksa12345</code></p>
            </div>

            <button
              id="mentor-login-btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? 'Verifying Account...' : 'Sign In to Mentor Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: AUTHENTICATED MENTOR DASHBOARD
  // =========================================================================
  return (
    <div id="mentor-dashboard-view" className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Mentor Header Bar */}
      <div className="bg-[#2C1A0E] text-white rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-lg border border-[#8C5A32]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#8C5A32]/40 text-[#E6AF6E] text-xs font-semibold uppercase tracking-wider border border-[#8C5A32]">
              {currentMentor.category} Mentor
            </span>
            <span className="text-xs text-stone-300">
              Organization: <strong>{currentMentor.organizationName}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            Welcome, {currentMentor.name}
          </h1>
          <p className="text-xs text-stone-300">
            Username: <span className="font-mono text-[#E6AF6E]">{currentMentor.username}</span> • Contact: {currentMentor.contact}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8C5A32] hover:bg-[#A36D42] text-xs font-semibold text-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Student
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-stone-300 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* 8 Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Total Students
          </span>
          <span className="text-2xl font-serif font-black text-[#2C1A0E]">{totalStudents}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
            Active
          </span>
          <span className="text-2xl font-serif font-black text-emerald-700">{activeStudents}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
            Removed
          </span>
          <span className="text-2xl font-serif font-bold text-stone-600">{removedStudents}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider block">
            Replaced
          </span>
          <span className="text-2xl font-serif font-bold text-amber-700">{replacedStudents}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">
            Completed
          </span>
          <span className="text-2xl font-serif font-bold text-blue-700">{completedStudents}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#8C5A32]/30 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-[#8C5A32] tracking-wider block">
            Attendance %
          </span>
          <span className="text-2xl font-serif font-black text-[#8C5A32]">{avgAttendance}%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
            Tenure Active
          </span>
          <span className="text-2xl font-serif font-bold text-stone-800">
            {students.filter((s) => s.tenureStatus === 'IN_PROGRESS').length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider block">
            Certificates
          </span>
          <span className="text-2xl font-serif font-bold text-purple-700">
            {certificates.filter((c) => c.mentorId === currentMentor.id).length}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200 space-x-2">
        {[
          { id: 'roster', label: 'Student Roster', icon: Users },
          { id: 'attendance', label: 'Daily Attendance', icon: Calendar },
          { id: 'certificates', label: 'Tenure & Certificates', icon: Award },
          { id: 'profile', label: 'Mentor Profile & Signature', icon: FileSignature },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-colors border-b-2 ${
                isActive
                  ? 'border-[#8C5A32] text-[#8C5A32]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: STUDENT ROSTER */}
      {/* ===================================================================== */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by student name, ID, phone, father name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">Status:</span>
              {(['ALL', 'ACTIVE', 'COMPLETED', 'REMOVED', 'REPLACED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#2C1A0E] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-[#FAF8F5] border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Name & Age</th>
                  <th className="py-3 px-4">Father&apos;s Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Enrolled Date</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tenure</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400">
                      No students found matching current criteria.
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
                        <span className="text-[10px] text-stone-400">{st.age} Yrs</span>
                      </td>
                      <td className="py-3 px-4 text-stone-700">{st.fatherName}</td>
                      <td className="py-3 px-4 text-stone-600">{st.contact}</td>
                      <td className="py-3 px-4 text-stone-500">{st.admissionDate}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-800">
                            {st.attendanceStats?.percentage || 0}%
                          </span>
                          <span className="text-[10px] text-stone-400">
                            ({st.attendanceStats?.present || 0}/{st.attendanceStats?.totalDays || 0}d)
                          </span>
                        </div>
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
                        <span className="text-[10px] text-stone-500 block">
                          {st.tenureDurationMonths} Mos ({st.tenureStatus})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Full Profile"
                            onClick={() => setSelectedStudentForProfile(st)}
                            className="p-1.5 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {st.status === 'ACTIVE' && (
                            <>
                              <button
                                title="Replace Student"
                                onClick={() => setShowReplaceStudentModal(st)}
                                className="p-1.5 rounded hover:bg-amber-50 text-amber-600 hover:text-amber-800"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                title="Remove Student"
                                onClick={() => setShowRemoveStudentModal(st)}
                                className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {st.status === 'COMPLETED' && (
                            <button
                              title="Request Certificate"
                              onClick={() => handleRequestCertificate(st)}
                              className="px-2 py-1 rounded bg-[#8C5A32] hover:bg-[#A36D42] text-[10px] font-semibold text-white flex items-center gap-1"
                            >
                              <Award className="w-3 h-3" />
                              Cert
                            </button>
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

      {/* ===================================================================== */}
      {/* TAB 2: DAILY ATTENDANCE SYSTEM */}
      {/* ===================================================================== */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#2C1A0E]">
                DAILY ATTENDANCE LOG
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Mark attendance for your enrolled students. Prevent duplicate entries automatically.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-stone-600">Select Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium focus:outline-none focus:border-[#8C5A32]"
              />
            </div>
          </div>

          {/* Quick status actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] p-3 rounded-lg border border-stone-200 text-xs">
            <span className="font-semibold text-stone-700">Quick Batch Actions:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => markAllAttendanceAs('PRESENT')}
                className="px-3 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAllAttendanceAs('ABSENT')}
                className="px-3 py-1 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Mark All Absent
              </button>
              <button
                type="button"
                onClick={() => markAllAttendanceAs('LEAVE')}
                className="px-3 py-1 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
              >
                Mark All Leave
              </button>
            </div>
          </div>

          {attendanceFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {attendanceFeedback}
            </div>
          )}

          {/* Student attendance list */}
          <div className="space-y-3">
            {students.filter((s) => s.status === 'ACTIVE').length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                No active students currently enrolled under your mentor account.
              </p>
            ) : (
              students
                .filter((s) => s.status === 'ACTIVE')
                .map((student) => {
                  const currentStatus = attendanceMap[student.id]?.status || 'PRESENT';
                  return (
                    <div
                      key={student.id}
                      className="p-3.5 rounded-lg border border-stone-200 hover:border-stone-300 flex flex-wrap items-center justify-between gap-3 bg-white"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-[#2C1A0E]">
                            {student.name}
                          </span>
                          <span className="font-mono text-xs text-[#8C5A32]">
                            {student.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Son of {student.fatherName} • Attendance: {student.attendanceStats?.percentage || 0}%
                        </p>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAttendanceMap({
                              ...attendanceMap,
                              [student.id]: { ...attendanceMap[student.id], status: 'PRESENT' },
                            })
                          }
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-emerald-50'
                          }`}
                        >
                          PRESENT
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAttendanceMap({
                              ...attendanceMap,
                              [student.id]: { ...attendanceMap[student.id], status: 'ABSENT' },
                            })
                          }
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                            currentStatus === 'ABSENT'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-red-50'
                          }`}
                        >
                          ABSENT
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAttendanceMap({
                              ...attendanceMap,
                              [student.id]: { ...attendanceMap[student.id], status: 'LEAVE' },
                            })
                          }
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                            currentStatus === 'LEAVE'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-amber-50'
                          }`}
                        >
                          LEAVE
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              id="save-attendance-btn"
              onClick={handleSaveAttendance}
              disabled={isSavingAttendance || students.filter((s) => s.status === 'ACTIVE').length === 0}
              className="px-8 py-2.5 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingAttendance ? 'Saving Attendance Records...' : `Save Attendance for ${attendanceDate}`}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: TENURE & CERTIFICATES */}
      {/* ===================================================================== */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              KSA Rule & Certification Policy:
            </p>
            <p>
              • Certificates are generated only after tenure completion and minimum required attendance.
            </p>
            <p>
              • <strong>A mentor can never self-approve their own student&apos;s certificate.</strong>
            </p>
            <p>
              • All certificate requests are submitted as drafts directly to <strong>Academy Owner Jay Prakash Bhakar</strong> for official verification and issuance.
            </p>
          </div>

          {/* Students Eligible for Certificate */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
              Completed Tenure Students
            </h3>

            <div className="divide-y divide-stone-100">
              {students.filter((s) => s.status === 'COMPLETED' || s.tenureStatus === 'COMPLETED').length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  No students currently have completed tenures under your mentor account.
                </p>
              ) : (
                students
                  .filter((s) => s.status === 'COMPLETED' || s.tenureStatus === 'COMPLETED')
                  .map((student) => {
                    const studentCert = certificates.find((c) => c.studentId === student.id);
                    return (
                      <div key={student.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-base text-[#2C1A0E]">
                              {student.name}
                            </span>
                            <span className="font-mono text-xs text-[#8C5A32] font-semibold">
                              {student.id}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600">
                            Training Period: {student.tenureStartDate} to {student.tenureEndDate} • Attendance:{' '}
                            <strong className="text-emerald-700">{student.attendanceStats?.percentage || 90}%</strong>
                          </p>
                          {studentCert && (
                            <p className="text-xs text-stone-500 font-mono">
                              Cert No: {studentCert.certificateNumber} • Status:{' '}
                              <span
                                className={`font-bold uppercase ${
                                  studentCert.status === 'ISSUED'
                                    ? 'text-emerald-600'
                                    : studentCert.status === 'APPROVED'
                                    ? 'text-blue-600'
                                    : studentCert.status === 'PENDING_APPROVAL'
                                    ? 'text-amber-600'
                                    : 'text-stone-600'
                                }`}
                              >
                                {studentCert.status}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!studentCert ? (
                            <button
                              onClick={() => handleRequestCertificate(student)}
                              className="px-4 py-2 rounded-lg bg-[#8C5A32] hover:bg-[#A36D42] text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                            >
                              <Award className="w-4 h-4" />
                              Request Owner Approval
                            </button>
                          ) : (
                            <button
                              onClick={() => setPreviewCert(studentCert)}
                              className="px-4 py-2 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              Preview Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: MENTOR PROFILE & SIGNATURE */}
      {/* ===================================================================== */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
              Mentor Information
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 uppercase font-semibold text-[10px]">Full Name</span>
                <p className="font-bold text-stone-800 text-sm">{currentMentor.name}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase font-semibold text-[10px]">Organization</span>
                <p className="font-semibold text-stone-800">{currentMentor.organizationName}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase font-semibold text-[10px]">Category</span>
                <p className="font-semibold text-stone-800">{currentMentor.category}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase font-semibold text-[10px]">Username</span>
                <p className="font-mono font-bold text-[#8C5A32]">{currentMentor.username}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase font-semibold text-[10px]">Contact</span>
                <p className="text-stone-700">{currentMentor.contact}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <button
                onClick={() => setShowPasswordChangeModal(true)}
                className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors"
              >
                Change Account Password
              </button>
            </div>
          </div>

          {/* Personal Mentor Signature */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
              Personal Mentor Signature
            </h3>
            <p className="text-xs text-stone-500">
              This signature will be digitally stamped on certificates issued to your students.
            </p>

            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-dashed border-[#8C5A32] flex items-center justify-center min-h-[100px]">
              {currentMentor.signatureUrl ? (
                <img
                  src={currentMentor.signatureUrl}
                  alt="Mentor Signature"
                  className="max-h-16 object-contain"
                />
              ) : (
                <span className="font-serif italic text-stone-400 text-sm">
                  {currentMentor.name}
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-500">
              To update your signature image, you can provide an image data URL or consult the KSA Academy Administrator.
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: FORCE PASSWORD CHANGE */}
      {/* ===================================================================== */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-stone-200 my-auto">
              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 text-[#8C5A32] mx-auto" />
                <h3 className="font-serif font-bold text-xl text-[#2C1A0E]">
                  Set Your Permanent Password
                </h3>
                <p className="text-xs text-stone-500">
                  Please update your temporary password to secure your mentor portal account.
                </p>
              </div>

              {passwordError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 uppercase block mb-1">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 uppercase block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  {!currentMentor?.isFirstLogin && (
                    <button
                      type="button"
                      onClick={() => setShowPasswordChangeModal(false)}
                      className="px-4 py-2 rounded-lg text-stone-500 hover:bg-stone-50 font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#2C1A0E] hover:bg-[#3D2514] text-white font-semibold"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: STUDENT PROFILE VIEW */}
      {/* ===================================================================== */}
      {selectedStudentForProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 border border-stone-200 my-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C5A32]">
                    {selectedStudentForProfile.category} Student Profile
                  </span>
                  <h3 className="font-serif font-bold text-2xl text-[#2C1A0E]">
                    {selectedStudentForProfile.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedStudentForProfile(null)}
                  className="text-stone-400 hover:text-stone-800 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Student ID</span>
                <p className="font-mono font-bold text-[#8C5A32] text-sm">
                  {selectedStudentForProfile.id}
                </p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Father&apos;s Name</span>
                <p className="font-semibold text-stone-800">{selectedStudentForProfile.fatherName}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Age & Contact</span>
                <p className="text-stone-800">
                  {selectedStudentForProfile.age} Yrs • {selectedStudentForProfile.contact}
                </p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Admission Date</span>
                <p className="text-stone-800">{selectedStudentForProfile.admissionDate}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Current Status</span>
                <p className="font-bold text-emerald-700">{selectedStudentForProfile.status}</p>
              </div>
              <div>
                <span className="text-stone-400 uppercase text-[10px]">Tenure Progress</span>
                <p className="text-stone-800">
                  {selectedStudentForProfile.tenureDurationMonths} Mos ({selectedStudentForProfile.tenureStatus})
                </p>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C5A32] block mb-2">
                Attendance Record
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded">
                  <span className="text-[10px] text-stone-400 block">Total Days</span>
                  <span className="font-bold">{selectedStudentForProfile.attendanceStats?.totalDays || 0}</span>
                </div>
                <div className="bg-white p-2 rounded text-emerald-700">
                  <span className="text-[10px] text-stone-400 block">Present</span>
                  <span className="font-bold">{selectedStudentForProfile.attendanceStats?.present || 0}</span>
                </div>
                <div className="bg-white p-2 rounded text-red-700">
                  <span className="text-[10px] text-stone-400 block">Absent</span>
                  <span className="font-bold">{selectedStudentForProfile.attendanceStats?.absent || 0}</span>
                </div>
                <div className="bg-white p-2 rounded text-[#8C5A32]">
                  <span className="text-[10px] text-stone-400 block">Rate %</span>
                  <span className="font-bold">{selectedStudentForProfile.attendanceStats?.percentage || 0}%</span>
                </div>
              </div>
            </div>

            {/* Change / Audit History */}
            <div>
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Timestamped History
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedStudentForProfile.history?.map((h, i) => (
                  <div key={i} className="p-2.5 bg-stone-50 rounded-lg text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span className="font-semibold text-[#8C5A32]">{h.action}</span>
                      <span>{h.date} {h.time}</span>
                    </div>
                    <p className="text-stone-700">{h.details}</p>
                    <p className="text-[10px] text-stone-400 italic">By: {h.performedBy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedStudentForProfile(null)}
                className="px-5 py-2 bg-[#2C1A0E] text-white rounded-lg text-xs font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REMOVE STUDENT (SOFT DELETE) */}
      {/* ===================================================================== */}
      {showRemoveStudentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-200 my-auto">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#2C1A0E]">
                  Remove Student Record
                </h3>
                <p className="text-xs text-stone-500">
                  Are you sure you want to deactivate <strong className="text-stone-800">{showRemoveStudentModal.name}</strong> ({showRemoveStudentModal.id})?
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg text-[11px] text-stone-600">
                Note: In compliance with KSA audit mandates, student history is <strong>never permanently deleted</strong>. The record will be marked as <code className="text-red-700 font-bold">REMOVED</code> and safely retained for audit trail purposes.
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Reason for Removal *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Relocated to another city / Discontinued training"
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-[#8C5A32]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveStudentModal(null);
                    setRemovalReason('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveStudent}
                  disabled={!removalReason.trim()}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Confirm Deactivation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REPLACE STUDENT */}
      {/* ===================================================================== */}
      {showReplaceStudentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 border border-stone-200 my-auto">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#2C1A0E]">
                  Replace Student in Batch
                </h3>
                <p className="text-xs text-stone-500">
                  Replacing: <strong className="text-stone-800">{showReplaceStudentModal.name}</strong> ({showReplaceStudentModal.id})
                </p>
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-[11px] leading-relaxed">
                The original student&apos;s record and attendance will be marked as <code className="font-bold">REPLACED</code> and preserved in history. A brand-new student record with a unique Student ID will be generated and assigned to your roster.
              </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Reason for Replacement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student injured / Slot reassigned"
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                />
              </div>

              <div className="border-t border-stone-200 pt-3">
                <span className="font-bold text-[#8C5A32] uppercase text-[10px] tracking-wider block mb-2">
                  New Student Details
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="New Student Name"
                      value={replacementForm.name}
                      onChange={(e) => setReplacementForm({ ...replacementForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Age *</label>
                    <input
                      type="number"
                      required
                      value={replacementForm.age}
                      onChange={(e) => setReplacementForm({ ...replacementForm, age: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Father&apos;s Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Father Name"
                      value={replacementForm.fatherName}
                      onChange={(e) => setReplacementForm({ ...replacementForm, fatherName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Contact Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98290 XXXXX"
                      value={replacementForm.contact}
                      onChange={(e) => setReplacementForm({ ...replacementForm, contact: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="font-semibold text-stone-700 block mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Residential address"
                    value={replacementForm.address}
                    onChange={(e) => setReplacementForm({ ...replacementForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setShowReplaceStudentModal(null);
                  setReplacementReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplaceStudent}
                className="px-5 py-2 rounded-lg bg-[#8C5A32] hover:bg-[#A36D42] text-white text-xs font-bold transition-colors"
              >
                Complete Replacement
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD STUDENT */}
      {/* ===================================================================== */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 border border-stone-200 my-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C5A32]">
                    Mentor Enrollment
                  </span>
                  <h3 className="font-serif font-bold text-xl text-[#2C1A0E]">
                    Add Student to {currentMentor.organizationName}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="text-stone-400 hover:text-stone-800 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                handleAddNewStudent({
                  name: form.name.value,
                  age: form.age.value,
                  fatherName: form.fatherName.value,
                  contact: form.contact.value,
                  address: form.address.value,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Student Name *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Full name"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Age *</label>
                  <input
                    name="age"
                    type="number"
                    min="6"
                    max="50"
                    required
                    defaultValue="16"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Father&apos;s Name *</label>
                  <input
                    name="fatherName"
                    type="text"
                    required
                    placeholder="Father Name"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Contact *</label>
                  <input
                    name="contact"
                    type="tel"
                    required
                    placeholder="+91 98290 XXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Address</label>
                <input
                  name="address"
                  type="text"
                  placeholder="Address or Campus"
                  defaultValue={currentMentor.organizationName}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C5A32]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2C1A0E] hover:bg-[#3D2514] text-white rounded-lg font-bold"
                >
                  Enroll & Generate ID
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* ===================================================================== */}
      {/* CERTIFICATE PREVIEW MODAL */}
      {/* ===================================================================== */}
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
