'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Save,
  Clock,
  Sparkles,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';

interface AdminWhatsAppSettingsTabProps {
  currentNumber: string;
  onSaved: (newNumber: string) => void;
}

export function AdminWhatsAppSettingsTab({
  currentNumber,
  onSaved,
}: AdminWhatsAppSettingsTabProps) {
  const [phoneNumber, setPhoneNumber] = useState(currentNumber || '8142731917');
  const [activeNumber, setActiveNumber] = useState(currentNumber || '8142731917');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentNumber) {
      setPhoneNumber(currentNumber);
      setActiveNumber(currentNumber);
    }
  }, [currentNumber]);

  // Clean 10-digit representation
  const cleanActive = activeNumber.replace(/\D/g, '').slice(-10) || '8142731917';
  const cleanInput = phoneNumber.replace(/\D/g, '').slice(-10);

  // Test message for WhatsApp
  const sampleTestMsg = `नमस्ते Kuchaman Sports Academy!\n\nयह आपके बुकिंग सिस्टम का टेस्ट वेरिफिकेशन मैसेज है।\n📲 आपका यह WhatsApp नंबर (+91 ${cleanInput || cleanActive}) बुकिंग अलर्ट प्राप्त करने के लिए बिल्कुल सही और सक्रिय है।`;
  const testWhatsAppUrl = `https://wa.me/91${cleanInput || cleanActive}?text=${encodeURIComponent(sampleTestMsg)}`;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setFeedback({
        type: 'error',
        text: 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (उदा. 8142731917)।',
      });
      return;
    }

    const cleanedToSave = digitsOnly.slice(-10);

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerWhatsAppNumber: cleanedToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'नंबर सेव करने में त्रुटि हुई');
      }

      setActiveNumber(cleanedToSave);
      setPhoneNumber(cleanedToSave);
      onSaved(cleanedToSave);

      setFeedback({
        type: 'success',
        text: `✅ WhatsApp मोबाइल नंबर सफलतापूर्वक बदलकर +91 ${cleanedToSave} कर दिया गया है! अब जब भी कोई खिलाड़ी बुकिंग करेगा, सत्यापन के लिए संदेश इसी नंबर पर जाएगा।`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'नेटवर्क समस्या के कारण नंबर सेव नहीं हो सका।',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(cleanActive);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#1b4332] text-white p-5 sm:p-6 rounded-2xl border border-emerald-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-agbalumo text-white">
                ओनर WhatsApp व बुकिंग वेरिफिकेशन नंबर
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
              जब भी कोई खिलाड़ी या छात्र ऑनलाइन स्लॉट या रिकरिंग प्लान बुक करेगा, तो पेमेंट वेरिफिकेशन का अलर्ट और यस/नो (Approve/Reject) लिंक इसी WhatsApp नंबर पर जाएगा।
            </p>
          </div>

          {/* Current Active Badge */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute inset-0" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 relative" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">
                वर्तमान सक्रिय नंबर
              </span>
              <span className="text-base sm:text-lg font-mono font-black text-white">
                +91 {cleanActive}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{feedback.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold text-neutral-500 hover:text-neutral-900 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Form + Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Change Mobile Number Form (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-black text-[#2C1A0E] flex items-center gap-2 font-agbalumo">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>नया WhatsApp मोबाइल नंबर बदलें</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Update the mobile number that receives verification alerts
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-[11px] font-bold">
              तत्काल लागू (Instant)
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-700 mb-1.5">
                ओनर का 10-अंकीय WhatsApp नंबर *
              </label>
              <div className="flex items-center rounded-xl border border-neutral-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-white overflow-hidden transition-all shadow-inner">
                <div className="px-3.5 py-3 bg-neutral-100 border-r border-neutral-300 text-neutral-700 font-mono font-bold text-sm flex items-center gap-1.5 select-none">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="उदा. 8142731917"
                  className="flex-1 px-4 py-3 text-base font-mono font-bold text-[#2C1A0E] outline-none placeholder:text-neutral-400 placeholder:font-normal"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                केवल 10 अंकों का मोबाइल नंबर डालें। देश कोड (+91) स्वतः जोड़ दिया जाएगा।
              </p>
            </div>

            {/* Current status display */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">वर्तमान सक्रिय नंबर:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-neutral-900">+91 {cleanActive}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 hover:bg-neutral-200 rounded-md text-neutral-600 transition-colors"
                    title="Copy Number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">सत्यापन संदेश गंतव्य:</span>
                <span className="font-bold text-emerald-700">सक्रिय (Active & Synced)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'सेव हो रहा है...' : '💾 नया WhatsApp नंबर सेव करें'}</span>
              </button>

              <a
                href={testWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>📲 टेस्ट मैसेज भेजें</span>
              </a>
            </div>
          </form>

          {/* Quick Note */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>सुरक्षा व पारदर्शिता:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              नया नंबर सेव करते ही यह पूरे सिस्टम (वेबसाइट, क्लाउड डेटाबेस, बुकिंग वेरिफिकेशन गेटवे) में तुरंत लागू हो जाएगा। अब कोई भी ग्राहक UPI से बुकिंग सबमिट करेगा तो उसका पूरा विवरण आपके नए नंबर पर ही आएगा।
            </p>
          </div>
        </div>

        {/* Right Col: WhatsApp Message Mockup & Flow (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* WhatsApp Chat Bubble Mockup */}
          <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-neutral-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-300/80 text-xs text-neutral-600">
              <span className="font-bold flex items-center gap-1.5 text-[#1b4332]">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp अलर्ट का लाइव नमूना (Preview)</span>
              </span>
              <span className="text-[10px] font-mono">Just now</span>
            </div>

            {/* Chat Bubble */}
            <div className="bg-white p-4 rounded-2xl rounded-tl-xs shadow-xs text-xs space-y-2 border border-neutral-200">
              <div className="flex items-center gap-1.5 text-amber-800 font-black">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>🔔 नई बुकिंग सत्यापन अनुरोध! (KSA)</span>
              </div>
              <div className="p-2 bg-neutral-50 rounded-lg font-mono text-[11px] text-neutral-800 space-y-1">
                <div><strong>📋 ID:</strong> KSA-CRK-8429</div>
                <div><strong>👤 ग्राहक:</strong> राहुल शर्मा (98290XXXXX)</div>
                <div><strong>🏆 खेल:</strong> क्रिकेट बॉक्स नेट #1</div>
                <div><strong>📅 दिनांक:</strong> आज • शाम 06:00 - 07:00 PM</div>
                <div><strong>💰 राशि:</strong> ₹1,000 (UPI)</div>
                <div><strong>💳 UTR:</strong> 423984920191</div>
              </div>
              <p className="text-[11px] text-neutral-600 italic">
                कृपया बैंक/UPI खाते में राशि चेक करके नीचे क्लिक करें:
              </p>
              <div className="pt-1 space-y-1.5">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-center text-[11px]">
                  👉 ✅ YES - भुगतान सत्यापित करें व स्लॉट कन्फर्म करें
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-bold text-center text-[11px]">
                  👉 ❌ NO - अस्वीकार करें (भुगतान नहीं मिला)
                </div>
              </div>
              <div className="pt-1 text-[10px] text-neutral-400 text-right">
                ✓✓ Delivered to +91 {cleanActive}
              </div>
            </div>
          </div>

          {/* 3 Step Flow Guide */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
            <h4 className="text-xs uppercase font-bold text-neutral-700 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>यह कैसे काम करता है? (3 सरल चरण)</span>
            </h4>

            <div className="space-y-2.5 text-xs text-neutral-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-neutral-900">ग्राहक की बुकिंग:</strong>
                  <p className="text-[11px] text-neutral-600">
                    ग्राहक वेबसाइट पर समय चुनकर UPI से भुगतान करता है और सत्यापन सबमिट करता है।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-neutral-900">तत्काल WhatsApp अलर्ट:</strong>
                  <p className="text-[11px] text-neutral-600">
                    ओनर के इस WhatsApp नंबर पर तुरंत ग्राहक का पूरा विवरण और Yes / No लिंक आता है।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-neutral-900">1-क्लिक लाइव पुष्टि:</strong>
                  <p className="text-[11px] text-neutral-600">
                    ओनर बैंक में पैसे चेक करके YES दबाते हैं और ग्राहक की स्क्रीन तुरंत कन्फर्म हो जाती है।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
