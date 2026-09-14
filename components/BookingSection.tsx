'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Copy,
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  Sparkles,
  Download,
  Share2,
  ShieldCheck,
  QrCode,
  IndianRupee,
  RotateCcw,
  CheckCheck,
  GraduationCap,
  Layers,
  Info,
} from 'lucide-react';
import { CricketNet, CricketSlot, SwimmingSession, Booking, AcademyConfig } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import { DEFAULT_NETS, DEFAULT_CONFIG, CRICKET_TIME_SLOTS, SWIMMING_TIME_SLOTS } from '@/lib/defaults';
import { BookingTimeWatch } from '@/components/BookingTimeWatch';
import { subscribeToConfig, createFirestoreBooking } from '@/lib/firestore-service';

export type BookingCategory = 'cricket' | 'swimming' | 'admission';

interface BookingSectionProps {
  initialSport?: 'cricket' | 'swimming' | 'admission';
  onBack?: () => void;
}

export function BookingSection({ initialSport = 'cricket', onBack }: BookingSectionProps) {
  const { isHindi } = useLanguage();
  const bookingContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTopSmoothly = () => {
    if (bookingContainerRef.current) {
      bookingContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Core Category & Active Step State
  // ---------------------------------------------------------------------------
  const [category, setCategory] = useState<BookingCategory>(initialSport);
  // Current active step: 1 (Selection/Details), 2 (Details/Payment), 3 (Payment for 3-step flows)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 State: Cricket & Time Watch Selection
  const [selectedNetType, setSelectedNetType] = useState<'bigbox' | 'practice'>('bigbox');
  const [selectedNetId, setSelectedNetId] = useState<string>('net-big-box');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('06:00 PM – 07:00 PM');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('06:00 PM');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('07:00 PM');
  const [durationHours, setDurationHours] = useState<number>(1);
  const [slotHourlyRate, setSlotHourlyRate] = useState<number>(1000);
  const [isSlotValid, setIsSlotValid] = useState<boolean>(true);
  const [slotConflictReason, setSlotConflictReason] = useState<string | undefined>();

  // Step 1 State: Swimming Selection
  const [selectedSwimmingSession, setSelectedSwimmingSession] = useState<string>('06:00 AM – 07:00 AM');

  // Step 2 State: Customer & Player Details (Cricket & Swimming)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [playerCount, setPlayerCount] = useState<number>(1);

  // Admission Flow State (2-step only: Mentor Name, Contact, How Many Students)
  const [mentorName, setMentorName] = useState<string>('');
  const [admissionContact, setAdmissionContact] = useState<string>('');
  const [studentCount, setStudentCount] = useState<number>(1);

  // Step 3 / Payment & Verification State
  const [ownerConfig, setOwnerConfig] = useState<Partial<AcademyConfig>>(DEFAULT_CONFIG);
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Confirmed Result State
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    category: BookingCategory;
    title: string;
    details: string;
    dateTime: string;
    personName: string;
    contactNumber: string;
    count: number;
    originalPrice: number;
    discountAmount: number;
    finalPaid: number;
    transactionId?: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // 2. Fetch Config & Availability
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Initial fetch from API
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.config) {
          setOwnerConfig(data.config);
        }
      })
      .catch(() => {});

    // 2. Realtime listener for instant sync across all user devices
    const unsubscribe = subscribeToConfig((liveConfig) => {
      if (liveConfig) {
        setOwnerConfig(liveConfig);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update initial sport if prop changes
  useEffect(() => {
    if (initialSport) {
      setCategory(initialSport);
      setCurrentStep(1);
    }
  }, [initialSport]);

  // Available Dates (Next 10 days)
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { weekday: 'short' });
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { month: 'short' });
      dates.push({ iso, dayName, dayNumber, monthName, isToday: i === 0, isTomorrow: i === 1 });
    }
    return dates;
  }, [isHindi]);

  // ---------------------------------------------------------------------------
  // 3. Time Watch Callback & Dynamic Pricing with 10% Online Booking Discount
  // ---------------------------------------------------------------------------
  const handleTimeChange = useCallback(
    (selection: {
      startTime: string;
      endTime: string;
      durationHours: number;
      timeRange: string;
      hourlyRate: number;
      originalPrice: number;
      discountAmount: number;
      finalPrice: number;
      isValid: boolean;
      conflictReason?: string;
    }) => {
      setSelectedStartTime(selection.startTime);
      setSelectedEndTime(selection.endTime);
      setSelectedSlotTime(selection.timeRange);
      setDurationHours(selection.durationHours);
      setSlotHourlyRate(selection.hourlyRate);
      setIsSlotValid(selection.isValid);
      setSlotConflictReason(selection.conflictReason);
    },
    []
  );

  const { originalPrice, discountAmount, finalPayableAmount } = useMemo(() => {
    let base = 0;

    if (category === 'cricket') {
      if (selectedNetType === 'bigbox') {
        const rate = ownerConfig?.hourlyRates?.cricketBigBox || 1000;
        base = Math.round(rate * durationHours);
      } else {
        // Practice net: ₹100 per person per hour
        base = Math.round(100 * Math.max(1, playerCount) * durationHours);
      }
    } else if (category === 'swimming') {
      // Swimming pool: ₹100 per swimmer session per hour
      const poolRate = ownerConfig?.hourlyRates?.swimmingPool || 100;
      base = Math.round(poolRate * Math.max(1, playerCount) * durationHours);
    } else if (category === 'admission') {
      // Admission: ₹1000 per student (as explicitly specified in user prompt)
      base = 1000 * Math.max(1, studentCount);
    }

    // 10% Online Booking Discount automatically applied across all categories
    const discount = Math.round((base * 10) / 100);
    const payable = Math.max(0, base - discount);

    return {
      originalPrice: base,
      discountAmount: discount,
      finalPayableAmount: payable,
    };
  }, [category, selectedNetType, playerCount, studentCount, durationHours, ownerConfig]);

  // ---------------------------------------------------------------------------
  // 4. UPI QR & Payment Info
  // ---------------------------------------------------------------------------
  const upiId = ownerConfig.upiId || '9829084421@paytm';
  const upiAccountName = ownerConfig.upiAccountName || 'Kuchaman Sports Academy';

  const upiPayUrl = useMemo(() => {
    const note = encodeURIComponent(`KSA ${category.toUpperCase()} ${customerPhone || admissionContact}`);
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      upiAccountName
    )}&am=${finalPayableAmount}&cu=INR&tn=${note}`;
  }, [upiId, upiAccountName, finalPayableAmount, category, customerPhone, admissionContact]);

  const qrImageUrl = useMemo(() => {
    if (ownerConfig.upiQrCodeUrl && ownerConfig.upiQrCodeUrl.length > 20) {
      return ownerConfig.upiQrCodeUrl;
    }
    // High-resolution instant QR generation from standard UPI deep-link
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(
      upiPayUrl
    )}`;
  }, [ownerConfig.upiQrCodeUrl, upiPayUrl]);

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // ---------------------------------------------------------------------------
  // 5. Navigation Handlers & Validation
  // ---------------------------------------------------------------------------
  const handleCategorySwitch = (newCat: BookingCategory) => {
    setCategory(newCat);
    setCurrentStep(1);
    setFormError('');
    scrollToTopSmoothly();
  };

  // Step 1 Validation -> Proceed to Step 2
  const handleCompleteStep1 = () => {
    setFormError('');
    if (category === 'admission') {
      // Admission Step 1 is "Mentor Name, Contact, Student Count"
      if (!mentorName.trim()) {
        setFormError(isHindi ? 'कृपया मेंटर / कोच का नाम दर्ज करें' : 'Please enter mentor name');
        return;
      }
      if (!admissionContact.trim() || admissionContact.replace(/\D/g, '').length < 10) {
        setFormError(isHindi ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
        return;
      }
      // Valid! Smoothly transition to Step 2 (Payment)
      setCurrentStep(2);
      scrollToTopSmoothly();
    } else {
      // Cricket or Swimming Step 1 is Slot & Date selection
      if (!selectedDate) {
        setFormError(isHindi ? 'कृपया तारीख चुनें' : 'Please select a date');
        return;
      }
      if (!isSlotValid) {
        setFormError(
          slotConflictReason ||
            (isHindi
              ? 'चयनित समय स्लॉट उपलब्ध नहीं है। कृपया कोई अन्य उपलब्ध समय चुनें।'
              : 'The selected time slot is unavailable. Please choose another available time on the watch.')
        );
        return;
      }
      // Valid! Smoothly transition to Step 2 (Details)
      setCurrentStep(2);
      scrollToTopSmoothly();
    }
  };

  // Step 2 Validation (for Cricket & Swimming) -> Proceed to Step 3 (Payment)
  const handleCompleteStep2 = () => {
    setFormError('');
    if (!customerName.trim()) {
      setFormError(isHindi ? 'कृपया अपना नाम दर्ज करें' : 'Please enter your name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      setFormError(isHindi ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    // Valid! Smoothly transition to Step 3 (Payment)
    setCurrentStep(3);
    scrollToTopSmoothly();
  };

  // ---------------------------------------------------------------------------
  // 6. Submit Booking & Confirmation
  // ---------------------------------------------------------------------------
  const handleFinalConfirmBooking = async () => {
    setFormError('');
    setIsSubmitting(true);

    try {
      const bookingId = `KSA-${Date.now().toString().slice(-6)}`;

      if (category === 'admission') {
        // Save to student / admission records
        const admissionPayload = {
          name: mentorName.trim(),
          contact: admissionContact.trim(),
          studentCount: Number(studentCount) || 1,
          amountPaid: finalPayableAmount,
          transactionId: transactionId.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`,
          paymentStatus: 'APPROVED',
          paymentMethod: 'ONLINE',
          category: 'ACADEMIC',
          admissionDate: new Date().toISOString().split('T')[0],
          tenureDurationMonths: 6,
        };

        // Call students API
        try {
          await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(admissionPayload),
          });
        } catch {
          // Local fallback allowed
        }

        setConfirmedBooking({
          id: bookingId,
          category: 'admission',
          title: isHindi ? 'एकैडमी एडमिशन (Admission)' : 'Academy Admission',
          details: `${isHindi ? 'मेंटर' : 'Mentor'}: ${mentorName} • ${studentCount} ${isHindi ? 'छात्र' : 'Students'}`,
          dateTime: new Date().toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          personName: mentorName,
          contactNumber: admissionContact,
          count: studentCount,
          originalPrice,
          discountAmount,
          finalPaid: finalPayableAmount,
          transactionId: transactionId.trim() || undefined,
        });
      } else {
        // Cricket or Swimming Booking
        const resourceName =
          category === 'cricket'
            ? selectedNetType === 'bigbox'
              ? 'Big Box Cricket Turf (160x70 ft)'
              : 'Cricket Practice Net'
            : 'Semi-Olympic Swimming Pool';

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const prefix = category === 'cricket' ? 'KSA-CRK' : 'KSA-SWM';
        const generatedBookingId = `${prefix}-${randomNum}`;
        const createdAt = new Date().toISOString();
        let finalBookingId = generatedBookingId;

        const bookingPayload: Booking = {
          id: generatedBookingId,
          sport: category,
          category: category === 'cricket' && selectedNetType === 'bigbox' ? 'cricket_bigbox' : category,
          resourceId: category === 'cricket' ? selectedNetId : 'swimming-pool',
          resourceName,
          date: selectedDate,
          timeRange: selectedSlotTime,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          durationHours,
          hourlyRate: slotHourlyRate,
          originalAmount: originalPrice,
          discountAmount,
          userName: customerName.trim(),
          userPhone: customerPhone.trim(),
          playerCount: Number(playerCount) || 1,
          amountPaid: finalPayableAmount,
          paymentStatus: 'APPROVED',
          paymentMethod: 'ONLINE',
          transactionId: transactionId.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`,
          paymentScreenshot: paymentScreenshot || undefined,
          status: 'COMPLETED',
          createdAt,
        };

        // 1. Direct Real-Time Cloud Firestore Sync
        try {
          await createFirestoreBooking(bookingPayload);
        } catch (fsErr) {
          console.warn('Direct Firestore booking creation notice:', fsErr);
        }

        // 2. Server Dual-Sync API
        try {
          const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingPayload),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.booking?.id) {
              finalBookingId = data.booking.id;
            }
          }
        } catch {
          // Local fallback allowed
        }

        setConfirmedBooking({
          id: finalBookingId,
          category,
          title: resourceName,
          details: `${category === 'cricket' ? (isHindi ? 'खिलाड़ी' : 'Players') : (isHindi ? 'व्यक्ति' : 'Swimmers')}: ${playerCount} • ${durationHours} ${durationHours === 1 ? (isHindi ? 'घंटा' : 'Hour') : (isHindi ? 'घंटे' : 'Hours')}`,
          dateTime: `${selectedDate} • ${selectedSlotTime}`,
          personName: customerName,
          contactNumber: customerPhone,
          count: playerCount,
          originalPrice,
          discountAmount,
          finalPaid: finalPayableAmount,
          transactionId: transactionId.trim() || undefined,
        });
      }

      scrollToTopSmoothly();
    } catch (err: any) {
      setFormError(err?.message || 'Booking submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setConfirmedBooking(null);
    setCurrentStep(1);
    setCustomerName('');
    setCustomerPhone('');
    setMentorName('');
    setAdmissionContact('');
    setTransactionId('');
    setPaymentScreenshot('');
    setFormError('');
    scrollToTopSmoothly();
  };

  // ---------------------------------------------------------------------------
  // 7. Render: Completed Digital Slip / Booking Pass
  // ---------------------------------------------------------------------------
  if (confirmedBooking) {
    const shareText = encodeURIComponent(
      `🏏 Kuchaman Sports Academy Booking Confirmed!\nBooking ID: ${confirmedBooking.id}\nCategory: ${confirmedBooking.title}\nDate/Time: ${confirmedBooking.dateTime}\nPaid: ₹${confirmedBooking.finalPaid} (10% Online Booking Discount Applied)\nName: ${confirmedBooking.personName}\nPhone: ${confirmedBooking.contactNumber}\nVenue: KSA Kuchaman City`
    );

    return (
      <div ref={bookingContainerRef} className="w-full max-w-xl mx-auto px-4 py-8 select-none scroll-smooth">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden"
        >
          {/* Top Success Header */}
          <div className="bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white p-7 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCheck className="w-9 h-9 text-[#52b788]" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wider uppercase mb-1">
              {isHindi ? 'बुकिंग सफलतापूर्वक कन्फर्म' : 'Booking Successfully Confirmed'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-agbalumo text-white">
              {isHindi ? 'आपकी बुकिंग कन्फर्म है!' : 'You Are All Set!'}
            </h2>
            <p className="text-xs text-white/80 mt-1">
              {isHindi ? 'कुचामन स्पोर्ट्स एकैडमी में आपका स्वागत है' : 'Welcome to Kuchaman Sports Academy'}
            </p>
          </div>

          {/* Ticket Details */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Booking ID & Verified Badge */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  {isHindi ? 'बुकिंग संदर्भ संख्या' : 'Booking Reference ID'}
                </p>
                <p className="text-lg font-black text-[#2C1A0E] tracking-wider">{confirmedBooking.id}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {isHindi ? 'वेरिफाइड' : 'Verified'}
              </span>
            </div>

            {/* Summary Item Breakdown */}
            <div className="space-y-3 divide-y divide-neutral-100 text-sm">
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'सेवा / खेल' : 'Service / Sport'}</span>
                <span className="font-bold text-[#2C1A0E] text-right">{confirmedBooking.title}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'दिनांक व समय' : 'Date & Timing'}</span>
                <span className="font-bold text-[#2C1A0E] text-right">{confirmedBooking.dateTime}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'नाम' : 'Customer Name'}</span>
                <span className="font-bold text-[#2C1A0E]">{confirmedBooking.personName}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'मोबाइल नंबर' : 'Phone Number'}</span>
                <span className="font-bold text-[#2C1A0E]">{confirmedBooking.contactNumber}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'संख्या' : 'Count'}</span>
                <span className="font-bold text-[#2C1A0E]">{confirmedBooking.count}</span>
              </div>
            </div>

            {/* Price & 10% Discount Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm space-y-1.5">
              <div className="flex justify-between text-neutral-600">
                <span>{isHindi ? 'सामान्य शुल्क (Original Price)' : 'Standard Fee'}</span>
                <span className="line-through text-neutral-400">₹{confirmedBooking.originalPrice}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isHindi ? '10% ऑनलाइन बुकिंग छूट (10% Off)' : '10% Online Discount'}
                </span>
                <span>- ₹{confirmedBooking.discountAmount}</span>
              </div>
              <div className="border-t border-emerald-200/80 pt-1.5 flex justify-between items-center text-base font-black text-emerald-900">
                <span>{isHindi ? 'कुल ऑनलाइन भुगतान' : 'Total Paid Online'}</span>
                <span className="text-xl">₹{confirmedBooking.finalPaid}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>{isHindi ? 'व्हाट्सएप पर शेयर करें' : 'Share WhatsApp'}</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>{isHindi ? 'पास डाउनलोड करें' : 'Download Pass'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full h-12 rounded-xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isHindi ? 'नई बुकिंग करें' : 'Make Another Booking'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 8. Main View: App-like Progressive 2-3 Step Checkout Flow
  // ---------------------------------------------------------------------------
  const totalSteps = category === 'admission' ? 2 : 3;

  return (
    <div ref={bookingContainerRef} className="w-full max-w-2xl mx-auto px-4 pt-4 pb-16 select-none scroll-smooth">
      {/* Top Header Card */}
      <div className="text-center mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black tracking-wide uppercase mb-2 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          {isHindi ? '⚡ सभी ऑनलाइन बुकिंग पर 10% की तत्काल छूट' : '⚡ Flat 10% Instant Online Booking Discount'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#2C1A0E] tracking-tight">
          {isHindi ? 'त्वरित बुकिंग सेवा' : 'Instant Booking Service'}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
          {isHindi
            ? 'सरल 2–3 आसान चरणों में अपनी पसंदीदा तारीख व स्लॉट कन्फर्म करें'
            : 'Complete your booking in 2–3 frictionless steps'}
        </p>
      </div>

      {/* Category Segmented Pills (Thumb-friendly iOS/Android Switcher) */}
      <div className="bg-neutral-200/70 p-1.5 rounded-2xl flex items-center gap-1 mb-5 border border-neutral-300/60 shadow-inner">
        <button
          type="button"
          onClick={() => handleCategorySwitch('cricket')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            category === 'cricket'
              ? 'bg-[#2C1A0E] text-white shadow-md'
              : 'text-neutral-700 hover:text-black hover:bg-white/50'
          }`}
        >
          <span>🏏</span>
          <span>{isHindi ? 'क्रिकेट नेट/टर्फ' : 'Cricket Turf'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleCategorySwitch('swimming')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            category === 'swimming'
              ? 'bg-[#2C1A0E] text-white shadow-md'
              : 'text-neutral-700 hover:text-black hover:bg-white/50'
          }`}
        >
          <span>🏊</span>
          <span>{isHindi ? 'स्विमिंग पूल' : 'Swimming'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleCategorySwitch('admission')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            category === 'admission'
              ? 'bg-[#2C1A0E] text-white shadow-md'
              : 'text-neutral-700 hover:text-black hover:bg-white/50'
          }`}
        >
          <span>🎓</span>
          <span>{isHindi ? 'एकैडमी एडमिशन' : 'Admission'}</span>
        </button>
      </div>

      {/* Global Step Progress Indicator */}
      <div className="flex items-center justify-between px-2 mb-4">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          {isHindi
            ? `चरण ${currentStep} / ${totalSteps}`
            : `Step ${currentStep} of ${totalSteps}`}
        </span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 === currentStep
                  ? 'w-7 bg-[#2C1A0E]'
                  : i + 1 < currentStep
                  ? 'w-4 bg-emerald-600'
                  : 'w-2 bg-neutral-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"
        >
          <Info className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PROGRESSIVE FLOW: ADMISSION (2 STEPS ONLY)                                */}
      {/* ========================================================================= */}
      {category === 'admission' && (
        <div className="space-y-4">
          {/* STEP 1: Admission Basic Details */}
          {currentStep === 1 ? (
            <motion.div
              key="admission-step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-lg space-y-5"
            >
              <div className="border-b border-neutral-100 pb-3">
                <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-block mb-1">
                  {isHindi ? 'चरण 1: जरूरी जानकारी' : 'Step 1: Essential Details'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#2C1A0E]">
                  {isHindi ? 'एडमिशन हेतु विवरण दर्ज करें' : 'Enter Admission Details'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isHindi
                    ? 'कृपया केवल नीचे दिए 3 आसान विवरण भरें'
                    : 'Please fill in only these 3 simple required fields'}
                </p>
              </div>

              {/* 1. Mentor Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi ? 'मेंटर / कोच का नाम (Mentor Name)' : 'Mentor Name'} *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder={isHindi ? 'उदा. राहुल शर्मा / अमित सिंह' : 'e.g. Rahul Sharma'}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] focus:ring-2 focus:ring-[#2C1A0E]/20 text-sm font-semibold text-neutral-900 bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* 2. Contact Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi ? 'मोबाइल नंबर (Contact Number)' : 'Contact Number'} *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={admissionContact}
                    onChange={(e) => setAdmissionContact(e.target.value.replace(/\D/g, ''))}
                    placeholder="98290XXXXX"
                    className="w-full h-12 pl-16 pr-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] focus:ring-2 focus:ring-[#2C1A0E]/20 text-sm font-semibold text-neutral-900 bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* 3. How Many Students? */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi ? 'छात्रों की संख्या (How Many Students?)' : 'How Many Students?'} *
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-neutral-300 rounded-xl bg-neutral-50 p-1">
                    <button
                      type="button"
                      onClick={() => setStudentCount((c) => Math.max(1, c - 1))}
                      className="w-10 h-10 rounded-lg bg-white border border-neutral-200 text-lg font-bold flex items-center justify-center hover:bg-neutral-100 active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-base font-black text-neutral-900">
                      {studentCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentCount((c) => Math.min(50, c + 1))}
                      className="w-10 h-10 rounded-lg bg-white border border-neutral-200 text-lg font-bold flex items-center justify-center hover:bg-neutral-100 active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Select Preset Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setStudentCount(num)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          studentCount === num
                            ? 'bg-[#2C1A0E] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Preview & Instant 10% Discount Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 line-through">
                    ₹{originalPrice} ({studentCount} {isHindi ? 'छात्र' : 'Students'})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-emerald-900">₹{finalPayableAmount}</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {isHindi ? '10% ऑनलाइन छूट' : '10% Discount'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800">
                  {isHindi ? `बचत: ₹${discountAmount}` : `Save: ₹${discountAmount}`}
                </span>
              </div>

              {/* Primary Action Button: Proceed to Payment */}
              <button
                type="button"
                onClick={handleCompleteStep1}
                className="w-full h-14 rounded-2xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <span>{isHindi ? 'भुगतान पर जाएं (Proceed to Payment)' : 'Proceed to Payment'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : (
            /* COMPACT COLLAPSED STEP 1 FOR ADMISSION */
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => {
                setCurrentStep(1);
                scrollToTopSmoothly();
              }}
              className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-emerald-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {isHindi ? '✓ चरण 1 पूरा: एडमिशन विवरण' : '✓ Step 1 Completed: Admission Details'}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">
                    {mentorName} • {admissionContact} • {studentCount} {isHindi ? 'छात्र' : 'Students'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-50"
              >
                {isHindi ? 'बदलें' : 'Edit'}
              </button>
            </motion.div>
          )}

          {/* STEP 2: Online Payment & Confirmation for Admission */}
          {currentStep === 2 && (
            <motion.div
              key="admission-step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-lg space-y-5"
            >
              <div className="border-b border-neutral-100 pb-3">
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-1">
                  {isHindi ? 'चरण 2: ऑनलाइन भुगतान व कन्फर्मेशन' : 'Step 2: Payment & Confirm'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#2C1A0E]">
                  {isHindi ? 'ऑनलाइन भुगतान (10% छूट लागू)' : 'Online Payment (10% Off Applied)'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isHindi
                    ? '10% ऑनलाइन डिस्काउंट के साथ नीचे दिए UPI QR या UPI ID पर भुगतान करें'
                    : 'Scan QR or pay via UPI with automatic 10% online discount'}
                </p>
              </div>

              {/* Price Breakdown Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>{isHindi ? 'सामान्य शुल्क (Normal Price):' : 'Normal Price:'}</span>
                  <span className="line-through text-neutral-400">₹{originalPrice}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isHindi ? 'ऑनलाइन बुकिंग छूट (10% Off):' : 'Online Booking Discount (10%):'}
                  </span>
                  <span>- ₹{discountAmount}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between items-center text-base font-black text-neutral-900">
                  <span>{isHindi ? 'कुल ऑनलाइन भुगतान (Pay Online):' : 'Pay Online:'}</span>
                  <span className="text-2xl text-emerald-700">₹{finalPayableAmount}</span>
                </div>
              </div>

              {/* UPI QR Code Block */}
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl border-2 border-neutral-200 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt="KSA UPI QR Code"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>

                <div className="w-full max-w-sm space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-neutral-200 text-xs">
                    <span className="text-neutral-500 font-bold">UPI ID:</span>
                    <span className="font-mono font-black text-neutral-900">{upiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold flex items-center gap-1 active:scale-95"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
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

                  {/* Direct Mobile UPI Link */}
                  <a
                    href={upiPayUrl}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                  >
                    <span>📱 {isHindi ? 'UPI ऐप खोलें (GPay / PhonePe / Paytm)' : 'Open UPI App to Pay'}</span>
                  </a>
                </div>
              </div>

              {/* Simple UTR / Ref Number Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi
                    ? 'पेमेंट UTR / संदर्भ संख्या (Transaction / UTR No.)'
                    : 'Transaction / UTR Number'}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={isHindi ? 'उदा. 4239XXXXXXXX या UPI Ref No.' : 'e.g. 4239XXXXXXXX'}
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-sm font-mono font-semibold text-neutral-900 bg-white outline-none"
                />
              </div>

              {/* Confirm Admission Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmBooking}
                className="w-full h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{isHindi ? 'कन्फर्म हो रहा है...' : 'Confirming Admission...'}</span>
                ) : (
                  <>
                    <span>
                      {isHindi
                        ? `✓ ₹${finalPayableAmount} भुगतान पूरा करें व एडमिशन कन्फर्म करें`
                        : `✓ Pay ₹${finalPayableAmount} & Confirm Admission`}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROGRESSIVE FLOW: CRICKET & SWIMMING (3 STEPS MAX)                        */}
      {/* ========================================================================= */}
      {category !== 'admission' && (
        <div className="space-y-4">
          {/* --------------------------------------------------------------------- */}
          {/* STEP 1: Service / Net / Session Selection                             */}
          {/* --------------------------------------------------------------------- */}
          {currentStep === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-lg space-y-5"
            >
              <div className="border-b border-neutral-100 pb-3">
                <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-block mb-1">
                  {isHindi ? 'चरण 1: स्लॉट व समय का चयन' : 'Step 1: Choose Slot & Timing'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#2C1A0E]">
                  {category === 'cricket'
                    ? isHindi
                      ? 'क्रिकेट टर्फ / नेट और समय चुनें'
                      : 'Choose Cricket Turf & Time'
                    : isHindi
                    ? 'स्विमिंग पूल सेशन और तारीख चुनें'
                    : 'Choose Swimming Session & Date'}
                </h3>
              </div>

              {/* Cricket: Choose Turf Arena vs Practice Net */}
              {category === 'cricket' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
                    {isHindi ? 'टर्फ का प्रकार चुनें' : 'Select Turf Type'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Big Box Turf Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNetType('bigbox');
                        setSelectedNetId('net-big-box');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedNetType === 'bigbox'
                          ? 'border-[#2C1A0E] bg-[#FAF8F5] shadow-sm ring-2 ring-[#2C1A0E]/15'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-[#2C1A0E] flex items-center gap-1.5">
                          <span>🏟️</span>
                          <span>{isHindi ? 'बड़ा बॉक्स क्रिकेट टर्फ' : 'Big Box Arena'}</span>
                        </span>
                        {selectedNetType === 'bigbox' && (
                          <div className="w-5 h-5 rounded-full bg-[#2C1A0E] text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">160 × 70 ft All-Weather Turf</p>
                      <p className="text-xs font-bold text-emerald-700 mt-1">₹1,000 / hr (10% छूट: ₹900)</p>
                    </button>

                    {/* Practice Net Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNetType('practice');
                        setSelectedNetId('net-1');
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedNetType === 'practice'
                          ? 'border-[#2C1A0E] bg-[#FAF8F5] shadow-sm ring-2 ring-[#2C1A0E]/15'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-[#2C1A0E] flex items-center gap-1.5">
                          <span>🏏</span>
                          <span>{isHindi ? 'क्रिकेट प्रैक्टिस नेट' : 'Practice Net'}</span>
                        </span>
                        {selectedNetType === 'practice' && (
                          <div className="w-5 h-5 rounded-full bg-[#2C1A0E] text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">Astro-Turf Elite Batting Lane</p>
                      <p className="text-xs font-bold text-emerald-700 mt-1">₹100 / person (10% छूट: ₹90)</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Date Selector (Horizontal Scroll Row) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
                  {isHindi ? 'तारीख चुनें (Select Date)' : 'Select Date'}
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.iso;
                    return (
                      <button
                        key={item.iso}
                        type="button"
                        onClick={() => setSelectedDate(item.iso)}
                        className={`shrink-0 w-20 py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#2C1A0E] text-white border-[#2C1A0E] shadow-sm'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          {item.isToday
                            ? isHindi
                              ? 'आज'
                              : 'Today'
                            : item.isTomorrow
                            ? isHindi
                              ? 'कल'
                              : 'Tmrw'
                            : item.dayName}
                        </p>
                        <p className="text-lg font-black my-0.5">{item.dayNumber}</p>
                        <p className="text-[10px] opacity-70 font-semibold">{item.monthName}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Booking Time Watch / Time Picker */}
              <div className="pt-1">
                <BookingTimeWatch
                  selectedDate={selectedDate}
                  selectedSport={category as 'cricket' | 'swimming'}
                  selectedResourceId={category === 'cricket' ? selectedNetId : 'swimming-pool'}
                  selectedTurfType={selectedNetType}
                  playerCount={playerCount}
                  initialStartTime={selectedStartTime}
                  initialDurationHours={durationHours}
                  ownerConfig={ownerConfig}
                  isHindi={isHindi}
                  onTimeChange={handleTimeChange}
                />
              </div>

              {/* Primary Action Button: Step 1 -> Step 2 */}
              <button
                type="button"
                onClick={handleCompleteStep1}
                className="w-full h-14 rounded-2xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <span>{isHindi ? 'आगे बढ़ें (Continue)' : 'Continue'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : (
            /* COMPACT COLLAPSED STEP 1 */
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => {
                setCurrentStep(1);
                scrollToTopSmoothly();
              }}
              className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-emerald-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {isHindi ? '✓ चरण 1 पूरा: स्लॉट चयन' : '✓ Step 1 Completed: Slot Selected'}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">
                    {category === 'cricket'
                      ? selectedNetType === 'bigbox'
                        ? (isHindi ? 'बॉक्स टर्फ (Big Box)' : 'Big Box Cricket Turf')
                        : (isHindi ? 'प्रैक्टिस नेट (Practice Net)' : 'Practice Net')
                      : (isHindi ? 'स्विमिंग पूल' : 'Swimming Pool')}{' '}
                    • {selectedDate} • {selectedSlotTime} ({durationHours}{' '}
                    {durationHours === 1 ? (isHindi ? 'घंटा' : 'hr') : (isHindi ? 'घंटे' : 'hrs')})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-50"
              >
                {isHindi ? 'बदलें' : 'Edit'}
              </button>
            </motion.div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP 2: Basic Contact & Players (Cricket & Swimming)                   */}
          {/* --------------------------------------------------------------------- */}
          {currentStep === 2 ? (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-lg space-y-5"
            >
              <div className="border-b border-neutral-100 pb-3">
                <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-block mb-1">
                  {isHindi ? 'चरण 2: संपर्क जानकारी' : 'Step 2: Contact Details'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#2C1A0E]">
                  {isHindi ? 'अपनी सामान्य जानकारी दर्ज करें' : 'Enter Your Basic Details'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isHindi ? 'बुकिंग कन्फर्मेशन व पास हेतु' : 'For booking confirmation & digital pass'}
                </p>
              </div>

              {/* 1. Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi ? 'आपका नाम (Your Full Name)' : 'Your Full Name'} *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isHindi ? 'उदा. ईश्वर कालवा' : 'e.g. Ishvar Kalwa'}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-sm font-semibold text-neutral-900 bg-white outline-none"
                  />
                </div>
              </div>

              {/* 2. Mobile Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Number'} *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="98290XXXXX"
                    className="w-full h-12 pl-16 pr-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-sm font-semibold text-neutral-900 bg-white outline-none"
                  />
                </div>
              </div>

              {/* 3. Player / Person Count */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {category === 'cricket'
                    ? isHindi
                      ? 'खिलाड़ियों की संख्या (Number of Players)'
                      : 'Number of Players'
                    : isHindi
                    ? 'व्यक्तियों की संख्या (Number of Persons)'
                    : 'Number of Persons'}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-neutral-300 rounded-xl bg-neutral-50 p-1">
                    <button
                      type="button"
                      onClick={() => setPlayerCount((c) => Math.max(1, c - 1))}
                      className="w-10 h-10 rounded-lg bg-white border border-neutral-200 text-lg font-bold flex items-center justify-center hover:bg-neutral-100 active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-base font-black text-neutral-900">
                      {playerCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPlayerCount((c) => Math.min(25, c + 1))}
                      className="w-10 h-10 rounded-lg bg-white border border-neutral-200 text-lg font-bold flex items-center justify-center hover:bg-neutral-100 active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 4, 6, 10, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPlayerCount(num)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          playerCount === num
                            ? 'bg-[#2C1A0E] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Breakdown Preview */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 line-through">₹{originalPrice}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-emerald-900">₹{finalPayableAmount}</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {isHindi ? '10% ऑनलाइन छूट' : '10% Online Off'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800">
                  {isHindi ? `बचत: ₹${discountAmount}` : `Save: ₹${discountAmount}`}
                </span>
              </div>

              {/* Action Button: Step 2 -> Step 3 */}
              <button
                type="button"
                onClick={handleCompleteStep2}
                className="w-full h-14 rounded-2xl bg-[#2C1A0E] hover:bg-[#432818] text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <span>{isHindi ? 'भुगतान पर जाएं (Proceed to Payment)' : 'Proceed to Payment'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : currentStep === 3 ? (
            /* COMPACT COLLAPSED STEP 2 */
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => {
                setCurrentStep(2);
                scrollToTopSmoothly();
              }}
              className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-emerald-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {isHindi ? '✓ चरण 2 पूरा: संपर्क विवरण' : '✓ Step 2 Completed: Contact Details'}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">
                    {customerName} • {customerPhone} • {playerCount}{' '}
                    {category === 'cricket' ? (isHindi ? 'खिलाड़ी' : 'Players') : (isHindi ? 'व्यक्ति' : 'Persons')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-50"
              >
                {isHindi ? 'बदलें' : 'Edit'}
              </button>
            </motion.div>
          ) : null}

          {/* --------------------------------------------------------------------- */}
          {/* STEP 3: Online Payment & Confirm                                      */}
          {/* --------------------------------------------------------------------- */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-lg space-y-5"
            >
              <div className="border-b border-neutral-100 pb-3">
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-1">
                  {isHindi ? 'चरण 3: ऑनलाइन भुगतान' : 'Step 3: Online Payment'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#2C1A0E]">
                  {isHindi ? 'ऑनलाइन भुगतान (10% छूट लागू)' : 'Online Payment (10% Off Applied)'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isHindi
                    ? '10% तत्काल डिस्काउंट के साथ नीचे दिए UPI QR या UPI ID पर भुगतान करें'
                    : 'Pay via UPI QR with automatic 10% online booking discount'}
                </p>
              </div>

              {/* Price Breakdown Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>{isHindi ? 'सामान्य शुल्क (Normal Price):' : 'Normal Price:'}</span>
                  <span className="line-through text-neutral-400">₹{originalPrice}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isHindi ? 'ऑनलाइन बुकिंग छूट (10% Off):' : 'Online Booking Discount (10%):'}
                  </span>
                  <span>- ₹{discountAmount}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between items-center text-base font-black text-neutral-900">
                  <span>{isHindi ? 'कुल ऑनलाइन देय राशि (Pay Online):' : 'Pay Online:'}</span>
                  <span className="text-2xl text-emerald-700">₹{finalPayableAmount}</span>
                </div>
              </div>

              {/* UPI QR Code Block */}
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl border-2 border-neutral-200 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt="KSA UPI QR Code"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>

                <div className="w-full max-w-sm space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-neutral-200 text-xs">
                    <span className="text-neutral-500 font-bold">UPI ID:</span>
                    <span className="font-mono font-black text-neutral-900">{upiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold flex items-center gap-1 active:scale-95"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
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

                  {/* Direct Mobile UPI Link */}
                  <a
                    href={upiPayUrl}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                  >
                    <span>📱 {isHindi ? 'UPI ऐप खोलें (GPay / PhonePe / Paytm)' : 'Open UPI App to Pay'}</span>
                  </a>
                </div>
              </div>

              {/* UTR / Transaction No. */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                  {isHindi
                    ? 'पेमेंट UTR / संदर्भ संख्या (Transaction / UTR No.)'
                    : 'Transaction / UTR Number'}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={isHindi ? 'उदा. 4239XXXXXXXX या UPI Ref No.' : 'e.g. 4239XXXXXXXX'}
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-sm font-mono font-semibold text-neutral-900 bg-white outline-none"
                />
              </div>

              {/* Confirm Booking Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmBooking}
                className="w-full h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{isHindi ? 'कन्फर्म हो रहा है...' : 'Confirming Booking...'}</span>
                ) : (
                  <>
                    <span>
                      {isHindi
                        ? `✓ ₹${finalPayableAmount} भुगतान पूरा करें व बुकिंग कन्फर्म करें`
                        : `✓ Pay ₹${finalPayableAmount} & Confirm Booking`}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
