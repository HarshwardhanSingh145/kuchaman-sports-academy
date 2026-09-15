'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  RefreshCw,
  Search,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { subscribeToBookings } from '@/lib/firestore-service';

interface AdminPaymentVerificationTabProps {
  onRefresh?: () => void;
}

export function AdminPaymentVerificationTab({ onRefresh }: AdminPaymentVerificationTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
    const unsubscribe = subscribeToBookings((liveBookings) => {
      if (Array.isArray(liveBookings)) {
        setBookings(liveBookings);
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error loading bookings for verification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (booking: Booking) => {
    setProcessingId(booking.id);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'APPROVED',
          status: 'CONFIRMED',
          verifiedBy: 'Admin (Manual Bank Verification)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve payment');
      }

      setFeedbackMessage({
        type: 'success',
        text: `✅ Booking ${booking.id} verified and confirmed successfully!`,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, paymentStatus: 'APPROVED', status: 'CONFIRMED', verifiedAt: new Date().toISOString() }
            : b
        )
      );

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to approve payment',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (booking: Booking) => {
    const confirmed = window.confirm(
      `Reject payment for Booking ${booking.id} (${booking.userName})?\n\nThis will mark the booking as "Payment Verification Failed".`
    );
    if (!confirmed) return;

    setProcessingId(booking.id);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'REJECTED',
          status: 'PAYMENT_VERIFICATION_FAILED',
          verifiedBy: 'Admin (Manual Bank Verification)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject payment');
      }

      setFeedbackMessage({
        type: 'success',
        text: `❌ Payment rejected for Booking ${booking.id}. Status set to Payment Verification Failed.`,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, paymentStatus: 'REJECTED', status: 'PAYMENT_VERIFICATION_FAILED', verifiedAt: new Date().toISOString() }
            : b
        )
      );

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to reject payment',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Pending verification bookings list
  const pendingBookings = bookings.filter((b) => {
    const isPending =
      b.paymentStatus === 'PENDING_VERIFICATION' ||
      b.status === 'AWAITING_VERIFICATION';

    if (!isPending) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.id?.toLowerCase().includes(q) ||
      b.userName?.toLowerCase().includes(q) ||
      b.userPhone?.toLowerCase().includes(q) ||
      b.userEmail?.toLowerCase().includes(q) ||
      b.transactionId?.toLowerCase().includes(q) ||
      b.resourceName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Strict Owner Verification Notice Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-[#3d2314] to-[#2C1A0E] text-white p-5 rounded-2xl border border-amber-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-black">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </span>
              <h3 className="text-lg font-black text-amber-100">
                Payment Verification (भुगतान सत्यापन)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-neutral-950">
                {pendingBookings.length} Pending
              </span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed max-w-2xl">
              <span className="font-bold text-white">अनिवार्य नियम:</span> कृपया अपने वास्तविक बैंक / UPI खाते (Paytm / SBI / GPay) में राशि जमा होने की पुष्टि करें। 
              केवल बैंक रिकॉर्ड देखने के बाद ही <span className="font-bold underline text-white">Approve Payment</span> दबाएं।
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="self-start sm:self-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Counter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, UTR or Booking ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-[#2C1A0E]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 px-2">
          <span>Total Awaiting Verification:</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-black">
            {pendingBookings.length}
          </span>
        </div>
      </div>

      {/* Pending Bookings List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-bold">Loading pending payment verification requests...</p>
        </div>
      ) : pendingBookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-neutral-900">No Pending Verification Requests</h4>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-sm mx-auto">
              All incoming UPI payments have been verified or no customer has submitted an unverified request.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingBookings.map((b) => {
            const isItemProcessing = processingId === b.id;
            const cleanPhone = b.userPhone.replace(/\D/g, '');
            const whatsappNumber = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone.slice(-10)}`;
            const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              `Hello ${b.userName}, regarding your booking ${b.id} at Kuchaman Sports Academy for ${b.date} (${b.timeRange}).`
            )}`;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border-2 border-amber-300/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Header Strip */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      {b.sport === 'cricket' ? '🏏' : b.sport === 'swimming' ? '🏊' : '🎓'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#2C1A0E] tracking-wider">
                          {b.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 animate-pulse">
                          Pending Verification
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-semibold">
                        Submitted: {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Amount Due</span>
                    <span className="text-lg font-black text-emerald-700">
                      ₹{b.amountPaid || b.originalAmount || 0}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 sm:p-5 space-y-3.5 text-xs text-neutral-800">
                  {/* Customer Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/80">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Customer Name</span>
                      <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{b.userName}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Mobile Number</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${b.userPhone}`}
                          className="font-bold text-neutral-900 hover:text-emerald-700 flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{b.userPhone}</span>
                        </a>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Chat with customer on WhatsApp"
                          className="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Email Address</span>
                      <p className="font-medium text-neutral-700 flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{b.userEmail || 'Not provided'}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Players / Persons</span>
                      <p className="font-bold text-neutral-900">
                        {b.playerCount} {b.sport === 'cricket' ? 'Players' : 'Persons'}
                      </p>
                    </div>
                  </div>

                  {/* Slot and Booking Information */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                      <span className="text-neutral-500 font-medium">Sport & Facility:</span>
                      <span className="font-black text-neutral-900">
                        {b.sport.toUpperCase()} — {b.resourceName}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                      <span className="text-neutral-500 font-medium">Booking Date:</span>
                      <span className="font-bold text-neutral-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{b.date}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                      <span className="text-neutral-500 font-medium">Selected Slot / Time:</span>
                      <span className="font-bold text-neutral-900 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{b.timeRange}</span>
                      </span>
                    </div>

                    {b.transactionId && (
                      <div className="flex justify-between items-center py-1.5 bg-amber-50/70 px-2 rounded-lg border border-amber-200/70">
                        <span className="text-amber-900 font-bold">Customer UPI / UTR Ref:</span>
                        <span className="font-mono font-black text-neutral-900 select-all">
                          {b.transactionId}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Payment Screenshot (if uploaded) */}
                  {b.paymentScreenshot && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedScreenshot(b.paymentScreenshot!)}
                        className="w-full py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4 text-neutral-600" />
                        <span>View Payment Screenshot</span>
                      </button>
                    </div>
                  )}

                  {/* Warning Checklist */}
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Check your bank SMS or UPI app for ₹{b.amountPaid || b.originalAmount || 0} from this customer before approving.
                    </span>
                  </div>
                </div>

                {/* Actions: Approve vs Reject */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-200 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isItemProcessing}
                    onClick={() => handleReject(b)}
                    className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Payment</span>
                  </button>

                  <button
                    type="button"
                    disabled={isItemProcessing}
                    onClick={() => handleApprove(b)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                  >
                    {isItemProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Screenshot Modal Viewer */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-900">Payment Screenshot</h4>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 hover:bg-neutral-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-neutral-50 rounded-xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedScreenshot}
                alt="Proof"
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
