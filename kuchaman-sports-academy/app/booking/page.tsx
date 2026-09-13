'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { BookingSection } from '@/components/BookingSection';
import { Footer } from '@/components/Footer';
import { AdminModal } from '@/components/AdminModal';
import AdmissionPanel from '@/components/AdmissionPanel';
import MentorPanel from '@/components/MentorPanel';

import { LanguageProvider } from '@/lib/LanguageContext';
import { FirebaseProvider } from '@/lib/FirebaseContext';

export default function HomePage() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  // Multi-view: 'home' | 'cricket' | 'swimming' | 'admission' | 'mentor'
  const [activeView, setActiveView] = useState<'home' | 'cricket' | 'swimming' | 'admission' | 'mentor'>('home');
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
      if (sportParam === 'cricket' || sportParam === 'swimming') {
        setActiveView(sportParam);
      } else if (viewParam === 'admission') {
        setActiveView('admission');
      } else if (viewParam === 'mentor') {
        setActiveView('mentor');
      }
    }
  }, []);

  const handleBackToHome = () => {
    if (activeView === 'home') {
      window.location.href = '/';
    } else {
      setActiveView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
              {/* VIEW 1: Clean Dedicated Hero Section */}
              {activeView === 'home' && (
                <motion.div
                  key="home-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.97 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="w-full"
                >
                  <HeroSection
                    onBookCricket={() => handleSelectSport('cricket')}
                    onBookBigBox={() => handleSelectSport('cricket')}
                    onBookSwimming={() => handleSelectSport('swimming')}
                    onOpenAdmission={handleOpenAdmission}
                    onOpenMentor={() => handleOpenMentor()}
                    onOpenAdmin={() => setIsAdminOpen(true)}
                  />
                </motion.div>
              )}

              {/* VIEW 2: Admission Panel (Solo, Academic, School) */}
              {activeView === 'admission' && (
                <motion.div
                  key="admission-view"
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full"
                >
                  <AdmissionPanel
                    onBackToHome={handleBackToHome}
                    onOpenMentorPanel={handleOpenMentor}
                  />
                </motion.div>
              )}

              {/* VIEW 3: Mentor Portal (Roster, Attendance, Certificates) */}
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
                    onBackToHome={handleBackToHome}
                  />
                </motion.div>
              )}

              {/* VIEW 4: Dedicated Sport Booking (Cricket or Swimming) */}
              {(activeView === 'cricket' || activeView === 'swimming') && (
                <motion.div
                  key={`booking-${activeView}`}
                  initial={{ opacity: 0, y: 30, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
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
          <Footer onOpenAdmin={() => setIsAdminOpen(true)} />

          {/* 4. Protected Admin Dashboard Modal */}
          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            onDataChanged={handleDataChanged}
          />
        </main>
      </LanguageProvider>
    </FirebaseProvider>
  );
}
