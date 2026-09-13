'use client';

import React, { useState } from 'react';
import { Shield, ChevronRight, MapPin, CheckCircle2, ArrowRight, GraduationCap, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/LanguageContext';

interface HeroSectionProps {
  onBookCricket: () => void;
  onBookSwimming: () => void;
  onOpenAdmission?: () => void;
  onOpenMentor?: () => void;
  onOpenAdmin: () => void;
}

export function HeroSection({
  onBookCricket,
  onBookSwimming,
  onOpenAdmission,
  onOpenMentor,
  onOpenAdmin,
}: HeroSectionProps) {
  const { isHindi } = useLanguage();
  const [selectedSport, setSelectedSport] = useState<'cricket' | 'swimming' | null>(null);

  const handleCardClick = (sport: 'cricket' | 'swimming') => {
    setSelectedSport(sport);
    // Smooth tactile delay before transitioning view
    setTimeout(() => {
      if (sport === 'cricket') {
        onBookCricket();
      } else {
        onBookSwimming();
      }
    }, 180);
  };

  return (
    <section
      id="hero"
      className="relative w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center pt-28 pb-16 px-4 sm:px-8 bg-[#FAF8F5] text-[#2C1A0E] overflow-hidden select-none"
    >
      {/* Refined subtle ambient background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.35, 0.45, 0.35],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-gradient-to-b from-[#E6AF6E]/25 via-[#8C5A32]/10 to-transparent blur-3xl rounded-full"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full text-center flex flex-col items-center">
        {/* Verified Location & Official Status */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200 text-[#8C5A32] text-xs sm:text-sm font-semibold mb-6 shadow-2xs"
        >
          <MapPin className="w-3.5 h-3.5 text-[#8C5A32]" />
          <span>
            {isHindi
              ? 'कुचामन सिटी, राजस्थान • KSA ऑफिशियल पोर्टल'
              : 'Kuchaman City, Rajasthan • KSA Official Portal'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </motion.div>

        {/* Hero Title: कुचामन स्पोर्ट्स एकेडमी */}
        <motion.h1
          id="hero-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#2C1A0E] leading-[1.15] mb-4"
        >
          {isHindi ? (
            <span className="font-handwritten font-bold text-[#2C1A0E] drop-shadow-xs">
              कुचामन स्पोर्ट्स एकेडमी
            </span>
          ) : (
            <span className="font-agbalumo font-normal tracking-wide uppercase text-[#2C1A0E]">
              KUCHAMAN SPORTS ACADEMY
            </span>
          )}
        </motion.h1>

        {/* Tagline / Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-xl text-[#8C5A32] font-semibold mb-10 sm:mb-12 max-w-2xl"
        >
          {isHindi
            ? 'विश्वस्तरीय क्रिकेट टर्फ़ नेट्स और ओलंपिक-ग्रेड स्विमिंग पूल स्लॉट बुकिंग'
            : 'World-Class Cricket Turf Nets & Olympic-Grade Swimming Pool Booking'}
        </motion.p>

        {/* The Two Main Interactive Choice Cards with Professional Selection Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 w-full max-w-4xl mb-10 text-left">
          {/* Card 1: Cricket Turf Nets */}
          <motion.div
            id="card-cricket-booking"
            onClick={() => handleCardClick('cricket')}
            whileHover={{ y: -6, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            animate={
              selectedSport === 'cricket'
                ? {
                    scale: 1.02,
                    borderColor: '#8C5A32',
                    boxShadow: '0 20px 30px -10px rgba(140, 90, 50, 0.25)',
                  }
                : {
                    scale: 1,
                    borderColor: '#e5e7eb',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick('cricket')}
            className={`group relative bg-white border-2 p-6 sm:p-8 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between ${
              selectedSport === 'cricket'
                ? 'border-[#8C5A32] ring-4 ring-[#8C5A32]/20'
                : 'border-neutral-200 hover:border-[#8C5A32]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-xl bg-[#2C1A0E] text-white flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  🏏
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedSport === 'cricket' ? (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#8C5A32] text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isHindi ? 'खुल रहा है...' : 'Opening...'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      {isHindi ? 'स्लॉट्स उपलब्ध' : 'Slots Open'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#2C1A0E] group-hover:text-[#8C5A32] transition-colors">
                  {isHindi ? 'क्रिकेट टर्फ़ नेट्स' : 'Cricket Turf Nets'}
                </h2>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  {isHindi
                    ? '4 प्रोफेशनल मैच स्पेसिफिकेशन एस्ट्रो-टर्फ़ नेट्स, ऑटोमैटिक बॉलिंग मशीन और डे/नाइट फ्लड लाइट्स।'
                    : '4 match-specification astro-turf nets, bowling machine, floodlights & big box cricket.'}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-neutral-600">
                <span className="px-2.5 py-1 bg-[#8C5A32]/10 text-[#8C5A32] font-bold rounded-md">
                  {isHindi ? '₹100 प्रति खिलाड़ी / घंटा' : '₹100 / player / hr'}
                </span>
                <span className="px-2.5 py-1 bg-neutral-100 rounded-md">
                  {isHindi ? '4 नेट्स + बिग बॉक्स' : '4 Nets + Box'}
                </span>
                <span className="px-2.5 py-1 bg-neutral-100 rounded-md">
                  {isHindi ? 'ऑनलाइन UPI' : 'Online UPI'}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-[#8C5A32] group-hover:text-[#2C1A0E] transition-colors flex items-center gap-1.5">
                <span>{isHindi ? 'क्रिकेट स्लॉट बुक करें' : 'Book Cricket Slots'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </span>
              <div className="w-8 h-8 rounded-full bg-[#8C5A32]/10 group-hover:bg-[#8C5A32] group-hover:text-white flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Swimming Lanes */}
          <motion.div
            id="card-swimming-booking"
            onClick={() => handleCardClick('swimming')}
            whileHover={{ y: -6, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            animate={
              selectedSport === 'swimming'
                ? {
                    scale: 1.02,
                    borderColor: '#1e3a8a',
                    boxShadow: '0 20px 30px -10px rgba(30, 58, 138, 0.25)',
                  }
                : {
                    scale: 1,
                    borderColor: '#e5e7eb',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick('swimming')}
            className={`group relative bg-white border-2 p-6 sm:p-8 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between ${
              selectedSport === 'swimming'
                ? 'border-blue-900 ring-4 ring-blue-900/20'
                : 'border-neutral-200 hover:border-blue-700'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-xl bg-blue-900 text-white flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                  🏊‍♂️
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedSport === 'swimming' ? (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-900 text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isHindi ? 'खुल रहा है...' : 'Opening...'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
                      {isHindi ? 'सेशन्स चालू' : 'Sessions Active'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#2C1A0E] group-hover:text-blue-900 transition-colors">
                  {isHindi ? 'स्विमिंग लैन्स' : 'Swimming Lanes'}
                </h2>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  {isHindi
                    ? 'ओलंपिक-ग्रेड स्विमिंग पूल, प्रमाणित ट्रेनर कोचिंग, स्वच्छ वाटर सर्कुलेशन व सुरक्षा गार्ड्स।'
                    : 'Semi-Olympic training pool, certified lifeguard supervision, clean water & dedicated lanes.'}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-neutral-600">
                {/* 100 RS PER PERSON PER HOUR */}
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-bold rounded-md">
                  {isHindi ? '₹100 प्रति व्यक्ति / घंटा' : '₹100 / person / hour'}
                </span>
                <span className="px-2.5 py-1 bg-neutral-100 rounded-md">
                  {isHindi ? 'मॉर्निंग & इवनिंग बैच' : 'Morning & Eve'}
                </span>
                <span className="px-2.5 py-1 bg-neutral-100 rounded-md">
                  {isHindi ? '25m लैन्स' : '25m Lanes'}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-blue-900 group-hover:text-[#2C1A0E] transition-colors flex items-center gap-1.5">
                <span>{isHindi ? 'स्विमिंग स्लॉट बुक करें' : 'Book Swimming Slots'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-900 group-hover:text-white flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Academy Portals: Admission Panel & Mentor Portal & Admin */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-4xl p-5 sm:p-6 bg-white border border-[#8C5A32]/20 rounded-2xl shadow-xs mb-8 text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C5A32] font-bold">
                {isHindi ? 'विद्यार्थी एवं खेल प्रबंधन प्रणाली' : 'KSA Student & Athlete Management'}
              </span>
              <h3 className="font-serif font-bold text-lg text-[#2C1A0E]">
                {isHindi ? 'एडमिशन, मेंटर पोर्टल और सर्टिफिकेट्स' : 'Admissions, Mentor Portal & Tenure Certification'}
              </h3>
            </div>
            <span className="text-xs text-stone-500 hidden sm:inline">
              {isHindi ? 'सोलो • एकेडमिक • स्कूल रजिस्ट्रेशन' : 'Solo • Academic • School Entries'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Admission Panel */}
            <button
              type="button"
              onClick={onOpenAdmission}
              className="p-3.5 rounded-xl border border-stone-200 hover:border-[#8C5A32] bg-[#FAF8F5] hover:bg-white transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#2C1A0E] text-white flex items-center justify-center group-hover:bg-[#8C5A32] transition-colors">
                  <GraduationCap className="w-5 h-5 text-[#E6AF6E]" />
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#8C5A32] group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-[#2C1A0E] group-hover:text-[#8C5A32]">
                {isHindi ? 'एडमिशन पैनल' : 'Admission Panel'}
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {isHindi ? 'सोलो, एकेडमिक या स्कूल दाखिला' : 'Solo, Academic & School Batches'}
              </p>
            </button>

            {/* 2. Mentor Portal */}
            <button
              type="button"
              onClick={onOpenMentor}
              className="p-3.5 rounded-xl border border-stone-200 hover:border-[#8C5A32] bg-[#FAF8F5] hover:bg-white transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#8C5A32] text-white flex items-center justify-center group-hover:bg-[#2C1A0E] transition-colors">
                  <UserCheck className="w-5 h-5 text-amber-200" />
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#8C5A32] group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-[#2C1A0E] group-hover:text-[#8C5A32]">
                {isHindi ? 'मेंटर लॉगिन पोर्टल' : 'Mentor Login Portal'}
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {isHindi ? 'हाजिरी, छात्र सूची व सर्टिफिकेट अनुरोध' : 'Attendance, Rosters & Tenure'}
              </p>
            </button>

            {/* 3. Owner & Admin Dashboard */}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-3.5 rounded-xl border border-stone-200 hover:border-[#8C5A32] bg-[#FAF8F5] hover:bg-white transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-stone-800 text-white flex items-center justify-center group-hover:bg-[#2C1A0E] transition-colors">
                  <Shield className="w-5 h-5 text-amber-200" />
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#8C5A32] group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-[#2C1A0E] group-hover:text-[#8C5A32]">
                {isHindi ? 'ओनर / एडमिन डैशबोर्ड' : 'Owner Admin Dashboard'}
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {isHindi ? 'सर्टिफिकेट अप्रूवल, हस्ताक्षर व ऑडिट' : 'Certificate Approvals & Signatures'}
              </p>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
