'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
  Info,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Booking, AcademyConfig, DateSpecificBlock } from '@/lib/types';
import {
  parseTimeToContinuousMinutes,
  formatMinutesTo12Hour,
  calculateEndTime,
  inspectSlotAvailability,
  formatContinuousHour,
  SlotAvailabilityStatus,
} from '@/lib/timing-helper';

interface BookingTimeWatchProps {
  selectedDate: string;
  selectedSport: 'cricket' | 'swimming';
  selectedResourceId?: string;
  selectedTurfType?: 'bigbox' | 'practice';
  playerCount?: number;
  initialStartTime?: string;
  initialDurationHours?: number;
  ownerConfig?: Partial<AcademyConfig>;
  isHindi?: boolean;
  onTimeChange: (selection: {
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
  }) => void;
}

export function BookingTimeWatch({
  selectedDate,
  selectedSport,
  selectedResourceId = 'net-big-box',
  selectedTurfType = 'bigbox',
  playerCount = 1,
  initialStartTime = '06:00 PM',
  initialDurationHours = 1,
  ownerConfig,
  isHindi = false,
  onTimeChange,
}: BookingTimeWatchProps) {
  // ---------------------------------------------------------------------------
  // 1. Time Watch Internal State
  // ---------------------------------------------------------------------------
  // Parse initial time components
  const initialParsed = useMemo(() => {
    const clean = (initialStartTime || '06:00 PM').trim().toUpperCase();
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return { hour: 6, minute: 0, period: 'PM' as 'AM' | 'PM' };
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = (match[3] || (h >= 12 ? 'PM' : 'AM')).toUpperCase() as 'AM' | 'PM';
    if (h > 12) h = h - 12;
    if (h === 0) h = 12;
    return { hour: h, minute: m, period: p };
  }, [initialStartTime]);

  const [selectedHour, setSelectedHour] = useState<number>(initialParsed.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialParsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialParsed.period);
  const [activeDialMode, setActiveDialMode] = useState<'hour' | 'minute'>('hour');
  const [durationHours, setDurationHours] = useState<number>(initialDurationHours);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  // Bookings list for conflict calculation
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 2. Fetch Bookings for Selected Date
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    setLoadingBookings(true);
    fetch(`/api/bookings?date=${encodeURIComponent(selectedDate)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && data.success && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        }
      })
      .catch((err) => console.warn('Could not load date bookings:', err))
      .finally(() => {
        if (isMounted) setLoadingBookings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // ---------------------------------------------------------------------------
  // 3. Operating Timing Configuration
  // ---------------------------------------------------------------------------
  const timingConfig = ownerConfig?.bookingTiming || {
    startHour: 6, // 06:00 AM
    endHour: 2, // 02:00 AM next day
    operatingHoursText: '06:00 AM – 02:00 AM',
    blockedHours: [],
    dateSpecificBlocks: [],
  };

  const startOperatingHour = timingConfig.startHour ?? 6;
  const endOperatingHour = timingConfig.endHour ?? 2;
  const blockedHours = useMemo(() => timingConfig.blockedHours || [], [timingConfig.blockedHours]);
  const dateSpecificBlocks = useMemo(
    () => (timingConfig.dateSpecificBlocks || []).filter((b: DateSpecificBlock) => b.date === selectedDate),
    [timingConfig.dateSpecificBlocks, selectedDate]
  );

  // ---------------------------------------------------------------------------
  // 4. Time Formatting Helpers
  // ---------------------------------------------------------------------------
  const currentFormattedStartTime = useMemo(() => {
    const padH = selectedHour < 10 ? `0${selectedHour}` : `${selectedHour}`;
    const padM = selectedMinute < 10 ? `0${selectedMinute}` : `${selectedMinute}`;
    return `${padH}:${padM} ${selectedPeriod}`;
  }, [selectedHour, selectedMinute, selectedPeriod]);

  // Calculate current continuous minutes
  const currentStartMinutes = useMemo(() => {
    return parseTimeToContinuousMinutes(currentFormattedStartTime);
  }, [currentFormattedStartTime]);

  // Check availability of selected start time with the chosen duration
  const selectionAvailability = useMemo(() => {
    return inspectSlotAvailability({
      date: selectedDate,
      startMinutes: currentStartMinutes,
      durationMinutes: Math.round(durationHours * 60),
      operatingStartHour: startOperatingHour,
      operatingEndHour: endOperatingHour,
      resourceId: selectedResourceId,
      sport: selectedSport,
      bookings,
      dateSpecificBlocks,
      blockedHours,
    });
  }, [
    selectedDate,
    currentStartMinutes,
    durationHours,
    startOperatingHour,
    endOperatingHour,
    selectedResourceId,
    selectedSport,
    bookings,
    dateSpecificBlocks,
    blockedHours,
  ]);

  // Calculated End Time & Full Range
  const { endTimeStr, timeRangeStr } = useMemo(() => {
    return calculateEndTime(currentFormattedStartTime, durationHours);
  }, [currentFormattedStartTime, durationHours]);

  // ---------------------------------------------------------------------------
  // 5. Hourly Rate & Price Calculation
  // ---------------------------------------------------------------------------
  const { hourlyRate, originalPrice, discountAmount, finalPrice } = useMemo(() => {
    const rates = ownerConfig?.hourlyRates || {
      cricketBigBox: 1000,
      cricketPracticeNet: 500,
      swimmingPool: 100,
      admission: 1000,
    };

    let baseRate = 1000;
    let baseTotal = 0;

    if (selectedSport === 'cricket') {
      if (selectedTurfType === 'bigbox') {
        baseRate = rates.cricketBigBox || 1000;
        baseTotal = Math.round(baseRate * durationHours);
      } else {
        // Practice net: ₹100 per person per hour (or standard fraction)
        baseRate = 100;
        baseTotal = Math.round(baseRate * Math.max(1, playerCount) * durationHours);
      }
    } else if (selectedSport === 'swimming') {
      baseRate = rates.swimmingPool || 100;
      baseTotal = Math.round(baseRate * Math.max(1, playerCount) * durationHours);
    }

    // 10% Online Booking Discount
    const discount = Math.round((baseTotal * 10) / 100);
    const payable = Math.max(0, baseTotal - discount);

    return {
      hourlyRate: baseRate,
      originalPrice: baseTotal,
      discountAmount: discount,
      finalPrice: payable,
    };
  }, [ownerConfig, selectedSport, selectedTurfType, durationHours, playerCount]);

  // Notify parent on change
  useEffect(() => {
    onTimeChange({
      startTime: currentFormattedStartTime,
      endTime: endTimeStr,
      durationHours,
      timeRange: timeRangeStr,
      hourlyRate,
      originalPrice,
      discountAmount,
      finalPrice,
      isValid: selectionAvailability.status === 'AVAILABLE',
      conflictReason: selectionAvailability.reason,
    });
  }, [
    currentFormattedStartTime,
    endTimeStr,
    durationHours,
    timeRangeStr,
    hourlyRate,
    originalPrice,
    discountAmount,
    finalPrice,
    selectionAvailability,
    onTimeChange,
  ]);

  // ---------------------------------------------------------------------------
  // 6. Configured Hours List for Grid / Strip (e.g. 6:00 AM to 2:00 AM)
  // ---------------------------------------------------------------------------
  const fullContinuousHoursList = useMemo(() => {
    const normEnd = endOperatingHour <= startOperatingHour ? endOperatingHour + 24 : endOperatingHour;
    const list: Array<{
      continuousHour: number;
      label: string;
      startTimeStr: string;
      startMinutes: number;
      hour12: number;
      period: 'AM' | 'PM';
      status: SlotAvailabilityStatus;
      reason?: string;
    }> = [];

    for (let ch = startOperatingHour; ch < normEnd; ch++) {
      const timeLabel = formatContinuousHour(ch);
      const startMin = ch * 60;
      const hour12 = ch >= 24 ? (ch - 24 === 0 ? 12 : ch - 24) : ch === 0 ? 12 : ch > 12 ? ch - 12 : ch;
      const period = ch >= 12 && ch < 24 ? ('PM' as const) : ('AM' as const);

      const inspection = inspectSlotAvailability({
        date: selectedDate,
        startMinutes: startMin,
        durationMinutes: 60,
        operatingStartHour: startOperatingHour,
        operatingEndHour: endOperatingHour,
        resourceId: selectedResourceId,
        sport: selectedSport,
        bookings,
        dateSpecificBlocks,
        blockedHours,
      });

      list.push({
        continuousHour: ch,
        label: timeLabel,
        startTimeStr: timeLabel,
        startMinutes: startMin,
        hour12,
        period,
        status: inspection.status,
        reason: inspection.reason,
      });
    }

    return list;
  }, [
    startOperatingHour,
    endOperatingHour,
    selectedDate,
    selectedResourceId,
    selectedSport,
    bookings,
    dateSpecificBlocks,
    blockedHours,
  ]);

  // Filtered hours by user selection
  const displayedHoursList = useMemo(() => {
    if (filterPeriod === 'all') return fullContinuousHoursList;
    if (filterPeriod === 'morning') {
      return fullContinuousHoursList.filter((item) => item.continuousHour >= 6 && item.continuousHour < 12);
    }
    if (filterPeriod === 'afternoon') {
      return fullContinuousHoursList.filter((item) => item.continuousHour >= 12 && item.continuousHour < 17);
    }
    // evening / night (5 PM to 2 AM next day)
    return fullContinuousHoursList.filter((item) => item.continuousHour >= 17);
  }, [fullContinuousHoursList, filterPeriod]);

  // ---------------------------------------------------------------------------
  // 7. Watch Dial Node Positions & Angles
  // ---------------------------------------------------------------------------
  // Dial radius and center coordinates
  const dialRadius = 106;
  const dialCenter = 135;

  // Compute angle for watch hand
  const currentHandAngle = useMemo(() => {
    if (activeDialMode === 'hour') {
      // 12 hours -> 360 deg, 30 deg per hour
      const h = selectedHour % 12;
      return h * 30;
    } else {
      // 60 minutes -> 360 deg, 6 deg per minute
      return selectedMinute * 6;
    }
  }, [activeDialMode, selectedHour, selectedMinute]);

  // Clock numbers for Hour mode (1 to 12)
  const clockHourNodes = useMemo(() => {
    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    return hours.map((hourNum) => {
      const angleDeg = (hourNum % 12) * 30 - 90;
      const rad = (angleDeg * Math.PI) / 180;
      const x = dialCenter + dialRadius * Math.cos(rad);
      const y = dialCenter + dialRadius * Math.sin(rad);

      // Check availability of this hour for currently selected AM/PM
      let testContinuousHour = hourNum;
      if (selectedPeriod === 'PM' && hourNum < 12) {
        testContinuousHour = hourNum + 12;
      } else if (selectedPeriod === 'AM') {
        if (hourNum === 12) testContinuousHour = 24; // 12 AM midnight = 24
        else if (hourNum < 6) testContinuousHour = hourNum + 24; // 1 AM, 2 AM = 25, 26
        else testContinuousHour = hourNum;
      }

      const testStartMin = testContinuousHour * 60;
      const inspection = inspectSlotAvailability({
        date: selectedDate,
        startMinutes: testStartMin,
        durationMinutes: 60,
        operatingStartHour: startOperatingHour,
        operatingEndHour: endOperatingHour,
        resourceId: selectedResourceId,
        sport: selectedSport,
        bookings,
        dateSpecificBlocks,
        blockedHours,
      });

      return {
        number: hourNum,
        label: `${hourNum}`,
        x,
        y,
        angleDeg,
        status: inspection.status,
        reason: inspection.reason,
        continuousHour: testContinuousHour,
      };
    });
  }, [
    dialCenter,
    dialRadius,
    selectedPeriod,
    selectedDate,
    startOperatingHour,
    endOperatingHour,
    selectedResourceId,
    selectedSport,
    bookings,
    dateSpecificBlocks,
    blockedHours,
  ]);

  // Clock numbers for Minute mode (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
  const clockMinuteNodes = useMemo(() => {
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    return minutes.map((m) => {
      const angleDeg = (m / 5) * 30 - 90;
      const rad = (angleDeg * Math.PI) / 180;
      const x = dialCenter + dialRadius * Math.cos(rad);
      const y = dialCenter + dialRadius * Math.sin(rad);
      const padM = m < 10 ? `0${m}` : `${m}`;
      return {
        minute: m,
        label: padM,
        x,
        y,
        angleDeg,
      };
    });
  }, [dialCenter, dialRadius]);

  // Handler for selecting an hour from dial or strip
  const handleSelectHour = (hour: number, period?: 'AM' | 'PM') => {
    setSelectedHour(hour);
    if (period) setSelectedPeriod(period);
  };

  // Handler for selecting duration
  const handleSelectDuration = (hours: number) => {
    setDurationHours(hours);
  };

  return (
    <div className="w-full space-y-6 select-none">
      {/* ----------------------------------------------------------------- */}
      {/* 1. TOP DIGITAL WATCH DISPLAY & STATUS BANNER                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#2C1A0E] text-white shadow-xl border border-[#432818] relative overflow-hidden">
        {/* Subtle decorative radial glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          {/* Active Timing Readout */}
          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" />
              <span>{isHindi ? 'लाइव बुकिंग वॉच' : 'Live Booking Time Watch'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            </div>

            {/* Big Interactive Digital Display */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              {/* Hour Button */}
              <button
                type="button"
                onClick={() => setActiveDialMode('hour')}
                className={`px-3 py-1.5 rounded-2xl text-3xl sm:text-4xl font-black font-mono transition-all cursor-pointer ${
                  activeDialMode === 'hour'
                    ? 'bg-amber-400 text-[#2C1A0E] shadow-lg shadow-amber-400/25 scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isHindi ? 'घंटा बदलने के लिए क्लिक करें' : 'Click to select hour'}
              >
                {selectedHour < 10 ? `0${selectedHour}` : selectedHour}
              </button>

              <span className="text-3xl sm:text-4xl font-black text-amber-300/80 font-mono">:</span>

              {/* Minute Button */}
              <button
                type="button"
                onClick={() => setActiveDialMode('minute')}
                className={`px-3 py-1.5 rounded-2xl text-3xl sm:text-4xl font-black font-mono transition-all cursor-pointer ${
                  activeDialMode === 'minute'
                    ? 'bg-amber-400 text-[#2C1A0E] shadow-lg shadow-amber-400/25 scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isHindi ? 'मिनट बदलने के लिए क्लिक करें' : 'Click to select minute'}
              >
                {selectedMinute < 10 ? `0${selectedMinute}` : selectedMinute}
              </button>

              {/* AM / PM Segmented Switcher */}
              <div className="flex flex-col gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('AM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    selectedPeriod === 'AM'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-200" />
                  <span>AM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('PM')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    selectedPeriod === 'PM'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-200" />
                  <span>PM</span>
                </button>
              </div>
            </div>
          </div>

          {/* Current Selection Live Status Card */}
          <div className="w-full sm:w-auto text-center sm:text-right">
            {selectionAvailability.status === 'AVAILABLE' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold shadow-inner">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {currentFormattedStartTime} ✅{' '}
                  {isHindi ? 'उपलब्ध (Available)' : 'Available for Booking'}
                </span>
              </div>
            ) : selectionAvailability.status === 'BOOKED' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-extrabold shadow-inner">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {currentFormattedStartTime} ❌{' '}
                  {isHindi ? 'पहले से बुक (Already Booked)' : 'Already Booked'}
                </span>
              </div>
            ) : selectionAvailability.status === 'BLOCKED_BY_OWNER' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold shadow-inner">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {currentFormattedStartTime} 🔒{' '}
                  {isHindi ? 'ओनर द्वारा ब्लॉक (Blocked by Owner)' : 'Blocked by Owner'}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-500/20 border border-neutral-400/40 text-neutral-300 text-xs font-extrabold shadow-inner">
                <AlertTriangle className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>
                  {currentFormattedStartTime} ⛔{' '}
                  {isHindi ? 'समय सीमा से बाहर (Outside Timing)' : 'Outside Booking Hours'}
                </span>
              </div>
            )}
            <p className="text-[11px] text-white/70 mt-1">
              {timingConfig.operatingHoursText
                ? `${isHindi ? 'बुकिंग समय' : 'Allowed Hours'}: ${timingConfig.operatingHoursText}`
                : 'Allowed: 06:00 AM – 02:00 AM'}
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. THE VISUAL TIME WATCH / CLOCK FACE (CIRCULAR DIAL)             */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-lg flex flex-col items-center">
        {/* Watch Control Mode Switcher */}
        <div className="flex items-center justify-between w-full max-w-sm mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveDialMode('hour')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeDialMode === 'hour'
                  ? 'bg-[#2C1A0E] text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              🕒 {isHindi ? 'घंटे चुनें (Hour Dial)' : 'Hour Dial'}
            </button>
            <button
              type="button"
              onClick={() => setActiveDialMode('minute')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeDialMode === 'minute'
                  ? 'bg-[#2C1A0E] text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              ⏱️ {isHindi ? 'मिनट चुनें (Minutes)' : 'Minute Dial'}
            </button>
          </div>

          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            {selectedPeriod === 'AM' ? '☀️ Morning/Night' : '🌙 Afternoon/Eve'}
          </span>
        </div>

        {/* Circular Analog Watch Bezel */}
        <div className="relative w-[270px] h-[270px] sm:w-[280px] sm:h-[280px] rounded-full bg-gradient-to-b from-[#FAF8F5] to-neutral-100 border-4 border-[#2C1A0E]/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1),0_10px_25px_rgba(44,26,14,0.15)] flex items-center justify-center select-none touch-none">
          {/* Outer Sports Tick Ring */}
          <div className="absolute inset-2 rounded-full border border-neutral-300 pointer-events-none" />
          <div className="absolute inset-5 rounded-full border border-dashed border-neutral-300/80 pointer-events-none" />

          {/* Center Watch Pin & Cap */}
          <div className="w-5 h-5 rounded-full bg-[#2C1A0E] border-2 border-amber-400 z-30 shadow-md flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>

          {/* Rotating Watch Hand with glowing indicator pointer */}
          <motion.div
            className="absolute z-20 pointer-events-none origin-bottom flex flex-col items-center justify-start"
            style={{
              width: 36,
              height: dialRadius + 18,
              bottom: '50%',
              left: 'calc(50% - 18px)',
            }}
            animate={{ rotate: currentHandAngle }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Top Pointer Cap Ring */}
            <div className="w-9 h-9 rounded-full border-2 border-amber-500 bg-amber-400/20 shadow-md flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            </div>
            {/* Hand Shaft */}
            <div className="w-1 flex-1 bg-gradient-to-t from-[#2C1A0E] to-amber-500 rounded-full" />
            {/* Counterweight */}
            <div className="w-3 h-3 rounded-full bg-[#2C1A0E] -mb-1.5" />
          </motion.div>

          {/* Dial Mode: Hours */}
          {activeDialMode === 'hour' && (
            <>
              {clockHourNodes.map((node) => {
                const isSelected = selectedHour === node.number;
                const isAvailable = node.status === 'AVAILABLE';
                const isBooked = node.status === 'BOOKED';
                const isBlocked = node.status === 'BLOCKED_BY_OWNER';
                const isOutside = node.status === 'OUTSIDE_HOURS';

                return (
                  <button
                    key={`hour-${node.number}`}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => handleSelectHour(node.number)}
                    style={{
                      left: node.x,
                      top: node.y,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-30 w-9 h-9 rounded-full flex flex-col items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C1A0E] text-amber-300 font-black scale-110 shadow-lg ring-2 ring-amber-400'
                        : isAvailable
                        ? 'bg-white hover:bg-amber-100 text-neutral-900 border border-neutral-300 shadow-2xs'
                        : isBooked
                        ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed line-through opacity-70'
                        : isBlocked
                        ? 'bg-amber-50 text-amber-600 border border-amber-200 cursor-not-allowed opacity-75'
                        : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-40'
                    }`}
                    title={
                      isAvailable
                        ? `${node.label}:00 ${selectedPeriod} - Available`
                        : isBooked
                        ? `${node.label}:00 ${selectedPeriod} - Already Booked`
                        : isBlocked
                        ? `${node.label}:00 ${selectedPeriod} - Blocked by Owner`
                        : `${node.label}:00 ${selectedPeriod} - Outside Allowed Hours`
                    }
                  >
                    <span className="leading-none">{node.label}</span>
                    {/* Visual Availability Dot Indicator */}
                    {isBooked && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute -bottom-0.5" />
                    )}
                    {isBlocked && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute -bottom-0.5" />
                    )}
                    {isAvailable && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-emerald-500 absolute -bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </>
          )}

          {/* Dial Mode: Minutes */}
          {activeDialMode === 'minute' && (
            <>
              {clockMinuteNodes.map((node) => {
                const isSelected = selectedMinute === node.minute;
                return (
                  <button
                    key={`min-${node.minute}`}
                    type="button"
                    onClick={() => {
                      setSelectedMinute(node.minute);
                      // After selecting minute, switch back to hour dial for convenience
                      setActiveDialMode('hour');
                    }}
                    style={{
                      left: node.x,
                      top: node.y,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-30 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C1A0E] text-amber-300 font-black scale-110 shadow-lg ring-2 ring-amber-400'
                        : 'bg-white hover:bg-amber-100 text-neutral-900 border border-neutral-300 shadow-2xs'
                    }`}
                  >
                    <span>:{node.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Quick Minute Preset Bar */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500">
            {isHindi ? 'त्वरित मिनट (Minutes):' : 'Quick Minutes:'}
          </span>
          {[0, 15, 30, 45].map((mins) => {
            const isSelected = selectedMinute === mins;
            const padM = mins < 10 ? `0${mins}` : `${mins}`;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedMinute(mins)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2C1A0E] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                :{padM}
              </button>
            );
          })}
        </div>

        {/* Dial Legend */}
        <div className="mt-4 pt-3 border-t border-neutral-200/80 w-full flex items-center justify-center gap-4 text-[11px] font-semibold text-neutral-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{isHindi ? 'उपलब्ध (Available)' : 'Available'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span>{isHindi ? 'बुक (Booked)' : 'Booked'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>{isHindi ? 'ओनर द्वारा ब्लॉक (Blocked)' : 'Blocked by Owner'}</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. DURATION SELECTOR (HOURS) & REAL-TIME END TIME CALCULATION     */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
              {isHindi ? 'अवधि चुनें (Select Duration)' : 'Select Duration'}
            </label>
            <p className="text-xs text-neutral-500">
              {isHindi
                ? 'शुरू होने का समय + चुनी गई अवधि से समाप्ति समय स्वतः तय होगा'
                : 'End time and total pricing are automatically calculated'}
            </p>
          </div>

          {/* Stepper for custom duration */}
          <div className="flex items-center border border-neutral-300 rounded-xl bg-neutral-50 p-1">
            <button
              type="button"
              disabled={durationHours <= 0.5}
              onClick={() => setDurationHours((d) => Math.max(0.5, d - 0.5))}
              className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-sm font-black flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40 cursor-pointer active:scale-95"
            >
              -
            </button>
            <span className="w-16 text-center text-xs font-black text-neutral-900 font-mono">
              {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}
            </span>
            <button
              type="button"
              disabled={durationHours >= 6}
              onClick={() => setDurationHours((d) => Math.min(6, d + 0.5))}
              className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-sm font-black flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40 cursor-pointer active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Duration Preset Pills */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[1, 1.5, 2, 2.5, 3, 4].map((hrs) => {
            const isSelected = durationHours === hrs;
            // Check if this duration causes a conflict with the currently selected start time
            const testEnd = currentStartMinutes + hrs * 60;
            const conflictCheck = inspectSlotAvailability({
              date: selectedDate,
              startMinutes: currentStartMinutes,
              durationMinutes: hrs * 60,
              operatingStartHour: startOperatingHour,
              operatingEndHour: endOperatingHour,
              resourceId: selectedResourceId,
              sport: selectedSport,
              bookings,
              dateSpecificBlocks,
              blockedHours,
            });
            const hasConflict = conflictCheck.status !== 'AVAILABLE';

            return (
              <button
                key={hrs}
                type="button"
                disabled={hasConflict}
                onClick={() => handleSelectDuration(hrs)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2C1A0E] text-white border-[#2C1A0E] shadow-xs'
                    : hasConflict
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-50 line-through'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                }`}
              >
                <span>{hrs} {hrs === 1 ? 'Hour' : 'Hours'}</span>
              </button>
            );
          })}
        </div>

        {/* Conflict Warning if chosen duration collides with subsequent slots */}
        {selectionAvailability.status !== 'AVAILABLE' && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-bold">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {isHindi
                ? `चुने गए समय (${currentFormattedStartTime} – ${endTimeStr}) पर स्लॉट उपलब्ध नहीं है: ${selectionAvailability.reason || 'स्लॉट बुक या ब्लॉक है'}`
                : `Requested time (${currentFormattedStartTime} – ${endTimeStr}) is unavailable: ${selectionAvailability.reason || 'Slot is booked or blocked'}`}
            </span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. FULL AVAILABLE TIMINGS STRIP & GRID (AS REQUESTED BY USER)     */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-md space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-black text-[#2C1A0E] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>{isHindi ? 'सभी समय स्लॉट (All Operating Time Slots)' : 'Operating Time Slots'}</span>
            </h4>
            <p className="text-xs text-neutral-500">
              {isHindi
                ? 'किसी भी उपलब्ध स्लॉट पर क्लिक करके तुरंत समय चुन सकते हैं'
                : 'Click any available time slot below to jump directly to it'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterPeriod('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === 'all'
                  ? 'bg-[#2C1A0E] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {isHindi ? 'सभी' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('morning')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === 'morning'
                  ? 'bg-[#2C1A0E] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              ☀️ {isHindi ? 'सुबह' : 'Morning'}
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('afternoon')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === 'afternoon'
                  ? 'bg-[#2C1A0E] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              🌤️ {isHindi ? 'दोपहर' : 'Afternoon'}
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('evening')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === 'evening'
                  ? 'bg-[#2C1A0E] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              🌙 {isHindi ? 'शाम/रात' : 'Evening/Night'}
            </button>
          </div>
        </div>

        {/* Scrollable / Grid of All Operating Hours */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
          {displayedHoursList.map((slot) => {
            const isSelected =
              selectedHour === slot.hour12 &&
              selectedPeriod === slot.period &&
              selectedMinute === 0;
            const isAvailable = slot.status === 'AVAILABLE';
            const isBooked = slot.status === 'BOOKED';
            const isBlocked = slot.status === 'BLOCKED_BY_OWNER';

            return (
              <button
                key={slot.label}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  handleSelectHour(slot.hour12, slot.period);
                  setSelectedMinute(0);
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#2C1A0E] text-white border-[#2C1A0E] shadow-sm ring-2 ring-[#2C1A0E]/20'
                    : isAvailable
                    ? 'bg-neutral-50 hover:bg-emerald-50 hover:border-emerald-300 text-neutral-800 border-neutral-200 cursor-pointer'
                    : isBooked
                    ? 'bg-red-50/60 border-red-200 text-red-700 cursor-not-allowed opacity-80'
                    : isBlocked
                    ? 'bg-amber-50/60 border-amber-200 text-amber-800 cursor-not-allowed opacity-80'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs font-mono">{slot.startTimeStr}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  )}
                </div>

                <div className="mt-1">
                  {isAvailable ? (
                    <span className={`text-[10px] font-extrabold flex items-center gap-1 ${
                      isSelected ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      <span>✅</span>
                      <span>{isHindi ? 'उपलब्ध' : 'Available'}</span>
                    </span>
                  ) : isBooked ? (
                    <span className="text-[10px] font-extrabold text-red-600 flex items-center gap-1">
                      <span>❌</span>
                      <span>{isHindi ? 'बुक' : 'Booked'}</span>
                    </span>
                  ) : isBlocked ? (
                    <span className="text-[10px] font-extrabold text-amber-700 flex items-center gap-1">
                      <span>🔒</span>
                      <span>{isHindi ? 'ब्लॉक' : 'Blocked by Owner'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400">
                      {isHindi ? 'बंद' : 'Closed'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 5. SUMMARY TICKET & LIVE PRICE CARD                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            {isHindi ? 'चयनित समय व दर सारांश' : 'Calculated Booking Time & Rate'}
          </span>
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="text-base font-black text-neutral-900">
              {timeRangeStr}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs">
              {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            {isHindi ? 'दर' : 'Rate'}: ₹{hourlyRate} / hr
            {selectedTurfType === 'practice' && ` • ${playerCount} ${isHindi ? 'खिलाड़ी' : 'Players'}`}
          </p>
        </div>

        {/* Live Amount Preview with 10% Online Discount */}
        <div className="text-center sm:text-right">
          <div className="text-xs text-neutral-500 line-through">₹{originalPrice}</div>
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <span className="text-2xl font-black text-emerald-900">₹{finalPrice}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{isHindi ? '10% ऑनलाइन छूट' : '10% Off'}</span>
            </span>
          </div>
          <p className="text-[11px] font-semibold text-emerald-800">
            {isHindi ? `बचत: ₹${discountAmount}` : `Save ₹${discountAmount}`}
          </p>
        </div>
      </div>
    </div>
  );
}
