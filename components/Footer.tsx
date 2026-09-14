'use client';

import React from 'react';
import { Shield, Languages, FileText } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenTerms?: () => void;
}

export function Footer({ onOpenAdmin, onOpenTerms }: FooterProps) {
  const { language, setLanguage, isHindi } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-neutral-100 text-[#2C1A0E] border-t border-neutral-200 py-6 sm:py-8 pb-20 sm:pb-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A5C4A]">
        {/* Brand Copyright */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#2C1A0E] text-white flex items-center justify-center font-bold text-[10px] rounded-md">
            KSA
          </div>
          <span>
            &copy; {currentYear} {isHindi ? 'कुचामन स्पोर्ट्स एकेडमी (KSA)' : 'Kuchaman Sports Academy (KSA)'}. {isHindi ? 'सर्वाधिकार सुरक्षित।' : 'All rights reserved.'}
          </span>
        </div>

        {/* Bottom Actions: Language Switcher + Admin Login Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
          {/* Bottom Language Switcher */}
          <div className="flex items-center bg-white p-0.5 border border-neutral-300 rounded-lg shadow-2xs">
            <button
              id="footer-lang-hi-btn"
              type="button"
              onClick={() => setLanguage('hi')}
              aria-label="हिंदी"
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                language === 'hi'
                  ? 'bg-[#2C1A0E] text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-[#2C1A0E]'
              }`}
            >
              <Languages className="w-3 h-3 text-[#E6AF6E]" />
              <span>हिंदी</span>
            </button>
            <button
              id="footer-lang-en-btn"
              type="button"
              onClick={() => setLanguage('en')}
              aria-label="English"
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-[#2C1A0E] text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-[#2C1A0E]'
              }`}
            >
              English
            </button>
          </div>

          {/* Terms & Conditions Button */}
          {onOpenTerms && (
            <button
              id="footer-terms-btn"
              type="button"
              onClick={onOpenTerms}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-neutral-200 border border-neutral-200 text-xs font-semibold text-[#2C1A0E] transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#8C5A32]" />
              <span>{isHindi ? 'नियम व शर्तें' : 'Terms & Conditions'}</span>
            </button>
          )}

          {/* Admin Login Button */}
          <button
            id="footer-admin-link"
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-neutral-200 border border-neutral-200 text-xs font-semibold text-[#2C1A0E] transition-colors cursor-pointer shadow-2xs"
          >
            <Shield className="w-3.5 h-3.5 text-[#8C5A32]" />
            <span>{isHindi ? 'एडमिन पैनल' : 'Admin Panel'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
