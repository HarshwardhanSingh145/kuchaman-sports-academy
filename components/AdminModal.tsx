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
  Gift,
  Percent,
  Sparkles,
  ShieldAlert,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { CricketNet, CricketSlot, SwimmingSession, Booking, AcademyConfig } from '@/lib/types';
import { useFirebase } from '@/lib/FirebaseContext';
import { compressImageFile } from '@/lib/utils';
import { AdminDiscountPopupTab } from './AdminDiscountPopupTab';
import { AdminHourlyRatesTab } from './AdminHourlyRatesTab';
import { AdminBookingTimingTab } from './AdminBookingTimingTab';
import { AdminBookingInfoTab } from './AdminBookingInfoTab';
import { AdminPaymentVerificationTab } from './AdminPaymentVerificationTab';
import { AdminRecurringBookingsTab } from './AdminRecurringBookingsTab';
import { AdminRecurringPricingTab } from './AdminRecurringPricingTab';
import { AdminWhatsAppSettingsTab } from './AdminWhatsAppSettingsTab';
import { subscribeToBookings, subscribeToConfig } from '@/lib/firestore-service';

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

  // Active Tab for focused Academy Admin controls
  const [activeTab, setActiveTab] = useState<
    'payment_verification' | 'whatsapp_settings' | 'recurring_bookings' | 'recurring_pricing' | 'booking_info' | 'hourly_rates' | 'booking_timing' | 'discount_popup' | 'payment_setup' | 'nets_facilities'
  >('booking_info');
  const [cricketSubView, setCricketSubView] = useState<'slots' | 'nets'>('slots');
  const [academyConfig, setAcademyConfig] = useState<AcademyConfig | null>(null);

  // Config & Payment Settings State
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('9829084421@paytm');
  const [upiAccountName, setUpiAccountName] = useState('Kuchaman Sports Academy');
  const [bankName, setBankName] = useState('State Bank of India');
  const [paymentNotes, setPaymentNotes] = useState('Please share screenshot after payment');
  const [ownerWhatsAppNumber, setOwnerWhatsAppNumber] = useState('8142731917');
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
        setAcademyConfig(configData.config);
        setUpiQrCodeUrl(configData.config.upiQrCodeUrl || '');
        setUpiId(configData.config.upiId || '9829084421@paytm');
        setUpiAccountName(configData.config.upiAccountName || 'Kuchaman Sports Academy');
        setBankName(configData.config.bankName || 'State Bank of India');
        setPaymentNotes(configData.config.paymentNotes || 'Please upload payment proof screenshot after UPI payment.');
        if (configData.config.ownerWhatsAppNumber) {
          setOwnerWhatsAppNumber(configData.config.ownerWhatsAppNumber);
        } else if (configData.config.phone) {
          setOwnerWhatsAppNumber(configData.config.phone.replace(/\D/g, '').slice(-10) || '8142731917');
        }
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
          ownerWhatsAppNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('QR Code and WhatsApp Notification setup saved successfully!');
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

      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = 'Failed to update payment status';
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch {
          // not JSON
        }
        setActionMessage(errorMsg);
        return;
      }

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

      const unsubBookings = subscribeToBookings((liveBookings) => {
        if (Array.isArray(liveBookings)) {
          setBookings(liveBookings);
        }
      });

      const unsubConfig = subscribeToConfig((liveConfig) => {
        if (liveConfig) {
          setUpiQrCodeUrl((prev) => (prev ? prev : (liveConfig.upiQrCodeUrl || '')));
          setUpiId((prev) => (prev ? prev : (liveConfig.upiId || '9829084421@paytm')));
          setUpiAccountName((prev) => (prev ? prev : (liveConfig.upiAccountName || 'Kuchaman Sports Academy')));
          setBankName((prev) => (prev ? prev : (liveConfig.bankName || 'State Bank of India')));
          setPaymentNotes((prev) => (prev ? prev : (liveConfig.paymentNotes || liveConfig.paymentInstructions || 'Please upload payment proof screenshot after UPI payment.')));
        }
      });

      return () => {
        unsubBookings();
        unsubConfig();
      };
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

  // Filtered bookings list with multi-criteria support
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilterSport !== 'all' && b.sport !== bookingFilterSport) return false;
    if (paymentStatusFilter !== 'all') {
      if (paymentStatusFilter === 'PENDING_VERIFICATION') {
        const isPending =
          b.paymentStatus === 'PENDING_VERIFICATION' ||
          (!b.paymentStatus && Boolean(b.paymentScreenshot));
        if (!isPending) return false;
      } else if (b.paymentStatus !== paymentStatusFilter) {
        return false;
      }
    }
    if (bookingSearchTerm) {
      const term = bookingSearchTerm.toLowerCase();
      const matchName = b.userName?.toLowerCase().includes(term);
      const matchPhone = b.userPhone?.includes(term);
      const matchId = b.id?.toLowerCase().includes(term);
      const matchUtr = b.transactionId?.toLowerCase().includes(term);
      return Boolean(matchName || matchPhone || matchId || matchUtr);
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
                type="button"
                onClick={() => setActiveTab('whatsapp_settings')}
                title="ओनर WhatsApp अलर्ट नंबर बदलें"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 cursor-pointer font-bold rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-agbalumo">अलर्ट: +91 {ownerWhatsAppNumber.replace(/\D/g, '').slice(-10)}</span>
                <span className="text-[10px] underline font-bold text-emerald-700">बदलें</span>
              </button>
            )}
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
                {/* Tab 0: Payment Verification */}
                {(() => {
                  const pendingCount = bookings.filter(
                    (b) => b.paymentStatus === 'PENDING_VERIFICATION' || b.status === 'AWAITING_VERIFICATION'
                  ).length;
                  return (
                    <button
                      onClick={() => setActiveTab('payment_verification')}
                      className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                        activeTab === 'payment_verification'
                          ? 'bg-amber-500 border-amber-600 text-neutral-950 font-black shadow-xs'
                          : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                      }`}
                    >
                      <ShieldAlert className={`w-3.5 h-3.5 ${activeTab === 'payment_verification' ? 'text-neutral-950' : 'text-amber-700'}`} />
                      <span>🛡️ भुगतान सत्यापन (Verification)</span>
                      {pendingCount > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Tab: WhatsApp Alert & Mobile Number */}
                <button
                  onClick={() => setActiveTab('whatsapp_settings')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'whatsapp_settings'
                      ? 'bg-emerald-700 border-emerald-800 text-white font-black shadow-xs'
                      : 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'whatsapp_settings' ? 'text-white' : 'text-emerald-700'}`} />
                  <span>📲 WhatsApp अलर्ट नंबर</span>
                </button>

                {/* Tab 1: Booking Information */}
                <button
                  onClick={() => setActiveTab('booking_info')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'booking_info'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>📋 बुकिंग जानकारी (Booking Info)</span>
                </button>

                {/* Tab: Recurring Bookings */}
                <button
                  onClick={() => setActiveTab('recurring_bookings')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'recurring_bookings'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-700" />
                  <span>🔄 रिकरिंग बुकिंग (Recurring Bookings)</span>
                </button>

                {/* Tab: Recurring Pricing */}
                <button
                  onClick={() => setActiveTab('recurring_pricing')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'recurring_pricing'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 text-amber-700" />
                  <span>💰 रिकरिंग दरें (Recurring Pricing)</span>
                </button>

                {/* Tab 2: Hourly Rate Control */}
                <button
                  onClick={() => setActiveTab('hourly_rates')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'hourly_rates'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>⏱️ प्रति घंटा दरें (Hourly Rates)</span>
                </button>

                {/* Tab 3: Booking Timing & Blocking */}
                <button
                  onClick={() => setActiveTab('booking_timing')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'booking_timing'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>📅 समय व स्लॉट ब्लॉक (Timing Control)</span>
                </button>

                {/* Tab 4: Special Event Discount Pop-up */}
                <button
                  onClick={() => setActiveTab('discount_popup')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'discount_popup'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 text-amber-600" />
                  <span>🎉 डिस्काउंट पॉप-अप (Special Offer)</span>
                </button>

                {/* Tab 5: QR & Payment Setup */}
                <button
                  onClick={() => setActiveTab('payment_setup')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'payment_setup'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-[#8C5A32]" />
                  <span>💳 QR, UPI व WhatsApp सेटअप</span>
                </button>

                {/* Tab 6: Turf & Nets Facilities */}
                <button
                  onClick={() => setActiveTab('nets_facilities')}
                  className={`px-3 sm:px-4 py-2 text-xs font-agbalumo tracking-wide uppercase transition-all cursor-pointer border rounded-xl whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                    activeTab === 'nets_facilities'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/40 border-transparent text-[#7A5C4A] hover:text-[#2C1A0E] hover:bg-white/80'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#8C5A32]" />
                  <span>🏟️ टर्फ व नेट्स</span>
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

            {/* Tab 0: Payment Verification Section */}
            {activeTab === 'payment_verification' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                <AdminPaymentVerificationTab
                  onRefresh={loadAdminData}
                  onNavigateToWhatsApp={() => setActiveTab('whatsapp_settings')}
                  activeWhatsAppNumber={ownerWhatsAppNumber}
                />
              </div>
            )}

            {/* Tab: WhatsApp Alert & Owner Mobile Number */}
            {activeTab === 'whatsapp_settings' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                <AdminWhatsAppSettingsTab
                  currentNumber={ownerWhatsAppNumber}
                  onSaved={(newNum) => {
                    setOwnerWhatsAppNumber(newNum);
                    setActionMessage(`✅ WhatsApp मोबाइल नंबर सफलतापूर्वक बदलकर +91 ${newNum} कर दिया गया है!`);
                    loadAdminData();
                    onDataChanged();
                  }}
                />
              </div>
            )}

            {/* Tab 1: Booking Information & Customer Management */}
            {activeTab === 'booking_info' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                <AdminBookingInfoTab onRefresh={loadAdminData} />
              </div>
            )}

            {/* Tab: Recurring Bookings Management */}
            {activeTab === 'recurring_bookings' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 font-agbalumo">
                <AdminRecurringBookingsTab
                  config={academyConfig || ({} as any)}
                  onDataChanged={() => {
                    loadAdminData();
                    onDataChanged();
                  }}
                />
              </div>
            )}

            {/* Tab: Recurring Pricing Control */}
            {activeTab === 'recurring_pricing' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 font-agbalumo">
                <AdminRecurringPricingTab
                  config={academyConfig || ({} as any)}
                  onDataChanged={() => {
                    loadAdminData();
                    onDataChanged();
                  }}
                />
              </div>
            )}

            {/* Tab 2: Hourly Rate Management */}
            {activeTab === 'hourly_rates' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                <AdminHourlyRatesTab
                  onSaved={() => {
                    loadAdminData();
                    onDataChanged();
                  }}
                />
              </div>
            )}

            {/* Tab 3: Booking Timing & Slot Blocking Management */}
            {activeTab === 'booking_timing' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                <AdminBookingTimingTab
                  onSaved={() => {
                    loadAdminData();
                    onDataChanged();
                  }}
                />
              </div>
            )}

            {/* Tab 4: Special Event Discount Pop-up */}
            {activeTab === 'discount_popup' && (
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                <AdminDiscountPopupTab
                  onSaved={() => {
                    loadAdminData();
                    onDataChanged();
                  }}
                />
              </div>
            )}

            {/* Turf & Nets Facilities */}
            {activeTab === 'nets_facilities' && (
              <div className="px-3 sm:px-6 pt-4 pb-0 flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#8C5A32]/20 shadow-xs">
                  <div>
                    <h4 className="text-base sm:text-lg font-agbalumo text-[#2C1A0E] uppercase flex items-center gap-2">
                      <span>🏏 Cricket Turf & Practice Nets</span>
                    </h4>
                    <p className="text-xs text-[#5C4033]">
                      Box Turf 160x70 ft, 4 practice nets, daily slot schedule & booking controls.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#F5EBE0] p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCricketSubView('slots')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        cricketSubView === 'slots'
                          ? 'bg-[#2C1A0E] text-white shadow-xs'
                          : 'text-[#7A5C4A] hover:text-[#2C1A0E]'
                      }`}
                    >
                      <span>📅 Daily Slots ({cricketSlots.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCricketSubView('nets')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        cricketSubView === 'nets'
                          ? 'bg-[#2C1A0E] text-white shadow-xs'
                          : 'text-[#7A5C4A] hover:text-[#2C1A0E]'
                      }`}
                    >
                      <span>⚙️ Turf & Net Settings ({nets.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Manage Cricket Nets */}
            {activeTab === 'nets_facilities' && cricketSubView === 'nets' && (
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
            {activeTab === 'nets_facilities' && cricketSubView === 'slots' && (
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

            {/* Tab 5: Owner QR Code & Payment Setup */}
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

                    {/* Owner WhatsApp Notification Destination */}
                    <div className="sm:col-span-2 pt-2 border-t border-neutral-100">
                      <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
                        <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Academy Owner WhatsApp Number for Instant Alerts *</span>
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <div className="relative flex-1">
                            <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              required
                              value={ownerWhatsAppNumber}
                              onChange={(e) => setOwnerWhatsAppNumber(e.target.value)}
                              placeholder="e.g. 8142731917 or +91 81427 31917"
                              className="w-full pl-9 pr-3.5 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono font-bold text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
                            />
                          </div>
                          {ownerWhatsAppNumber && (
                            <a
                              href={`https://wa.me/91${ownerWhatsAppNumber.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                                'नमस्ते, कुचामन स्पोर्ट्स एकेडमी (KSA) का WhatsApp टेस्ट नोटिफिकेशन सक्रिय है।'
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Test Link (टेस्ट करें)</span>
                            </a>
                          )}
                        </div>
                        <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            📲 जब भी कोई खिलाड़ी UPI से स्लॉट बुक करेगा, तो तुरंत इस नंबर पर व्हाट्सएप अलर्ट और 1-क्लिक अप्रूवल का डायरेक्ट लिंक भेजा जाएगा।
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('whatsapp_settings')}
                            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <span>विस्तृत WhatsApp सेटिंग्स पेज →</span>
                          </button>
                        </div>
                      </div>
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

