'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { BookingSection } from '@/components/BookingSection';
import { Footer } from '@/components/Footer';
import { AdminModal } from '@/components/AdminModal';
import { TermsModal } from '@/components/TermsModal';
import { SpecialEventDiscountPopup } from '@/components/SpecialEventDiscountPopup';
import AdmissionPanel from '@/components/AdmissionPanel';
import MentorPanel from '@/components/MentorPanel';

import { LanguageProvider } from '@/lib/LanguageContext';
import { FirebaseProvider } from '@/lib/FirebaseContext';

export default function HomePage() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  // Multi-view: 'cricket' | 'swimming' | 'admission' | 'mentor'
  const [activeView, setActiveView] = useState<'cricket' | 'swimming' | 'admission' | 'mentor'>('cricket');
  const [bookingKey, setBookingKey] = useState(0);
  const [mentorCredentials, setMentorCredentials] = useState<{ username: string; pass: string } | null>(null);

  const handleSelectSport = (sport: 'cricket' | 'swimming') => {
    setActiveView(sport);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdmission = () => {
    setActiveView('admission');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMentor = (credentials?: { username: string; pass: string }) => {
    if (credentials) {
      setMentorCredentials(credentials);
    }
    setActiveView('mentor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sportParam = params.get('sport');
      const viewParam = params.get('view');
      const catParam = params.get('category');
      const termsParam = params.get('terms');
      if (termsParam === 'open' || termsParam === 'true') {
        setIsTermsOpen(true);
      }
      if (sportParam === 'cricket' || sportParam === 'swimming') {
        setActiveView(sportParam);
      } else if (viewParam === 'admission' || catParam === 'admission') {
        setActiveView('admission');
      } else if (viewParam === 'mentor') {
        setActiveView('mentor');
      }
    }
  }, []);

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleDataChanged = () => {
    // Force re-fetch in booking section
    setBookingKey((prev) => prev + 1);
  };

  return (
    <FirebaseProvider>
      <LanguageProvider>
        <main className="min-h-screen bg-[#FAF8F5] text-[#2C1A0E] relative selection:bg-[#8C5A32] selection:text-white flex flex-col justify-between">
          {/* 1. Fixed Header (Navbar) */}
          <Navbar
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenAdmission={handleOpenAdmission}
            onOpenMentor={() => handleOpenMentor()}
            onGoHome={handleBackToHome}
            activeView={activeView}
          />

          <div className="flex-1 w-full overflow-x-clip">
            <AnimatePresence mode="wait">
              {/* VIEW: Mentor Portal (Roster, Attendance, Certificates) */}
              {activeView === 'mentor' && (
                <motion.div
                  key="mentor-view"
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full"
                >
                  <MentorPanel
                    initialCredentials={mentorCredentials}
                    onBackToHome={() => setActiveView('cricket')}
                  />
                </motion.div>
              )}

              {/* VIEW: Progressive One-Screen Booking System (Cricket / Swimming / Admission) */}
              {activeView !== 'mentor' && (
                <motion.div
                  key={`booking-${activeView}-${bookingKey}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full"
                >
                  <BookingSection
                    key={`${bookingKey}-${activeView}`}
                    initialSport={activeView}
                    onBack={handleBackToHome}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Minimal Clean Footer */}
          <Footer
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenTerms={() => setIsTermsOpen(true)}
          />

          {/* 4. Terms & Conditions Modal */}
          <TermsModal
            isOpen={isTermsOpen}
            onClose={() => setIsTermsOpen(false)}
          />

          {/* 5. Protected Admin Dashboard Modal */}
          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            onDataChanged={handleDataChanged}
          />

          {/* 6. Customer Special Event Discount Popup */}
          <SpecialEventDiscountPopup />
        </main>
      </LanguageProvider>
    </FirebaseProvider>
  );
}
