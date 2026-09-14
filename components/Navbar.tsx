'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Languages, Trophy, Shield, GraduationCap, UserCheck } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface NavbarProps {
  onOpenAdmin?: () => void;
  onOpenAdmission?: () => void;
  onOpenMentor?: () => void;
  onGoHome?: () => void;
  activeView?: 'home' | 'cricket' | 'swimming' | 'admission' | 'mentor';
}

export function Navbar({
  onOpenAdmin,
  onOpenAdmission,
  onOpenMentor,
  onGoHome,
  activeView = 'home',
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, isHindi } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = () => {
    if (onGoHome) {
      onGoHome();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'py-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-[0_2px_15px_rgba(0,0,0,0.05)]'
            : 'py-3.5 sm:py-4.5 bg-white/90 backdrop-blur-sm border-b border-neutral-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-8 flex items-center justify-between gap-2">
          {/* Sports Logo + KSA + Back link */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-none"
              aria-label="KSA Home"
            >
              {/* Athletic Sports Emblem Logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#2C1A0E] text-white flex items-center justify-center shadow-xs group-hover:bg-[#8C5A32] transition-colors duration-300">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#E6AF6E]" />
              </div>
              
              {/* Strictly KSA text only */}
              <span className="text-lg sm:text-2xl font-agbalumo font-normal tracking-wide text-[#2C1A0E] group-hover:text-[#8C5A32] transition-colors">
                KSA
              </span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[11px] sm:text-xs font-semibold text-[#2C1A0E] transition-colors shrink-0"
              title={isHindi ? 'मुख्य वेबसाइट पर जाएं' : 'Return to Main Website'}
            >
              <span>←</span>
              <span className="hidden xs:inline">{isHindi ? 'वेबसाइट' : 'Website'}</span>
            </Link>

            {activeView !== 'home' && onGoHome && (
              <button
                onClick={onGoHome}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[11px] sm:text-xs font-semibold text-[#2C1A0E] transition-colors cursor-pointer shrink-0"
              >
                <span>←</span>
                <span className="hidden sm:inline">{isHindi ? 'बुकिंग होम' : 'Booking Home'}</span>
              </button>
            )}
          </div>

          {/* Right side: Portals (Desktop) + Language Switcher (Desktop) + Admin Button (Always visible on mobile & desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick link: Admission Panel (Desktop) */}
            {onOpenAdmission && (
              <button
                id="navbar-admission-btn"
                type="button"
                onClick={onOpenAdmission}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'admission'
                    ? 'bg-[#2C1A0E] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-[#2C1A0E]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#8C5A32]" />
                <span>{isHindi ? 'दाखिला' : 'Admissions'}</span>
              </button>
            )}

            {/* Quick link: Mentor Portal (Desktop) */}
            {onOpenMentor && (
              <button
                id="navbar-mentor-btn"
                type="button"
                onClick={onOpenMentor}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'mentor'
                    ? 'bg-[#8C5A32] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-[#2C1A0E]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-[#8C5A32]" />
                <span>{isHindi ? 'मेंटर पोर्टल' : 'Mentor Portal'}</span>
              </button>
            )}

            {/* Desktop Only Hindi / English Switcher - Hidden on mobile so Admin button has full space */}
            <div className="hidden md:flex items-center bg-neutral-100 p-1 border border-neutral-200 rounded-lg">
              <button
                id="lang-hi-btn"
                onClick={() => setLanguage('hi')}
                aria-label="हिंदी भाषा चुने"
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-handwritten font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  language === 'hi'
                    ? 'bg-[#2C1A0E] text-white shadow-sm'
                    : 'text-neutral-600 hover:text-[#2C1A0E] hover:bg-white/60'
                }`}
              >
                <Languages className="w-3.5 h-3.5 text-[#E6AF6E]" />
                <span>हिंदी</span>
              </button>
              <button
                id="lang-en-btn"
                onClick={() => setLanguage('en')}
                aria-label="Switch to English"
                className={`px-3 sm:px-4 py-1.5 text-xs font-agbalumo font-normal rounded-md transition-all duration-200 cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#2C1A0E] text-white shadow-sm'
                    : 'text-neutral-600 hover:text-[#2C1A0E] hover:bg-white/60'
                }`}
              >
                English
              </button>
            </div>

            {/* Direct Admin Panel Button - PROMINENT & FULLY VISIBLE ON ALL SCREENS INCLUDING MOBILE */}
            {onOpenAdmin && (
              <button
                id="navbar-admin-btn"
                type="button"
                onClick={onOpenAdmin}
                aria-label="Open Admin Dashboard"
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-[#8C5A32] hover:bg-[#2C1A0E] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer shadow-sm shrink-0 border border-amber-900/20"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200 shrink-0" />
                <span className="tracking-wide font-bold">{isHindi ? 'एडमिन' : 'Admin'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile View: Floating Bottom Language Switcher (within easy thumb reach) */}
      <div
        className="fixed bottom-4 left-4 z-40 md:hidden flex items-center bg-white/95 backdrop-blur-md p-1 border border-[#8C5A32]/25 rounded-full shadow-[0_4px_16px_rgba(44,26,14,0.18)] transition-all"
        role="region"
        aria-label="Language selection"
      >
        <button
          id="mobile-bottom-lang-hi-btn"
          type="button"
          onClick={() => setLanguage('hi')}
          aria-label="हिंदी भाषा चुने"
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1 ${
            language === 'hi'
              ? 'bg-[#2C1A0E] text-white shadow-xs'
              : 'text-neutral-700 hover:text-[#2C1A0E]'
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-[#E6AF6E]" />
          <span>हिंदी</span>
        </button>
        <button
          id="mobile-bottom-lang-en-btn"
          type="button"
          onClick={() => setLanguage('en')}
          aria-label="Switch to English"
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
            language === 'en'
              ? 'bg-[#2C1A0E] text-white shadow-xs'
              : 'text-neutral-700 hover:text-[#2C1A0E]'
          }`}
        >
          English
        </button>
      </div>
    </>
  );
}




