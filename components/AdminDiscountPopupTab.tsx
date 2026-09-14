'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Gift,
  Save,
  Check,
  AlertCircle,
  Eye,
  RefreshCw,
  Tag,
  Calendar,
  Flame,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { DiscountPopupConfig } from '@/lib/types';

interface AdminDiscountPopupTabProps {
  onSaved?: () => void;
}

export function AdminDiscountPopupTab({ onSaved }: AdminDiscountPopupTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('स्पेशल इवेंट धमाका ऑफर! 🏏 🏊');
  const [discountBadge, setDiscountBadge] = useState('15% EXTRA OFF');
  const [discountPercentage, setDiscountPercentage] = useState(15);
  const [description, setDescription] = useState(
    'कुचामन स्पोर्ट्स एकैडमी के बॉक्स क्रिकेट टर्फ, नेट प्रैक्टिस और स्विमिंग पूल स्लॉट पर विशेष छूट!'
  );
  const [couponCode, setCouponCode] = useState('KSAEVENT2026');
  const [validTill, setValidTill] = useState('सीमित समय के लिए उपलब्ध (Limited Period Offer)');
  const [applicableSport, setApplicableSport] = useState<'all' | 'cricket' | 'swimming' | 'admission'>('all');
  const [buttonText, setButtonText] = useState('अभी स्लॉट बुक करें (Claim Discount)');

  // Quick Preset Templates for Easy Admin Configuration
  const applyPreset = (preset: {
    title: string;
    badge: string;
    pct: number;
    desc: string;
    code: string;
    valid: string;
  }) => {
    setTitle(preset.title);
    setDiscountBadge(preset.badge);
    setDiscountPercentage(preset.pct);
    setDescription(preset.desc);
    setCouponCode(preset.code);
    setValidTill(preset.valid);
  };

  useEffect(() => {
    setLoading(true);
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.discountPopup) {
          const p = data.config.discountPopup;
          setEnabled(Boolean(p.enabled));
          if (p.title) setTitle(p.title);
          if (p.discountBadge) setDiscountBadge(p.discountBadge);
          if (p.discountPercentage !== undefined) setDiscountPercentage(Number(p.discountPercentage));
          if (p.description) setDescription(p.description);
          if (p.couponCode !== undefined) setCouponCode(p.couponCode);
          if (p.validTill) setValidTill(p.validTill);
          if (p.applicableSport) setApplicableSport(p.applicableSport);
          if (p.buttonText) setButtonText(p.buttonText);
        }
      })
      .catch((err) => {
        console.error('Error fetching discount config:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload: DiscountPopupConfig = {
      enabled,
      title,
      discountBadge,
      discountPercentage: Number(discountPercentage) || 15,
      description,
      couponCode: couponCode.trim(),
      validTill,
      applicableSport,
      buttonText,
    };

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountPopup: payload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: enabled
            ? '✅ स्पेशल इवेंट डिस्काउंट पॉप-अप वेबसाइट पर एक्टिव कर दिया गया है!'
            : 'स्पेशल डिस्काउंट पॉप-अप को डिएक्टिवेट (OFF) कर दिया गया है।',
          type: 'success',
        });
        if (onSaved) onSaved();
      } else {
        setFeedback({ text: data.error || 'Failed to update discount popup', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Network error saving popup config', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-[#7A5C4A]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#8C5A32]" />
        <span className="text-xs font-agbalumo">Loading Discount Pop-up Configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-6 font-agbalumo max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#8C5A32]/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl border border-amber-300">
              <Gift className="w-5 h-5" />
            </div>
            <h4 className="text-lg sm:text-xl font-agbalumo text-[#2C1A0E] uppercase">
              Special Event Discount Pop-up Manager
            </h4>
          </div>
          <p className="text-xs text-[#5C4033] mt-1">
            वेबसाइट पर स्पेशल इवेंट, त्योहार या टूर्नामेंट के समय ग्राहकों को लुभाने वाला डिस्काउंट पॉप-अप दिखाएं।
          </p>
        </div>

        {/* Status indicator badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              enabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-neutral-100 text-neutral-600 border-neutral-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                enabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
              }`}
            ></span>
            <span>{enabled ? 'POP-UP LIVE ON WEBSITE' : 'POP-UP DISABLED (OFF)'}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-sm font-bold opacity-60 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* Quick Event Presets */}
      <div className="space-y-2">
        <label className="text-xs uppercase font-bold text-[#7A5C4A] tracking-wider block">
          ⚡ 1-क्लिक त्वरित प्रीसेट टेम्पलेट (Quick Presets)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() =>
              applyPreset({
                title: 'त्योहार स्पेशल महा-धमाका ऑफर! 🏏 🪔',
                badge: '20% FESTIVAL OFF',
                pct: 20,
                desc: 'त्योहारों के इस सीजन में कुचामन स्पोर्ट्स एकैडमी के क्रिकेट टर्फ व स्विमिंग पूल पर पाएं 20% की विशेष छूट!',
                code: 'FESTIVAL20',
                valid: 'सीमित दिनों के लिए मान्य (Limited Period)',
              })
            }
            className="p-2.5 bg-white hover:bg-[#FAF4ED] border border-[#8C5A32]/30 rounded-xl text-left transition-all hover:border-[#8C5A32] cursor-pointer shadow-2xs"
          >
            <span className="text-[11px] font-bold text-[#2C1A0E] block">🪔 फेस्टिवल / त्योहार</span>
            <span className="text-[10px] text-amber-700 block">20% Festival Off</span>
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset({
                title: 'वीकेंड बॉक्स क्रिकेट टूर्नामेंट स्पेशल! 🏏 🏆',
                badge: '15% WEEKEND BLAST',
                pct: 15,
                desc: 'इस वीकेंड अपने दोस्तों के साथ 160x70 फ़ीट बड़े बॉक्स टर्फ पर मैच खेलें और 15% छूट का आनंद लें!',
                code: 'WEEKEND15',
                valid: 'केवल इस शनिवार और रविवार के लिए मान्य',
              })
            }
            className="p-2.5 bg-white hover:bg-[#FAF4ED] border border-[#8C5A32]/30 rounded-xl text-left transition-all hover:border-[#8C5A32] cursor-pointer shadow-2xs"
          >
            <span className="text-[11px] font-bold text-[#2C1A0E] block">🏏 वीकेंड क्रिकेट स्पेशल</span>
            <span className="text-[10px] text-emerald-700 block">15% Weekend Blast</span>
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset({
                title: 'समर स्विमिंग पूल कूल ऑफर! 🏊 ☀️',
                badge: 'FLAT ₹50 OFF',
                pct: 25,
                desc: 'गर्मी के मौसम में कुचामन के ओलंपिक-ग्रेड स्विमिंग पूल में तैराकी करें और पाएं विशेष समर डिस्काउंट!',
                code: 'SUMMERPOOL',
                valid: 'इस माह के अंत तक मान्य (Limited Batch)',
              })
            }
            className="p-2.5 bg-white hover:bg-[#FAF4ED] border border-[#8C5A32]/30 rounded-xl text-left transition-all hover:border-[#8C5A32] cursor-pointer shadow-2xs"
          >
            <span className="text-[11px] font-bold text-[#2C1A0E] block">🏊 समर स्विमिंग कैंप</span>
            <span className="text-[10px] text-blue-700 block">Flat ₹50 / 25% Off</span>
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset({
                title: 'स्पोर्ट्स एकैडमी एडमिशन डिस्काउंट! 🎓 ⚡',
                badge: '₹100 INSTANT OFF',
                pct: 10,
                desc: 'नए बैच में मेंटर/कोच के साथ एडमिशन लें और पहले महीने की फीस पर पाएं 10% ऑनलाइन डिस्काउंट!',
                code: 'KSAADMISSION',
                valid: 'नए छात्रों के लिए सीमित सीटें उपलब्ध',
              })
            }
            className="p-2.5 bg-white hover:bg-[#FAF4ED] border border-[#8C5A32]/30 rounded-xl text-left transition-all hover:border-[#8C5A32] cursor-pointer shadow-2xs"
          >
            <span className="text-[11px] font-bold text-[#2C1A0E] block">🎓 न्यू एडमिशन ऑफर</span>
            <span className="text-[10px] text-purple-700 block">10% Instant Off</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Controls + Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Configuration Inputs (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4 bg-white p-5 border border-[#8C5A32]/20 rounded-2xl shadow-xs">
          {/* Master Enable/Disable Toggle Switch */}
          <div className="p-4 bg-[#FAF4ED] border border-[#8C5A32]/30 rounded-xl flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#2C1A0E] uppercase block">
                पॉप-अप चालू / बंद करें (Enable Pop-up on Website)
              </span>
              <span className="text-[11px] text-[#5C4033]">
                चालू रखने पर वेबसाइट पर आने वाले प्रत्येक विज़िटर को यह डिस्काउंट ऑफर दिखाई देगा।
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
              इवेंट या ऑफर का शीर्षक (Event Title) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. स्पेशल इवेंट धमाका ऑफर! 🏏 🏊"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
            />
          </div>

          {/* Discount Badge & Percentage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                डिस्काउंट बैज टेक्स्ट (Discount Badge Text) *
              </label>
              <input
                type="text"
                required
                value={discountBadge}
                onChange={(e) => setDiscountBadge(e.target.value)}
                placeholder="e.g. 15% EXTRA OFF या FLAT ₹200 OFF"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                छूट का प्रतिशत (Discount %)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                placeholder="15"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
              ऑफर का विवरण व संदेश (Offer Description) *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ग्राहकों के लिए आकर्षक विवरण..."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
            />
          </div>

          {/* Coupon Code & Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                प्रोमो / कूपन कोड (Promo Code)
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. KSAEVENT2026"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                मान्यता अवधि (Valid Till)
              </label>
              <input
                type="text"
                value={validTill}
                onChange={(e) => setValidTill(e.target.value)}
                placeholder="e.g. 30 सितम्बर तक मान्य (Limited Time)"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
              />
            </div>
          </div>

          {/* Target Sport & Button Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                लागू खेल / श्रेणी (Applicable Service)
              </label>
              <select
                value={applicableSport}
                onChange={(e: any) => setApplicableSport(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
              >
                <option value="all">सभी सेवाएँ (Cricket, Swimming, Admission)</option>
                <option value="cricket">केवल क्रिकेट टर्फ व नेट्स (Cricket)</option>
                <option value="swimming">केवल स्विमिंग पूल (Swimming)</option>
                <option value="admission">केवल एकैडमी एडमिशन (Admission)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#7A5C4A] mb-1">
                बटन टेक्स्ट (Action Button Text)
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="e.g. अभी स्लॉट बुक करें (Claim Discount)"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-[#2C1A0E] focus:outline-none focus:border-[#8C5A32]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#2C1A0E] hover:bg-[#8C5A32] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>Save & Publish Pop-up</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Interactive Visual Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#7A5C4A] tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#8C5A32]" />
              <span>लाइव प्रिव्यू (Website Customer Preview)</span>
            </span>
            <span className="text-[10px] text-neutral-400">जैसा ग्राहकों को दिखेगा</span>
          </div>

          {/* Mockup Card */}
          <div className="bg-neutral-900/60 p-4 sm:p-5 rounded-3xl border border-neutral-300/40 shadow-inner flex items-center justify-center">
            <div className="w-full max-w-sm bg-[#FAF8F5] border-2 border-[#8C5A32]/40 rounded-2xl shadow-2xl overflow-hidden relative">
              {/* Fake close button */}
              <div className="absolute top-2.5 right-2.5 p-1 bg-white/20 rounded-full text-white/80 z-10">
                <X className="w-3.5 h-3.5" />
              </div>

              {/* Preview Header */}
              <div className="bg-gradient-to-br from-[#2C1A0E] via-[#5C381E] to-[#8C5A32] text-white p-4 text-center relative overflow-hidden">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-bold uppercase mb-2">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                  <span>Special Event Offer</span>
                  <Flame className="w-3 h-3 text-orange-400" />
                </div>

                <h5 className="text-sm font-bold font-agbalumo text-[#FAF4ED] leading-tight">
                  {title || 'स्पेशल इवेंट धमाका ऑफर!'}
                </h5>

                <div className="mt-2.5 inline-block">
                  <div className="px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-[#2C1A0E] font-black text-lg rounded-xl shadow-md border border-amber-200 uppercase tracking-tight">
                    {discountBadge || '15% EXTRA OFF'}
                  </div>
                </div>
              </div>

              {/* Preview Body */}
              <div className="p-4 space-y-3">
                <p className="text-xs text-[#5C4033] leading-relaxed text-center">
                  {description || 'कुचामन स्पोर्ट्स एकैडमी के स्पेशल इवेंट पर पाएं विशेष छूट!'}
                </p>

                {couponCode && (
                  <div className="bg-[#F5EBE0] border border-dashed border-[#8C5A32]/40 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#8C5A32]" />
                      <span className="font-mono font-bold text-xs text-[#2C1A0E]">{couponCode}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#2C1A0E] text-white text-[10px] rounded-md font-bold">
                      Copy
                    </span>
                  </div>
                )}

                {validTill && (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#7A5C4A] font-semibold">
                    <Calendar className="w-3 h-3 text-[#8C5A32]" />
                    <span>{validTill}</span>
                  </div>
                )}

                <div className="pt-1">
                  <div className="w-full py-2.5 bg-gradient-to-r from-[#2C1A0E] to-[#8C5A32] text-white text-xs font-bold uppercase text-center rounded-xl shadow-md flex items-center justify-center gap-1.5">
                    <span>{buttonText || 'अभी स्लॉट बुक करें'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
