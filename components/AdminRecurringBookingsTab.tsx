'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  Eye,
  Trash2,
  AlertCircle,
  Check,
  X,
  Phone,
  User,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Booking, AcademyConfig } from '@/lib/types';
import { formatDisplayDate, getDayNameFromDate } from '@/lib/recurring-helper';

interface AdminRecurringBookingsTabProps {
  config: AcademyConfig;
  onDataChanged: () => void;
}

export function AdminRecurringBookingsTab({
  config,
  onDataChanged,
}: AdminRecurringBookingsTabProps) {
  const [recurringBookings, setRecurringBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'weekly' | 'monthly' | 'preferred_time'>('ALL');
  const [activeParent, setActiveParent] = useState<Booking | null>(null);
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all recurring bookings
  const fetchRecurringBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/recurring-bookings');
      const data = await res.json();
      if (data.success && Array.isArray(data.recurringBookings)) {
        setRecurringBookings(data.recurringBookings);
      }
    } catch (err) {
      console.error('Failed to fetch recurring bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurringBookings();
  }, []);

  // Fetch individual sessions for an active parent booking
  const handleViewSessions = async (parent: Booking) => {
    setActiveParent(parent);
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/recurring-bookings/sessions?parentId=${parent.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Approve Payment for Recurring Booking (Cascades to all sessions)
  const handleApprovePayment = async (booking: Booking) => {
    if (!confirm(`Approve payment of ₹${booking.amountPaid} for recurring booking ${booking.id}? This will confirm all ${booking.total_sessions || 'linked'} sessions.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/bookings/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          verifiedBy: 'Admin (KSA Owner)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Recurring booking ${booking.id} and all sessions confirmed successfully!` });
        await fetchRecurringBookings();
        if (activeParent?.id === booking.id) {
          await handleViewSessions(booking);
        }
        onDataChanged();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to approve booking' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error approving recurring booking' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Reject Payment
  const handleRejectPayment = async (booking: Booking) => {
    const reason = prompt('Enter rejection reason (optional):') || 'Payment verification rejected by admin';
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/bookings/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          reason,
          verifiedBy: 'Admin (KSA Owner)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Recurring booking ${booking.id} rejected.` });
        await fetchRecurringBookings();
        if (activeParent?.id === booking.id) {
          await handleViewSessions(booking);
        }
        onDataChanged();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reject booking' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error rejecting booking' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Cancel Recurring Booking
  const handleCancelRecurring = async (booking: Booking) => {
    if (!confirm(`Are you sure you want to cancel recurring booking ${booking.id}? All linked sessions will be marked as CANCELLED.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/bookings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          status: 'CANCELLED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Recurring booking ${booking.id} cancelled.` });
        await fetchRecurringBookings();
        if (activeParent?.id === booking.id) {
          await handleViewSessions(booking);
        }
        onDataChanged();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cancel booking' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error cancelling booking' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Adjust an individual session (cancel or mark attended)
  const handleAdjustSession = async (session: Booking, newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/recurring-bookings/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          updates: { status: newStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Session on ${session.date} updated to ${newStatus}.` });
        if (activeParent) {
          await handleViewSessions(activeParent);
        }
        onDataChanged();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update session' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating session' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Filter Bookings
  const filteredBookings = recurringBookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.id.toLowerCase().includes(q) ||
      b.userName.toLowerCase().includes(q) ||
      b.userPhone.includes(q) ||
      (b.resourceName && b.resourceName.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'PENDING') {
      matchesStatus = b.paymentStatus === 'PENDING_VERIFICATION' || b.status === 'AWAITING_VERIFICATION';
    } else if (statusFilter === 'CONFIRMED') {
      matchesStatus = b.status === 'CONFIRMED' || b.paymentStatus === 'APPROVED';
    } else if (statusFilter === 'CANCELLED') {
      matchesStatus = b.status === 'CANCELLED' || b.status === 'PAYMENT_VERIFICATION_FAILED';
    }

    let matchesType = true;
    if (typeFilter !== 'ALL') {
      matchesType = b.recurrence_type === typeFilter;
    }

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#2C1A0E] to-[#4A2D19] text-white">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-300" />
            <h3 className="text-lg font-black tracking-wide">
              रिकरिंग बुकिंग प्रबंधन (Recurring Bookings)
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1">
            साप्ताहिक, मासिक व पसंदीदा समय के सभी पैकेज व व्यक्तिगत स्लॉट सत्र देखें, अप्रूव व मैनेज करें।
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRecurringBookings}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>रिफ्रेश (Sync)</span>
        </button>
      </div>

      {/* Action Notification Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम, मोबाइल या ID खोजें..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1A0E]"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-800 bg-white focus:outline-none"
        >
          <option value="ALL">सभी स्थितियां (All Statuses)</option>
          <option value="PENDING">⏳ सत्यापन प्रतीक्षित (Pending Verification)</option>
          <option value="CONFIRMED">✅ कन्फर्म / स्वीकृत (Confirmed)</option>
          <option value="CANCELLED">❌ निरस्त (Cancelled)</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-800 bg-white focus:outline-none"
        >
          <option value="ALL">सभी प्रकार (All Types)</option>
          <option value="weekly">साप्ताहिक बुकिंग (Weekly)</option>
          <option value="monthly">मासिक बुकिंग (Monthly)</option>
          <option value="preferred_time">पसंदीदा समय (Preferred Time)</option>
        </select>
      </div>

      {/* Recurring Bookings List */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-semibold">रिकरिंग बुकिंग लोड हो रही हैं...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 p-8">
          <Layers className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-700">कोई रिकरिंग बुकिंग नहीं मिली</p>
          <p className="text-xs text-neutral-500 mt-1">
            जब कोई ग्राहक साप्ताहिक या मासिक रिकरिंग स्लॉट बुक करेगा, वह यहां प्रदर्शित होगी।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const isPending =
              b.paymentStatus === 'PENDING_VERIFICATION' || b.status === 'AWAITING_VERIFICATION';
            const isConfirmed = b.status === 'CONFIRMED' || b.paymentStatus === 'APPROVED';
            const typeLabel =
              b.recurrence_type === 'weekly'
                ? 'साप्ताहिक (Weekly)'
                : b.recurrence_type === 'monthly'
                ? 'मासिक (Monthly)'
                : 'पसंदीदा समय (Preferred Time)';

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 sm:p-5 hover:border-neutral-300 transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-black font-mono text-xs">
                      {b.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold">
                      {typeLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                      {b.sport === 'cricket' ? '🏏 क्रिकेट' : '🏊 स्विमिंग'}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                        <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                        <span>सत्यापन प्रतीक्षित (Pending Approval)</span>
                      </span>
                    ) : isConfirmed ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>कन्फर्म (Approved)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black">
                        <XCircle className="w-3.5 h-3.5 text-rose-700" />
                        <span>{b.status}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500 block">ग्राहक (Customer):</span>
                    <span className="font-bold text-neutral-900 text-sm flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      {b.userName}
                    </span>
                    <a
                      href={`tel:${b.userPhone}`}
                      className="text-amber-800 hover:underline font-semibold flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3 h-3 text-neutral-400" />
                      {b.userPhone}
                    </a>
                  </div>

                  <div>
                    <span className="text-neutral-500 block">दिन व समय (Schedule):</span>
                    <span className="font-bold text-neutral-900 block mt-0.5">
                      {b.recurrence_days?.join(', ') || 'Regular'}
                    </span>
                    <span className="text-neutral-600 block">
                      {b.preferred_time || b.timeRange} ({b.duration || b.durationHours || 1} hr)
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block">अवधि व सत्र (Duration):</span>
                    <span className="font-bold text-neutral-900 block mt-0.5">
                      {formatDisplayDate(b.start_date || b.date)} — {formatDisplayDate(b.end_date || b.date)}
                    </span>
                    <span className="text-amber-900 font-bold block">
                      कुल {b.total_sessions || b.recurring_dates?.length || 1} सत्र (Sessions)
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block">कुल भुगतान राशि:</span>
                    <span className="text-base font-black text-[#2C1A0E] block mt-0.5">
                      ₹{b.amountPaid || b.recurring_price || 0}
                    </span>
                    {b.transactionId && (
                      <span className="font-mono text-[11px] text-neutral-500 block truncate">
                        UTR: {b.transactionId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => handleViewSessions(b)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>सभी {b.total_sessions || 'सत्र'} देखें (View Sessions)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprovePayment(b)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>भुगतान स्वीकारें (Approve All)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectPayment(b)}
                          disabled={isProcessing}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>अस्वीकार (Reject)</span>
                        </button>
                      </>
                    )}

                    {isConfirmed && (
                      <button
                        type="button"
                        onClick={() => handleCancelRecurring(b)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-700 text-xs font-semibold transition-all cursor-pointer"
                      >
                        निरस्त करें (Cancel)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Sessions Modal */}
      {activeParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#2C1A0E] to-[#4A2D19] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-mono font-bold">
                    {activeParent.id}
                  </span>
                  <h4 className="font-black text-base">सत्र अनुसूची (Recurring Sessions)</h4>
                </div>
                <p className="text-xs text-neutral-300 mt-0.5">
                  {activeParent.userName} • {activeParent.userPhone} • {activeParent.preferred_time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveParent(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {isLoadingSessions ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">सत्र लोड हो रहे हैं...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-500">
                  इस रिकरिंग बुकिंग के सत्र जनरेट नहीं हुए हैं।
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500 font-semibold mb-1 flex justify-between">
                    <span>कुल सत्र: {sessions.length}</span>
                    <span>समय: {activeParent.preferred_time}</span>
                  </div>

                  {sessions.map((sess, idx) => {
                    const dayName = getDayNameFromDate(sess.date);
                    const isSessConfirmed = sess.status === 'CONFIRMED' || sess.paymentStatus === 'APPROVED';
                    const isSessCancelled = sess.status === 'CANCELLED';

                    return (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#2C1A0E] text-white font-bold flex items-center justify-center text-[11px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-neutral-900">
                              {formatDisplayDate(sess.date)} ({dayName})
                            </span>
                            <span className="text-neutral-500 block text-[11px]">
                              {sess.timeRange} • {sess.resourceName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isSessConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isSessCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sess.status}
                          </span>

                          {/* Session Status Actions */}
                          {isSessConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleAdjustSession(sess, 'CANCELLED')}
                              disabled={isProcessing}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer"
                              title="Cancel this single session"
                            >
                              रद्द करें
                            </button>
                          )}
                          {isSessCancelled && (
                            <button
                              type="button"
                              onClick={() => handleAdjustSession(sess, 'CONFIRMED')}
                              disabled={isProcessing}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer"
                              title="Reactivate session"
                            >
                              पुनः सक्रिय
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-semibold">
                पैकेज मूल्य: ₹{activeParent.amountPaid || activeParent.recurring_price}
              </span>
              <button
                type="button"
                onClick={() => setActiveParent(null)}
                className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold cursor-pointer"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
