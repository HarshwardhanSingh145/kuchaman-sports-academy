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
  CreditCard,
  Wallet,
  Building2,
  AlertTriangle,
  Loader2,
  Zap,
  Smartphone,
  AlertCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CricketNet, CricketSlot, SwimmingSession, Booking, AcademyConfig } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';
import { DEFAULT_NETS, DEFAULT_CONFIG, CRICKET_TIME_SLOTS, SWIMMING_TIME_SLOTS } from '@/lib/defaults';
import { BookingTimeWatch } from '@/components/BookingTimeWatch';
import { subscribeToConfig, createFirestoreBooking, subscribeToBookings } from '@/lib/firestore-service';
import { buildOwnerVerificationMessage, generateOwnerWhatsAppLink } from '@/lib/notifications';
import { TermsModal } from '@/components/TermsModal';
import { RecurringBookingSection } from '@/components/RecurringBookingSection';

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
  const [bookingMode, setBookingMode] = useState<'standard' | 'recurring'>('standard');
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
  const [paymentMethodType, setPaymentMethodType] = useState<'cashfree' | 'manual_upi'>('manual_upi');
  const [cashfreeConfigStatus, setCashfreeConfigStatus] = useState<{ configured: boolean; env: string } | null>(null);
  const [cashfreeNotice, setCashfreeNotice] = useState<{ show: boolean; orderId: string; amount: number } | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // UPI verification flow states
  const [hasOpenedUpi, setHasOpenedUpi] = useState<boolean>(false);
  const [hasReturnedFromUpi, setHasReturnedFromUpi] = useState<boolean>(false);
  const [submittedVerificationBooking, setSubmittedVerificationBooking] = useState<Booking | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'AWAITING_VERIFICATION' | 'CONFIRMED' | 'PAYMENT_VERIFICATION_FAILED'
  >('AWAITING_VERIFICATION');

  // Terms & Conditions Acceptance State (agreed by default for seamless 1-click verification)
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [termsHighlighted, setTermsHighlighted] = useState<boolean>(false);

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
  // 2. Fetch Config, Availability & Mobile Session State Restoration
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Restore session on mount (Crucial for mobile users returning from UPI app)
    try {
      const savedDraft = sessionStorage.getItem('ksa_booking_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.selectedDate) setSelectedDate(parsed.selectedDate);
        if (parsed.selectedStartTime) setSelectedStartTime(parsed.selectedStartTime);
        if (parsed.selectedEndTime) setSelectedEndTime(parsed.selectedEndTime);
        if (parsed.selectedSlotTime) setSelectedSlotTime(parsed.selectedSlotTime);
        if (parsed.durationHours) setDurationHours(parsed.durationHours);
        if (parsed.selectedNetId) setSelectedNetId(parsed.selectedNetId);
        if (parsed.selectedNetType) setSelectedNetType(parsed.selectedNetType);
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
        if (parsed.playerCount) setPlayerCount(parsed.playerCount);
        if (parsed.mentorName) setMentorName(parsed.mentorName);
        if (parsed.admissionContact) setAdmissionContact(parsed.admissionContact);
        if (parsed.studentCount) setStudentCount(parsed.studentCount);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.transactionId) setTransactionId(parsed.transactionId);
      }

      const upiOpened = sessionStorage.getItem('ksa_has_opened_upi');
      if (upiOpened === 'true') {
        setHasOpenedUpi(true);
      }
      const upiReturned = sessionStorage.getItem('ksa_has_returned_upi');
      if (upiReturned === 'true') {
        setHasReturnedFromUpi(true);
      }

      const savedPendingBooking = sessionStorage.getItem('ksa_pending_verification_booking');
      if (savedPendingBooking) {
        const parsedPending = JSON.parse(savedPendingBooking);
        setSubmittedVerificationBooking(parsedPending);
      }
    } catch (err) {
      console.warn('Session restoration notice:', err);
    }

    // 1. Initial fetch from API
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.config) {
          setOwnerConfig(data.config);
        }
      })
      .catch(() => {});

    // Check Cashfree Payment Gateway status
    fetch('/api/payments/cashfree/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success) {
          setCashfreeConfigStatus({ configured: data.configured, env: data.env });
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

  // Real-time listener for submitted verification booking
  useEffect(() => {
    if (!submittedVerificationBooking?.id) return;

    const targetId = submittedVerificationBooking.id;

    // Real-time Firestore sync
    const unsubscribe = subscribeToBookings((allBookings) => {
      const match = allBookings.find((b) => b.id === targetId);
      if (match) {
        if (match.status === 'CONFIRMED' && match.paymentStatus === 'APPROVED') {
          setVerificationStatus('CONFIRMED');
          setConfirmedBooking({
            id: match.id,
            category: match.sport || 'cricket',
            title: match.resourceName || 'Kuchaman Sports Academy',
            details: `${match.playerCount || 1} Players • ${match.durationHours || 1} Hours`,
            dateTime: `${match.date} • ${match.timeRange}`,
            personName: match.userName,
            contactNumber: match.userPhone,
            count: match.playerCount || 1,
            originalPrice: match.originalAmount || match.amountPaid || 0,
            discountAmount: match.discountAmount || 0,
            finalPaid: match.amountPaid || 0,
            transactionId: match.transactionId,
          });
          try {
            sessionStorage.removeItem('ksa_pending_verification_booking');
          } catch {}
          try {
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          } catch {}
        } else if (
          match.status === 'PAYMENT_VERIFICATION_FAILED' ||
          match.paymentStatus === 'REJECTED'
        ) {
          setVerificationStatus('PAYMENT_VERIFICATION_FAILED');
        }
      }
    });

    // Periodic polling fallback every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(targetId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.booking) {
            const b = data.booking;
            if (b.status === 'CONFIRMED' && b.paymentStatus === 'APPROVED') {
              setVerificationStatus('CONFIRMED');
              setConfirmedBooking({
                id: b.id,
                category: b.sport || 'cricket',
                title: b.resourceName || 'Kuchaman Sports Academy',
                details: `${b.playerCount || 1} Players • ${b.durationHours || 1} Hours`,
                dateTime: `${b.date} • ${b.timeRange}`,
                personName: b.userName,
                contactNumber: b.userPhone,
                count: b.playerCount || 1,
                originalPrice: b.originalAmount || b.amountPaid || 0,
                discountAmount: b.discountAmount || 0,
                finalPaid: b.amountPaid || 0,
                transactionId: b.transactionId,
              });
              try {
                sessionStorage.removeItem('ksa_pending_verification_booking');
              } catch {}
              try {
                confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
              } catch {}
            } else if (
              b.status === 'PAYMENT_VERIFICATION_FAILED' ||
              b.paymentStatus === 'REJECTED'
            ) {
              setVerificationStatus('PAYMENT_VERIFICATION_FAILED');
            }
          }
        }
      } catch {}
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [submittedVerificationBooking?.id]);

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

  // Handler: Customer clicks "Choose your preferred UPI app"
  const handleChooseUpiApp = () => {
    setHasOpenedUpi(true);

    // 1. Preserve draft session before launching UPI app (prevents mobile reload loss)
    try {
      sessionStorage.setItem('ksa_has_opened_upi', 'true');
      const draft = {
        category,
        selectedDate,
        selectedStartTime,
        selectedEndTime,
        selectedSlotTime,
        durationHours,
        selectedNetId,
        selectedNetType,
        customerName,
        customerPhone,
        playerCount,
        mentorName,
        admissionContact,
        studentCount,
        currentStep: category === 'admission' ? 2 : 3,
        transactionId,
      };
      sessionStorage.setItem('ksa_booking_draft', JSON.stringify(draft));
    } catch {}

    // 2. Open UPI protocol intent
    window.location.href = upiPayUrl;

    // 3. Detect when customer returns to browser / website
    const triggerReturn = () => {
      setHasReturnedFromUpi(true);
      try {
        sessionStorage.setItem('ksa_has_returned_upi', 'true');
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerReturn();
      }
    };

    const handleWindowFocus = () => {
      triggerReturn();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { once: true });
    window.addEventListener('focus', handleWindowFocus, { once: true });

    // Fallback timer in case platform doesn't dispatch visibilitychange/focus
    setTimeout(() => {
      triggerReturn();
    }, 2500);
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
  // 6. Cashfree Payment Execution & Verification
  // ---------------------------------------------------------------------------
  const executeVerification = async (orderId: string, isSimulated = false) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      const resourceName =
        category === 'cricket'
          ? selectedNetType === 'bigbox'
            ? 'Big Box Cricket Turf (160x70 ft)'
            : 'Cricket Practice Net'
          : 'Semi-Olympic Swimming Pool';

      const bookingPayload =
        category === 'admission'
          ? {
              category: 'admission',
              mentorName: mentorName.trim(),
              admissionContact: admissionContact.trim(),
              studentCount: Number(studentCount) || 1,
              finalPayableAmount,
              amountPaid: finalPayableAmount,
            }
          : {
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
            };

      const res = await fetch('/api/payments/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          bookingPayload,
          category,
          isSimulated,
        }),
      });

      const verifyData = await res.json();

      // STRICT VALIDATION: ONLY confirm if payment is verified as PAID!
      if (verifyData.success && verifyData.isPaid) {
        // Confetti explosion for celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        if (category === 'admission') {
          setConfirmedBooking({
            id: orderId,
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
            transactionId: verifyData.transactionId || orderId,
          });
        } else {
          setConfirmedBooking({
            id: verifyData.booking?.id || orderId,
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
            transactionId: verifyData.transactionId || orderId,
          });
        }

        setCashfreeNotice(null);
        scrollToTopSmoothly();
      } else {
        setFormError(
          verifyData.error ||
            (isHindi
              ? 'भुगतान अधूरा या विफल रहा। स्लॉट केवल सफल भुगतान के बाद ही कन्फर्म होगा।'
              : 'Payment not completed or failed. Booking was NOT confirmed.')
        );
      }
    } catch (err: any) {
      setFormError(err.message || 'Payment verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayWithCashfree = async () => {
    setFormError('');

    if (!agreedToTerms) {
      setFormError(
        isHindi
          ? 'कृपया आगे बढ़ने से पहले नियम एवं शर्तें (Terms & Conditions) को पढ़कर स्वीकार करें।'
          : 'Please read and agree to the Terms & Conditions before completing payment.'
      );
      setTermsHighlighted(true);
      setTimeout(() => setTermsHighlighted(false), 3000);
      return;
    }

    setIsSubmitting(true);

    try {
      const customerPhoneVal = category === 'admission' ? admissionContact : customerPhone;
      const customerNameVal = category === 'admission' ? mentorName : customerName;

      // 1. Create order on server via Cashfree
      const orderRes = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalPayableAmount,
          customerName: customerNameVal,
          customerPhone: customerPhoneVal,
          category,
          orderNote: `Kuchaman Sports Academy - ${category.toUpperCase()}`,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success) {
        if (orderData.notConfigured) {
          // Cashfree credentials missing in .env
          setCashfreeNotice({
            show: true,
            orderId: orderData.orderId,
            amount: finalPayableAmount,
          });
          setIsSubmitting(false);
          return;
        }
        throw new Error(orderData.error || 'Failed to initiate Cashfree payment');
      }

      const { payment_session_id, order_id, environment } = orderData;

      // 2. Dynamically import Cashfree JS SDK v3
      const { load } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await load({
        mode: (environment === 'production' ? 'production' : 'sandbox') as any,
      });

      // 3. Open Cashfree Checkout Modal popup
      await cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: '_modal',
      });

      // 4. Verify payment with backend Cashfree API
      await executeVerification(order_id);
    } catch (err: any) {
      console.warn('Cashfree payment interaction:', err);
      // If error occurred during checkout modal close, do not auto-confirm without verify
      setFormError(err.message || 'Payment was cancelled or could not be initiated.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Booking & Confirmation (Routes according to selected payment method)
  const handleFinalConfirmBooking = async () => {
    if (paymentMethodType === 'cashfree') {
      await handlePayWithCashfree();
      return;
    }

    // Manual UPI Flow: Create pending verification booking request immediately
    setFormError('');

    // Ensure terms are confirmed
    if (!agreedToTerms) {
      setAgreedToTerms(true);
    }

    setIsSubmitting(true);

    try {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const prefix = category === 'cricket' ? 'KSA-CRK' : category === 'swimming' ? 'KSA-SWM' : 'KSA-ADM';
      const generatedBookingId = `${prefix}-${randomNum}`;
      const createdAt = new Date().toISOString();

      const resourceName =
        category === 'cricket'
          ? selectedNetType === 'bigbox'
            ? 'Big Box Cricket Turf (160x70 ft)'
            : 'Cricket Practice Net'
          : category === 'swimming'
          ? 'Semi-Olympic Swimming Pool'
          : 'Academy Admission';

      const bookingPayload: Booking = {
        id: generatedBookingId,
        sport: category,
        category: category === 'cricket' && selectedNetType === 'bigbox' ? 'cricket_bigbox' : category,
        resourceId:
          category === 'cricket'
            ? selectedNetId
            : category === 'swimming'
            ? 'swimming-pool'
            : 'academy-admission',
        resourceName,
        date: category === 'admission' ? new Date().toISOString().split('T')[0] : selectedDate,
        timeRange: category === 'admission' ? 'Academy Admission' : selectedSlotTime,
        startTime: category === 'admission' ? '06:00 AM' : selectedStartTime,
        endTime: category === 'admission' ? '08:00 PM' : selectedEndTime,
        durationHours: category === 'admission' ? 1 : durationHours,
        hourlyRate: slotHourlyRate,
        originalAmount: originalPrice,
        discountAmount,
        userName: (category === 'admission' ? mentorName : customerName).trim(),
        userPhone: (category === 'admission' ? admissionContact : customerPhone).trim(),
        playerCount: category === 'admission' ? Number(studentCount) || 1 : Number(playerCount) || 1,
        amountPaid: finalPayableAmount,
        paymentStatus: 'PENDING_VERIFICATION',
        paymentMethod: 'UPI_QR',
        transactionId: transactionId.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`,
        paymentScreenshot: paymentScreenshot || undefined,
        status: 'AWAITING_VERIFICATION',
        createdAt,
      };

      // 1. Direct Firestore write for instant client cache resilience
      try {
        await createFirestoreBooking(bookingPayload);
      } catch (fsErr) {
        console.warn('Direct Firestore booking creation notice:', fsErr);
      }

      // 2. Persist via backend API (which also automatically notifies the owner via backend WhatsApp)
      let activeBooking = bookingPayload;
      try {
        const apiRes = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.booking) {
            activeBooking = apiData.booking;
          }
        }
      } catch (apiErr) {
        console.warn('Backend booking persistence notice:', apiErr);
      }

      // 3. Update UI to "Booking Request Submitted" screen
      setSubmittedVerificationBooking(activeBooking);
      setVerificationStatus('AWAITING_VERIFICATION');

      try {
        sessionStorage.setItem('ksa_pending_verification_booking', JSON.stringify(activeBooking));
        sessionStorage.removeItem('ksa_booking_draft');
      } catch {}

      scrollToTopSmoothly();
    } catch (err: any) {
      setFormError(err?.message || 'Booking submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    try {
      sessionStorage.removeItem('ksa_booking_draft');
      sessionStorage.removeItem('ksa_has_opened_upi');
      sessionStorage.removeItem('ksa_has_returned_upi');
      sessionStorage.removeItem('ksa_pending_verification_booking');
    } catch {}
    setSubmittedVerificationBooking(null);
    setVerificationStatus('AWAITING_VERIFICATION');
    setHasOpenedUpi(false);
    setHasReturnedFromUpi(false);
    setConfirmedBooking(null);
    setCurrentStep(1);
    setCustomerName('');
    setCustomerPhone('');
    setMentorName('');
    setAdmissionContact('');
    setStudentCount(1);
    setPlayerCount(1);
    setTransactionId('');
    setPaymentScreenshot('');
    setFormError('');
    scrollToTopSmoothly();
  };

  // ---------------------------------------------------------------------------
  // 6.5 Render: Pending Verification or Failed Verification Screen
  // ---------------------------------------------------------------------------
  if (submittedVerificationBooking && !confirmedBooking) {
    const currentOwnerNumber = ownerConfig.ownerWhatsAppNumber || ownerConfig.phone || '8142731917';
    const cleanDisplayNumber = currentOwnerNumber.replace(/\D/g, '').slice(-10) || '8142731917';

    const ownerWhatsAppLink = generateOwnerWhatsAppLink(
      {
        id: submittedVerificationBooking.id,
        userName: submittedVerificationBooking.userName,
        userPhone: submittedVerificationBooking.userPhone,
        amountPaid: submittedVerificationBooking.amountPaid || 0,
        sport: submittedVerificationBooking.sport,
        resourceName: submittedVerificationBooking.resourceName,
        date: submittedVerificationBooking.date,
        timeRange: submittedVerificationBooking.timeRange,
        transactionId: submittedVerificationBooking.transactionId,
      },
      currentOwnerNumber
    );

    const isPending = verificationStatus === 'AWAITING_VERIFICATION';
    const isFailed = verificationStatus === 'PAYMENT_VERIFICATION_FAILED';

    return (
      <div ref={bookingContainerRef} className="w-full max-w-xl mx-auto px-4 py-8 select-none scroll-smooth">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden"
        >
          {/* Header Card based on Verification Status */}
          {isPending ? (
            <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white p-7 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Clock className="w-8 h-8 text-amber-100 animate-pulse" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase mb-1.5">
                {isHindi ? 'बुकिंग शेड्यूल्ड • सत्यापन प्रतीक्षित' : 'Booking Scheduled • Awaiting Owner Approval'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-agbalumo text-white">
                {isHindi ? 'बुकिंग शेड्यूल्ड (Booking Scheduled)' : 'Booking Scheduled'}
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-2 max-w-md mx-auto leading-relaxed">
                {isHindi
                  ? `आपकी बुकिंग शेड्यूल कर ली गई है! इस नाम (${submittedVerificationBooking.userName}) के ग्राहक ने इस समय (${submittedVerificationBooking.timeRange || 'स्लॉट'}) के लिए ₹${submittedVerificationBooking.amountPaid} का भुगतान सबमिट किया है। ओनर (${cleanDisplayNumber}) द्वारा व्हाट्सएप पर "YES" करते ही यह तुरंत लाइव कन्फर्म हो जाएगी।`
                  : `Your booking is scheduled! Customer ${submittedVerificationBooking.userName} has submitted ₹${submittedVerificationBooking.amountPaid} for ${submittedVerificationBooking.timeRange || 'slot'}. It will be confirmed once owner (${cleanDisplayNumber}) clicks YES on WhatsApp.`}
              </p>
            </div>
          ) : isFailed ? (
            <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 text-white p-7 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase mb-1.5">
                {isHindi ? 'सत्यापन विफल • FAILED' : 'Payment Verification Failed'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-agbalumo text-white">
                {isHindi ? 'भुगतान सत्यापन विफल' : 'Payment Verification Failed'}
              </h2>
              <p className="text-xs sm:text-sm text-rose-100/90 mt-2 max-w-md mx-auto leading-relaxed">
                {isHindi
                  ? 'हम आपके भुगतान का सत्यापन नहीं कर सके। कृपया सहायता के लिए एकैडमी से संपर्क करें।'
                  : 'We could not verify your payment. Please contact the academy for assistance.'}
              </p>
            </div>
          ) : null}

          {/* Ticket Details */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Booking Reference ID */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  {isHindi ? 'बुकिंग संदर्भ संख्या (Reference ID)' : 'Booking Reference ID'}
                </p>
                <p className="text-lg font-black text-[#2C1A0E] tracking-wider">
                  {submittedVerificationBooking.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(submittedVerificationBooking.id);
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? (isHindi ? 'कॉपी हुआ' : 'Copied') : isHindi ? 'कॉपी' : 'Copy'}</span>
              </button>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-3 divide-y divide-neutral-100 text-sm">
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'ग्राहक का नाम' : 'Customer Name'}</span>
                <span className="font-bold text-[#2C1A0E]">{submittedVerificationBooking.userName}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'मोबाइल नंबर' : 'Phone Number'}</span>
                <span className="font-bold text-[#2C1A0E]">{submittedVerificationBooking.userPhone}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'सेवा / खेल' : 'Sport / Service'}</span>
                <span className="font-bold text-[#2C1A0E] text-right">
                  {submittedVerificationBooking.resourceName || submittedVerificationBooking.sport.toUpperCase()}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'दिनांक व स्लॉट' : 'Date & Slot Time'}</span>
                <span className="font-bold text-[#2C1A0E] text-right">
                  {submittedVerificationBooking.date} • {submittedVerificationBooking.timeRange}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'भुगतान विधि' : 'Payment Method'}</span>
                <span className="font-bold text-neutral-800">UPI (Manual)</span>
              </div>
              {submittedVerificationBooking.transactionId && (
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-neutral-500">{isHindi ? 'ट्रांजेक्शन UTR / Ref' : 'Transaction / UTR'}</span>
                  <span className="font-mono font-bold text-neutral-800 text-xs">
                    {submittedVerificationBooking.transactionId}
                  </span>
                </div>
              )}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'भुगतान स्थिति' : 'Payment Status'}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isPending
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {isPending ? '⏳ Pending Verification' : '❌ Rejected'}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-neutral-500">{isHindi ? 'बुकिंग स्थिति' : 'Booking Status'}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isPending
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {isPending ? '⏳ Awaiting Payment Verification' : '❌ Payment Verification Failed'}
                </span>
              </div>
            </div>

            {/* Total Amount Card */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-sm flex justify-between items-center">
              <div>
                <span className="text-xs text-amber-900 font-bold block">
                  {isHindi ? 'कुल देय / भुगतान राशि' : 'Amount Paid / Payable'}
                </span>
                <span className="text-xs text-amber-700">10% Online Booking Discount Applied</span>
              </div>
              <span className="text-2xl font-black text-amber-950">₹{submittedVerificationBooking.amountPaid}</span>
            </div>

            {/* Live syncing banner */}
            {isPending && (
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-neutral-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>
                    {isHindi
                      ? 'लाइव स्टेटस मॉनिटरिंग सक्रिय है'
                      : 'Live Status Monitoring Active'}
                  </span>
                </div>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  {isHindi
                    ? 'जैसे ही एकैडमी ओनर अपने बैंक/UPI में भुगतान चेक करके इसे अप्रूव करेंगे, यह स्क्रीन अपने आप कन्फर्म हो जाएगी।'
                    : 'As soon as the academy owner checks the bank/UPI account and approves your payment, this screen will update to Confirmed in real-time.'}
                </p>
              </div>
            )}

            {/* Actions for Customer */}
            <div className="space-y-2.5 pt-1">
              <a
                href={ownerWhatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {isHindi
                    ? `📲 एकैडमी ओनर (${cleanDisplayNumber}) को व्हाट्सएप पर भेजें`
                    : `📲 Send Request to Owner on WhatsApp (${cleanDisplayNumber})`}
                </span>
              </a>

              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`tel:${cleanDisplayNumber}`}
                  className="h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <Phone className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{isHindi ? `कॉल करें: ${cleanDisplayNumber}` : `Call ${cleanDisplayNumber}`}</span>
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-11 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'नई बुकिंग' : 'New Booking'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

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
              {isHindi ? '✅ बुकिंग कन्फर्म • CONFIRMED' : '✅ Booking Confirmed'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-agbalumo text-white">
              {isHindi ? 'आपकी बुकिंग कन्फर्म है!' : 'Booking Confirmed'}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md mx-auto">
              {isHindi
                ? 'आपका भुगतान सफलतापूर्वक सत्यापित हो गया है और आपकी बुकिंग कन्फर्म है।'
                : 'Your payment has been verified successfully and your booking is confirmed.'}
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

      {/* Primary Booking Mode Selector (One-Time vs Recurring) */}
      <div className="bg-neutral-200/80 p-1.5 rounded-2xl flex items-center gap-1.5 mb-5 border border-neutral-300/80 shadow-inner">
        <button
          type="button"
          onClick={() => setBookingMode('standard')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            bookingMode === 'standard'
              ? 'bg-[#2C1A0E] text-white shadow-md'
              : 'text-neutral-700 hover:text-black hover:bg-white/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{isHindi ? 'सामान्य बुकिंग (One-Time)' : 'One-Time Booking'}</span>
        </button>

        <button
          type="button"
          onClick={() => setBookingMode('recurring')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            bookingMode === 'recurring'
              ? 'bg-[#2C1A0E] text-white shadow-md'
              : 'text-neutral-700 hover:text-black hover:bg-white/50'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
          <span>{isHindi ? '🔄 नियमित बुकिंग (Recurring)' : '🔄 Recurring Booking'}</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-neutral-950 text-[10px] font-black uppercase">
            New
          </span>
        </button>
      </div>

      {bookingMode === 'recurring' ? (
        <RecurringBookingSection onBackToOneTime={() => setBookingMode('standard')} />
      ) : (
        <>
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

              {/* Payment Method Selector Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
                  {isHindi ? 'भुगतान माध्यम चुनें' : 'Choose Payment Method'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('cashfree')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethodType === 'cashfree'
                        ? 'border-[#2C1A0E] bg-[#FAF8F5] shadow-sm ring-2 ring-[#2C1A0E]/15'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-[#2C1A0E] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        <span>Cashfree PG</span>
                      </span>
                      {paymentMethodType === 'cashfree' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">
                      {isHindi ? '⚡ UPI, कार्ड, नेटबैंकिंग (तत्काल)' : '⚡ UPI, Cards, NetBanking'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('manual_upi')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethodType === 'manual_upi'
                        ? 'border-[#2C1A0E] bg-[#FAF8F5] shadow-sm ring-2 ring-[#2C1A0E]/15'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-[#2C1A0E] flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-neutral-600" />
                        <span>{isHindi ? 'डायरेक्ट QR' : 'Direct QR'}</span>
                      </span>
                      {paymentMethodType === 'manual_upi' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-medium mt-1">
                      {isHindi ? 'मैन्युअल UPI व UTR' : 'Manual UPI & UTR'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Cashfree Payment Gateway Box */}
              {paymentMethodType === 'cashfree' ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-stone-50 to-amber-50/40 border border-emerald-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-sm">
                        CF
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 leading-tight">
                          Cashfree Payment Gateway
                        </h4>
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          {isHindi ? '100% सुरक्षित भुगतान • सफल होने पर ही एडमिशन कन्फर्म' : '100% Secure • Instant Admission Confirmation'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {isHindi ? 'आधिकारिक' : 'Official'}
                    </span>
                  </div>

                  {/* Supported channels */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 text-center shadow-2xs">
                      <p className="text-xs font-black text-neutral-800">⚡ UPI</p>
                      <p className="text-[10px] text-neutral-500">GPay, PhonePe, Paytm</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 text-center shadow-2xs">
                      <p className="text-xs font-black text-neutral-800">💳 Cards</p>
                      <p className="text-[10px] text-neutral-500">Visa, RuPay, Master</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 text-center shadow-2xs">
                      <p className="text-xs font-black text-neutral-800">🏦 NetBanking</p>
                      <p className="text-[10px] text-neutral-500">50+ Top Banks</p>
                    </div>
                  </div>

                  {/* Strict Confirmation Rule Notice */}
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-300/60 text-emerald-950 text-xs leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        {isHindi ? 'कन्फर्मेशन नियम: ' : 'Confirmation Policy: '}
                      </span>
                      <span>
                        {isHindi
                          ? 'भुगतान सफल होने पर ही एडमिशन स्वतः कन्फर्म होगा व रसीद जारी होगी।'
                          : 'Admission is confirmed only after payment is verified as successful.'}
                      </span>
                    </div>
                  </div>

                  {/* Sandbox test helper if credentials need setup */}
                  {cashfreeNotice?.show && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-900">
                        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black">
                            {isHindi ? 'Cashfree क्रेडेंशियल्स आवश्यक (Setup Notice)' : 'Cashfree Setup Notice'}
                          </p>
                          <p className="text-[11px] text-amber-800">
                            {isHindi
                              ? 'लाइव पेमेंट्स के लिए CASHFREE_APP_ID और CASHFREE_SECRET_KEY सेट करें। अभी आप टेस्ट सिमुलेटर से परीक्षण कर सकते हैं:'
                              : 'Add CASHFREE_APP_ID & CASHFREE_SECRET_KEY in environment to process live payments. You can test the payment gate below:'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => executeVerification(cashfreeNotice.orderId, true)}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition-all cursor-pointer shadow-xs active:scale-98"
                        >
                          {isHindi ? '✓ सफल भुगतान सिमुलेट करें (Test Success)' : '✓ Simulate Payment Success'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(isHindi ? 'भुगतान अस्वीकार हुआ। एडमिशन बुक नहीं हुआ।' : 'Payment rejected. Admission not confirmed.');
                          }}
                          className="py-2 px-3 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-all cursor-pointer active:scale-98"
                        >
                          {isHindi ? '✕ विफलता परीक्षण' : '✕ Test Failure'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual UPI QR Block */
                <div className="space-y-4">
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

                      <a
                        href={upiPayUrl}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                      >
                        <span>📱 {isHindi ? 'UPI ऐप खोलें (GPay / PhonePe / Paytm)' : 'Open UPI App to Pay'}</span>
                      </a>
                    </div>
                  </div>

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
                </div>
              )}

              {/* Terms & Conditions Acceptance Checkbox */}
              <div
                id="admission-terms-container"
                className={`p-4 rounded-2xl border transition-all ${
                  termsHighlighted
                    ? 'bg-red-50 border-red-300 ring-2 ring-red-400/40'
                    : agreedToTerms
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-neutral-50 border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="admission-terms-checkbox"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setFormError('');
                    }}
                    className="mt-1 w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer shrink-0"
                  />
                  <div className="text-xs sm:text-sm text-neutral-800 leading-snug">
                    <span>
                      {isHindi ? 'मैंने खेल सुरक्षा दिशानिर्देश एवं ' : 'I have read and agree to the '}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTermsModalOpen(true);
                      }}
                      className="inline font-bold text-[#8C5A32] hover:text-[#2C1A0E] underline underline-offset-2 cursor-pointer"
                    >
                      {isHindi ? 'नियम व शर्तें (Terms & Conditions)' : 'Terms & Conditions'}
                    </button>
                    <span>
                      {isHindi
                        ? ' पढ़ ली हैं और सहमत हूँ, तथा खेल गतिविधि के सुरक्षा नियमों को समझता/समझती हूँ।'
                        : ' and understand the safety guidelines applicable to the selected sports activity.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmBooking}
                className={`w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer ${
                  agreedToTerms
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700 border border-neutral-300'
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isHindi ? 'भुगतान प्रक्रियाधीन है...' : 'Processing Payment...'}</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {paymentMethodType === 'cashfree'
                        ? isHindi
                          ? `⚡ Cashfree से ₹${finalPayableAmount} भुगतान करें व एडमिशन लें`
                          : `⚡ Pay ₹${finalPayableAmount} with Cashfree & Confirm`
                        : isHindi
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

              {/* Payment Method Selector Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
                  {isHindi ? 'भुगतान माध्यम चुनें' : 'Choose Payment Method'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('cashfree')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethodType === 'cashfree'
                        ? 'border-[#2C1A0E] bg-[#FAF8F5] shadow-sm ring-2 ring-[#2C1A0E]/15'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-[#2C1A0E] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        <span>Cashfree PG</span>
                      </span>
                      {paymentMethodType === 'cashfree' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">
                      {isHindi ? '⚡ UPI, कार्ड, नेटबैंकिंग (तत्काल)' : '⚡ UPI, Cards, NetBanking'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('manual_upi')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethodType === 'manual_upi'
                        ? 'border-[#2C1A0E] bg-[#FAF8F5] shadow-sm ring-2 ring-[#2C1A0E]/15'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-[#2C1A0E] flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-neutral-600" />
                        <span>{isHindi ? 'डायरेक्ट QR' : 'Direct QR'}</span>
                      </span>
                      {paymentMethodType === 'manual_upi' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-medium mt-1">
                      {isHindi ? 'मैन्युअल UPI व UTR' : 'Manual UPI & UTR'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Cashfree Payment Gateway Box */}
              {paymentMethodType === 'cashfree' ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-stone-50 to-amber-50/40 border border-emerald-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-sm">
                        CF
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 leading-tight">
                          Cashfree Payment Gateway
                        </h4>
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          {isHindi ? '100% सुरक्षित भुगतान • सफल होने पर ही स्लॉट स्वतः बुक होगा' : '100% Secure • Slot Confirmed On Payment Success'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {isHindi ? 'आधिकारिक' : 'Official'}
                    </span>
                  </div>

                  {/* Supported channels */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 text-center shadow-2xs">
                      <p className="text-xs font-black text-neutral-800">⚡ UPI</p>
                      <p className="text-[10px] text-neutral-500">GPay, PhonePe, Paytm</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 text-center shadow-2xs">
                      <p className="text-xs font-black text-neutral-800">💳 Cards</p>
                      <p className="text-[10px] text-neutral-500">Visa, RuPay, Master</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 text-center shadow-2xs">
                      <p className="text-xs font-black text-neutral-800">🏦 NetBanking</p>
                      <p className="text-[10px] text-neutral-500">50+ Top Banks</p>
                    </div>
                  </div>

                  {/* Strict Confirmation Rule Notice */}
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-300/60 text-emerald-950 text-xs leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        {isHindi ? 'कन्फर्मेशन गारंटी: ' : 'Confirmation Policy: '}
                      </span>
                      <span>
                        {isHindi
                          ? 'भुगतान सफल होने पर ही स्लॉट स्वतः लॉक व कन्फर्म होगा। यदि पेमेंट पूरा नहीं होता है तो स्लॉट बुक नहीं होगा।'
                          : 'The slot is automatically confirmed and locked only after successful payment. Incomplete attempts will not reserve the slot.'}
                      </span>
                    </div>
                  </div>

                  {/* Sandbox test helper if credentials need setup */}
                  {cashfreeNotice?.show && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-900">
                        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black">
                            {isHindi ? 'Cashfree क्रेडेंशियल्स आवश्यक (Setup Notice)' : 'Cashfree Setup Notice'}
                          </p>
                          <p className="text-[11px] text-amber-800">
                            {isHindi
                              ? 'लाइव पेमेंट्स के लिए CASHFREE_APP_ID और CASHFREE_SECRET_KEY सेट करें। अभी आप टेस्ट सिमुलेटर से परीक्षण कर सकते हैं:'
                              : 'Add CASHFREE_APP_ID & CASHFREE_SECRET_KEY in environment to process live payments. You can test the payment gate below:'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => executeVerification(cashfreeNotice.orderId, true)}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition-all cursor-pointer shadow-xs active:scale-98"
                        >
                          {isHindi ? '✓ सफल भुगतान सिमुलेट करें (Test Success)' : '✓ Simulate Payment Success'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(isHindi ? 'भुगतान अस्वीकार हुआ। स्लॉट बुक नहीं हुआ।' : 'Payment rejected. Booking not confirmed.');
                          }}
                          className="py-2 px-3 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-all cursor-pointer active:scale-98"
                        >
                          {isHindi ? '✕ विफलता परीक्षण' : '✕ Test Failure'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual UPI QR Block */
                <div className="space-y-4">
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

                      {/* Primary Button: "Choose your preferred UPI app" */}
                      <button
                        type="button"
                        onClick={handleChooseUpiApp}
                        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>
                          {isHindi
                            ? 'अपना पसंदीदा UPI ऐप चुनें (Choose your preferred UPI app)'
                            : 'Choose your preferred UPI app'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Transaction / UTR Input (Optional) */}
                  <div className="space-y-4">
                    {hasOpenedUpi && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-xs text-emerald-900 font-bold">
                          {isHindi
                            ? 'UPI ऐप से भुगतान पूरा होने के बाद कृपया नीचे तुरंत सत्यापन हेतु बुकिंग सबमिट करें।'
                            : 'After completing payment in your UPI app, please submit booking for verification below.'}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                        {isHindi
                          ? 'पेमेंट UTR / संदर्भ संख्या (Transaction / UTR No.) - वैकल्पिक'
                          : 'Transaction / UTR Number (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder={isHindi ? 'उदा. 4239XXXXXXXX या UPI Ref No.' : 'e.g. 4239XXXXXXXX'}
                        className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#2C1A0E] text-sm font-mono font-semibold text-neutral-900 bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Terms & Conditions Acceptance Checkbox */}
              <div
                id="booking-terms-container"
                className={`p-4 rounded-2xl border transition-all ${
                  termsHighlighted
                    ? 'bg-red-50 border-red-300 ring-2 ring-red-400/40'
                    : agreedToTerms
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-neutral-50 border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="booking-terms-checkbox"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setFormError('');
                    }}
                    className="mt-1 w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer shrink-0"
                  />
                  <div className="text-xs sm:text-sm text-neutral-800 leading-snug">
                    <span>
                      {isHindi ? 'मैंने खेल सुरक्षा दिशानिर्देश एवं ' : 'I have read and agree to the '}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsTermsModalOpen(true);
                      }}
                      className="inline font-bold text-[#8C5A32] hover:text-[#2C1A0E] underline underline-offset-2 cursor-pointer"
                    >
                      {isHindi ? 'नियम व शर्तें (Terms & Conditions)' : 'Terms & Conditions'}
                    </button>
                    <span>
                      {isHindi
                        ? ' पढ़ ली हैं और सहमत हूँ, तथा चुनी गई खेल गतिविधि के सुरक्षा नियमों को समझता/समझती हूँ।'
                        : ' and understand the safety guidelines applicable to the selected sports activity.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Button: Immediately accessible for 1-click verification */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmBooking}
                className={`w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer ${
                  agreedToTerms
                    ? paymentMethodType === 'manual_upi'
                      ? 'bg-[#1b4332] hover:bg-[#2d6a4f] text-white shadow-emerald-950/20'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700 border border-neutral-300'
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {paymentMethodType === 'manual_upi'
                        ? isHindi
                          ? 'सत्यापन अनुरोध सबमिट हो रहा है...'
                          : 'Submitting Booking for Verification...'
                        : isHindi
                        ? 'भुगतान प्रक्रियाधीन है...'
                        : 'Processing Payment...'}
                    </span>
                  </span>
                ) : (
                  <>
                    {paymentMethodType === 'manual_upi' ? (
                      <>
                        <ShieldAlert className="w-5 h-5 text-amber-300" />
                        <span>
                          {isHindi
                            ? 'सत्यापन हेतु बुकिंग सबमिट करें (Submit Booking for Verification)'
                            : 'Submit Booking for Verification'}
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <span>
                          {isHindi
                            ? `⚡ Cashfree से ₹${finalPayableAmount} भुगतान करें व बुकिंग कन्फर्म करें`
                            : `⚡ Pay ₹${finalPayableAmount} with Cashfree & Confirm`}
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}
        </>
      )}

      {/* Full Terms & Conditions Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setAgreedToTerms(true);
          setFormError('');
        }}
      />
    </div>
  );
}
