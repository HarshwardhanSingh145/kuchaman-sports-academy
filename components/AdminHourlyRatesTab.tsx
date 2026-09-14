'use client';

import React, { useState, useEffect } from 'react';
import { IndianRupee, Save, Check, Clock, Sparkles, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { HourlyRatesConfig } from '@/lib/types';

interface AdminHourlyRatesTabProps {
  onSaved?: () => void;
}

export function AdminHourlyRatesTab({ onSaved }: AdminHourlyRatesTabProps) {
  const [rates, setRates] = useState<HourlyRatesConfig>({
    cricketBigBox: 1000,
    cricketPracticeNet: 500,
    swimmingPool: 100,
    admission: 1000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = () => {
    setLoading(true);
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.hourlyRates) {
          setRates({
            cricketBigBox: Number(data.config.hourlyRates.cricketBigBox) || 1000,
            cricketPracticeNet: Number(data.config.hourlyRates.cricketPracticeNet) || 500,
            swimmingPool: Number(data.config.hourlyRates.swimmingPool) || 100,
            admission: Number(data.config.hourlyRates.admission) || 1000,
          });
        }
      })
      .catch((err) => {
        console.error('Error loading rates:', err);
      })
      .finally(() => setLoading(false));
  };

  const handleRateChange = (category: keyof HourlyRatesConfig, delta: number) => {
    setRates((prev) => {
      const nextVal = Math.max(50, (prev[category] || 0) + delta);
      return { ...prev, [category]: nextVal };
    });
  };

  const handleManualInput = (category: keyof HourlyRatesConfig, val: string) => {
    const num = parseInt(val, 10);
    setRates((prev) => ({
      ...prev,
      [category]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hourlyRates: rates,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          text: '✓ प्रति घंटा दरें सफलतापूर्वक अपडेट हो गईं! बुकिंग पेज पर यह नया रेट तुरंत लागू हो गया है।',
        });
        if (onSaved) onSaved();
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to update hourly rates',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Connection error while saving rates',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-neutral-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-700" />
        <p className="text-xs font-semibold">दरें लोड हो रही हैं...</p>
      </div>
    );
  }

  const categoryCards: {
    key: keyof HourlyRatesConfig;
    title: string;
    titleEn: string;
    icon: string;
    description: string;
    unitLabel: string;
    stepSmall: number;
    stepLarge: number;
  }[] = [
    {
      key: 'cricketBigBox',
      title: 'बड़ा बॉक्स क्रिकेट टर्फ (Big Box Turf)',
      titleEn: 'Big Box Turf Arena (160 × 70 ft)',
      icon: '🏟️',
      description: 'पूरे बॉक्स टर्फ का प्रति घंटा किराया (Duration-based billing)',
      unitLabel: 'प्रति घंटा (Per Hour)',
      stepSmall: 50,
      stepLarge: 100,
    },
    {
      key: 'cricketPracticeNet',
      title: 'क्रिकेट प्रैक्टिस नेट (Practice Nets)',
      titleEn: 'Practice Nets (Net 1–4 Lanes)',
      icon: '🏏',
      description: 'एस्ट्रो-टर्फ प्रैक्टिस लेन का प्रति घंटा स्लॉट रेट',
      unitLabel: 'प्रति घंटा (Per Hour)',
      stepSmall: 50,
      stepLarge: 100,
    },
    {
      key: 'swimmingPool',
      title: 'स्विमिंग पूल सेशन (Swimming Pool)',
      titleEn: 'Swimming Pool Hourly / Session Rate',
      icon: '🏊',
      description: 'ओलंपिक-ग्रेड स्वीमिंग पूल का प्रति घंटा स्लॉट चार्ज',
      unitLabel: 'प्रति घंटा / प्रति व्यक्ति',
      stepSmall: 20,
      stepLarge: 50,
    },
    {
      key: 'admission',
      title: 'एकैडमी एडमिशन (Academy Admission)',
      titleEn: 'KSA Academy Admission Registration',
      icon: '🎓',
      description: 'प्रति छात्र स्पोर्ट्स एकैडमी ट्रेनिंग एडमिशन फीस',
      unitLabel: 'प्रति छात्र (Per Student)',
      stepSmall: 100,
      stepLarge: 500,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#2C1A0E] to-[#5C381E] text-white p-5 rounded-2xl shadow-sm border border-[#2C1A0E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg text-xs font-black">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black tracking-tight text-[#FAF4ED]">
                Hourly Rate Management (प्रति घंटा दर नियंत्रण)
              </h3>
            </div>
            <p className="text-xs text-neutral-300 max-w-xl">
              Owner/Admin किसी भी समय किसी भी कैटेगरी की प्रति घंटा दर बदल सकते हैं। यहाँ बदला हुआ रेट
              तुरंत बुकिंग पेज पर नई बुकिंग्स में लागू होगा।
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Reflected in Booking</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSaveRates} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryCards.map((item) => {
            const currentVal = rates[item.key] || 0;
            return (
              <div
                key={item.key}
                className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs hover:border-[#8C5A32]/50 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {item.unitLabel}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-neutral-900">{item.title}</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{item.description}</p>
                </div>

                {/* Big Rate Display & Inputs */}
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-neutral-500 font-medium">Current Rate:</span>
                    <div className="flex items-baseline gap-1 text-[#2C1A0E]">
                      <span className="text-sm font-black text-amber-700">₹</span>
                      <span className="text-2xl font-black">{currentVal}</span>
                      <span className="text-xs text-neutral-500 font-semibold">/hr</span>
                    </div>
                  </div>

                  {/* Manual Input + Quick Adjustment Controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={currentVal}
                        onChange={(e) => handleManualInput(item.key, e.target.value)}
                        className="w-full h-10 pl-7 pr-3 rounded-lg border border-neutral-300 focus:border-[#2C1A0E] text-sm font-bold text-neutral-900 bg-white outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRateChange(item.key, -item.stepSmall)}
                        className="h-10 px-2.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        title={`Decrease by ₹${item.stepSmall}`}
                      >
                        -{item.stepSmall}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateChange(item.key, item.stepSmall)}
                        className="h-10 px-2.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        title={`Increase by ₹${item.stepSmall}`}
                      >
                        +{item.stepSmall}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateChange(item.key, item.stepLarge)}
                        className="h-10 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        title={`Increase by ₹${item.stepLarge}`}
                      >
                        +{item.stepLarge}
                      </button>
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  <div className="mt-2.5 pt-2 border-t border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-600">
                    <span>1 Hr: <strong>₹{currentVal}</strong></span>
                    <span>2 Hrs: <strong>₹{currentVal * 2}</strong></span>
                    <span>3 Hrs: <strong>₹{currentVal * 3}</strong></span>
                    <span>4 Hrs: <strong>₹{currentVal * 4}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#2C1A0E] hover:bg-[#432818] text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>अपडेट हो रहा है...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>दरें सेव करें (Save Hourly Rates)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
