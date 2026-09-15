'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Users,
  Phone,
  User,
  Sparkles,
  QrCode,
  IndianRupee,
  Share2,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Copy,
  Layers,
  Repeat,
  CheckCheck,
  Search,
  Eye,
  X,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/lib/LanguageContext';
import { AcademyConfig, Booking, RecurringPricingConfig } from '@/lib/types';
import { DEFAULT_CONFIG, DEFAULT_RECURRING_PRICING, CRICKET_TIME_SLOTS, SWIMMING_TIME_SLOTS } from '@/lib/defaults';
import {
  DAYS_OF_WEEK,
  RecurrenceType,
  generateRecurringDates,
  calculateRecurringPricing,
  formatDisplayDate,
  getDayNameFromDate,
} from '@/lib/recurring-helper';
import { generateOwnerWhatsAppLink } from '@/lib/notifications';
import { compressImageFile } from '@/lib/utils';

interface RecurringBookingSectionProps {
  onBackToOneTime?: () => void;
}

export function RecurringBookingSection({ onBackToOneTime }: RecurringBookingSectionProps) {
  const { isHindi } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 1. Academy Config & Pricing
  const [config, setConfig] = useState<AcademyConfig>(DEFAULT_CONFIG as any);
  const [recurringPricing, setRecurringPricing] = useState<RecurringPricingConfig>(DEFAULT_RECURRING_PRICING);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setConfig(data.config);
          if (data.config.recurringPricing) {
            setRecurringPricing(data.config.recurringPricing);
          }
        }
      })
      .catch((err) => console.warn('Config fetch notice:', err));
  }, []);

  // 2. Step Flow: 1 (Plan & Sport), 2 (Schedule & Days), 3 (Customer & Review), 4 (UPI Payment)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selections
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [sport, setSport] = useState<'cricket' | 'swimming'>('cricket');

  // Schedule States
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('06:00 PM – 07:00 PM');
  const [durationHours, setDurationHours] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [durationWeeks, setDurationWeeks] = useState<number>(4);
  const [durationMonths, setDurationMonths] = useState<number>(1);

  // Customer Details
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [playerCount, setPlayerCount] = useState<number>(1);
  const [notes, setNotes] = useState('');

  // Payment State
  const [transactionId, setTransactionId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Availability Check State
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    checked: boolean;
    isAvailable: boolean;
    message?: string;
    conflicts?: Array<{ date: string; timeRange: string; reason: string }>;
  }>({ checked: false, isAvailable: true });

  // Completion & Customer Modal States
  const [submittedBooking, setSubmittedBooking] = useState<Booking | null>(null);
  const [showMyBookingsModal, setShowMyBookingsModal] = useState(false);
  const [searchMyPhone, setSearchMyPhone] = useState('');
  const [myRecurringBookings, setMyRecurringBookings] = useState<Booking[]>([]);
  const [isSearchingBookings, setIsSearchingBookings] = useState(false);
  const [viewingParentSessions, setViewingParentSessions] = useState<{
    parent: Booking;
    sessions: Booking[];
  } | null>(null);

  // Calculated session dates
  const calculatedDates = useMemo(() => {
    return generateRecurringDates({
      recurrence_type: recurrenceType,
      start_date: startDate,
      recurrence_days: selectedDays,
      duration_weeks: recurrenceType === 'weekly' ? durationWeeks : undefined,
      duration_months: recurrenceType === 'monthly' ? durationMonths : undefined,
    });
  }, [recurrenceType, startDate, selectedDays, durationWeeks, durationMonths]);

  // Pricing calculation
  const pricingCalculation = useMemo(() => {
    return calculateRecurringPricing({
      sport,
      recurrence_type: recurrenceType,
      total_sessions: calculatedDates.length,
      duration_hours: durationHours,
      player_count: sport === 'swimming' ? playerCount : 1,
      customPricing: recurringPricing,
    });
  }, [sport, recurrenceType, calculatedDates.length, durationHours, playerCount, recurringPricing]);

  // Reset availability when schedule changes
  useEffect(() => {
    setAvailabilityResult({ checked: false, isAvailable: true });
  }, [startDate, selectedDays, selectedTimeRange, recurrenceType, durationWeeks, durationMonths, sport]);

  // Toggle Day Selection
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        setFormError(isHindi ? 'कम से कम 1 दिन चुनना आवश्यक है।' : 'At least one day must be selected.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
    setFormError('');
  };

  // Perform Server Availability Conflict Check
  const handleCheckAvailability = async () => {
    if (calculatedDates.length === 0) {
      setFormError(isHindi ? 'कोई वैध सत्र तिथि उपलब्ध नहीं है।' : 'No valid session dates calculated.');
      return false;
    }

    setIsCheckingAvailability(true);
    setFormError('');

    try {
      const res = await fetch('/api/recurring-bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: calculatedDates,
          timeRange: selectedTimeRange,
          sport,
          resourceId: sport === 'cricket' ? 'net-big-box' : 'session-swimming',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAvailabilityResult({
          checked: true,
          isAvailable: data.isAvailable,
          message: data.message,
          conflicts: data.conflicts,
        });

        if (!data.isAvailable) {
          setFormError(
            data.message ||
              (isHindi
                ? 'चयनित समय में कुछ स्लॉट पहले से बुक या अनुपलब्ध हैं।'
                : 'Some dates in this schedule are already booked or unavailable.')
          );
          return false;
        }
        return true;
      } else {
        setFormError(data.error || 'उपलब्धता जांचने में विफल।');
        return false;
      }
    } catch (err: any) {
      setFormError(err.message || 'त्रुटि उत्पन्न हुई।');
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Proceed to next step with validation
  const handleProceedToStep2 = () => {
    setStep(2);
    scrollToTop();
  };

  const handleProceedToStep3 = async () => {
    if (selectedDays.length === 0) {
      setFormError(isHindi ? 'कृपया कम से कम एक दिन चुनें।' : 'Please select at least one day.');
      return;
    }
    if (calculatedDates.length === 0) {
      setFormError(isHindi ? 'कोई सत्र तिथि नहीं बनी।' : 'No session dates generated.');
      return;
    }

    // Availability validation before review
    const ok = await handleCheckAvailability();
    if (ok) {
      setStep(3);
      scrollToTop();
    }
  };

  const handleProceedToStep4 = () => {
    if (!userName.trim()) {
      setFormError(isHindi ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your full name.');
      return;
    }
    if (!userPhone.trim() || userPhone.trim().length < 10) {
      setFormError(isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit phone number.');
      return;
    }
    setFormError('');
    setStep(4);
    scrollToTop();
  };

  // Handle Screenshot Upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.7);
      setPaymentScreenshot(compressed);
    } catch (err) {
      console.error('Image compression error:', err);
    }
  };

  // Final Recurring Booking Submission
  const handleSubmitRecurringBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      setFormError(isHindi ? 'कृपया 12 अंकों का UPI UTR / Transaction ID दर्ज करें।' : 'Please enter the 12-digit UPI UTR number.');
      return;
    }
    if (transactionId.trim().length < 6) {
      setFormError(isHindi ? 'मान्य UPI Transaction ID दर्ज करें।' : 'Please provide a valid UTR number.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const resourceName =
        sport === 'cricket'
          ? 'Cricket Turf Box (160x70 ft)'
          : 'Olympic Half Pool (25m)';

      const res = await fetch('/api/recurring-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          category: sport,
          resourceId: sport === 'cricket' ? 'net-big-box' : 'session-swimming',
          resourceName,
          recurrence_type: recurrenceType,
          recurrence_days: selectedDays,
          preferred_time: selectedTimeRange,
          duration: durationHours,
          start_date: startDate,
          end_date: calculatedDates[calculatedDates.length - 1],
          recurring_dates: calculatedDates,
          userName: userName.trim(),
          userPhone: userPhone.trim(),
          userEmail: userEmail.trim(),
          playerCount: sport === 'swimming' ? playerCount : 1,
          notes: notes.trim(),
          amountPaid: pricingCalculation.finalPayableAmount,
          recurring_price: pricingCalculation.finalPayableAmount,
          paymentMethod: 'UPI_QR',
          paymentScreenshot,
          transactionId: transactionId.trim(),
          paymentStatus: 'PENDING_VERIFICATION',
          status: 'AWAITING_VERIFICATION',
        }),
      });

      const data = await res.json();
      if (data.success && data.parentBooking) {
        setSubmittedBooking(data.parentBooking);
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
        scrollToTop();
      } else {
        setFormError(data.error || 'रिकरिंग बुकिंग सहेजने में विफल।');
      }
    } catch (err: any) {
      setFormError(err.message || 'त्रुटि उत्पन्न हुई।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search Customer's Recurring Bookings
  const handleSearchMyBookings = async () => {
    if (!searchMyPhone.trim()) return;
    setIsSearchingBookings(true);
    try {
      const cleanPhone = searchMyPhone.trim().replace(/\D/g, '').slice(-10);
      const res = await fetch(`/api/recurring-bookings?phone=${cleanPhone}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.recurringBookings)) {
        setMyRecurringBookings(data.recurringBookings);
      } else {
        setMyRecurringBookings([]);
      }
    } catch (err) {
      console.error(err);
      setMyRecurringBookings([]);
    } finally {
      setIsSearchingBookings(false);
    }
  };

  const handleFetchSessionsForParent = async (parent: Booking) => {
    try {
      const res = await fetch(`/api/recurring-bookings/sessions?parentId=${parent.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setViewingParentSessions({ parent, sessions: data.sessions });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic Owner WhatsApp Number
  const rawOwnerNumber =
    config.ownerWhatsAppNumber ||
    config.phone ||
    '8142731917';
  const cleanOwnerNumber = rawOwnerNumber.replace(/\D/g, '').slice(-10) || '8142731917';

  // Available Time Slots List
  const timeSlotsList = sport === 'cricket' ? CRICKET_TIME_SLOTS : SWIMMING_TIME_SLOTS;

  // ---------------------------------------------------------------------------
  // View: Completed & Verification Submitted Screen
  // ---------------------------------------------------------------------------
  if (submittedBooking) {
    const recTypeUpper = (submittedBooking.recurrence_type || 'weekly').toUpperCase();
    const ownerWhatsAppMsg = `नमस्ते Kuchaman Sports Academy! मैंने रिकरिंग बुकिंग की है:\n\n📋 Booking ID: ${submittedBooking.id}\n👤 नाम: ${submittedBooking.userName}\n📞 फोन: ${submittedBooking.userPhone}\n🏆 खेल: ${submittedBooking.sport === 'cricket' ? 'क्रिकेट टर्फ' : 'स्विमिंग पूल'}\n📅 प्रकार: ${recTypeUpper}\n⏰ समय: ${submittedBooking.preferred_time || ''}\n🗓️ दिन: ${submittedBooking.recurrence_days?.join(', ') || ''}\n🔢 कुल सत्र: ${submittedBooking.total_sessions || 0} Sessions\n💰 कुल राशि: ₹${submittedBooking.amountPaid}\n💳 UPI UTR: ${submittedBooking.transactionId || ''}\n\nकृपया मेरा भुगतान चेक करके बुकिंग अप्रूव करें।`;
    const shareLink = `https://wa.me/91${cleanOwnerNumber}?text=${encodeURIComponent(ownerWhatsAppMsg)}`;

    return (
      <div ref={containerRef} className="w-full max-w-xl mx-auto px-4 py-8 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#2C1A0E] to-[#4A2D19] text-white p-7 text-center relative">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-300/40 flex items-center justify-center mx-auto mb-3">
              <CheckCheck className="w-8 h-8 text-amber-300" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black tracking-wider uppercase mb-1">
              ⏳ सत्यापन प्रक्रिया में (Pending Owner Verification)
            </span>
            <h2 className="text-2xl font-black">
              {isHindi ? 'रिकरिंग बुकिंग दर्ज हो गई!' : 'Recurring Plan Submitted!'}
            </h2>
            <p className="text-xs text-neutral-300 mt-1 max-w-md mx-auto">
              {isHindi
                ? 'आपकी सभी सत्रों की अनुसूची तैयार है। एकैडमी ओनर द्वारा भुगतान चेक होते ही सभी स्लॉट कन्फर्म हो जाएंगे।'
                : 'All recurring sessions scheduled. Once the owner verifies payment, all sessions will be confirmed.'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Booking ID */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase block">
                  {isHindi ? 'रिकरिंग बुकिंग ID' : 'Recurring Reference ID'}
                </span>
                <span className="text-lg font-black font-mono text-[#2C1A0E]">
                  {submittedBooking.id}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                {submittedBooking.total_sessions} SESSIONS
              </span>
            </div>

            {/* Plan Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-neutral-500 block">खेल व पैकेज</span>
                <span className="font-bold text-neutral-900 block mt-0.5">
                  {submittedBooking.sport === 'cricket' ? '🏏 क्रिकेट टर्फ' : '🏊 स्विमिंग पूल'}
                </span>
                <span className="text-[11px] text-neutral-600 block">
                  {submittedBooking.recurrence_type === 'weekly'
                    ? 'साप्ताहिक (Weekly)'
                    : submittedBooking.recurrence_type === 'monthly'
                    ? 'मासिक (Monthly)'
                    : 'पसंदीदा समय (Preferred Time)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-neutral-500 block">समय व दिन</span>
                <span className="font-bold text-neutral-900 block mt-0.5">
                  {submittedBooking.preferred_time}
                </span>
                <span className="text-[11px] text-neutral-600 block">
                  {submittedBooking.recurrence_days?.join(', ')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-neutral-500 block">सत्र अवधि</span>
                <span className="font-bold text-neutral-900 block mt-0.5">
                  {formatDisplayDate(submittedBooking.start_date)} — {formatDisplayDate(submittedBooking.end_date)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-neutral-500 block">भुगतान राशि</span>
                <span className="font-black text-[#2C1A0E] text-base block mt-0.5">
                  ₹{submittedBooking.amountPaid}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono block truncate">
                  UTR: {submittedBooking.transactionId}
                </span>
              </div>
            </div>

            {/* WhatsApp Share to Owner */}
            <a
              href={shareLink}
              target="_blank"
              rel="noreferrer"
              className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>
                {isHindi
                  ? `📲 एकैडमी ओनर (${cleanOwnerNumber}) को व्हाट्सएप भेजें`
                  : `📲 Send Verification Request to Owner (${cleanOwnerNumber})`}
              </span>
            </a>

            <button
              type="button"
              onClick={() => {
                setSubmittedBooking(null);
                setStep(1);
                if (onBackToOneTime) onBackToOneTime();
              }}
              className="w-full h-11 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isHindi ? 'मुख्य बुकिंग पर वापस जाएं' : 'Return to Home'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto px-4 pt-2 pb-16 select-none scroll-smooth">
      {/* Top Banner */}
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-900 text-xs font-black tracking-wide uppercase shadow-2xs">
            <Repeat className="w-3.5 h-3.5 text-blue-700" />
            <span>{isHindi ? '🔄 रिकरिंग बुकिंग सुविधा' : '🔄 Recurring Booking Feature'}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowMyBookingsModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
          >
            <Search className="w-3 h-3 text-neutral-600" />
            <span>{isHindi ? 'मेरी रिकरिंग बुकिंग देखें' : 'My Recurring Bookings'}</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#2C1A0E] tracking-tight">
          {isHindi ? 'नियमित व पैकेज स्लॉट बुकिंग' : 'Recurring & Package Slot Booking'}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-lg mx-auto">
          {isHindi
            ? 'साप्ताहिक, मासिक या पसंदीदा समय के लिए अग्रिम में नियमित स्लॉट आरक्षित करें और विशेष पैकेज छूट का लाभ उठाएं।'
            : 'Reserve regular slots for weeks or months in advance with exclusive package discounts.'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2 mb-5">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {isHindi ? `चरण ${step} / 4` : `Step ${step} of 4`}:{' '}
          {step === 1 && (isHindi ? 'पैकेज व खेल' : 'Plan & Sport')}
          {step === 2 && (isHindi ? 'दिन व समय अनुसूची' : 'Days & Schedule')}
          {step === 3 && (isHindi ? 'ग्राहक विवरण व समीक्षा' : 'Customer & Review')}
          {step === 4 && (isHindi ? 'UPI भुगतान' : 'UPI Payment')}
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-7 bg-[#2C1A0E]'
                  : s < step
                  ? 'w-4 bg-emerald-600'
                  : 'w-2 bg-neutral-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {formError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1: Choose Recurrence Option & Sport                              */}
      {/* ===================================================================== */}
      {step === 1 && (
        <motion.div
          key="step-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Recurrence Type Selector: 3 Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-neutral-700 uppercase tracking-wide">
              {isHindi ? '1. रिकरिंग बुकिंग प्रकार चुनें' : '1. Select Recurring Plan'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Weekly */}
              <button
                type="button"
                onClick={() => setRecurrenceType('weekly')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  recurrenceType === 'weekly'
                    ? 'border-[#2C1A0E] bg-amber-50/70 shadow-md ring-2 ring-[#2C1A0E]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                    📅
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    {recurringPricing.weeklyDiscountPercent}% OFF
                  </span>
                </div>
                <h3 className="text-sm font-black text-[#2C1A0E]">
                  {isHindi ? 'साप्ताहिक बुकिंग' : 'Weekly Booking'}
                </h3>
                <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                  {isHindi
                    ? 'सप्ताह के 1 से अधिक दिन, 1 से 12 हफ्तों हेतु।'
                    : 'Choose specific days of week for 1–12 weeks.'}
                </p>
              </button>

              {/* Option 2: Monthly */}
              <button
                type="button"
                onClick={() => setRecurrenceType('monthly')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  recurrenceType === 'monthly'
                    ? 'border-[#2C1A0E] bg-emerald-50/70 shadow-md ring-2 ring-[#2C1A0E]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                    🗓️
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    {recurringPricing.monthlyDiscountPercent}% OFF
                  </span>
                </div>
                <h3 className="text-sm font-black text-[#2C1A0E]">
                  {isHindi ? 'मासिक बुकिंग' : 'Monthly Booking'}
                </h3>
                <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                  {isHindi
                    ? '1 से 6 महीने तक नियमित स्लॉट पैकेज।'
                    : 'Regular fixed slot package for 1–6 months.'}
                </p>
              </button>

              {/* Option 3: Preferred Time */}
              <button
                type="button"
                onClick={() => setRecurrenceType('preferred_time')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  recurrenceType === 'preferred_time'
                    ? 'border-[#2C1A0E] bg-blue-50/70 shadow-md ring-2 ring-[#2C1A0E]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                    ⭐
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                    {recurringPricing.preferredTimeDiscountPercent}% OFF
                  </span>
                </div>
                <h3 className="text-sm font-black text-[#2C1A0E]">
                  {isHindi ? 'पसंदीदा समय बुकिंग' : 'Preferred Time'}
                </h3>
                <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                  {isHindi
                    ? 'निश्चित स्लॉट को पूरे समय के लिए लॉक करें।'
                    : 'Lock your prime slot exclusively across all dates.'}
                </p>
              </button>
            </div>
          </div>

          {/* Sport Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-neutral-700 uppercase tracking-wide">
              {isHindi ? '2. खेल चुनें (Select Sport)' : '2. Select Sport'}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSport('cricket')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  sport === 'cricket'
                    ? 'border-[#2C1A0E] bg-[#2C1A0E] text-white shadow-md'
                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <span className="text-2xl">🏏</span>
                <div className="text-left">
                  <span className="font-black text-sm block">
                    {isHindi ? 'क्रिकेट बॉक्स टर्फ' : 'Cricket Box Turf'}
                  </span>
                  <span
                    className={`text-[11px] block ${
                      sport === 'cricket' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    160x70 ft Turf
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSport('swimming')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  sport === 'swimming'
                    ? 'border-[#2C1A0E] bg-[#2C1A0E] text-white shadow-md'
                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                }`}
              >
                <span className="text-2xl">🏊</span>
                <div className="text-left">
                  <span className="font-black text-sm block">
                    {isHindi ? 'स्विमिंग पूल' : 'Swimming Pool'}
                  </span>
                  <span
                    className={`text-[11px] block ${
                      sport === 'swimming' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    Olympic Half Pool
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="w-full h-12 rounded-2xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>{isHindi ? 'दिन व समय चुनें (Next: Schedule)' : 'Continue to Schedule'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: Days of Week, Time Slot & Duration Schedule                  */}
      {/* ===================================================================== */}
      {step === 2 && (
        <motion.div
          key="step-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Days of Week Selector */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>{isHindi ? 'सप्ताह के दिन चुनें (Preferred Days)' : 'Select Preferred Days of Week'}</span>
              </label>
              <span className="text-[11px] font-bold text-neutral-500">
                {selectedDays.length} {isHindi ? 'दिन चुने' : 'days selected'}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C1A0E] text-white shadow-xs scale-102'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <span className="text-sm">{day.key}</span>
                    <span className="text-[10px] font-medium opacity-80">
                      {isHindi ? day.hindi : day.name.slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500">
              {isHindi
                ? 'उदा. सोम + बुध + शुक्र या सभी दिन नियमित स्लॉट हेतु।'
                : 'e.g. Mon, Wed, Fri for regular training or every day.'}
            </p>
          </div>

          {/* Time Slot & Duration Hours */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Time Slot Picker */}
              <div>
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>{isHindi ? 'पसंदीदा समय स्लॉट (Time Slot)' : 'Preferred Time Slot'}</span>
                </label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 bg-white focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                >
                  {timeSlotsList.map((slot) => (
                    <option key={slot.timeRange} value={slot.timeRange}>
                      {slot.timeRange}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hours per Session */}
              <div>
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1.5">
                  {isHindi ? 'प्रति सत्र घंटे (Hours/Session)' : 'Hours per Session'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setDurationHours(hr)}
                      className={`flex-1 h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        durationHours === hr
                          ? 'bg-[#2C1A0E] text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {hr} {hr === 1 ? (isHindi ? 'घंटा' : 'Hour') : (isHindi ? 'घंटे' : 'Hours')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Date & Plan Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div>
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1.5">
                  {isHindi ? 'आरंभ तिथि (Start Date)' : 'Start Date'}
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 bg-white focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                />
              </div>

              {/* Duration: Weeks or Months based on recurrence type */}
              <div>
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1.5">
                  {recurrenceType === 'monthly'
                    ? isHindi
                      ? 'महीनों की संख्या (Months)'
                      : 'Number of Months'
                    : isHindi
                    ? 'हफ्तों की संख्या (Weeks)'
                    : 'Number of Weeks'}
                </label>

                {recurrenceType === 'monthly' ? (
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 bg-white focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                  >
                    <option value={1}>1 Month (1 महीना)</option>
                    <option value={2}>2 Months (2 महीने)</option>
                    <option value={3}>3 Months (3 महीने - तिमाही)</option>
                    <option value={6}>6 Months (6 महीने - छमाही)</option>
                  </select>
                ) : (
                  <select
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 bg-white focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                  >
                    {[1, 2, 3, 4, 6, 8, 12].map((w) => (
                      <option key={w} value={w}>
                        {w} {w === 1 ? (isHindi ? 'हफ्ता' : 'Week') : (isHindi ? 'हफ्ते' : 'Weeks')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Calculation Summary Box */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
              <span className="text-xs font-black text-amber-900 uppercase">
                {isHindi ? 'सत्र गणना व अनुमानित मूल्य' : 'Sessions & Estimated Price'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-xs font-black">
                {calculatedDates.length} {isHindi ? 'सत्र (Sessions)' : 'Sessions'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-neutral-500 block">प्रति सत्र दर:</span>
                <span className="font-bold text-neutral-900">
                  ₹{pricingCalculation.ratePerSession}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">कुल मूल्य:</span>
                <span className="font-bold text-neutral-600 line-through">
                  ₹{pricingCalculation.totalOriginalPrice}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">पैकेज छूट:</span>
                <span className="font-bold text-emerald-700">
                  -₹{pricingCalculation.discountAmount} ({pricingCalculation.discountPercent}%)
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">अंतिम देय राशि:</span>
                <span className="font-black text-[#2C1A0E] text-sm">
                  ₹{pricingCalculation.finalPayableAmount}
                </span>
              </div>
            </div>

            {/* Dates preview pill list */}
            <div className="pt-2 border-t border-amber-200/60">
              <div className="text-[11px] font-bold text-neutral-600 mb-1.5 flex justify-between">
                <span>जनरेट की गई सत्र तिथियां ({calculatedDates.length}):</span>
                <span className="text-amber-900">
                  {formatDisplayDate(startDate)} → {formatDisplayDate(calculatedDates[calculatedDates.length - 1] || startDate)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white/60 rounded-xl border border-amber-200/50">
                {calculatedDates.slice(0, 15).map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[10px] font-mono font-bold text-neutral-800"
                  >
                    {d.slice(5)} ({getDayNameFromDate(d).slice(0, 3)})
                  </span>
                ))}
                {calculatedDates.length > 15 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-[10px] font-bold text-amber-900">
                    +{calculatedDates.length - 15} और...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Availability Status Box */}
          {availabilityResult.checked && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                availabilityResult.isAvailable
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {availabilityResult.isAvailable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{availabilityResult.message}</span>
            </div>
          )}

          {/* Step Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all cursor-pointer"
            >
              ← वापस (Back)
            </button>

            <button
              type="button"
              onClick={handleProceedToStep3}
              disabled={isCheckingAvailability}
              className="flex-1 h-12 rounded-xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isCheckingAvailability ? (
                <span>स्लॉट उपलब्धता जांची जा रही है...</span>
              ) : (
                <>
                  <span>{isHindi ? 'उपलब्धता जांचें व आगे बढ़ें' : 'Check Availability & Proceed'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: Customer Details & Final Summary Review                      */}
      {/* ===================================================================== */}
      {step === 3 && (
        <motion.div
          key="step-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Customer Form */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-700" />
              <span>{isHindi ? 'ग्राहक विवरण (Customer Details)' : 'Customer Details'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {isHindi ? 'पूरा नाम (Full Name) *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  placeholder="उदा. राहुल शर्मा"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {isHindi ? 'मोबाइल नंबर (WhatsApp Phone) *' : 'WhatsApp Phone *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9829084421"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-11 pl-11 pr-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                  />
                </div>
              </div>
            </div>

            {sport === 'swimming' && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {isHindi ? 'तैरने वालों की संख्या (Number of Swimmers)' : 'Number of Swimmers'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Math.max(1, Number(e.target.value)))}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isHindi ? 'विशेष टिप्पणी / नोट (Optional Notes)' : 'Optional Notes'}
              </label>
              <input
                type="text"
                placeholder={isHindi ? 'उदा. शाम 7 बजे नियमित अभ्यास' : 'e.g. Regular practice sessions'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-normal text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-gradient-to-br from-[#2C1A0E] to-[#4A2D19] text-white rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                  {isHindi ? 'रिकरिंग बुकिंग सारांश' : 'Recurring Plan Summary'}
                </span>
                <h4 className="text-base font-black">
                  {sport === 'cricket' ? '🏏 Cricket Box Turf' : '🏊 Swimming Pool'}
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black">
                {recurrenceType.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-300 block">सत्र दिन (Days):</span>
                <span className="font-bold text-white block mt-0.5">
                  {selectedDays.join(', ')}
                </span>
              </div>

              <div>
                <span className="text-neutral-300 block">समय (Time Slot):</span>
                <span className="font-bold text-white block mt-0.5">
                  {selectedTimeRange} ({durationHours} hr)
                </span>
              </div>

              <div>
                <span className="text-neutral-300 block">अवधि (Period):</span>
                <span className="font-bold text-white block mt-0.5">
                  {formatDisplayDate(startDate)} — {formatDisplayDate(calculatedDates[calculatedDates.length - 1])}
                </span>
              </div>

              <div>
                <span className="text-neutral-300 block">कुल सत्र (Total Sessions):</span>
                <span className="font-bold text-amber-300 text-sm block mt-0.5">
                  {calculatedDates.length} Sessions
                </span>
              </div>
            </div>

            {/* Total Payable Box */}
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-300 block">कुल देय राशि (Total Amount):</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">
                    ₹{pricingCalculation.finalPayableAmount}
                  </span>
                  <span className="text-xs text-neutral-400 line-through">
                    ₹{pricingCalculation.totalOriginalPrice}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                {pricingCalculation.discountPercent}% SAVED
              </span>
            </div>
          </div>

          {/* Step Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-3 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all cursor-pointer"
            >
              ← वापस (Back)
            </button>

            <button
              type="button"
              onClick={handleProceedToStep4}
              className="flex-1 h-12 rounded-xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>{isHindi ? 'भुगतान हेतु आगे बढ़ें (Proceed to Payment)' : 'Proceed to UPI Payment'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: UPI Payment & Verification                                   */}
      {/* ===================================================================== */}
      {step === 4 && (
        <motion.div
          key="step-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <form onSubmit={handleSubmitRecurringBooking} className="space-y-5">
            {/* Payment Info Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-4 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase">
                UPI QR कोड स्कैन करें
              </span>

              {/* Amount Pill */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs text-neutral-500 block">भुगतान हेतु राशि (Payable Amount):</span>
                <span className="text-2xl font-black text-[#2C1A0E] block">
                  ₹{pricingCalculation.finalPayableAmount}
                </span>
                <span className="text-[11px] text-neutral-600">
                  {calculatedDates.length} सत्र • {recurrenceType.toUpperCase()}
                </span>
              </div>

              {/* QR Code */}
              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border-2 border-neutral-300 shadow-sm flex items-center justify-center relative">
                {config.upiQrCodeUrl ? (
                  <img
                    src={config.upiQrCodeUrl}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <QrCode className="w-32 h-32 text-neutral-400" />
                )}
              </div>

              {/* UPI ID Copy Box */}
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between max-w-sm mx-auto">
                <div className="text-left truncate mr-2">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">UPI ID</span>
                  <span className="text-xs font-mono font-bold text-neutral-900 truncate block">
                    {config.upiId || '9829084421@paytm'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(config.upiId || '9829084421@paytm');
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedUpi ? 'कॉपी हो गया' : 'कॉपी करें'}</span>
                </button>
              </div>

              <p className="text-[11px] text-neutral-500">
                Paytm, Google Pay, PhonePe या किसी भी UPI ऐप से स्कैन करके भुगतान करें।
              </p>
            </div>

            {/* UTR & Screenshot Entry */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1">
                  12 अंकों का UPI UTR / Transaction ID *
                </label>
                <input
                  type="text"
                  maxLength={24}
                  placeholder="उदा. 423589123456"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value.trim())}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                  required
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  UPI ऐप में भुगतान के बाद 12 अंकों का UTR नंबर यहाँ दर्ज करें।
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wide mb-1">
                  भुगतान का स्क्रीनशॉट (वैकल्पिक / Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#2C1A0E] file:text-white hover:file:bg-[#432818] cursor-pointer"
                />
                {paymentScreenshot && (
                  <span className="text-[11px] font-bold text-emerald-700 block mt-1">
                    ✓ स्क्रीनशॉट अपलोड हो गया
                  </span>
                )}
              </div>
            </div>

            {/* Step Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-3 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all cursor-pointer"
              >
                ← वापस (Back)
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <span>सत्यापन हेतु भेजा जा रहा है...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isHindi ? 'रिकरिंग बुकिंग सबमिट करें' : 'Submit for Verification'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Customer "My Recurring Bookings" Lookup                       */}
      {/* ===================================================================== */}
      {showMyBookingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2C1A0E] to-[#4A2D19] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-black">मेरी रिकरिंग बुकिंग (My Recurring Bookings)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMyBookingsModal(false);
                  setViewingParentSessions(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Phone input to search */}
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="अपना 10 अंकों का मोबाइल नंबर दर्ज करें"
                  value={searchMyPhone}
                  onChange={(e) => setSearchMyPhone(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 h-11 px-3 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchMyBookings}
                  disabled={isSearchingBookings}
                  className="px-4 h-11 rounded-xl bg-[#2C1A0E] text-white text-xs font-black hover:bg-[#432818] transition-all cursor-pointer shrink-0"
                >
                  {isSearchingBookings ? 'खोज रहे हैं...' : 'खोजें (Search)'}
                </button>
              </div>

              {/* Viewing Sessions Modal View */}
              {viewingParentSessions ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setViewingParentSessions(null)}
                      className="text-xs font-bold text-amber-900 hover:underline cursor-pointer"
                    >
                      ← वापस सूची पर जाएं
                    </button>
                    <span className="text-xs font-bold text-neutral-700">
                      ID: {viewingParentSessions.parent.id} ({viewingParentSessions.sessions.length} सत्र)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {viewingParentSessions.sessions.map((sess, idx) => {
                      const isConfirmed = sess.status === 'CONFIRMED' || sess.paymentStatus === 'APPROVED';
                      return (
                        <div
                          key={sess.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-xs"
                        >
                          <div>
                            <span className="font-bold text-neutral-900 block">
                              सत्र #{idx + 1}: {formatDisplayDate(sess.date)} ({getDayNameFromDate(sess.date)})
                            </span>
                            <span className="text-neutral-500 text-[11px] block">
                              {sess.timeRange} • {sess.resourceName}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* List of Parents */
                <div className="space-y-3">
                  {myRecurringBookings.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      {searchMyPhone
                        ? 'इस मोबाइल नंबर पर कोई रिकरिंग बुकिंग नहीं मिली।'
                        : 'अपना मोबाइल नंबर दर्ज करके अपनी रिकरिंग बुकिंग खोजें।'}
                    </div>
                  ) : (
                    myRecurringBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-amber-900">{b.id}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              b.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <div className="text-neutral-700">
                          <span className="font-bold block">
                            {b.sport === 'cricket' ? '🏏 क्रिकेट टर्फ' : '🏊 स्विमिंग पूल'} •{' '}
                            {b.preferred_time}
                          </span>
                          <span className="text-[11px] text-neutral-500 block">
                            {b.recurrence_days?.join(', ')} • {b.total_sessions} सत्र
                          </span>
                          <span className="text-[11px] text-neutral-500 block">
                            {formatDisplayDate(b.start_date)} से {formatDisplayDate(b.end_date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                          <span className="font-black text-[#2C1A0E]">₹{b.amountPaid}</span>
                          <button
                            type="button"
                            onClick={() => handleFetchSessionsForParent(b)}
                            className="px-3 py-1 rounded-lg bg-neutral-900 text-white text-[11px] font-bold cursor-pointer"
                          >
                            सभी सत्र देखें (View Schedule)
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
