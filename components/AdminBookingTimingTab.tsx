'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Lock,
  Unlock,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  RefreshCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { BookingTimingConfig, DateSpecificBlock } from '@/lib/types';
import { formatContinuousHour } from '@/lib/timing-helper';

interface AdminBookingTimingTabProps {
  onSaved?: () => void;
}

export function AdminBookingTimingTab({ onSaved }: AdminBookingTimingTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Global Timing State
  const [startHour, setStartHour] = useState<number>(6); // 06:00 AM
  const [endHour, setEndHour] = useState<number>(2); // 02:00 AM
  const [operatingHoursText, setOperatingHoursText] = useState('06:00 AM – 02:00 AM');
  const [blockedHours, setBlockedHours] = useState<number[]>([]);
  const [dateSpecificBlocks, setDateSpecificBlocks] = useState<DateSpecificBlock[]>([]);

  // New Date Block Form State
  const [newBlockDate, setNewBlockDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [newBlockStartTime, setNewBlockStartTime] = useState('07:00 PM');
  const [newBlockEndTime, setNewBlockEndTime] = useState('09:00 PM');
  const [newBlockReason, setNewBlockReason] = useState('Blocked by Owner');

  useEffect(() => {
    fetchTimingConfig();
  }, []);

  const fetchTimingConfig = () => {
    setLoading(true);
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.bookingTiming) {
          const t: BookingTimingConfig = data.config.bookingTiming;
          setStartHour(t.startHour ?? 6);
          setEndHour(t.endHour ?? 2);
          setOperatingHoursText(t.operatingHoursText || '06:00 AM – 02:00 AM');
          setBlockedHours(t.blockedHours || []);
          setDateSpecificBlocks(t.dateSpecificBlocks || []);
        }
      })
      .catch((err) => console.error('Error fetching timing config:', err))
      .finally(() => setLoading(false));
  };

  const handleToggleGlobalHour = async (hour: number) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleBlockedHour',
          toggleHour: hour,
        }),
      });
      const data = await res.json();
      if (data.success && data.blockedHours) {
        setBlockedHours(data.blockedHours);
        setFeedback({
          type: 'success',
          text: `घंटे ${formatContinuousHour(hour)} की उपलब्धता अपडेट हो गई।`,
        });
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockDate || !newBlockStartTime || !newBlockEndTime) {
      setFeedback({ type: 'error', text: 'कृपया तारीख, शुरू और समाप्त समय दर्ज करें।' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addDateBlock',
          blockData: {
            date: newBlockDate,
            startTime: newBlockStartTime,
            endTime: newBlockEndTime,
            reason: newBlockReason.trim() || 'Blocked by Owner',
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.block) {
        setDateSpecificBlocks((prev) => [...prev, data.block]);
        setFeedback({
          type: 'success',
          text: `✓ ${newBlockDate} (${newBlockStartTime} – ${newBlockEndTime}) को सफलतापूर्वक ब्लॉक कर दिया गया। अब यह स्लॉट बुकिंग पेज पर अनउपलब्ध रहेगा।`,
        });
        if (onSaved) onSaved();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to add date block' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDateBlock = async (blockId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteDateBlock',
          blockId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDateSpecificBlocks((prev) => prev.filter((b) => b.id !== blockId));
        setFeedback({
          type: 'success',
          text: 'स्लॉट अनब्लॉक हो गया और पुनः ग्राहकों के लिए उपलब्ध हो गया।',
        });
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobalHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingTiming: {
            startHour,
            endHour,
            operatingHoursText: `${formatContinuousHour(startHour)} – ${formatContinuousHour(
              endHour < startHour ? endHour + 24 : endHour
            )}`,
            blockedHours,
            dateSpecificBlocks,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          text: '✓ ग्लोबल बुकिंग ऑवर सेटिंग्स सफलतापूर्वक सेव हो गईं!',
        });
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-neutral-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-700" />
        <p className="text-xs font-semibold">टाइमिंग सेटिंग्स लोड हो रही हैं...</p>
      </div>
    );
  }

  // 20 operating continuous hours from 6 AM (6) to 2 AM next day (26)
  const operationalHoursList = Array.from({ length: 21 }, (_, i) => 6 + i);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2C1A0E] to-[#5C381E] text-white p-5 rounded-2xl shadow-sm border border-[#2C1A0E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg text-xs font-black">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black tracking-tight text-[#FAF4ED]">
                Booking Timing & Slot Blocking (समय व स्लॉट नियंत्रण)
              </h3>
            </div>
            <p className="text-xs text-neutral-300 max-w-xl">
              Owner/Admin किसी भी विशिष्ट तारीख या पूरे दिन के लिए स्लॉट्स को ब्लॉक/अनब्लॉक कर सकते हैं।
              ग्राहक केवल वही समय देख सकेंगे जो वास्तव में उपलब्ध है।
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 rounded-xl text-amber-300 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Strict Conflict Prevention</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* SECTION 1: Date & Time Specific Blocking (Admin Directive #7) */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              Date-Specific Blocking
            </span>
            <h4 className="text-base font-black text-neutral-900 mt-1">
              विशिष्ट तारीख और समय को ब्लॉक करें (Date + Time Slot Block)
            </h4>
            <p className="text-xs text-neutral-500">
              उदाहरण: 25 सितम्बर, 7:00 PM – 9:00 PM को Owner द्वारा प्राइवेट मैच या मेंटेनेंस के लिए ब्लॉक करें
            </p>
          </div>
        </div>

        {/* Add Block Form */}
        <form onSubmit={handleAddDateBlock} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
              तारीख (Date) *
            </label>
            <input
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-xs font-semibold text-neutral-900 bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
              शुरू समय (Start Time) *
            </label>
            <input
              type="text"
              value={newBlockStartTime}
              onChange={(e) => setNewBlockStartTime(e.target.value)}
              placeholder="07:00 PM"
              className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-xs font-semibold text-neutral-900 bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
              समाप्त समय (End Time) *
            </label>
            <input
              type="text"
              value={newBlockEndTime}
              onChange={(e) => setNewBlockEndTime(e.target.value)}
              placeholder="09:00 PM"
              className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-xs font-semibold text-neutral-900 bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
              कारण (Reason / Label)
            </label>
            <input
              type="text"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="Blocked by Owner"
              className="w-full h-10 px-3 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-xs font-semibold text-neutral-900 bg-white outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full h-10 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>स्लॉट ब्लॉक करें</span>
            </button>
          </div>
        </form>

        {/* Active Date-Specific Blocks Table */}
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <h5 className="text-xs font-black text-neutral-700 uppercase tracking-wider mb-2.5">
            सक्रिय ब्लॉक किए गए स्लॉट्स (Active Blocked Slots): {dateSpecificBlocks.length}
          </h5>

          {dateSpecificBlocks.length === 0 ? (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-500">
              वर्तमान में कोई विशेष तारीख स्लॉट ब्लॉक नहीं है। सभी स्लॉट्स सामान्य रूप से उपलब्ध हैं।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-600 font-bold border-b border-neutral-200">
                    <th className="py-2.5 px-3">तारीख (Date)</th>
                    <th className="py-2.5 px-3">समय सीमा (Time Range)</th>
                    <th className="py-2.5 px-3">कारण (Reason)</th>
                    <th className="py-2.5 px-3 text-right">कार्रवाई (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {dateSpecificBlocks.map((block) => (
                    <tr key={block.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-black text-neutral-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{block.date}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">
                        {block.timeRange || `${block.startTime} – ${block.endTime}`}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 font-medium">
                        {block.reason || 'Blocked by Owner'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteDateBlock(block.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>अनब्लॉक करें</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: 24-Hour Operating & Daily Blocked Hours */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Operating Hours & Daily Availability
          </span>
          <h4 className="text-base font-black text-neutral-900 mt-1">
            दैनिक घंटे उपलब्धता ग्रिड (Click Hour to Toggle Available / Blocked)
          </h4>
          <p className="text-xs text-neutral-500">
            नीचे दिए गए किसी भी घंटे पर क्लिक करके उसे हमेशा के लिए ब्लॉक या उपलब्ध कर सकते हैं (हरे = उपलब्ध, लाल = ब्लॉक)
          </p>
        </div>

        {/* Hour Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {operationalHoursList.map((hour) => {
            const isBlocked = blockedHours.includes(hour) || (hour >= 24 && blockedHours.includes(hour - 24));
            const label = formatContinuousHour(hour);

            return (
              <button
                key={hour}
                type="button"
                onClick={() => handleToggleGlobalHour(hour >= 24 ? hour - 24 : hour)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isBlocked
                    ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {isBlocked ? (
                    <Lock className="w-3 h-3 text-rose-600" />
                  ) : (
                    <Check className="w-3 h-3 text-emerald-600" />
                  )}
                  <span className="text-xs font-black">{label}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider block">
                  {isBlocked ? 'Blocked' : 'Available'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
