'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  LogOut,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Check,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Layers,
  Waves,
  Eye,
  CheckCircle2,
  XCircle,
  QrCode,
  CreditCard,
  Upload,
  ZoomIn,
  Copy,
  Image as ImageIcon,
  GraduationCap,
} from 'lucide-react';
import { CricketNet, CricketSlot, SwimmingSession, Booking, AcademyConfig } from '@/lib/types';
import { useFirebase } from '@/lib/FirebaseContext';
import { compressImageFile } from '@/lib/utils';
import { AdminStudentManagementTab } from './AdminStudentManagementTab';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export function AdminModal({ isOpen, onClose, onDataChanged }: AdminModalProps) {
  const { user, isAdmin, signInWithGoogle, signOut: fbSignOut } = useFirebase();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab: 'student_management' | 'cricket_nets' | 'cricket_slots' | 'swimming_sessions' | 'bookings' | 'payments' | 'payment_setup'
  const [activeTab, setActiveTab] = useState<
    'student_management' | 'cricket_nets' | 'cricket_slots' | 'swimming_sessions' | 'bookings' | 'payments' | 'payment_setup'
  >('student_management');

  // Config & Payment Settings State
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('9829084421@paytm');
  const [upiAccountName, setUpiAccountName] = useState('Kuchaman Sports Academy');
  const [bankName, setBankName] = useState('State Bank of India');
  const [paymentNotes, setPaymentNotes] = useState('Please share screenshot after payment');
  const [savingConfig, setSavingConfig] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

  // Payment Verification & Proof Modal State
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    'all' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
  >('all');

  // Selected date for slot management
  const [adminDate, setAdminDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // State
  const [nets, setNets] = useState<CricketNet[]>([]);
  const [cricketSlots, setCricketSlots] = useState<CricketSlot[]>([]);
  const [swimmingSessions, setSwimmingSessions] = useState<SwimmingSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Add/Edit Net Form State
  const [isAddingNet, setIsAddingNet] = useState(false);
  const [editingNetId, setEditingNetId] = useState<string | null>(null);
  const [netFormName, setNetFormName] = useState('');
  const [netFormCode, setNetFormCode] = useState('');
  const [netFormTurf, setNetFormTurf] = useState('Astro-Turf Elite');
  const [netFormCap, setNetFormCap] = useState(4);
  const [netFormDesc, setNetFormDesc] = useState('');

  // Bookings Filter
  const [bookingFilterSport, setBookingFilterSport] = useState<string>('all');
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');

  const isEffectiveAuth = isAuthenticated || Boolean(user && isAdmin);

  // Admin login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      setIsAuthenticated(true);
      loadAdminData();
    } catch (err: any) {
      setAuthError(err.message || 'Connection error');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadAdminData = React.useCallback(async () => {
    setLoading(true);
    setActionMessage('');
    try {
      // 1. Load nets
      const netsRes = await fetch('/api/admin/nets');
      const netsData = await netsRes.json();
      if (netsData.success) setNets(netsData.nets || []);

      // 2. Load slots for date
      const slotsRes = await fetch(`/api/slots?sport=cricket&date=${adminDate}`);
      const slotsData = await slotsRes.json();
      if (slotsData.success) setCricketSlots(slotsData.slots || []);

      // 3. Load swimming sessions for date
      const swimRes = await fetch(`/api/slots?sport=swimming&date=${adminDate}`);
      const swimData = await swimRes.json();
      if (swimData.success) setSwimmingSessions(swimData.sessions || []);

      // 4. Load all bookings
      const bookingsRes = await fetch('/api/admin/bookings');
      const bookingsData = await bookingsRes.json();
      if (bookingsData.success) setBookings(bookingsData.bookings || []);

      // 5. Load academy payment config
      const configRes = await fetch('/api/admin/config');
      const configData = await configRes.json();
      if (configData.success && configData.config) {
        setUpiQrCodeUrl(configData.config.upiQrCodeUrl || '');
        setUpiId(configData.config.upiId || '9829084421@paytm');
        setUpiAccountName(configData.config.upiAccountName || 'Kuchaman Sports Academy');
        setBankName(configData.config.bankName || 'State Bank of India');
        setPaymentNotes(configData.config.paymentNotes || 'Please upload payment proof screenshot after UPI payment.');
      }
    } catch (err) {
      console.error('Error loading admin data', err);
    } finally {
      setLoading(false);
    }
  }, [adminDate]);

  // Save Academy QR / Payment Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiQrCodeUrl,
          upiId,
          upiAccountName,
          bankName,
          paymentNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('QR Code and Payment setup saved successfully!');
      } else {
        setActionMessage(data.error || 'Failed to save config');
      }
    } catch (err) {
      console.error('Error saving config', err);
      setActionMessage('Network error saving config');
    } finally {
      setSavingConfig(false);
    }
  };

  // Upload custom QR Image
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setQrUploading(true);
      const compressed = await compressImageFile(file, 800, 800, 0.85);
      setUpiQrCodeUrl(compressed);
      setActionMessage('QR Code preview updated. Click "Save Payment Settings" to publish.');
    } catch (err) {
      console.error('Error compressing QR', err);
      setActionMessage('Failed to process QR image file');
    } finally {
      setQrUploading(false);
    }
  };

  // Update Payment Status (Approve / Reject)
  const handleUpdatePaymentStatus = async (
    bookingId: string,
    paymentStatus: 'APPROVED' | 'REJECTED',
    bookingStatus: 'CONFIRMED' | 'CANCELLED'
  ) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          paymentStatus,
          status: bookingStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(
          paymentStatus === 'APPROVED'
            ? 'Payment verified & booking confirmed!'
            : 'Payment rejected & booking cancelled.'
        );
        loadAdminData();
        onDataChanged();
      } else {
        setActionMessage(data.error || 'Failed to update payment status');
      }
    } catch (err) {
      console.error('Error updating payment status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEffectiveAuth) {
      loadAdminData();
    }
  }, [isEffectiveAuth, loadAdminData]);

  // Net Management Actions
  const handleSaveNet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!netFormName.trim()) return;

    try {
      if (editingNetId) {
        // Update existing net
        await fetch('/api/admin/nets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingNetId,
            name: netFormName,
            code: netFormCode,
            turfType: netFormTurf,
            capacityPerSlot: Number(netFormCap),
            description: netFormDesc,
          }),
        });
        setActionMessage(`Net "${netFormName}" updated successfully.`);
      } else {
        // Add new net
        await fetch('/api/admin/nets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: netFormName,
            code: netFormCode,
            turfType: netFormTurf,
            capacityPerSlot: Number(netFormCap),
            description: netFormDesc,
          }),
        });
        setActionMessage(`New net "${netFormName}" created successfully.`);
      }

      setIsAddingNet(false);
      setEditingNetId(null);
      setNetFormName('');
      setNetFormCode('');
      setNetFormDesc('');
      loadAdminData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNetActive = async (net: CricketNet) => {
    try {
      await fetch('/api/admin/nets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: net.id, isActive: !net.isActive }),
      });
      loadAdminData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNet = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await fetch(`/api/admin/nets?id=${id}`, { method: 'DELETE' });
      setActionMessage(`Net "${name}" removed.`);
      loadAdminData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  // Cricket Slot Status Action
  const handleUpdateCricketSlotStatus = async (
    slotKey: string,
    status: 'AVAILABLE' | 'FULL' | 'CLOSED' | 'LIMITED',
    capacity?: number
  ) => {
    try {
      await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cricket_slot',
          slotKey,
          updates: {
            status,
            ...(capacity !== undefined ? { capacity } : {}),
          },
        }),
      });
      loadAdminData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  // Swimming Session Status Action
  const handleUpdateSwimmingSession = async (
    sessionKey: string,
    status: 'AVAILABLE' | 'FULL' | 'CLOSED',
    capacity?: number
  ) => {
    try {
      await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_swimming_session',
          sessionKey,
          updates: {
            status,
            ...(capacity !== undefined ? { capacity } : {}),
          },
        }),
      });
      loadAdminData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  // Update booking status
  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  ) => {
    try {
      await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      loadAdminData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered bookings list
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilterSport !== 'all' && b.sport !== bookingFilterSport) return false;
    if (bookingSearchTerm) {
      const term = bookingSearchTerm.toLowerCase();
      const matchName = b.userName.toLowerCase().includes(term);
      const matchPhone = b.userPhone.includes(term);
      const matchId = b.id.toLowerCase().includes(term);
      return matchName || matchPhone || matchId;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-6xl h-[95vh] sm:h-[90vh] max-h-[960px] bg-[#FAF4ED] border border-[#8C5A32]/40 shadow-2xl text-[#2C1A0E] flex flex-col overflow-hidden my-auto rounded-xl sm:rounded-2xl"
      >
        {/* Modal Top Bar */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-[#F5EBE0] border-b border-[#8C5A32]/20 flex items-center justify-between flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#FAF4ED] border border-[#8C5A32]/40 flex items-center justify-center text-[#8C5A32] rounded-lg flex-shrink-0 shadow-xs">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-wider uppercase font-agbalumo text-[#2C1A0E] truncate">
                KSA Director Terminal
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#7A5C4A] font-agbalumo font-semibold tracking-wider truncate">
                {isEffectiveAuth ? 'AUTHENTICATED ADMIN SUITE' : 'AUTHENTICATION REQUIRED'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {isEffectiveAuth && (
              <button
                onClick={loadAdminData}
                title="Refresh Data"
                disabled={loading}
                className="p-1.5 sm:px-3 sm:py-1.5 text-xs text-[#5C4033] hover:text-[#2C1A0E] hover:bg-[#FAF4ED] bg-white/70 border border-[#8C5A32]/30 cursor-pointer font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8C5A32]' : ''}`} />
                <span className="hidden md:inline font-agbalumo">Refresh</span>
              </button>
            )}
            {isEffectiveAuth && (
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  fbSignOut();
                }}
                className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs text-[#5C4033] hover:text-[#A83232] bg-white/70 hover:bg-[#FDF2F2] border border-[#8C5A32]/30 cursor-pointer font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-agbalumo">Sign Out</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 sm:p-2 text-[#5C4033] hover:text-[#2C1A0E] hover:bg-[#FAF4ED] bg-white/70 border border-[#8C5A32]/30 cursor-pointer rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isEffectiveAuth ? (
          /* Login View */
          <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex items-center justify-center">
            <div className="max-w-md w-full my-auto space-y-6 bg-white/60 p-6 sm:p-8 border border-[#8C5A32]/20 rounded-2xl shadow-xs">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#F5EBE0] border border-[#8C5A32]/40 mx-auto flex items-center justify-center text-[#8C5A32] mb-3 rounded-xl shadow-xs">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-agbalumo text-[#2C1A0E] uppercase">
                  Administrator Sign In
                </h3>
                <p className="text-xs text-[#5C4033] font-agbalumo">
                  Secure access for academy directors, managers, and head coaches.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-[#FDF2F2] border border-[#E5A7A7] text-xs text-[#A83232] flex items-center gap-2 font-semibold rounded-lg font-agbalumo">
                  <AlertCircle className="w-4 h-4 text-[#A83232] flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 font-agbalumo">
                <div>
                  <label className="block text-xs uppercase text-[#5C4033] mb-1 font-bold">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Username"
                    className="w-full px-4 py-2.5 bg-[#FAF4ED] border border-[#8C5A32]/30 text-sm text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-[#5C4033] mb-1 font-bold">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-[#FAF4ED] border border-[#8C5A32]/30 text-sm text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32] rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-[#2C1A0E] hover:bg-[#8C5A32] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl"
                >
                  {authLoading ? 'Verifying...' : 'Access Dashboard'}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-300"></div>
                <span className="flex-shrink mx-3 text-neutral-400 text-xs uppercase font-agbalumo">or</span>
                <div className="flex-grow border-t border-neutral-300"></div>
              </div>

              <button
                onClick={async () => {
                  setAuthLoading(true);
                  setAuthError('');
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    setAuthError(err.message || 'Google sign-in failed');
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                disabled={authLoading}
                className="w-full py-3 bg-white hover:bg-neutral-50 text-[#2C1A0E] border border-neutral-300 text-xs font-bold uppercase tracking-wide transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer rounded-xl font-agbalumo"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs & Controls */}
            <div className="px-3 sm:px-6 pt-3 pb-2 bg-[#F5EBE0] border-b border-[#8C5A32]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
                <button
                  onClick={() => setActiveTab('student_management')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'student_management'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student Management & Certificates</span>
                </button>
                <button
                  onClick={() => setActiveTab('cricket_nets')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'cricket_nets'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Nets ({nets.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('cricket_slots')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'cricket_slots'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cricket Slots</span>
                </button>
                <button
                  onClick={() => setActiveTab('swimming_sessions')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'swimming_sessions'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>Swim Sessions</span>
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'bookings'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Bookings ({bookings.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'payments'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    Payments ({bookings.filter((b) => b.paymentScreenshot || b.transactionId).length})
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('payment_setup')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-lg whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'payment_setup'
                      ? 'bg-[#FAF4ED] border-[#8C5A32]/60 text-[#8C5A32] font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR & UPI Setup</span>
                </button>
              </div>

              {/* Date Control */}
              <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                <span className="text-xs text-[#7A5C4A] font-agbalumo font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8C5A32]" />
                  <span>Date:</span>
                </span>
                <input
                  type="date"
                  value={adminDate}
                  onChange={(e) => setAdminDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32] rounded-lg font-agbalumo"
                />
              </div>
            </div>

            {/* Action notification */}
            {actionMessage && (
              <div className="px-4 sm:px-6 py-2 bg-[#F5EBE0] text-xs text-[#8C5A32] border-b border-[#8C5A32]/20 flex items-center justify-between font-agbalumo font-bold flex-shrink-0">
                <span>{actionMessage}</span>
                <button onClick={() => setActionMessage('')} className="text-[#7A5C4A] hover:text-[#2C1A0E] p-1">
                  &times;
                </button>
              </div>
            )}

            {/* Tab 0: Student Management & Certificates */}
            {activeTab === 'student_management' && (
              <AdminStudentManagementTab onRefreshParent={loadAdminData} />
            )}

            {/* Tab 1: Manage Cricket Nets */}
            {activeTab === 'cricket_nets' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 font-agbalumo">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg sm:text-xl font-agbalumo text-[#2C1A0E] uppercase">
                      Cricket Nets Configuration
                    </h4>
                    <p className="text-xs text-[#5C4033]">
                      Configure turf nets, slot capacity, rename, or add custom lanes.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsAddingNet(true);
                      setEditingNetId(null);
                      setNetFormName(`Net 0${nets.length + 1} — Custom Turf`);
                      setNetFormCode(`NET-0${nets.length + 1}`);
                      setNetFormTurf('Astro-Turf Elite');
                      setNetFormCap(4);
                      setNetFormDesc('Tournament turf lane');
                    }}
                    className="px-4 py-2.5 bg-[#2C1A0E] hover:bg-[#8C5A32] text-[#FAF4ED] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-xl self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 text-[#FAF4ED]" />
                    <span>Add Cricket Net</span>
                  </button>
                </div>

                {/* Add/Edit Form */}
                {isAddingNet && (
                  <form
                    onSubmit={handleSaveNet}
                    className="p-4 sm:p-5 bg-[#F5EBE0] border border-[#8C5A32]/30 space-y-4 rounded-xl shadow-xs"
                  >
                    <div className="flex justify-between items-center border-b border-[#8C5A32]/20 pb-3">
                      <span className="text-xs font-bold uppercase text-[#8C5A32]">
                        {editingNetId ? 'Edit Net Details' : 'Create New Cricket Net'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingNet(false)}
                        className="text-xs text-[#5C4033] hover:text-[#2C1A0E]"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs text-[#7A5C4A] uppercase mb-1 font-bold">
                          Net Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={netFormName}
                          onChange={(e) => setNetFormName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#7A5C4A] uppercase mb-1 font-bold">
                          Net Code
                        </label>
                        <input
                          type="text"
                          value={netFormCode}
                          onChange={(e) => setNetFormCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#7A5C4A] uppercase mb-1 font-bold">
                          Turf Specification
                        </label>
                        <select
                          value={netFormTurf}
                          onChange={(e) => setNetFormTurf(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] rounded-lg"
                        >
                          <option value="Astro-Turf Elite">Astro-Turf Elite</option>
                          <option value="Natural Clay Blend">Natural Clay Blend</option>
                          <option value="High-Bounce Poly">High-Bounce Poly</option>
                          <option value="Precision Turf">Precision Turf</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs text-[#7A5C4A] uppercase mb-1 font-bold">
                          Max Athletes Capacity Per Slot
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={netFormCap}
                          onChange={(e) => setNetFormCap(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#7A5C4A] uppercase mb-1 font-bold">
                          Description
                        </label>
                        <input
                          type="text"
                          value={netFormDesc}
                          onChange={(e) => setNetFormDesc(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNet(false)}
                        className="px-4 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#5C4033] rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-[#2C1A0E] hover:bg-[#8C5A32] text-[#FAF4ED] text-xs font-bold uppercase tracking-wider rounded-lg"
                      >
                        Save Net
                      </button>
                    </div>
                  </form>
                )}

                {/* Nets Table */}
                <div className="w-full overflow-x-auto border border-[#8C5A32]/20 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="bg-[#F5EBE0] text-[#7A5C4A] uppercase tracking-wider border-b border-[#8C5A32]/20 font-bold">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Code</th>
                        <th className="p-3.5 whitespace-nowrap">Net Name</th>
                        <th className="p-3.5 whitespace-nowrap">Turf Type</th>
                        <th className="p-3.5 whitespace-nowrap">Capacity / Slot</th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C5A32]/15">
                      {nets.map((net) => (
                        <tr key={net.id} className="hover:bg-[#F5EBE0]/50 transition-colors">
                          <td className="p-3.5 text-[#8C5A32] font-bold whitespace-nowrap">{net.code}</td>
                          <td className="p-3.5 font-semibold text-[#2C1A0E] whitespace-nowrap">{net.name}</td>
                          <td className="p-3.5 text-[#5C4033] whitespace-nowrap">{net.turfType}</td>
                          <td className="p-3.5 text-[#2C1A0E] whitespace-nowrap">{net.capacityPerSlot} Athletes</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md ${
                                net.isActive
                                  ? 'bg-[#E5D2C0] text-[#2C1A0E] border border-[#8C5A32]/40'
                                  : 'bg-[#FDF2F2] text-[#A83232] border border-[#E5A7A7]'
                              }`}
                            >
                              {net.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => {
                                setEditingNetId(net.id);
                                setIsAddingNet(true);
                                setNetFormName(net.name);
                                setNetFormCode(net.code);
                                setNetFormTurf(net.turfType);
                                setNetFormCap(net.capacityPerSlot);
                                setNetFormDesc(net.description);
                              }}
                              className="px-2.5 py-1.5 bg-[#FAF4ED] hover:bg-[#F5EBE0] text-[#8C5A32] border border-[#8C5A32]/30 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleNetActive(net)}
                              className="px-2.5 py-1.5 bg-[#FAF4ED] hover:bg-[#F5EBE0] text-[#5C4033] border border-[#8C5A32]/30 text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              {net.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            {nets.length > 2 && (
                              <button
                                onClick={() => handleDeleteNet(net.id, net.name)}
                                className="px-2.5 py-1.5 bg-[#FDF2F2] hover:bg-[#FADEDE] text-[#A83232] border border-[#E5A7A7] text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Manage Cricket Slots */}
            {activeTab === 'cricket_slots' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 font-agbalumo">
                <div>
                  <h4 className="text-lg sm:text-xl font-agbalumo text-[#2C1A0E] uppercase">
                    Cricket Slot Schedule Control
                  </h4>
                  <p className="text-xs text-[#5C4033]">
                    Toggle slot status (AVAILABLE, FULL, CLOSED, LIMITED) for {adminDate}.
                  </p>
                </div>

                <div className="w-full overflow-x-auto border border-[#8C5A32]/20 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="bg-[#F5EBE0] text-[#7A5C4A] uppercase tracking-wider border-b border-[#8C5A32]/20 font-bold">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Net</th>
                        <th className="p-3.5 whitespace-nowrap">Time Slot</th>
                        <th className="p-3.5 whitespace-nowrap">Capacity / Booked</th>
                        <th className="p-3.5 whitespace-nowrap">Current Status</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Quick Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C5A32]/15">
                      {cricketSlots.map((slot) => (
                        <tr key={slot.id} className="hover:bg-[#F5EBE0]/50 transition-colors">
                          <td className="p-3.5 font-semibold text-[#2C1A0E] whitespace-nowrap">{slot.netName}</td>
                          <td className="p-3.5 text-[#5C4033] whitespace-nowrap">{slot.timeRange}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="text-[#8C5A32] font-bold">{slot.booked}</span> / {slot.capacity}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                                slot.status === 'CLOSED'
                                  ? 'bg-[#FDF2F2] text-[#A83232] border border-[#E5A7A7]'
                                  : slot.status === 'FULL'
                                  ? 'bg-[#F5EBE0] text-[#7A5C4A]'
                                  : slot.status === 'LIMITED'
                                  ? 'bg-[#FFF8E7] text-[#B87A00] border border-[#E8D090]'
                                  : 'bg-[#FAF4ED] text-[#8C5A32] border border-[#8C5A32]/40'
                              }`}
                            >
                              {slot.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() =>
                                handleUpdateCricketSlotStatus(slot.id, 'AVAILABLE')
                              }
                              className="px-2.5 py-1.5 bg-[#FAF4ED] hover:bg-[#F5EBE0] text-[#8C5A32] border border-[#8C5A32]/30 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => handleUpdateCricketSlotStatus(slot.id, 'FULL')}
                              className="px-2.5 py-1.5 bg-[#FFF8E7] hover:bg-[#F5EBE0] text-[#B87A00] border border-[#E8D090] text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Mark Full
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateCricketSlotStatus(slot.id, 'CLOSED')
                              }
                              className="px-2.5 py-1.5 bg-[#FDF2F2] hover:bg-[#FADEDE] text-[#A83232] border border-[#E5A7A7] text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Close Slot
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Manage Swimming Sessions */}
            {activeTab === 'swimming_sessions' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 font-agbalumo">
                <div>
                  <h4 className="text-lg sm:text-xl font-agbalumo text-[#2C1A0E] uppercase">
                    Swimming Sessions & Capacity
                  </h4>
                  <p className="text-xs text-[#5C4033]">
                    Control pool capacity, session status, and view remaining swimmer spots for {adminDate}.
                  </p>
                </div>

                <div className="w-full overflow-x-auto border border-[#8C5A32]/20 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="bg-[#F5EBE0] text-[#7A5C4A] uppercase tracking-wider border-b border-[#8C5A32]/20 font-bold">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Session Name</th>
                        <th className="p-3.5 whitespace-nowrap">Time</th>
                        <th className="p-3.5 whitespace-nowrap">Booked / Total</th>
                        <th className="p-3.5 whitespace-nowrap">Remaining</th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C5A32]/15">
                      {swimmingSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-[#F5EBE0]/50 transition-colors">
                          <td className="p-3.5 font-semibold text-[#2C1A0E] whitespace-nowrap">{session.title}</td>
                          <td className="p-3.5 text-[#5C4033] whitespace-nowrap">{session.timeRange}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="text-[#8C5A32] font-bold">{session.booked}</span> / {session.capacity}
                          </td>
                          <td className="p-3.5 text-[#2C1A0E] font-semibold whitespace-nowrap">
                            {session.remaining} spots left
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                                session.status === 'CLOSED'
                                  ? 'bg-[#FDF2F2] text-[#A83232] border border-[#E5A7A7]'
                                  : session.status === 'FULL'
                                  ? 'bg-[#F5EBE0] text-[#7A5C4A]'
                                  : 'bg-[#FAF4ED] text-[#8C5A32] border border-[#8C5A32]/40'
                              }`}
                            >
                              {session.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() =>
                                handleUpdateSwimmingSession(session.id, 'AVAILABLE')
                              }
                              className="px-2.5 py-1.5 bg-[#FAF4ED] hover:bg-[#F5EBE0] text-[#8C5A32] border border-[#8C5A32]/30 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Open
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateSwimmingSession(session.id, 'FULL')
                              }
                              className="px-2.5 py-1.5 bg-[#FFF8E7] hover:bg-[#F5EBE0] text-[#B87A00] border border-[#E8D090] text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Mark Full
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateSwimmingSession(session.id, 'CLOSED')
                              }
                              className="px-2.5 py-1.5 bg-[#FDF2F2] hover:bg-[#FADEDE] text-[#A83232] border border-[#E5A7A7] text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Manage Bookings */}
            {activeTab === 'bookings' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 font-agbalumo">
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-[#7A5C4A]" />
                      <input
                        type="text"
                        placeholder="Search athlete, phone, ID..."
                        value={bookingSearchTerm}
                        onChange={(e) => setBookingSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] focus:outline-none rounded-lg"
                      />
                    </div>

                    <select
                      value={bookingFilterSport}
                      onChange={(e) => setBookingFilterSport(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] focus:outline-none rounded-lg font-semibold"
                    >
                      <option value="all">All Sports</option>
                      <option value="cricket">Cricket Only</option>
                      <option value="swimming">Swimming Only</option>
                    </select>
                  </div>

                  <div className="text-xs text-[#7A5C4A] font-bold self-end sm:self-auto">
                    Showing {filteredBookings.length} booking records
                  </div>
                </div>

                {/* Bookings Directory Table */}
                <div className="w-full overflow-x-auto border border-[#8C5A32]/20 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead className="bg-[#F5EBE0] text-[#7A5C4A] uppercase tracking-wider border-b border-[#8C5A32]/20 font-bold">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Booking ID</th>
                        <th className="p-3.5 whitespace-nowrap">Athlete</th>
                        <th className="p-3.5 whitespace-nowrap">Phone</th>
                        <th className="p-3.5 whitespace-nowrap">Sport & Resource</th>
                        <th className="p-3.5 whitespace-nowrap">Date & Time</th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C5A32]/15">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-sm text-[#7A5C4A]">
                            No bookings found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-[#F5EBE0]/50 transition-colors">
                            <td className="p-3.5 font-bold text-[#8C5A32] whitespace-nowrap">{b.id}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-semibold text-[#2C1A0E]">{b.userName}</div>
                              {b.notes && (
                                <div className="text-[10px] text-[#7A5C4A] italic line-clamp-1 max-w-[180px]">
                                  {b.notes}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-[#5C4033] whitespace-nowrap">{b.userPhone}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] uppercase text-[#8C5A32] block font-bold">
                                {b.sport}
                              </span>
                              <span className="text-[#2C1A0E]">{b.resourceName}</span>
                            </td>
                            <td className="p-3.5 text-xs whitespace-nowrap">
                              <div className="text-[#2C1A0E] font-semibold">{b.date}</div>
                              <div className="text-[10px] text-[#7A5C4A]">{b.timeRange}</div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                                  b.status === 'CONFIRMED'
                                    ? 'bg-[#FAF4ED] text-[#8C5A32] border border-[#8C5A32]/40'
                                    : b.status === 'COMPLETED'
                                    ? 'bg-[#EBF5EE] text-[#1E5631] border border-[#A3D9B1]'
                                    : 'bg-[#FDF2F2] text-[#A83232] border border-[#E5A7A7]'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                              {b.status === 'CONFIRMED' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(b.id, 'COMPLETED')}
                                    title="Mark as Completed"
                                    className="px-2.5 py-1.5 bg-[#FAF4ED] hover:bg-[#F5EBE0] text-[#8C5A32] border border-[#8C5A32]/30 text-xs font-bold cursor-pointer rounded-lg"
                                  >
                                    Complete
                                  </button>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(b.id, 'CANCELLED')}
                                    title="Cancel Booking"
                                    className="px-2.5 py-1.5 bg-[#FDF2F2] hover:bg-[#FADEDE] text-[#A83232] border border-[#E5A7A7] text-xs font-bold cursor-pointer rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 5: Payments Received & Verification Record */}
            {activeTab === 'payments' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 font-agbalumo">
                {/* Revenue Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block">
                      Total Verified Revenue
                    </span>
                    <div className="text-xl font-bold text-emerald-950">
                      ₹{bookings
                        .filter((b) => b.paymentStatus === 'APPROVED')
                        .reduce((sum, b) => sum + (b.amountPaid || 0), 0)}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block">
                      Pending Verifications
                    </span>
                    <div className="text-xl font-bold text-amber-950">
                      {bookings.filter(
                        (b) => b.paymentStatus === 'PENDING_VERIFICATION' || (!b.paymentStatus && b.paymentScreenshot)
                      ).length}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-[#8C5A32]/20 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-[10px] font-mono font-bold text-[#7A5C4A] uppercase tracking-wider block">
                      Total Paid Bookings
                    </span>
                    <div className="text-xl font-bold text-[#2C1A0E]">
                      {bookings.filter((b) => b.paymentScreenshot || b.transactionId).length}
                    </div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-[#7A5C4A]" />
                      <input
                        type="text"
                        placeholder="Search name, phone, UTR..."
                        value={bookingSearchTerm}
                        onChange={(e) => setBookingSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] focus:outline-none rounded-lg"
                      />
                    </div>

                    <select
                      value={paymentStatusFilter}
                      onChange={(e: any) => setPaymentStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-[#8C5A32]/30 text-xs text-[#2C1A0E] focus:outline-none rounded-lg font-semibold"
                    >
                      <option value="all">All Payment Statuses</option>
                      <option value="PENDING_VERIFICATION">Pending Verification Only</option>
                      <option value="APPROVED">Approved Only</option>
                      <option value="REJECTED">Rejected Only</option>
                    </select>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="w-full overflow-x-auto border border-[#8C5A32]/20 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-[#F5EBE0] text-[#7A5C4A] uppercase tracking-wider border-b border-[#8C5A32]/20 font-bold">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap">Athlete Name & Phone</th>
                        <th className="p-3.5 whitespace-nowrap">Sport & Slot</th>
                        <th className="p-3.5 whitespace-nowrap">Amount Paid</th>
                        <th className="p-3.5 whitespace-nowrap">Payment Proof Screenshot</th>
                        <th className="p-3.5 whitespace-nowrap">UTR / Ref No.</th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 text-right whitespace-nowrap">Verification Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C5A32]/15">
                      {bookings
                        .filter((b) => {
                          const matchSearch =
                            !bookingSearchTerm ||
                            b.userName.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
                            b.userPhone.includes(bookingSearchTerm) ||
                            (b.transactionId && b.transactionId.toLowerCase().includes(bookingSearchTerm.toLowerCase()));

                          const matchStatus =
                            paymentStatusFilter === 'all' ||
                            (paymentStatusFilter === 'PENDING_VERIFICATION'
                              ? b.paymentStatus === 'PENDING_VERIFICATION' || (!b.paymentStatus && b.paymentScreenshot)
                              : b.paymentStatus === paymentStatusFilter);

                          return matchSearch && matchStatus;
                        })
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-[#F5EBE0]/50 transition-colors">
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-bold text-[#2C1A0E]">{b.userName}</div>
                              <div className="text-[10px] font-mono text-[#7A5C4A]">{b.userPhone}</div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] uppercase text-[#8C5A32] block font-bold">
                                {b.sport}
                              </span>
                              <div className="text-[#2C1A0E] font-medium">{b.date} &bull; {b.timeRange}</div>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-[#8C5A32] whitespace-nowrap">
                              ₹{b.amountPaid || 100}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {b.paymentScreenshot ? (
                                <button
                                  onClick={() => setViewingScreenshot(b.paymentScreenshot || null)}
                                  className="group flex items-center gap-2 p-1.5 border border-[#8C5A32]/30 rounded-lg hover:border-[#8C5A32] bg-neutral-50 transition-colors cursor-pointer"
                                >
                                  <img
                                    src={b.paymentScreenshot}
                                    alt="Screenshot preview"
                                    className="w-10 h-10 object-cover rounded border border-neutral-200"
                                  />
                                  <span className="text-[10px] font-bold text-[#8C5A32] group-hover:underline flex items-center gap-1">
                                    <ZoomIn className="w-3 h-3" />
                                    View Proof
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-neutral-400 italic">No Screenshot</span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-xs text-[#2C1A0E] whitespace-nowrap">
                              {b.transactionId ? (
                                <code className="bg-neutral-100 px-2 py-1 rounded border border-neutral-200 font-bold text-[#8C5A32]">
                                  {b.transactionId}
                                </code>
                              ) : (
                                <span className="text-neutral-400 text-[10px]">&mdash;</span>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                                  b.paymentStatus === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : b.paymentStatus === 'REJECTED'
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {b.paymentStatus === 'APPROVED'
                                  ? 'APPROVED'
                                  : b.paymentStatus === 'REJECTED'
                                  ? 'REJECTED'
                                  : 'PENDING VERIFICATION'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                              {b.paymentStatus !== 'APPROVED' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(b.id, 'APPROVED', 'CONFIRMED')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs flex items-center gap-1 inline-flex"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}
                              {b.paymentStatus !== 'REJECTED' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(b.id, 'REJECTED', 'CANCELLED')}
                                  className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 6: Owner QR Code & Payment Setup */}
            {activeTab === 'payment_setup' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 font-agbalumo max-w-3xl space-y-6">
                <div>
                  <h4 className="text-lg sm:text-xl font-agbalumo text-[#2C1A0E] uppercase flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#8C5A32]" />
                    <span>Upload QR Code & Payment Details</span>
                  </h4>
                  <p className="text-xs text-[#5C4033]">
                    Upload your UPI QR code and set your account details. This QR code will be displayed to athletes when booking slots.
                  </p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-6 bg-white p-5 border border-[#8C5A32]/20 rounded-2xl shadow-xs">
                  {/* QR Code Upload Section */}
                  <div className="space-y-3">
                    <label className="block text-xs uppercase font-bold text-[#7A5C4A] tracking-wider">
                      Academy UPI QR Code Image
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-44 h-44 bg-neutral-50 border-2 border-dashed border-[#8C5A32]/40 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden group">
                        {upiQrCodeUrl ? (
                          <>
                            <img
                              src={upiQrCodeUrl}
                              alt="Academy QR Code"
                              className="w-full h-full object-contain rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                              <span className="text-white text-xs font-bold">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-3 space-y-1">
                            <QrCode className="w-10 h-10 text-[#8C5A32] mx-auto" />
                            <span className="text-xs font-bold text-[#2C1A0E] block">No QR Uploaded</span>
                            <span className="text-[10px] text-[#7A5C4A] block">Click below to upload</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 flex-1 w-full">
                        <label className="px-4 py-2.5 bg-[#FAF4ED] hover:bg-[#F5EBE0] text-[#8C5A32] border border-[#8C5A32]/40 text-xs font-bold uppercase rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors">
                          <Upload className="w-4 h-4 text-[#8C5A32]" />
                          <span>{qrUploading ? 'Uploading Image...' : 'Choose QR Image File'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrUpload}
                            disabled={qrUploading}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-[#5C4033] font-serif italic">
                          Upload your Paytm, PhonePe, Google Pay, or Bank UPI QR Code image (PNG/JPG format).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div>
                      <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                        UPI ID (VPA) *
                      </label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. 9829084421@paytm"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                        Account / Payee Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={upiAccountName}
                        onChange={(e) => setUpiAccountName(e.target.value)}
                        placeholder="e.g. Kuchaman Sports Academy"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                        Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                        Instructions for Athletes
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. Upload screenshot after completing UPI payment"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingConfig || qrUploading}
                      className="px-6 py-3 bg-[#2C1A0E] hover:bg-[#8C5A32] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {savingConfig ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Save Payment Settings</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Screenshot Full Image Viewer Modal */}
        <AnimatePresence>
          {viewingScreenshot && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4">
              <div className="min-h-full flex items-center justify-center py-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative max-w-3xl w-full bg-white border border-neutral-200 p-4 sm:p-6 rounded-2xl shadow-2xl flex flex-col items-center my-auto"
                >
                  <button
                    onClick={() => setViewingScreenshot(null)}
                    className="absolute top-3 right-3 p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-[#2C1A0E] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h4 className="text-sm font-bold text-[#2C1A0E] mb-3 self-start">
                    Payment Proof Screenshot
                  </h4>

                  <div className="overflow-auto max-h-[75vh] w-full flex items-center justify-center bg-neutral-100 p-2 rounded-xl">
                    <img
                      src={viewingScreenshot}
                      alt="Payment Proof Full"
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                    />
                  </div>

                  <div className="mt-3 flex justify-end w-full">
                    <button
                      onClick={() => setViewingScreenshot(null)}
                      className="px-4 py-2 bg-[#2C1A0E] text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
                    >
                      Close Viewer
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

