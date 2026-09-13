'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
  X,
  ChevronRight,
  Shield,
  RefreshCw,
  QrCode,
  Download,
  Upload,
  Copy,
  Check,
  CreditCard,
  ArrowLeft,
  Sparkles,
  Info,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { CricketNet, CricketSlot, SwimmingSession, Booking, AcademyConfig, BigBoxPricingTier } from '@/lib/types';
import { DEFAULT_BIG_BOX_PRICING } from '@/lib/defaults';
import { useLanguage } from '@/lib/LanguageContext';
import { compressImageFile } from '@/lib/utils';

interface BookingSectionProps {
  initialSport?: 'cricket' | 'bigbox' | 'swimming';
  onBack?: () => void;
}

export function BookingSection({ initialSport = 'cricket', onBack }: BookingSectionProps) {
  const { isHindi } = useLanguage();
  const [sport, setSport] = useState<'cricket' | 'bigbox' | 'swimming'>(initialSport);

  useEffect(() => {
    if (initialSport) {
      setSport(initialSport);
    }
  }, [initialSport]);

  // Progressive flow state for Cricket
  const [selectedNetId, setSelectedNetId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [playerCount, setPlayerCount] = useState<number>(1);

  // Data
  const [nets, setNets] = useState<CricketNet[]>([]);
  const [cricketSlots, setCricketSlots] = useState<CricketSlot[]>([]);
  const [swimmingSessions, setSwimmingSessions] = useState<SwimmingSession[]>([]);

  // Loading & refresh
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Customer contact form & payment proof
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [experience, setExperience] = useState('Intermediate');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment State
  const [ownerConfig, setOwnerConfig] = useState<Partial<AcademyConfig>>({});
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Confirmed booking pass
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Modal target for swimming sessions
  const [swimmingBookingTarget, setSwimmingBookingTarget] = useState<SwimmingSession | null>(null);

  // Load Academy Config for UPI QR & Details
  useEffect(() => {
    fetch('/api/config')
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (data && data.success && data.config) {
          setOwnerConfig(data.config);
        }
      })
      .catch(() => {
        // Silently tolerate warmup
      });
  }, []);

  // Generate next 12 days for date selector
  const availableDates = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      dates.push({ iso, dayName, dayNumber, monthName, isToday: i === 0 });
    }
    return dates;
  }, []);

  // Duration Tier Selection for Big Box (Admin-Configured)
  const [selectedDurationTierId, setSelectedDurationTierId] = useState<string>('tier-1');

  // Big Box Pricing Tiers (From Admin Config or Default)
  const bigBoxTiers: BigBoxPricingTier[] = React.useMemo(() => {
    if (ownerConfig?.bigBoxPricing && Array.isArray(ownerConfig.bigBoxPricing) && ownerConfig.bigBoxPricing.length > 0) {
      return ownerConfig.bigBoxPricing;
    }
    return DEFAULT_BIG_BOX_PRICING;
  }, [ownerConfig?.bigBoxPricing]);

  const activeBigBoxTier: BigBoxPricingTier = React.useMemo(() => {
    return (
      bigBoxTiers.find((t) => t.id === selectedDurationTierId) ||
      bigBoxTiers[0] ||
      DEFAULT_BIG_BOX_PRICING[0]
    );
  }, [bigBoxTiers, selectedDurationTierId]);

  // Fetch slot availability from API
  const fetchAvailability = useCallback(async () => {
    try {
      setRefreshing(true);
      const apiSport = sport === 'bigbox' ? 'cricket' : sport;
      const res = await fetch(`/api/slots?sport=${apiSport}&date=${selectedDate}`);
      if (!res.ok) {
        return;
      }
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return;
      }

      if (data && data.success) {
        if (sport === 'cricket' || sport === 'bigbox') {
          const loadedNets: CricketNet[] = data.nets || [];
          setNets(loadedNets);
          setCricketSlots(data.slots || []);

          if (sport === 'bigbox') {
            const bigBoxNet = loadedNets.find(
              (n) => n.id === 'net-big-box' || n.isBigBox || n.code === 'BOX-TURF' || n.name?.toUpperCase().includes('BIG BOX')
            ) || loadedNets[0];
            if (bigBoxNet) {
              setSelectedNetId(bigBoxNet.id);
            }
          }
        } else {
          setSwimmingSessions(data.sessions || []);
        }
      }
    } catch {
      // Silently handle transient network/warmup interruptions
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [sport, selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchAvailability();
  }, [sport, selectedDate, fetchAvailability]);

  // Selected Net details
  const activeNet = React.useMemo(() => {
    return nets.find((n) => n.id === selectedNetId) || null;
  }, [nets, selectedNetId]);

  const isBigBoxNet = Boolean(
    sport === 'bigbox' ||
    activeNet?.isBigBox ||
    activeNet?.name?.toUpperCase().includes('BIG BOX') ||
    activeNet?.code === 'BOX-CRICKET' ||
    activeNet?.code === 'BOX-TURF' ||
    selectedNetId === 'net-big-box'
  );

  // Sync selection when switching sport modes
  useEffect(() => {
    if (sport === 'bigbox' && nets.length > 0) {
      const bigBoxNet = nets.find(
        (n) => n.id === 'net-big-box' || n.isBigBox || n.code === 'BOX-TURF' || n.name?.toUpperCase().includes('BIG BOX')
      ) || nets[0];
      if (bigBoxNet && selectedNetId !== bigBoxNet.id) {
        setSelectedNetId(bigBoxNet.id);
      }
    } else if (sport === 'cricket' && selectedNetId === 'net-big-box') {
      setSelectedNetId('');
    }
  }, [sport, nets, selectedNetId]);

  // CHANGE 1: Filter nets so Big Box has ONLY Big Box, and Cricket has only 4 Practice Nets
  const visibleNets = React.useMemo(() => {
    if (sport === 'bigbox') {
      const bb = nets.filter(
        (n) => n.id === 'net-big-box' || n.isBigBox || n.code === 'BOX-TURF' || n.name?.toUpperCase().includes('BIG BOX')
      );
      return bb.length > 0 ? bb : nets.slice(0, 1);
    }
    return nets.filter(
      (n) => !(n.id === 'net-big-box' || n.isBigBox || n.code === 'BOX-TURF' || n.name?.toUpperCase().includes('BIG BOX'))
    );
  }, [sport, nets]);

  // Available slots for selected net
  const netSlots = React.useMemo(() => {
    if (!selectedNetId) return [];
    return cricketSlots.filter((s) => s.netId === selectedNetId);
  }, [cricketSlots, selectedNetId]);

  // Selected slot details
  const activeSlot = React.useMemo(() => {
    if (!selectedSlotId) return null;
    return netSlots.find((s) => s.id === selectedSlotId) || null;
  }, [netSlots, selectedSlotId]);

  // Enforce player limits whenever net changes
  useEffect(() => {
    if (!isBigBoxNet && playerCount > 4) {
      setPlayerCount(4);
    }
  }, [isBigBoxNet, playerCount]);

  // CHANGE 2: Pricing formula
  // Big Box is fixed total per booking based on Admin configured duration tier (NOT per-person)
  // Regular cricket nets are ₹100 per person
  const feePerPerson = 100;
  const totalCricketFee = isBigBoxNet
    ? activeBigBoxTier.price
    : feePerPerson * Math.max(1, playerCount);

  // Handle Net Selection (Step 1)
  const handleSelectNet = (netId: string) => {
    setSelectedNetId(netId);
    // If switching net, reset slot if that slot belongs to another net
    setSelectedSlotId('');
    setFormError('');
  };

  // Handle Date Selection (Step 2)
  const handleSelectDate = (dateIso: string) => {
    setSelectedDate(dateIso);
    setSelectedSlotId('');
    setFormError('');
  };

  // Handle Slot Selection (Step 3)
  const handleSelectSlot = (slot: CricketSlot) => {
    if (slot.status === 'CLOSED' || slot.status === 'FULL' || slot.remaining <= 0) {
      return;
    }
    setSelectedSlotId(slot.id);
    // Ensure player count doesn't exceed slot remaining if regular net
    if (!isBigBoxNet && playerCount > slot.remaining) {
      setPlayerCount(Math.min(4, Math.max(1, slot.remaining)));
    }
    setFormError('');
  };

  // Handle Player Count Changes (Step 4)
  const handlePlayerCountChange = (newCount: number) => {
    if (isBigBoxNet) {
      setPlayerCount(Math.max(1, newCount));
    } else {
      const maxAllowed = Math.min(4, activeSlot ? activeSlot.remaining : 4);
      setPlayerCount(Math.min(maxAllowed, Math.max(1, newCount)));
    }
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    const upi = ownerConfig?.upiId || '9829084421@paytm';
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Upload Payment Screenshot
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      setFormError('');
      const compressed = await compressImageFile(file, 800, 800, 0.85);
      setPaymentScreenshot(compressed);
    } catch (err: any) {
      setFormError(isHindi ? 'स्क्रीनशॉट लोड करने में त्रुटि हुई।' : 'Failed to compress payment screenshot.');
    } finally {
      setUploadingProof(false);
    }
  };

  // Confirm Cricket Reservation
  const handleConfirmCricketReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNet || !activeSlot) {
      setFormError(isHindi ? 'कृपया नेट, दिनांक और समय स्लॉट का चयन करें।' : 'Please select net, date and time slot first.');
      return;
    }

    if (!formName.trim() || !formPhone.trim()) {
      setFormError(isHindi ? 'कृपया अपना पूरा नाम और 10 अंकों का फोन नंबर दर्ज करें।' : 'Please enter your full name and 10-digit phone number.');
      return;
    }

    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError(isHindi ? 'कृपया 10 अंकों का मान्य फोन नंबर दर्ज करें।' : 'Please enter a valid 10-digit phone number.');
      return;
    }

    if (!isBigBoxNet && playerCount > 4) {
      setFormError(isHindi ? 'नियमित नेट में अधिकतम 4 खिलाड़ी ही खेल सकते हैं।' : 'Regular cricket nets allow a maximum of 4 players.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const finalTimeRange = isBigBoxNet
        ? `${activeSlot.timeRange} (${activeBigBoxTier.label})`
        : activeSlot.timeRange;

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: 'cricket',
          resourceId: activeNet.id,
          resourceName: activeNet.name,
          date: selectedDate,
          timeRange: finalTimeRange,
          userName: formName.trim(),
          userPhone: formPhone.trim(),
          ...(formEmail.trim() ? { userEmail: formEmail.trim() } : {}),
          playerCount: playerCount,
          experienceLevel: experience,
          notes: isBigBoxNet
            ? `[Big Box Booking - Duration: ${activeBigBoxTier.label} - Rate: ₹${activeBigBoxTier.price}] ${notes}`.trim()
            : (notes.trim() || undefined),
          amountPaid: totalCricketFee,
          paymentStatus: 'PENDING_VERIFICATION',
          ...(paymentScreenshot ? { paymentScreenshot } : {}),
          ...(transactionId.trim() ? { transactionId: transactionId.trim() } : {}),
          paymentMethod: 'UPI_QR',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || (isHindi ? 'स्लॉट बुक करने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to confirm booking. Slot may have been taken.'));
        return;
      }

      setConfirmedBooking(data.booking);
      fetchAvailability();
    } catch (err: any) {
      setFormError(err.message || (isHindi ? 'नेटवर्क त्रुटि हुई। कृपया दोबारा प्रयास करें।' : 'Network error occurred. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Swimming reservation handler
  const handleConfirmSwimmingReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swimmingBookingTarget) return;

    if (!formName.trim() || !formPhone.trim()) {
      setFormError(isHindi ? 'कृपया अपना पूरा नाम और फोन नंबर दर्ज करें।' : 'Please enter your full name and phone number.');
      return;
    }

    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError(isHindi ? 'कृपया 10 अंकों का मान्य फोन नंबर दर्ज करें।' : 'Please enter a valid 10-digit phone number.');
      return;
    }

    const totalAmount = swimmingBookingTarget.price * playerCount;

    try {
      setSubmitting(true);
      setFormError('');

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: 'swimming',
          resourceId: swimmingBookingTarget.id,
          resourceName: swimmingBookingTarget.title,
          date: selectedDate,
          timeRange: swimmingBookingTarget.timeRange,
          userName: formName.trim(),
          userPhone: formPhone.trim(),
          ...(formEmail.trim() ? { userEmail: formEmail.trim() } : {}),
          playerCount: playerCount,
          experienceLevel: experience,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          amountPaid: totalAmount,
          paymentStatus: 'PENDING_VERIFICATION',
          ...(paymentScreenshot ? { paymentScreenshot } : {}),
          ...(transactionId.trim() ? { transactionId: transactionId.trim() } : {}),
          paymentMethod: 'UPI_QR',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to confirm swimming booking.');
        return;
      }

      setConfirmedBooking(data.booking);
      setSwimmingBookingTarget(null);
      fetchAvailability();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset all booking selections and state
  const handleResetBooking = () => {
    setConfirmedBooking(null);
    setSelectedNetId('');
    setSelectedSlotId('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setPlayerCount(1);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setNotes('');
    setPaymentScreenshot('');
    setTransactionId('');
    setFormError('');
    setSwimmingBookingTarget(null);
  };

  const handleBackAndReset = () => {
    handleResetBooking();
    onBack?.();
  };

  // Format date helper
  const formatReadableDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <section
      id="booking-system"
      className="relative w-full pt-28 pb-20 sm:pt-32 sm:pb-28 bg-[#FAF8F5] text-[#2C1A0E] border-t border-neutral-200 scroll-mt-10 font-sans min-h-[calc(100vh-140px)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        {/* Navigation Breadcrumb / Back Button */}
        {onBack && (
          <div className="mb-6 flex items-center justify-between">
            <button
              id="booking-back-home-btn"
              type="button"
              onClick={handleBackAndReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-[#2C1A0E] text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#8C5A32] group-hover:-translate-x-1 transition-transform" />
              <span>{isHindi ? '← मुख्य पृष्ठ (होम)' : '← Back to Home'}</span>
            </button>

            <span className="text-xs font-semibold text-neutral-500">
              {sport === 'bigbox'
                ? (isHindi ? 'बिग बॉक्स टर्फ़ बुकिंग' : 'Big Box Turf Booking')
                : sport === 'cricket'
                ? (isHindi ? 'क्रिकेट प्रैक्टिस नेट्स बुकिंग' : 'Cricket Practice Nets Booking')
                : (isHindi ? 'स्विमिंग लैन्स बुकिंग' : 'Swimming Lanes Booking')}
            </span>
          </div>
        )}

        {/* AFTER RESERVATION: PREVIOUS SELECTED TAB & FORMS ARE COMPLETELY UNVISIBLE */}
        {confirmedBooking ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="max-w-2xl mx-auto bg-white border border-emerald-500/30 p-6 sm:p-10 shadow-2xl text-[#2C1A0E] rounded-3xl"
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-600 text-white mx-auto flex items-center justify-center rounded-full shadow-lg ring-8 ring-emerald-100">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isHindi ? 'आरक्षण सफलतापूर्वक दर्ज' : 'Reservation Confirmed & Saved'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2C1A0E]">
                {isHindi ? 'डिजिटल प्रवेश पास' : 'Official Access Pass'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
                {isHindi
                  ? 'कुचामन स्पोर्ट्स एकेडमी में आपका स्लॉट सुरक्षित हो चुका है। कृपया इस पास को रिसेप्शन पर दिखाएं।'
                  : 'Your reservation has been secured in the academy system. Present this pass at the academy reception.'}
              </p>
            </div>

            {/* Digital Pass Representation */}
            <div className="mt-8 p-6 bg-[#FAF8F5] border border-neutral-200 relative overflow-hidden space-y-4 rounded-2xl shadow-xs">
              <div className="flex justify-between items-start border-b border-neutral-200 pb-3">
                <div>
                  <div className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium">
                    {isHindi ? 'बुकिंग संदर्भ आईडी' : 'Booking Reference ID'}
                  </div>
                  <div className="text-lg font-mono font-extrabold text-[#8C5A32]">
                    {confirmedBooking.id}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium">
                    {isHindi ? 'खेल / सुविधा' : 'Sport / Facility'}
                  </div>
                  <div className="text-xs font-bold uppercase text-[#2C1A0E] px-2.5 py-1 bg-white border border-neutral-200 rounded-md">
                    {confirmedBooking.sport === 'cricket'
                      ? (isHindi ? '🏏 क्रिकेट टर्फ़' : '🏏 CRICKET TURF')
                      : (isHindi ? '🏊‍♂️ स्विमिंग पूल' : '🏊‍♂️ SWIMMING POOL')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 block font-medium">
                    {isHindi ? 'खिलाड़ी का नाम' : 'Athlete Name'}
                  </span>
                  <span className="font-bold text-[#2C1A0E] text-sm">{confirmedBooking.userName}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block font-medium">
                    {isHindi ? 'फोन नंबर' : 'Phone'}
                  </span>
                  <span className="font-semibold text-neutral-700">{confirmedBooking.userPhone}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block font-medium">
                    {isHindi ? 'आरक्षित सुविधा / नेट' : 'Resource / Net'}
                  </span>
                  <span className="font-bold text-[#2C1A0E]">{confirmedBooking.resourceName}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block font-medium">
                    {isHindi ? 'दिनांक व समय' : 'Date & Time'}
                  </span>
                  <span className="font-semibold text-[#8C5A32]">
                    {confirmedBooking.date} • {confirmedBooking.timeRange}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 block font-medium">
                    {isHindi ? 'खिलाड़ी संख्या' : 'Player Count'}
                  </span>
                  <span className="font-bold text-[#2C1A0E]">
                    {confirmedBooking.playerCount} {confirmedBooking.playerCount === 1 ? 'Player' : 'Players'}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 block font-medium">
                    {isHindi ? 'आरक्षण शुल्क' : 'Reservation Fee'}
                  </span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ₹{confirmedBooking.amountPaid || (confirmedBooking.playerCount * 100)}{' '}
                    <span className="text-[10px] text-neutral-500 font-normal">
                      {confirmedBooking.resourceId === 'net-big-box' || confirmedBooking.resourceName?.toUpperCase().includes('BIG BOX')
                        ? (isHindi ? '(पूरा टर्फ़ आरक्षण)' : '(Full Arena Booking)')
                        : `(₹100 ${isHindi ? 'प्रति व्यक्ति' : '/ person'})`}
                    </span>
                  </span>
                </div>
              </div>

              {/* QR Presentation */}
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-neutral-600">
                  <QrCode className="w-10 h-10 text-[#8C5A32] shrink-0" />
                  <span>
                    {isHindi
                      ? 'यह डिजिटल पास एकेडमी के रिसेप्शन काउंटर पर दिखाकर मैदान में प्रवेश करें।'
                      : 'Present this digital pass at the academy reception desk for direct entry.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3.5 bg-[#2C1A0E] hover:bg-[#8C5A32] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-xl shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isHindi ? 'पास सहेजें / प्रिंट करें' : 'Save / Print Pass'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetBooking}
                className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-[#2C1A0E] text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isHindi ? 'नई बुकिंग करें' : 'Book Another Slot'}</span>
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={handleBackAndReset}
                  className="py-3.5 px-5 bg-white hover:bg-neutral-100 border border-neutral-200 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-700 cursor-pointer rounded-xl transition-colors"
                >
                  {isHindi ? 'मुख्य पृष्ठ' : 'Home'}
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <div>
            {/* Terminal Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8C5A32]/10 text-[#8C5A32] text-xs font-semibold tracking-wide uppercase mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#8C5A32] animate-pulse" />
                  {isHindi ? 'लाइव रिजर्वेशन टर्मिनल' : 'Live Reservation Terminal'}
                </div>

                <h2 className="text-2xl sm:text-4xl font-bold text-[#2C1A0E] tracking-tight">
                  {sport === 'bigbox'
                    ? (isHindi ? 'बिग बॉक्स टर्फ़ बुकिंग' : 'Big Box Turf Reservation')
                    : sport === 'cricket'
                    ? (isHindi ? 'प्रैक्टिस नेट्स बुकिंग' : 'Practice Nets Reservation')
                    : (isHindi ? 'स्विमिंग पूल सेशन्स बुकिंग' : 'Swimming Sessions Reservation')}
                </h2>
                <p className="text-sm sm:text-base text-neutral-600 mt-1.5 max-w-2xl">
                  {sport === 'bigbox'
                    ? (isHindi
                        ? 'क्रिकेट, फुटबॉल व हॉकी हेतु बिग बॉक्स टर्फ़: अवधि चुनें और पूरा टर्फ़ आरक्षित करें (निश्चित शुल्क, प्रति व्यक्ति नहीं)।'
                        : 'Cricket, Football & Hockey Big Box Turf: Choose duration & start time to book the full arena (fixed total price, not per player).')
                    : sport === 'cricket'
                    ? (isHindi
                        ? '4 प्रैक्टिस नेट्स में से अपना नेट चुनें, दिनांक और समय चुनें (अधिकतम 4 खिलाड़ी, ₹100 प्रति व्यक्ति)।'
                        : 'Select your practice net, choose date & time, specify players (max 4 players, ₹100 per person).')
                    : (isHindi
                        ? 'ओलंपिक-ग्रेड स्विमिंग पूल में अपना तैराकी स्लॉट आरक्षित करें।'
                        : 'Reserve your lane in our semi-Olympic training pool with certified lifeguards.')}
                </p>
              </div>

              {/* Sport Selector Toggle (3 Options: Big Box, Practice Nets, Swimming) */}
              <div className="flex items-center gap-1.5 p-1 bg-white border border-neutral-200 shadow-xs self-start md:self-auto rounded-xl flex-wrap">
                <button
                  id="tab-bigbox-slots"
                  onClick={() => {
                    setSport('bigbox');
                    setSelectedSlotId('');
                  }}
                  className={`px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer rounded-lg ${
                    sport === 'bigbox'
                      ? 'bg-[#2C1A0E] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-[#2C1A0E] hover:bg-neutral-50'
                  }`}
                >
                  {isHindi ? 'बिग बॉक्स टर्फ़' : 'Big Box Turf'}
                </button>
                <button
                  id="tab-cricket-slots"
                  onClick={() => {
                    setSport('cricket');
                    setSelectedSlotId('');
                  }}
                  className={`px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer rounded-lg ${
                    sport === 'cricket'
                      ? 'bg-[#2C1A0E] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-[#2C1A0E] hover:bg-neutral-50'
                  }`}
                >
                  {isHindi ? 'प्रैक्टिस नेट्स' : 'Practice Nets'}
                </button>
                <button
                  id="tab-swimming-slots"
                  onClick={() => {
                    setSport('swimming');
                    setSelectedSlotId('');
                  }}
                  className={`px-4 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer rounded-lg ${
                    sport === 'swimming'
                      ? 'bg-[#2C1A0E] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-[#2C1A0E] hover:bg-neutral-50'
                  }`}
                >
                  {isHindi ? 'स्विमिंग पूल' : 'Swimming Pool'}
                </button>
              </div>
            </div>

            {/* CRICKET & BIG BOX: Progressive Step-by-Step Selection Flow */}
            {sport === 'cricket' || sport === 'bigbox' ? (
              <div className="space-y-6">
                {/* Step Progress Bar */}
                <div className="bg-white border border-neutral-200/80 p-3 sm:p-4 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs pb-1 sm:pb-0 scrollbar-none">
                    {/* Step 1 Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        if (sport !== 'bigbox') setSelectedNetId('');
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        sport === 'bigbox'
                          ? 'bg-neutral-100 text-neutral-800 cursor-default'
                          : !selectedNetId
                          ? 'bg-[#2C1A0E] text-white font-semibold shadow-xs cursor-pointer'
                          : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        !selectedNetId && sport !== 'bigbox' ? 'bg-white text-[#2C1A0E]' : 'bg-[#8C5A32] text-white'
                      }`}>
                        {selectedNetId ? '✓' : '1'}
                      </span>
                      <span>
                        {sport === 'bigbox'
                          ? (isHindi ? '1. बिग बॉक्स टर्फ़' : '1. Big Box Turf')
                          : (isHindi ? '1. क्रिकेट नेट' : '1. Cricket Net')}
                      </span>
                      {activeNet && (
                        <span className="text-[11px] font-semibold text-[#8C5A32]">
                          ({sport === 'bigbox' ? 'BIG BOX' : activeNet.name?.split('—')[0].trim()})
                        </span>
                      )}
                    </button>

                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />

                    {/* Step 2 Pill */}
                    <button
                      type="button"
                      disabled={!selectedNetId}
                      onClick={() => setSelectedSlotId('')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        !selectedNetId
                          ? 'text-neutral-400 cursor-not-allowed opacity-60'
                          : selectedNetId && !selectedSlotId
                          ? 'bg-[#2C1A0E] text-white font-semibold shadow-xs cursor-pointer'
                          : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        selectedSlotId ? 'bg-[#8C5A32] text-white' : selectedNetId ? 'bg-white text-[#2C1A0E]' : 'bg-neutral-300 text-neutral-600'
                      }`}>
                        {selectedSlotId ? '✓' : '2'}
                      </span>
                      <span>{isHindi ? '2. दिनांक' : '2. Date'}</span>
                      {selectedNetId && (
                        <span className="text-[11px] font-semibold text-[#8C5A32]">
                          ({selectedDate})
                        </span>
                      )}
                    </button>

                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />

                    {/* Step 3 Pill */}
                    <button
                      type="button"
                      disabled={!selectedNetId}
                      onClick={() => setSelectedSlotId('')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        !selectedNetId
                          ? 'text-neutral-400 cursor-not-allowed opacity-60'
                          : selectedSlotId
                          ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer'
                          : 'bg-[#2C1A0E] text-white font-semibold shadow-xs cursor-pointer'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        selectedSlotId ? 'bg-[#8C5A32] text-white' : 'bg-neutral-300 text-neutral-600'
                      }`}>
                        {selectedSlotId ? '✓' : '3'}
                      </span>
                      <span>
                        {sport === 'bigbox'
                          ? (isHindi ? '3. अवधि व स्लॉट' : '3. Duration & Slot')
                          : (isHindi ? '3. समय स्लॉट' : '3. Time Slot')}
                      </span>
                      {activeSlot && (
                        <span className="text-[11px] font-semibold text-[#8C5A32]">
                          ({activeSlot.startTime})
                        </span>
                      )}
                    </button>

                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />

                    {/* Step 4 Pill */}
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
                        activeSlot
                          ? 'bg-[#2C1A0E] text-white font-semibold shadow-xs'
                          : 'text-neutral-400 opacity-60'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        activeSlot ? 'bg-white text-[#2C1A0E]' : 'bg-neutral-300 text-neutral-600'
                      }`}>
                        4
                      </span>
                      <span>{isHindi ? '4. खिलाड़ी व विवरण' : '4. Players & Details'}</span>
                      {activeSlot && (
                        <span className="text-[11px] font-semibold text-emerald-300">
                          (₹{totalCricketFee})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* STEP 1: CRICKET / BIG BOX NET SELECTION */}
                <div className="bg-white border border-neutral-200 p-5 sm:p-7 rounded-2xl shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#2C1A0E] text-white flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A0E]">
                          {sport === 'bigbox'
                            ? (isHindi ? 'चरण 1: बिग बॉक्स टर्फ़ एरिना' : 'Step 1: Big Box Turf Arena')
                            : (isHindi ? 'चरण 1: अपना प्रैक्टिस नेट चुनें' : 'Step 1: Select Practice Net')}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 pl-8">
                        {sport === 'bigbox'
                          ? (isHindi
                              ? 'क्रिकेट / फुटबॉल / हॉकी मैचों हेतु 1 विशेष Big Box Turf Net। असीमित खिलाड़ी • पूरी बुकिंग का निश्चित शुल्क।'
                              : '1 dedicated Big Box Turf arena for cricket, football and hockey matches. Flat booking fee for the entire arena.')
                          : (isHindi
                              ? '4 प्रैक्टिस नेट्स (अधिकतम 4 खिलाड़ी प्रति नेट)। शुल्क: ₹100 प्रति व्यक्ति।'
                              : 'Choose from 4 practice nets (maximum 4 players per net). Fee: ₹100 per person.')}
                      </p>
                    </div>

                    {activeNet && sport !== 'bigbox' && (
                      <button
                        type="button"
                        onClick={() => setSelectedNetId('')}
                        className="self-start sm:self-auto text-xs font-semibold text-[#8C5A32] hover:text-[#2C1A0E] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isHindi ? 'नेट बदलें' : 'Change Net'}</span>
                      </button>
                    )}
                  </div>

                  {/* Facility Cards: Big Box shows ONLY Big Box; Cricket shows ONLY 4 Practice Nets */}
                  <div className={`grid gap-4 ${
                    sport === 'bigbox'
                      ? 'grid-cols-1 max-w-xl mx-auto'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  }`}>
                    {visibleNets.map((net) => {
                      const isSelected = selectedNetId === net.id || sport === 'bigbox';
                      const isBigBox = Boolean(
                        sport === 'bigbox' ||
                        net.isBigBox ||
                        net.name?.toUpperCase().includes('BIG BOX') ||
                        net.code === 'BOX-CRICKET' ||
                        net.code === 'BOX-TURF' ||
                        net.id === 'net-big-box'
                      );

                      return (
                        <motion.div
                          key={net.id}
                          onClick={() => handleSelectNet(net.id)}
                          whileHover={{ y: -4, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                            isSelected
                              ? 'border-[#2C1A0E] bg-amber-50/40 shadow-md ring-2 ring-[#2C1A0E]/10'
                              : isBigBox
                              ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/60 to-white hover:border-[#8C5A32] shadow-xs'
                              : 'border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-xs'
                          }`}
                        >
                          {/* Special highlight badge for BIG BOX */}
                          {isBigBox && (
                            <div className="absolute -top-3 left-4 bg-amber-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-200" />
                              <span>{isHindi ? 'विशेष एरिना • केवल 1 बिग बॉक्स' : 'EXCLUSIVE ARENA • 1 BIG BOX ONLY'}</span>
                            </div>
                          )}

                          <div>
                            {/* Header: Code & Type */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-[#8C5A32]">
                                {net.code}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md">
                                {net.turfType}
                              </span>
                            </div>

                            {/* Net Name */}
                            <h4 className="text-base sm:text-lg font-bold text-[#2C1A0E]">
                              {net.name}
                            </h4>

                            {/* Description */}
                            <p className="text-xs text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                              {net.description}
                            </p>
                          </div>

                          {/* Footer: Capacity Rule & Pricing */}
                          <div className="mt-5 pt-3 border-t border-neutral-100 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-500 font-medium">
                                {isHindi ? 'क्षमता:' : 'Capacity:'}
                              </span>
                              <span className={`font-semibold ${isBigBox ? 'text-amber-800' : 'text-[#2C1A0E]'}`}>
                                {isBigBox
                                  ? (isHindi ? 'असीमित खिलाड़ी (पूरी टीम)' : 'Full Team Arena (No Limit)')
                                  : (isHindi ? 'अधिकतम 4 खिलाड़ी' : 'Max 4 Players')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-500 font-medium">
                                {isHindi ? 'शुल्क:' : 'Fee:'}
                              </span>
                              <span className="text-sm font-bold text-[#8C5A32]">
                                {isBigBox ? (
                                  <span>
                                    ₹{activeBigBoxTier.price}{' '}
                                    <span className="text-xs font-normal text-neutral-600">
                                      ({activeBigBoxTier.label} • {isHindi ? 'पूरा टर्फ़' : 'Flat Booking'})
                                    </span>
                                  </span>
                                ) : (
                                  <span>
                                    ₹100 <span className="text-xs font-normal text-neutral-600">/ {isHindi ? 'व्यक्ति' : 'person'}</span>
                                  </span>
                                )}
                              </span>
                            </div>

                            <button
                              type="button"
                              className={`w-full mt-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#2C1A0E] text-white shadow-xs'
                                  : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  <span>{isHindi ? 'चयनित (Selected)' : 'Selected'}</span>
                                </>
                              ) : (
                                <span>{isHindi ? 'यह नेट चुनें' : 'Select Net'}</span>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

            {/* STEP 2: DATE SELECTION (Revealed only after Net is selected) */}
            <AnimatePresence>
              {selectedNetId && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-neutral-200 p-5 sm:p-7 rounded-2xl shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#2C1A0E] text-white flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A0E]">
                          {isHindi ? 'चरण 2: अभ्यास की तारीख चुनें' : 'Step 2: Choose Practice Date'}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 pl-8">
                        {isHindi
                          ? `चयनित नेट: ${activeNet?.name} • अभ्यास हेतु वांछित दिन का चयन करें।`
                          : `Selected Net: ${activeNet?.name} • Choose from the next 12 days or pick a custom date.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={fetchAvailability}
                        className="text-xs font-semibold text-[#8C5A32] hover:text-[#2C1A0E] flex items-center gap-1.5 cursor-pointer transition-colors"
                        title={isHindi ? 'ताज़ा करें' : 'Refresh availability'}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>{isHindi ? 'ताज़ा करें' : 'Refresh'}</span>
                      </button>

                      {/* Explicit Date Picker Input */}
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleSelectDate(e.target.value)}
                        className="text-xs font-medium px-3 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:border-[#2C1A0E]"
                      />
                    </div>
                  </div>

                  {/* Horizontal Interactive Date Chips */}
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {availableDates.map((item) => {
                      const isSelected = selectedDate === item.iso;
                      return (
                        <motion.button
                          key={item.iso}
                          onClick={() => handleSelectDate(item.iso)}
                          whileHover={{ scale: 1.04, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className={`flex-shrink-0 px-4 py-3 border text-center transition-all cursor-pointer min-w-[90px] rounded-xl ${
                            isSelected
                              ? 'bg-[#2C1A0E] border-[#2C1A0E] text-white shadow-md font-semibold'
                              : 'bg-neutral-50/80 border-neutral-200 text-neutral-700 hover:border-[#8C5A32]/60 hover:bg-white'
                          }`}
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-wider">
                            {item.isToday ? (isHindi ? 'आज' : 'TODAY') : item.dayName}
                          </div>
                          <div className={`text-2xl font-bold my-1 ${isSelected ? 'text-white' : 'text-[#2C1A0E]'}`}>
                            {item.dayNumber}
                          </div>
                          <div className={`text-xs font-medium uppercase tracking-wide ${isSelected ? 'text-white/80' : 'text-neutral-500'}`}>
                            {item.monthName}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 3: TIME SLOT SELECTION (Revealed only after Net & Date are selected) */}
            <AnimatePresence>
              {selectedNetId && selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-neutral-200 p-5 sm:p-7 rounded-2xl shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#2C1A0E] text-white flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A0E]">
                          {isHindi ? 'चरण 3: समय स्लॉट चुनें' : 'Step 3: Select Time Slot'}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 pl-8">
                        {isHindi
                          ? `तारीख: ${formatReadableDate(selectedDate)} • नेट: ${activeNet?.name}`
                          : `Date: ${formatReadableDate(selectedDate)} • Net: ${activeNet?.name}`}
                      </p>
                    </div>

                    {activeSlot && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlotId('')}
                        className="self-start sm:self-auto text-xs font-semibold text-[#8C5A32] hover:text-[#2C1A0E] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isHindi ? 'समय बदलें' : 'Change Time'}</span>
                      </button>
                    )}
                  </div>

                  {/* ADMIN CONTROLLED DURATION SELECTOR FOR BIG BOX */}
                  {isBigBoxNet && (
                    <div className="mb-6 p-4 sm:p-5 rounded-xl bg-[#FAF8F5] border border-amber-200/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <span className="text-xs font-bold text-[#8C5A32] uppercase tracking-wider block">
                            {isHindi ? 'बिग बॉक्स अवधि व दर (Admin Controlled Duration)' : 'Big Box Duration & Rates'}
                          </span>
                          <p className="text-xs text-neutral-600 mt-0.5">
                            {isHindi
                              ? 'वांछित अवधि चुनें। कीमत पूरी बुकिंग की है, प्रति खिलाड़ी नहीं।'
                              : 'Choose booking duration. Pricing is for the full arena, not per player.'}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold self-start sm:self-auto">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>{activeBigBoxTier.label} = ₹{activeBigBoxTier.price}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {bigBoxTiers.map((tier) => {
                          const isTierSelected = activeBigBoxTier.id === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setSelectedDurationTierId(tier.id)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isTierSelected
                                  ? 'bg-[#2C1A0E] border-[#2C1A0E] text-white shadow-sm ring-2 ring-[#8C5A32]/20'
                                  : 'bg-white border-neutral-200 text-neutral-800 hover:border-amber-400 hover:bg-amber-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isTierSelected ? 'text-amber-300' : 'text-neutral-600'}`}>
                                  {tier.label}
                                </span>
                                {isTierSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />}
                              </div>
                              <div className={`text-base sm:text-lg font-extrabold mt-1 ${isTierSelected ? 'text-white' : 'text-[#8C5A32]'}`}>
                                ₹{tier.price}
                              </div>
                              <div className={`text-[10px] mt-0.5 ${isTierSelected ? 'text-white/80' : 'text-neutral-500'}`}>
                                {isHindi ? 'पूरा टर्फ़ (Fixed Total)' : 'Total Booking'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="p-10 text-center text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#8C5A32]" />
                      <span className="text-xs font-medium">{isHindi ? 'स्लॉट लोड हो रहे हैं...' : 'Loading time slots...'}</span>
                    </div>
                  ) : netSlots.length === 0 ? (
                    <div className="p-10 text-center text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl">
                      <span className="text-xs font-medium">
                        {isHindi ? 'इस तारीख के लिए कोई स्लॉट सक्रिय नहीं है।' : 'No slots active for this date.'}
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {netSlots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id;
                        const isClosed = slot.status === 'CLOSED';
                        const isFull = !isBigBoxNet && (slot.status === 'FULL' || slot.remaining <= 0);

                        return (
                          <motion.div
                            key={slot.id}
                            onClick={() => !isClosed && !isFull && handleSelectSlot(slot)}
                            whileHover={!isClosed && !isFull ? { y: -3, scale: 1.01 } : undefined}
                            whileTap={!isClosed && !isFull ? { scale: 0.98 } : undefined}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            className={`p-4 border rounded-xl transition-all flex flex-col justify-between ${
                              isClosed
                                ? 'bg-neutral-100 border-neutral-200 opacity-50 cursor-not-allowed'
                                : isFull
                                ? 'bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-amber-50/50 border-[#2C1A0E] shadow-sm ring-2 ring-[#2C1A0E]/10 cursor-pointer'
                                : 'bg-neutral-50/60 border-neutral-200 hover:border-[#8C5A32] hover:bg-white cursor-pointer shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#8C5A32]" />
                                  <span>{slot.startTime.includes('AM') ? (isHindi ? 'सुबह' : 'Morning') : (isHindi ? 'शाम' : 'Evening')}</span>
                                </span>

                                {/* Status badge */}
                                {isClosed ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md">
                                    {isHindi ? 'बंद' : 'Closed'}
                                  </span>
                                ) : isFull ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-md">
                                    {isHindi ? 'फुल' : 'Full'}
                                  </span>
                                ) : isBigBoxNet ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                                    {isHindi ? 'ओपन एरिना' : 'Open Arena'}
                                  </span>
                                ) : slot.remaining <= 2 ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-md">
                                    {slot.remaining} {isHindi ? 'स्थान शेष' : 'spots left'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                    {isHindi ? 'उपलब्ध' : 'Available'}
                                  </span>
                                )}
                              </div>

                              <div className="text-base font-bold text-[#2C1A0E]">
                                {slot.timeRange}
                              </div>

                              <div className="text-xs text-neutral-600 mt-1">
                                {isBigBoxNet ? (
                                  <span className="text-amber-800 font-medium">
                                    {isHindi ? `पूरा टर्फ़ आरक्षित • ${activeBigBoxTier.label}` : `Full Arena • ${activeBigBoxTier.label}`}
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 font-medium">
                                    {isHindi ? 'अधिकतम 4 खिलाड़ी' : 'Max 4 players allowed'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                              <span className="font-bold text-[#8C5A32]">
                                {isBigBoxNet ? (
                                  <span>
                                    ₹{activeBigBoxTier.price}{' '}
                                    <span className="text-[11px] font-normal text-neutral-500">
                                      ({activeBigBoxTier.label} • {isHindi ? 'पूरा टर्फ़' : 'Full Arena'})
                                    </span>
                                  </span>
                                ) : (
                                  <span>
                                    ₹100 <span className="text-[11px] font-normal text-neutral-500">/ {isHindi ? 'व्यक्ति' : 'person'}</span>
                                  </span>
                                )}
                              </span>

                              <button
                                type="button"
                                disabled={isClosed || isFull}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-[#2C1A0E] text-white shadow-xs'
                                    : isClosed || isFull
                                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                                    : 'bg-white border border-neutral-300 text-neutral-800 hover:bg-[#2C1A0E] hover:text-white'
                                }`}
                              >
                                {isSelected ? (isHindi ? 'चयनित' : 'Selected') : (isHindi ? 'चुनें' : 'Select')}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 4: PLAYERS SELECTION & DYNAMIC FEE CALCULATION (Revealed once slot is selected) */}
            <AnimatePresence>
              {activeSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-neutral-200 p-5 sm:p-7 rounded-2xl shadow-xs space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#2C1A0E] text-white flex items-center justify-center text-xs font-bold">
                          4
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A0E]">
                          {isHindi ? 'चरण 4: खिलाड़ियों की संख्या एवं आरक्षण शुल्क' : 'Step 4: Number of Players & Reservation Fee'}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-600 mt-1 pl-8">
                        {isBigBoxNet
                          ? (isHindi
                              ? `BIG BOX: पूरी बुकिंग का निश्चित शुल्क ₹${activeBigBoxTier.price} (${activeBigBoxTier.label}) है। खिलाड़ियों की संख्या बदलने पर कीमत नहीं बदलेगी।`
                              : `BIG BOX: Flat rate ₹${activeBigBoxTier.price} (${activeBigBoxTier.label}) for the whole booking. Player count does not affect price.`)
                          : (isHindi
                              ? 'नियमित नेट: एक समय में अधिकतम 4 खिलाड़ी ही खेल सकते हैं। शुल्क: ₹100 प्रति व्यक्ति।'
                              : 'Regular Net: Maximum 4 players at the same time. Fee: ₹100 per person.')}
                      </p>
                    </div>
                  </div>

                  {/* Player Count Control */}
                  <div className="bg-[#FAF8F5] border border-neutral-200 p-5 sm:p-6 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#2C1A0E] uppercase tracking-wider mb-1">
                          {isHindi ? 'कुल खिलाड़ी (खिलाड़ी जानकारी हेतु)' : 'Participating Players (Team Info)'}
                        </label>
                        <span className="text-xs text-neutral-600">
                          {isBigBoxNet
                            ? (isHindi ? `पूरी टीम के खिलाड़ी जोड़ें (शुल्क निश्चित ₹${activeBigBoxTier.price} रहेगा)` : `Add participating players (price stays flat at ₹${activeBigBoxTier.price})`)
                            : (isHindi ? 'नियमित नेट सीमा: 1 से 4 खिलाड़ी' : 'Regular net limit: 1 to 4 players')}
                        </span>
                      </div>

                      {/* Number Selector / Stepper */}
                      {isBigBoxNet ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handlePlayerCountChange(playerCount - 1)}
                            disabled={playerCount <= 1}
                            className="w-10 h-10 rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center font-bold text-lg disabled:opacity-40 cursor-pointer shadow-xs"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <div className="flex items-center bg-white border border-neutral-300 rounded-lg px-4 py-2 shadow-xs">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={playerCount}
                              onChange={(e) => handlePlayerCountChange(Number(e.target.value) || 1)}
                              className="w-14 text-center font-bold text-xl text-[#2C1A0E] focus:outline-none"
                            />
                            <span className="text-xs text-neutral-500 font-medium ml-1">
                              {isHindi ? 'खिलाड़ी' : 'players'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePlayerCountChange(playerCount + 1)}
                            className="w-10 h-10 rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center font-bold text-lg cursor-pointer shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4].map((num) => {
                            const isSelected = playerCount === num;
                            const isExceedingSlot = activeSlot && num > activeSlot.remaining;

                            return (
                              <button
                                key={num}
                                type="button"
                                disabled={isExceedingSlot}
                                onClick={() => handlePlayerCountChange(num)}
                                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#2C1A0E] text-white shadow-sm'
                                    : isExceedingSlot
                                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                    : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                                }`}
                              >
                                {num} {num === 1 ? (isHindi ? 'खिलाड़ी' : 'Player') : (isHindi ? 'खिलाड़ी' : 'Players')}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Player Count Buttons for BIG BOX */}
                    {isBigBoxNet && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200/80">
                        <span className="text-xs text-neutral-500 font-medium">
                          {isHindi ? 'त्वरित चयन:' : 'Quick Select:'}
                        </span>
                        {[2, 4, 6, 8, 10, 12, 14, 16, 20].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handlePlayerCountChange(num)}
                            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                              playerCount === num
                                ? 'bg-[#2C1A0E] text-white'
                                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* DYNAMIC FEE CALCULATION DISPLAY */}
                    <div className="bg-white border border-neutral-200 p-4 sm:p-5 rounded-xl shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                            {isHindi ? 'शुल्क गणना (Admin Configured Pricing)' : 'Price Breakdown'}
                          </span>
                          {isBigBoxNet ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 text-sm text-neutral-800 font-bold">
                                <span>Big Box Turf ({activeBigBoxTier.label})</span>
                                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  {isHindi ? 'निश्चित कुल शुल्क' : 'Flat Booking Rate'}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500">
                                {isHindi
                                  ? `${playerCount} खिलाड़ी खेल रहे हैं • कुल शुल्क ₹${activeBigBoxTier.price} ही रहेगा (खिलाड़ी संख्या से कीमत नहीं बदलेगी)`
                                  : `${playerCount} players participating • Total charge remains ₹${activeBigBoxTier.price} regardless of player count`}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-neutral-700 font-medium">
                              <span>₹100 ({isHindi ? 'प्रति व्यक्ति' : 'per person'})</span>
                              <span>×</span>
                              <span>{playerCount} {playerCount === 1 ? (isHindi ? 'खिलाड़ी' : 'player') : (isHindi ? 'खिलाड़ी' : 'players')}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-xs text-neutral-500 font-medium block">
                            {isHindi ? 'कुल देय राशि (Total Amount)' : 'Total Reservation Fee'}
                          </span>
                          <span className="text-2xl sm:text-3xl font-extrabold text-[#8C5A32]">
                            ₹{totalCricketFee}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 5: ATHLETE DETAILS & PAYMENT FORM */}
                  <form onSubmit={handleConfirmCricketReservation} className="space-y-6 pt-2">
                    <div className="border-t border-neutral-100 pt-6">
                      <h4 className="text-base font-bold text-[#2C1A0E] mb-4">
                        {isHindi ? 'खिलाड़ी / संपर्क जानकारी' : 'Athlete Contact Information'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? 'पूरा नाम *' : 'Full Name *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder={isHindi ? 'उदा. रोहित शर्मा' : 'e.g. Rohit Sharma'}
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-[#2C1A0E] focus:outline-none focus:border-[#2C1A0E] focus:bg-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? 'मोबाइल नंबर (10 अंक) *' : 'Phone Number (10 digits) *'}
                          </label>
                          <input
                            type="tel"
                            required
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            placeholder="98290XXXXX"
                            maxLength={14}
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-[#2C1A0E] focus:outline-none focus:border-[#2C1A0E] focus:bg-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? 'ईमेल आईडी (वैकल्पिक)' : 'Email Address (Optional)'}
                          </label>
                          <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="rohit@gmail.com"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-[#2C1A0E] focus:outline-none focus:border-[#2C1A0E] focus:bg-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? 'कौशल स्तर' : 'Playing Level'}
                          </label>
                          <select
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-[#2C1A0E] focus:outline-none focus:border-[#2C1A0E] focus:bg-white transition-colors"
                          >
                            <option value="Beginner">{isHindi ? 'शुरुआती (Beginner)' : 'Beginner'}</option>
                            <option value="Intermediate">{isHindi ? 'मध्यम (Intermediate Club)' : 'Intermediate'}</option>
                            <option value="Advanced">{isHindi ? 'उन्नत (Tournament / District)' : 'Advanced'}</option>
                            <option value="Pro / State Athlete">{isHindi ? 'प्रो / स्टेट खिलाड़ी (State Level)' : 'Pro / State Athlete'}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? 'विशेष अभ्यास निर्देश या नोट्स (वैकल्पिक)' : 'Special Training Notes (Optional)'}
                          </label>
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={isHindi ? 'उदा. तेज गेंदबाजी अभ्यास / स्ट्रोक प्ले' : 'e.g. Pace bowling practice / Match situation simulation'}
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-[#2C1A0E] focus:outline-none focus:border-[#2C1A0E] focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PAYMENT SECTION: UPI QR & Details */}
                    <div className="p-5 sm:p-6 bg-[#FAF4ED] border border-[#8C5A32]/30 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#2C1A0E]">
                          <CreditCard className="w-4 h-4 text-[#8C5A32]" />
                          <span>{isHindi ? 'UPI भुगतान एवं QR कोड' : 'UPI Payment & QR Code'}</span>
                        </div>
                        <span className="text-sm font-bold text-[#8C5A32] bg-white px-3 py-1 border border-[#8C5A32]/20 rounded-lg shadow-xs">
                          {isHindi ? 'देय राशि:' : 'Amount Due:'} ₹{totalCricketFee}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-4 border border-neutral-200 rounded-xl">
                        {/* QR Code Display */}
                        <div className="w-36 h-36 bg-white border border-neutral-300 p-2 rounded-xl flex-shrink-0 flex items-center justify-center relative shadow-xs">
                          {ownerConfig?.upiQrCodeUrl ? (
                            <img
                              src={ownerConfig.upiQrCodeUrl}
                              alt="KSA UPI QR Code"
                              className="w-full h-full object-contain rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center text-center p-2 rounded-lg">
                              <QrCode className="w-12 h-12 text-[#8C5A32]" />
                              <span className="text-[10px] text-neutral-600 mt-1 font-bold">KSA OFFICIAL UPI</span>
                            </div>
                          )}
                        </div>

                        {/* UPI Details & 1-Click Copy */}
                        <div className="flex-1 space-y-3 text-xs w-full">
                          <div>
                            <span className="text-neutral-500 block font-medium">
                              {isHindi ? 'खाता धारक (Payee Name)' : 'Account Holder'}
                            </span>
                            <span className="text-sm font-bold text-[#2C1A0E]">
                              {ownerConfig?.upiAccountName || 'Kuchaman Sports Academy'}
                            </span>
                          </div>

                          <div>
                            <span className="text-neutral-500 block font-medium">
                              {isHindi ? 'यूपीआई आईडी (UPI ID)' : 'Official UPI ID'}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="bg-neutral-100 px-3 py-1.5 border border-neutral-300 font-mono text-xs text-[#8C5A32] font-bold rounded-lg flex-1 truncate">
                                {ownerConfig?.upiId || '9829084421@paytm'}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopyUpi}
                                className="px-3 py-1.5 bg-[#2C1A0E] text-white hover:bg-[#8C5A32] text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                              >
                                {copiedUpi ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{isHindi ? 'कॉपी हुआ' : 'Copied'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{isHindi ? 'कॉपी' : 'Copy'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <p className="text-neutral-600 text-[11px] leading-relaxed">
                            {isHindi
                              ? '1. ऊपर दिए गए QR कोड को स्कैन करें अथवा UPI ID पर ₹' + totalCricketFee + ' का भुगतान करें।'
                              : '1. Scan QR code or make UPI payment of ₹' + totalCricketFee + ' to the UPI ID above.'}
                          </p>
                        </div>
                      </div>

                      {/* Payment Proof Upload & UTR */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? '2. भुगतान स्क्रीनशॉट अपलोड करें' : '2. Upload Payment Screenshot'}
                          </label>

                          {paymentScreenshot ? (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg">
                              <img
                                src={paymentScreenshot}
                                alt="Proof Preview"
                                className="w-12 h-12 object-cover border border-emerald-400 rounded shadow-xs"
                              />
                              <div className="flex-1 min-w-0 text-xs">
                                <span className="text-emerald-800 font-bold block flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  {isHindi ? 'रसीद संलग्न' : 'Screenshot Attached'}
                                </span>
                                <span className="text-[11px] text-emerald-700">
                                  {isHindi ? 'सफलतापूर्वक अपलोड' : 'Ready for verification'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPaymentScreenshot('')}
                                className="px-2.5 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 font-semibold rounded cursor-pointer"
                              >
                                {isHindi ? 'हटाएं' : 'Remove'}
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#8C5A32]/40 hover:border-[#8C5A32] bg-white p-3.5 rounded-lg cursor-pointer transition-colors text-center">
                              <Upload className="w-5 h-5 text-[#8C5A32] mb-1" />
                              <span className="text-xs font-semibold text-[#2C1A0E]">
                                {uploadingProof
                                  ? (isHindi ? 'प्रोसेस हो रहा है...' : 'Processing...')
                                  : (isHindi ? 'स्क्रीनशॉट चुनें (PNG, JPG)' : 'Click to Upload Screenshot')}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploadingProof}
                              />
                            </label>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                            {isHindi ? '3. यूपीआई संदर्भ / UTR No. (वैकल्पिक)' : '3. UPI Transaction / UTR No. (Optional)'}
                          </label>
                          <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g. 425312009871"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-[#2C1A0E] focus:outline-none focus:border-[#2C1A0E]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Notice */}
                    {formError && (
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* STEP 6: BOOKING SUMMARY & CONFIRM BUTTON */}
                    <div className="bg-neutral-900 text-white p-5 sm:p-6 rounded-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                        <div>
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                            {isHindi ? 'बुकिंग सारांश' : 'Reservation Summary'}
                          </span>
                          <h4 className="text-lg font-bold text-white mt-0.5">
                            {activeNet?.name || 'Cricket Net'}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 bg-neutral-800 rounded-md text-neutral-300">
                            📅 {formatReadableDate(selectedDate)}
                          </span>
                          <span className="px-2.5 py-1 bg-neutral-800 rounded-md text-neutral-300">
                            ⏰ {activeSlot?.timeRange || ''}
                          </span>
                          <span className="px-2.5 py-1 bg-neutral-800 rounded-md text-amber-300 font-semibold">
                            👥 {playerCount} {playerCount === 1 ? (isHindi ? 'खिलाड़ी' : 'Player') : (isHindi ? 'खिलाड़ी' : 'Players')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div>
                          <div className="text-xs text-neutral-400">
                            {isHindi ? 'कुल आरक्षण शुल्क (Total Payable):' : 'Total Reservation Fee:'}
                          </div>
                          <div className="text-2xl font-extrabold text-white">
                            ₹{totalCricketFee}{' '}
                            <span className="text-xs font-normal text-neutral-400">
                              (₹100 × {playerCount} {isHindi ? 'खिलाड़ी' : 'players'})
                            </span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || uploadingProof}
                          className="px-8 py-3.5 bg-[#8C5A32] hover:bg-[#A36B3D] text-white text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-white" />
                              <span>{isHindi ? 'रिजर्वेशन प्रोसेस हो रहा है...' : 'Confirming Reservation...'}</span>
                            </>
                          ) : (
                            <>
                              <span>{isHindi ? 'आरक्षण कन्फर्म करें' : 'Confirm Reservation'}</span>
                              <ChevronRight className="w-4 h-4 text-white" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* SWIMMING SESSIONS INTERFACE */
          <div className="space-y-6">
            {/* Swimming Date Selector */}
            <div className="bg-white border border-neutral-200 p-5 sm:p-7 rounded-2xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-neutral-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#2C1A0E]">
                    {isHindi ? 'तैराकी सत्र हेतु दिनांक चुनें' : 'Select Date for Swimming Session'}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                    {isHindi ? 'अर्ध-ओलंपिक प्रशिक्षण पूल में अपने सत्र का चयन करें।' : 'Book your lane in our Olympic-grade swimming pool.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchAvailability}
                    className="text-xs font-semibold text-[#8C5A32] hover:text-[#2C1A0E] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{isHindi ? 'ताज़ा करें' : 'Refresh'}</span>
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-medium px-3 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:border-[#2C1A0E]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {availableDates.map((item) => {
                  const isSelected = selectedDate === item.iso;
                  return (
                    <button
                      key={item.iso}
                      onClick={() => setSelectedDate(item.iso)}
                      className={`flex-shrink-0 px-4 py-3 border text-center transition-all cursor-pointer min-w-[90px] rounded-xl ${
                        isSelected
                          ? 'bg-[#2C1A0E] border-[#2C1A0E] text-white shadow-md font-semibold'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-[#8C5A32]/60 hover:bg-white'
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wider">
                        {item.isToday ? (isHindi ? 'आज' : 'TODAY') : item.dayName}
                      </div>
                      <div className={`text-2xl font-bold my-1 ${isSelected ? 'text-white' : 'text-[#2C1A0E]'}`}>
                        {item.dayNumber}
                      </div>
                      <div className={`text-xs font-medium uppercase tracking-wide ${isSelected ? 'text-white/80' : 'text-neutral-500'}`}>
                        {item.monthName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Swimming Sessions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {swimmingSessions.map((session) => {
                const isClosed = session.status === 'CLOSED';
                const isFull = session.status === 'FULL' || session.remaining <= 0;

                return (
                  <motion.div
                    key={session.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs ${
                      isClosed || isFull
                        ? 'opacity-60 border-neutral-200'
                        : 'border-neutral-200 hover:border-[#8C5A32]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800">
                          {session.category}
                        </span>
                        <span className="text-xs font-bold text-[#8C5A32]">
                          ₹{session.price || 100} / {isHindi ? 'व्यक्ति (प्रति घंटा)' : 'person / hr'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#2C1A0E] mt-1">
                        {session.title}
                      </h4>
                      <p className="text-xs text-neutral-600 mt-1">
                        {session.category} &bull; 50m Semi-Olympic Pool Lane
                      </p>

                      <div className="flex items-center gap-2 text-xs text-neutral-700 font-semibold mt-3">
                        <Clock className="w-3.5 h-3.5 text-[#8C5A32]" />
                        <span>{session.timeRange}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium">
                        {isClosed
                          ? (isHindi ? 'सत्र बंद' : 'Closed')
                          : isFull
                          ? (isHindi ? 'सत्र फुल' : 'Fully Booked')
                          : `${session.remaining} ${isHindi ? 'स्थान शेष' : 'spots left'}`}
                      </span>

                      <button
                        type="button"
                        disabled={isClosed || isFull}
                        onClick={() => {
                          setSwimmingBookingTarget(session);
                          setPlayerCount(1);
                          setFormError('');
                        }}
                        className="px-4 py-2 bg-[#2C1A0E] hover:bg-[#8C5A32] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isHindi ? 'आरक्षित करें' : 'Reserve Lane'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* SWIMMING BOOKING MODAL */}
        <AnimatePresence>
          {swimmingBookingTarget && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4">
              <div className="min-h-full flex items-center justify-center py-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative w-full max-w-lg bg-white border border-neutral-200 p-6 sm:p-8 shadow-2xl rounded-2xl text-[#2C1A0E] my-auto"
                >
                <button
                  onClick={() => setSwimmingBookingTarget(null)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-[#2C1A0E] mb-1">
                  {swimmingBookingTarget.title}
                </h3>
                <p className="text-xs text-neutral-600 mb-4">
                  {formatReadableDate(selectedDate)} • {swimmingBookingTarget.timeRange}
                </p>

                <form onSubmit={handleConfirmSwimmingReservation} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {isHindi ? 'पूरा नाम *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {isHindi ? 'मोबाइल नंबर *' : 'Phone Number *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                        placeholder="98290XXXXX"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                    <span className="text-xs font-medium text-neutral-700">
                      {isHindi ? 'तैराकों की संख्या:' : 'Number of Swimmers:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPlayerCount(Math.max(1, playerCount - 1))}
                        className="w-8 h-8 rounded bg-white border border-neutral-300 text-sm font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{playerCount}</span>
                      <button
                        type="button"
                        onClick={() => setPlayerCount(Math.min(swimmingBookingTarget.remaining, playerCount + 1))}
                        className="w-8 h-8 rounded bg-white border border-neutral-300 text-sm font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                    <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                      <span>{isHindi ? 'कुल राशि:' : 'Total Amount:'}</span>
                      <div className="text-right">
                        <span className="text-lg text-[#8C5A32]">
                          ₹{(swimmingBookingTarget.price || 100) * playerCount}
                        </span>
                        <span className="text-xs text-neutral-500 font-normal block">
                          (₹100 × {playerCount} {isHindi ? 'व्यक्ति / घंटा' : 'person / hr'})
                        </span>
                      </div>
                    </div>

                  {formError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{formError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#2C1A0E] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#8C5A32] cursor-pointer transition-colors"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Swimming Slot'}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
          )}
        </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
