'use client';

import React from 'react';
import { BookingSection } from './BookingSection';

interface AdmissionPanelProps {
  onBackToHome: () => void;
  onOpenMentorPanel: (credentials?: { username: string; pass: string }) => void;
}

export function AdmissionPanel({ onBackToHome, onOpenMentorPanel }: AdmissionPanelProps) {
  return (
    <div className="w-full">
      {/* Back button link */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-black py-1.5 px-3 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <span>← मुख्य पृष्ठ (Back to Home)</span>
        </button>
      </div>

      {/* Renders the streamlined, 2-step Admission Booking Flow with 10% Online Booking Discount */}
      <BookingSection initialSport="admission" onBack={onBackToHome} />
    </div>
  );
}

export default AdmissionPanel;

