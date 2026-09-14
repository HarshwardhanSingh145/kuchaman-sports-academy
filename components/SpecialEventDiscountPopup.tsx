'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Gift, ArrowRight, Tag, Check, Calendar, Flame } from 'lucide-react';
import { DiscountPopupConfig } from '@/lib/types';

interface SpecialEventDiscountPopupProps {
  onClaim?: () => void;
}

export function SpecialEventDiscountPopup({ onClaim }: SpecialEventDiscountPopupProps) {
  const [config, setConfig] = useState<DiscountPopupConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Check if dismissed in this browser session
    const isDismissed = sessionStorage.getItem('ksa_discount_popup_dismissed') === 'true';

    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.discountPopup?.enabled) {
          setConfig(data.config.discountPopup);
          if (!isDismissed) {
            // Show popup with a slight delay for pleasant entry
            const timer = setTimeout(() => {
              setIsOpen(true);
            }, 900);
            return () => clearTimeout(timer);
          } else {
            setIsMinimized(true);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch discount popup config:', err);
      });
  }, []);

  if (!config || !config.enabled) return null;

  const handleDismiss = () => {
    setIsOpen(false);
    setIsMinimized(true);
    sessionStorage.setItem('ksa_discount_popup_dismissed', 'true');
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (config.couponCode) {
      navigator.clipboard.writeText(config.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClaimOffer = () => {
    setIsOpen(false);
    setIsMinimized(true);
    sessionStorage.setItem('ksa_discount_popup_dismissed', 'true');
    if (onClaim) {
      onClaim();
    } else {
      const target = document.getElementById('booking-view') || document.querySelector('[data-booking-root]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = '/booking';
      }
    }
  };

  return (
    <>
      {/* Floating Offer Pill when popup is closed/minimized */}
      {isMinimized && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed bottom-5 right-5 z-40"
        >
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-[#2C1A0E] to-[#8C5A32] text-white shadow-xl hover:shadow-2xl border-2 border-[#FAF4ED]/50 transition-all hover:scale-105 cursor-pointer group"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold font-agbalumo text-[#FAF4ED] group-hover:text-white">
              {config.discountBadge || 'Special Offer'}
            </span>
            <Gift className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </motion.div>
      )}

      {/* Main Special Event Discount Popup Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-[#FAF8F5] border-2 border-[#8C5A32]/40 rounded-3xl shadow-2xl overflow-hidden my-auto"
            >
              {/* Festive Gradient Header with Pattern */}
              <div className="relative bg-gradient-to-br from-[#2C1A0E] via-[#5C381E] to-[#8C5A32] text-white p-6 sm:p-7 text-center overflow-hidden">
                {/* Decorative glow elements */}
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none"></div>

                {/* Close Button */}
                <button
                  onClick={handleDismiss}
                  aria-label="Close offer popup"
                  className="absolute top-4 right-4 p-2 bg-white/15 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Event Celebration Badge */}
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Special Event Offer</span>
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold font-agbalumo text-[#FAF4ED] tracking-wide leading-snug">
                  {config.title || 'स्पेशल डिस्काउंट ऑफर! 🏏 🏊'}
                </h3>

                {/* Big Discount Badge */}
                <div className="mt-4 inline-block">
                  <div className="px-5 py-2 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-[#2C1A0E] font-black text-2xl sm:text-3xl rounded-2xl shadow-lg border border-amber-200 uppercase tracking-tight transform -rotate-1 hover:rotate-0 transition-transform">
                    {config.discountBadge || `${config.discountPercentage || 15}% OFF`}
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-7 space-y-5">
                {/* Description */}
                <p className="text-sm text-[#5C4033] leading-relaxed text-center font-medium">
                  {config.description ||
                    'कुचामन स्पोर्ट्स एकैडमी के स्पेशल इवेंट पर बॉक्स क्रिकेट टर्फ, नेट प्रैक्टिस और स्विमिंग पूल स्लॉट्स पर विशेष छूट उपलब्ध है!'}
                </p>

                {/* Coupon Code Section (if provided) */}
                {config.couponCode && (
                  <div className="bg-[#F5EBE0] border-2 border-dashed border-[#8C5A32]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-[#8C5A32]" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7A5C4A] block">
                          Use Promo Code
                        </span>
                        <span className="font-mono font-bold text-base text-[#2C1A0E] tracking-wider">
                          {config.couponCode}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3.5 py-1.5 bg-[#2C1A0E] hover:bg-[#8C5A32] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <span>Copy Code</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Validity / Expiry notice */}
                {config.validTill && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#7A5C4A] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#8C5A32]" />
                    <span>{config.validTill}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleClaimOffer}
                    className="w-full py-3.5 bg-gradient-to-r from-[#2C1A0E] to-[#8C5A32] hover:from-[#1E1109] hover:to-[#724523] text-white text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>{config.buttonText || 'Claim Discount & Book Now'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="w-full py-2 text-xs text-[#7A5C4A] hover:text-[#2C1A0E] font-bold text-center cursor-pointer transition-colors"
                  >
                    Not now, remind me later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
