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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-3.5 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-[0_2px_15px_rgba(0,0,0,0.05)]'
          : 'py-4.5 bg-white/90 backdrop-blur-sm border-b border-neutral-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        {/* Sports Logo + KSA ONLY */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            aria-label="KSA Home"
          >
            {/* Athletic Sports Emblem Logo */}
            <div className="w-10 h-10 rounded-lg bg-[#2C1A0E] text-white flex items-center justify-center shadow-sm group-hover:bg-[#8C5A32] transition-colors duration-300">
              <Trophy className="w-5 h-5 text-[#E6AF6E]" />
            </div>
            
            {/* Strictly KSA text only */}
            <span className="text-xl sm:text-2xl font-agbalumo font-normal tracking-wide text-[#2C1A0E] group-hover:text-[#8C5A32] transition-colors">
              KSA
            </span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-[#2C1A0E] transition-colors"
            title="Return to Main Website"
          >
            <span>←</span>
            <span>{isHindi ? 'मुख्य वेबसाइट' : 'Main Website'}</span>
          </Link>

          {activeView !== 'home' && onGoHome && (
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-[#2C1A0E] transition-colors cursor-pointer"
            >
              <span>←</span>
              <span className="hidden xs:inline">{isHindi ? 'बुकिंग होम' : 'Booking Home'}</span>
            </button>
          )}
        </div>

        {/* Right side: Portals + Language Switcher + Admin Button */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick link: Admission Panel */}
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

          {/* Quick link: Mentor Portal */}
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

          {/* Dedicated Hindi / English Switcher */}
          <div className="flex items-center bg-neutral-100 p-1 border border-neutral-200 rounded-lg">
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

          {/* Direct Admin Panel Button */}
          {onOpenAdmin && (
            <button
              id="navbar-admin-btn"
              type="button"
              onClick={onOpenAdmin}
              aria-label="Open Admin Dashboard"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-[#8C5A32] hover:bg-[#2C1A0E] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-amber-200" />
              <span>{isHindi ? 'एडमिन' : 'Admin'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}




