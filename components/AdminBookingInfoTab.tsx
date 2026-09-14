'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Phone,
  IndianRupee,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Sparkles,
  Download,
} from 'lucide-react';
import { Booking } from '@/lib/types';

interface AdminBookingInfoTabProps {
  onRefresh?: () => void;
}

export function AdminBookingInfoTab({ onRefresh }: AdminBookingInfoTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        }
      })
      .catch((err) => console.error('Error loading bookings:', err))
      .finally(() => setLoading(false));
  };

  const handleUpdatePaymentStatus = async (
    bookingId: string,
    paymentStatus: 'APPROVED' | 'REJECTED',
    status?: 'CONFIRMED' | 'CANCELLED'
  ) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus,
          status: status || (paymentStatus === 'APPROVED' ? 'CONFIRMED' : 'CANCELLED'),
          verifiedBy: 'Admin',
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
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  paymentStatus,
                  status: status || (paymentStatus === 'APPROVED' ? 'CONFIRMED' : 'CANCELLED'),
                }
              : b
          )
        );
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to update payment status:', err?.message || err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  ) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = 'Failed to update status';
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch {
          // not JSON
        }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
        );
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to update status:', err?.message || err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm(`Are you sure you want to delete booking ${bookingId}?`)) return;
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = 'Failed to delete booking';
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch {
          // not JSON
        }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (data.success) {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to delete booking:', err?.message || err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      b.id?.toLowerCase().includes(q) ||
      b.userName?.toLowerCase().includes(q) ||
      b.userPhone?.toLowerCase().includes(q) ||
      b.resourceName?.toLowerCase().includes(q);

    const matchesSport =
      filterSport === 'all' ||
      b.sport === filterSport ||
      b.category === filterSport;

    const matchesPayment =
      filterPayment === 'all' || b.paymentStatus === filterPayment;

    return matchesSearch && matchesSport && matchesPayment;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#2C1A0E] to-[#5C381E] text-white p-5 rounded-2xl shadow-sm border border-[#2C1A0E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg text-xs font-black">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black tracking-tight text-[#FAF4ED]">
                Booking Information & Customers (बुकिंग व ग्राहक जानकारी)
              </h3>
            </div>
            <p className="text-xs text-neutral-300 max-w-xl">
              सभी ग्राहकों/मेंबर्स की बुकिंग जानकारी: नाम, फोन, प्लेयर्स की संख्या, तारीख, समय अवधि (duration) और भुगतान स्थिति।
            </p>
          </div>
          <button
            type="button"
            onClick={fetchBookings}
            className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>रिफ्रेश करें</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="नाम, फोन नंबर या बुकिंग ID से खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-900 bg-neutral-50/50 focus:bg-white focus:border-[#2C1A0E] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="h-10 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 bg-white outline-none"
          >
            <option value="all">सभी श्रेणियाँ (All Categories)</option>
            <option value="cricket">Cricket</option>
            <option value="swimming">Swimming</option>
            <option value="admission">Admission</option>
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="h-10 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 bg-white outline-none"
          >
            <option value="all">सभी भुगतान (All Payment)</option>
            <option value="APPROVED">स्वीकृत (Approved)</option>
            <option value="PENDING_VERIFICATION">सत्यापन लंबित (Pending)</option>
            <option value="REJECTED">अस्वीकृत (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Bookings List / Table */}
      {loading ? (
        <div className="py-12 text-center text-neutral-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-700" />
          <p className="text-xs font-semibold">बुकिंग डेटा लोड हो रहा है...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
          <p className="text-sm font-bold text-neutral-700">कोई बुकिंग नहीं मिली</p>
          <p className="text-xs text-neutral-400 mt-1">
            दिए गए फ़िल्टर या खोज के अनुसार कोई रिकॉर्ड उपलब्ध नहीं है।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const isBigBox =
              b.resourceName?.toUpperCase().includes('BIG BOX') ||
              b.resourceId === 'net-big-box' ||
              b.category === 'cricket_bigbox';

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs hover:border-[#8C5A32]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Customer and Booking Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                      {b.id}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        b.sport === 'cricket'
                          ? isBigBox
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                          : b.sport === 'swimming'
                          ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                      }`}
                    >
                      {b.sport === 'cricket'
                        ? isBigBox
                          ? '🏟️ Big Box Turf'
                          : '🏏 Practice Net'
                        : b.sport === 'swimming'
                        ? '🏊 Swimming Pool'
                        : '🎓 Admission'}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        b.paymentStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : b.paymentStatus === 'PENDING_VERIFICATION'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {b.paymentStatus === 'APPROVED'
                        ? '✓ Payment Approved'
                        : b.paymentStatus === 'PENDING_VERIFICATION'
                        ? '⏳ Verification Pending'
                        : '✗ Rejected'}
                    </span>
                  </div>

                  {/* Customer Info Line */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                        Customer / Mentor
                      </span>
                      <span className="font-bold text-neutral-900">{b.userName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                        Contact Phone
                      </span>
                      <a
                        href={`tel:${b.userPhone}`}
                        className="font-bold text-amber-900 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-amber-700" />
                        <span>{b.userPhone}</span>
                      </a>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                        Date & Duration
                      </span>
                      <div className="font-semibold text-neutral-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        <span>{b.date}</span>
                      </div>
                      <div className="text-[11px] text-neutral-600 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{b.timeRange}</span>
                        {b.durationHours ? (
                          <span className="font-bold text-neutral-800">
                            ({b.durationHours} hr{b.durationHours > 1 ? 's' : ''})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                        Players & Amount
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {b.playerCount || 1} Person(s)
                      </span>
                      <div className="text-sm font-black text-emerald-700 flex items-center gap-0.5 mt-0.5">
                        <span>₹{b.amountPaid}</span>
                        {b.hourlyRate ? (
                          <span className="text-[10px] text-neutral-400 font-normal">
                            (₹{b.hourlyRate}/hr)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                  {b.paymentScreenshot && (
                    <button
                      type="button"
                      onClick={() => setSelectedScreenshot(b.paymentScreenshot!)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>रसीद देखें</span>
                    </button>
                  )}

                  {b.paymentStatus === 'PENDING_VERIFICATION' && (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === b.id}
                        onClick={() => handleUpdatePaymentStatus(b.id, 'APPROVED', 'CONFIRMED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>स्वीकारें (Approve)</span>
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === b.id}
                        onClick={() => handleUpdatePaymentStatus(b.id, 'REJECTED', 'CANCELLED')}
                        className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>अस्वीकारें</span>
                      </button>
                    </>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => handleUpdateBookingStatus(b.id, 'COMPLETED')}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <span>Mark Completed</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={updatingId === b.id}
                    onClick={() => handleDeleteBooking(b.id)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-black text-neutral-900">भुगतान स्क्रीनशॉट (Payment Screenshot)</h4>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-neutral-200 max-h-96 flex items-center justify-center bg-neutral-900">
              <img
                src={selectedScreenshot}
                alt="Payment proof"
                className="max-h-96 w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-4 py-2 rounded-xl bg-[#2C1A0E] text-white text-xs font-bold cursor-pointer"
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
