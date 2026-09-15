'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Home,
} from 'lucide-react';
import Link from 'next/link';

interface BookingInfo {
  id: string;
  userName: string;
  userPhone: string;
  amountPaid: number;
  sport: string;
  resourceName?: string;
  date: string;
  timeRange: string;
  status: string;
  paymentStatus: string;
  transactionId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

function VerifyBookingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const initialAction = searchParams.get('action');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) {
      setError('बुकिंग ID या सत्यापन टोकन नहीं मिला (Missing ID or Token)');
      setLoading(false);
      return;
    }

    const verifyOrFetch = async () => {
      try {
        setLoading(true);
        // Build url with initial action if present
        let url = `/api/bookings/verify?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
        if (initialAction) {
          url += `&action=${encodeURIComponent(initialAction)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'सत्यापन विफल रहा (Verification failed)');
          setLoading(false);
          return;
        }

        setBooking(data.booking);
        if (data.message) {
          setFeedbackMessage(data.message);
        }
      } catch (err: any) {
        setError(err?.message || 'सर्वर से कनेक्ट नहीं हो सका');
      } finally {
        setLoading(false);
      }
    };

    verifyOrFetch();
  }, [id, initialAction, token]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!id || !token) return;
    try {
      setUpdating(true);
      setError(null);
      const res = await fetch('/api/bookings/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'अद्यतन विफल रहा');
        return;
      }
      setBooking(data.booking);
      setFeedbackMessage(data.message);
    } catch (err: any) {
      setError(err?.message || 'अद्यतन नहीं हो सका');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-neutral-800 border border-neutral-700 rounded-3xl p-8 max-w-md w-full text-center text-white shadow-2xl">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold">भुगतान सत्यापन जांचा जा रहा है...</h2>
          <p className="text-neutral-400 text-sm mt-2">
            कृपया प्रतीक्षा करें, ओनर सत्यापन प्रक्रिया सक्रिय हो रही है।
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-neutral-800 border border-rose-800/60 rounded-3xl p-8 max-w-md w-full text-center text-white shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-rose-300">त्रुटि / Error</h2>
          <p className="text-neutral-300 text-sm mt-2 leading-relaxed">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <Home className="w-4 h-4" /> होमपेज पर जाएं
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmed = booking?.status === 'CONFIRMED' && booking?.paymentStatus === 'APPROVED';
  const isRejected =
    booking?.status === 'PAYMENT_VERIFICATION_FAILED' || booking?.paymentStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Top Header Card */}
        <div
          className={`p-6 text-center text-white relative ${
            isConfirmed
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
              : isRejected
              ? 'bg-gradient-to-br from-rose-600 to-rose-800'
              : 'bg-gradient-to-br from-amber-600 to-amber-800'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
            {isConfirmed ? (
              <CheckCircle2 className="w-9 h-9 text-white" />
            ) : isRejected ? (
              <XCircle className="w-9 h-9 text-white" />
            ) : (
              <Clock className="w-9 h-9 text-amber-200 animate-pulse" />
            )}
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase mb-1.5">
            {isConfirmed
              ? '✅ भुगतान स्वीकृत • CONFIRMED'
              : isRejected
              ? '❌ भुगतान अस्वीकृत • REJECTED'
              : '⏳ सत्यापन प्रतीक्षित • PENDING'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-black">
            {isConfirmed
              ? 'बुकिंग कन्फर्म हो चुकी है!'
              : isRejected
              ? 'बुकिंग रिजेक्ट कर दी गई है!'
              : 'भुगतान सत्यापन लंबित है'}
          </h1>

          <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-sm mx-auto leading-relaxed">
            {isConfirmed
              ? 'वेबसाइट पर ग्राहक की स्क्रीन लाइव कन्फर्म हो चुकी है और स्लॉट बुक हो गया है।'
              : isRejected
              ? 'ग्राहक की स्क्रीन पर पेमेंट अस्वीकृत दिखा रहा है और स्लॉट पुनः उपलब्ध हो चुका है।'
              : 'कृपया अपने बैंक खाते में राशि देखकर निर्णय लें।'}
          </p>
        </div>

        {/* Booking Details Card */}
        {booking && (
          <div className="p-6 space-y-4">
            {/* Client WhatsApp Notification Status Banner */}
            {(isConfirmed || isRejected) && (
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
                  isConfirmed
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                <MessageCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {isConfirmed
                      ? '✅ ग्राहक के व्हाट्सएप पर कन्फर्मेशन मैसेज भेजा गया:'
                      : '⚠️ ग्राहक के व्हाट्सएप पर कैंसलेशन मैसेज भेजा गया:'}
                  </p>
                  <p className="text-white/80">
                    मोबाइल नंबर <span className="font-mono font-bold text-white">{booking.userPhone}</span> ({booking.userName})
                  </p>
                  <a
                    href={`https://wa.me/91${booking.userPhone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-white underline underline-offset-2 mt-1 hover:text-emerald-300"
                  >
                    व्हाट्सएप पर ग्राहक से चैट खोलें →
                  </a>
                </div>
              </div>
            )}

            <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <span className="text-xs text-neutral-400 font-medium">बुकिंग ID:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{booking.id}</span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <span className="text-xs text-neutral-400 font-medium">ग्राहक का नाम:</span>
                <span className="font-bold text-white text-sm">{booking.userName}</span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <span className="text-xs text-neutral-400 font-medium">मोबाइल नंबर:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-neutral-200 text-sm font-semibold">
                    {booking.userPhone}
                  </span>
                  <a
                    href={`tel:${booking.userPhone}`}
                    className="p-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-emerald-400 transition"
                    title="कॉल करें"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/91${booking.userPhone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-emerald-400 transition"
                    title="व्हाट्सएप करें"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <span className="text-xs text-neutral-400 font-medium">खेल व स्लॉट:</span>
                <span className="font-semibold text-neutral-200 text-right text-xs sm:text-sm">
                  {booking.resourceName || booking.sport.toUpperCase()}
                  <br />
                  <span className="text-xs text-amber-400">
                    {booking.date} • {booking.timeRange}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <span className="text-xs text-neutral-400 font-medium">भुगतान राशि:</span>
                <span className="font-black text-emerald-400 text-lg">₹{booking.amountPaid}</span>
              </div>

              {booking.transactionId && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-medium">UTR / Ref No:</span>
                  <span className="font-mono text-xs text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded">
                    {booking.transactionId}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action Buttons for Owner */}
            <div className="pt-2 space-y-3">
              <div className="text-center text-xs text-neutral-400 font-medium">
                {isConfirmed
                  ? 'यदि आपने गलती से स्वीकृति (YES) दी थी, तो आप यहाँ से रिजेक्ट कर सकते हैं:'
                  : isRejected
                  ? 'यदि ग्राहक का पेमेंट अब बैंक खाते में आ गया है, तो आप यहाँ से कन्फर्म कर सकते हैं:'
                  : 'कृपया बैंक में पैसे चेक करके सही बटन दबाएं:'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={updating || isConfirmed}
                  onClick={() => handleAction('approve')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isConfirmed
                      ? 'bg-emerald-800/40 text-emerald-300 border border-emerald-600/40 cursor-default opacity-80'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isConfirmed ? 'स्वीकृत है (Approved)' : '✅ YES (कन्फर्म करें)'}
                </button>

                <button
                  type="button"
                  disabled={updating || isRejected}
                  onClick={() => handleAction('reject')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isRejected
                      ? 'bg-rose-800/40 text-rose-300 border border-rose-600/40 cursor-default opacity-80'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 active:scale-95'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  {isRejected ? 'अस्वीकृत है (Rejected)' : '❌ NO (रिजेक्ट करें)'}
                </button>
              </div>

              {feedbackMessage && (
                <p className="text-center text-xs font-semibold text-amber-300 py-1">
                  {feedbackMessage}
                </p>
              )}
            </div>

            {/* Bottom Navigation Link */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1.5 text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> KSA Verified Portal
              </span>
              <Link
                href="/"
                className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1 transition"
              >
                वेबसाइट खोलें <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      }
    >
      <VerifyBookingContent />
    </Suspense>
  );
}
