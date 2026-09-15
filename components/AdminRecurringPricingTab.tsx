'use client';

import React, { useState } from 'react';
import { Save, Sparkles, Check, AlertCircle, RefreshCw, Layers, Percent, Calendar } from 'lucide-react';
import { AcademyConfig, RecurringPricingConfig } from '@/lib/types';
import { DEFAULT_RECURRING_PRICING } from '@/lib/defaults';

interface AdminRecurringPricingTabProps {
  config: AcademyConfig;
  onDataChanged: () => void;
}

export function AdminRecurringPricingTab({
  config,
  onDataChanged,
}: AdminRecurringPricingTabProps) {
  const currentPricing: RecurringPricingConfig = {
    ...DEFAULT_RECURRING_PRICING,
    ...(config.recurringPricing || {}),
  };

  const [pricing, setPricing] = useState<RecurringPricingConfig>(currentPricing);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          recurringPricing: pricing,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotice({
          type: 'success',
          text: 'रिकरिंग बुकिंग दरें सफलतापूर्वक अपडेट हो गईं! (Recurring pricing saved successfully!)',
        });
        onDataChanged();
      } else {
        setNotice({
          type: 'error',
          text: data.error || 'दरें सहेजने में विफल। कृपया पुनः प्रयास करें।',
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'त्रुटि उत्पन्न हुई।',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const resetToDefaults = () => {
    if (confirm('क्या आप सभी रिकरिंग दरों को डिफ़ॉल्ट मान पर रीसेट करना चाहते हैं?')) {
      setPricing(DEFAULT_RECURRING_PRICING);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#2C1A0E] to-[#4A2D19] text-white">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-300" />
          <h3 className="text-lg font-black tracking-wide">
            रिकरिंग बुकिंग मूल्य नियंत्रण (Recurring Pricing Control)
          </h3>
        </div>
        <p className="text-xs text-neutral-300 mt-1">
          साप्ताहिक, मासिक और पसंदीदा समय बुकिंग के लिए प्रति सत्र शुल्क और विशेष पैकेज छूट प्रतिशत निर्धारित करें।
        </p>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* 1. WEEKLY BOOKING PRICING */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
              1
            </span>
            <div>
              <h4 className="font-black text-sm text-[#2C1A0E]">
                साप्ताहिक बुकिंग दरें (Weekly Booking Pricing)
              </h4>
              <p className="text-[11px] text-neutral-500">
                सप्ताह में 1 या अधिक दिन नियमित स्लॉट चुनने वाले ग्राहकों हेतु
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200">
            WEEKLY PLAN
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              क्रिकेट टर्फ प्रति सत्र (₹/hr)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min={100}
                max={5000}
                value={pricing.weeklyCricketRatePerSession}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    weeklyCricketRatePerSession: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">सामान्य: ₹1,000 / घंटा</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              स्विमिंग पूल प्रति सत्र (₹/व्यक्ति)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min={20}
                max={1000}
                value={pricing.weeklySwimmingRatePerSession}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    weeklySwimmingRatePerSession: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">सामान्य: ₹100 / घंटा</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              साप्ताहिक पैकेज छूट (%)
            </label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                %
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={pricing.weeklyDiscountPercent}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    weeklyDiscountPercent: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-3 pr-8 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">डिफ़ॉल्ट छूट: 10%</p>
          </div>
        </div>
      </div>

      {/* 2. MONTHLY BOOKING PRICING */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm">
              2
            </span>
            <div>
              <h4 className="font-black text-sm text-[#2C1A0E]">
                मासिक बुकिंग दरें (Monthly Booking Pricing)
              </h4>
              <p className="text-[11px] text-neutral-500">
                1 से 6 महीने तक नियमित स्लॉट बुक करने वाले ग्राहकों हेतु
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
            MONTHLY PLAN
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              क्रिकेट टर्फ प्रति सत्र (₹/hr)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min={100}
                max={5000}
                value={pricing.monthlyCricketRatePerSession}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    monthlyCricketRatePerSession: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">सामान्य: ₹1,000 / घंटा</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              स्विमिंग पूल प्रति सत्र (₹/व्यक्ति)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min={20}
                max={1000}
                value={pricing.monthlySwimmingRatePerSession}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    monthlySwimmingRatePerSession: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">सामान्य: ₹100 / घंटा</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              मासिक पैकेज छूट (%)
            </label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                %
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={pricing.monthlyDiscountPercent}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    monthlyDiscountPercent: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-3 pr-8 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">डिफ़ॉल्ट छूट: 15%</p>
          </div>
        </div>
      </div>

      {/* 3. PREFERRED TIME BOOKING PRICING */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm">
              3
            </span>
            <div>
              <h4 className="font-black text-sm text-[#2C1A0E]">
                पसंदीदा समय बुकिंग (Preferred Time Pricing)
              </h4>
              <p className="text-[11px] text-neutral-500">
                निश्चित पसंदीदा समय स्लॉट को नियमित आरक्षित रखने वाले ग्राहकों हेतु
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-extrabold border border-blue-200">
            PREFERRED TIME
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              क्रिकेट टर्फ प्रति सत्र (₹/hr)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min={100}
                max={5000}
                value={pricing.preferredTimeCricketRatePerSession}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    preferredTimeCricketRatePerSession: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              स्विमिंग पूल प्रति सत्र (₹/व्यक्ति)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min={20}
                max={1000}
                value={pricing.preferredTimeSwimmingRatePerSession}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    preferredTimeSwimmingRatePerSession: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
              पसंदीदा समय पैकेज छूट (%)
            </label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                %
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={pricing.preferredTimeDiscountPercent}
                onChange={(e) =>
                  setPricing((p) => ({
                    ...p,
                    preferredTimeDiscountPercent: Number(e.target.value) || 0,
                  }))
                }
                className="w-full h-11 pl-3 pr-8 rounded-xl border border-neutral-300 text-xs font-black text-neutral-900 focus:ring-2 focus:ring-[#2C1A0E] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={resetToDefaults}
          className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all cursor-pointer"
        >
          डिफ़ॉल्ट मान पर रीसेट करें
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-[#2C1A0E] hover:bg-[#432818] text-white text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'सहेजा जा रहा है...' : 'रिकरिंग दरें सहेजें (Save Pricing)'}</span>
        </button>
      </div>
    </form>
  );
}
