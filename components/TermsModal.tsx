'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  X,
  HeartPulse,
  UserCheck,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Languages,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const { isHindi: defaultIsHindi } = useLanguage();
  // Allow toggling language directly within the Terms Modal for maximum accessibility
  const [modalHindi, setModalHindi] = useState<boolean>(defaultIsHindi);

  // Sync with global language whenever modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setModalHindi(defaultIsHindi);
    }
  }, [isOpen, defaultIsHindi]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#2C1A0E] text-white p-4 sm:p-6 flex items-center justify-between border-b border-[#432818] z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E6AF6E]/20 border border-[#E6AF6E]/40 flex items-center justify-center text-[#E6AF6E] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#E6AF6E] uppercase tracking-wider block">
                  Kuchaman Sports Academy (KSA)
                </span>
                <h2 id="terms-modal-title" className="text-base sm:text-lg font-black leading-tight text-white">
                  {modalHindi ? 'नियम, शर्तें एवं सुरक्षा दिशानिर्देश' : 'Terms, Conditions & Safety Guidelines'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher Button in Header */}
              <button
                type="button"
                onClick={() => setModalHindi((prev) => !prev)}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Toggle Language"
              >
                <Languages className="w-3.5 h-3.5 text-[#E6AF6E]" />
                <span>{modalHindi ? 'English' : 'हिंदी'}</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Terms"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-sm text-[#3E2718] leading-relaxed bg-[#FAF8F5]">
            {/* Reassuring Welcome Callout */}
            <div className="p-4 rounded-2xl bg-white border border-[#EADBCE] shadow-2xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-[#2C1A0E]">
                  {modalHindi
                    ? 'सुरक्षित एवं पेशेवर खेल परिवेश के प्रति हमारी प्रतिबद्धता'
                    : 'Our Commitment to Safe & Inspiring Sports Training'}
                </p>
                <p className="text-neutral-600 mt-1">
                  {modalHindi
                    ? 'कुचामन स्पोर्ट्स एकेडमी (KSA) में हमारा ध्येय प्रत्येक खिलाड़ी, छात्र और अभिभावक को उच्चस्तरीय, अनुशासित और सुरक्षित खेल सुविधाएं प्रदान करना है। नीचे दिए गए नियम और दिशानिर्देश सभी के सुरक्षित अनुभव को सुनिश्चित करने हेतु तैयार किए गए हैं।'
                    : 'Kuchaman Sports Academy (KSA) is dedicated to providing high-quality, disciplined, and safe sporting infrastructure for athletes of all levels. The guidelines below are established to ensure a safe, fair, and positive experience for all participants.'}
                </p>
              </div>
            </div>

            {/* Section 1: Sports Activities & Safety */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#2C1A0E]">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-[#2C1A0E]">
                  {modalHindi ? '1. खेल गतिविधियाँ एवं सुरक्षा व्यवस्था (Sports Activities & Safety)' : '1. Sports Activities & Safety Measures'}
                </h3>
              </div>
              <p className="text-neutral-700">
                {modalHindi
                  ? 'कुचामन स्पोर्ट्स एकेडमी में Cricket, Football, Swimming एवं अन्य sporting activities उचित supervision और सामान्य safety precautions के साथ कराई जाती हैं। सभी participants से अपेक्षा की जाती है कि वे safety instructions, coaches/staff के निर्देश और facility के नियमों का पालन करें।'
                  : 'At Kuchaman Sports Academy, Cricket, Football, Swimming, and all other sporting activities are conducted under reasonable supervision and with standard safety precautions. All participants are expected to strictly adhere to safety instructions, staff/coach guidance, and facility rules at all times.'}
              </p>
              <p className="text-neutral-700">
                {modalHindi
                  ? 'Academy अपनी ओर से reasonable safety measures, supervision और facility maintenance का ध्यान रखने का प्रयास करती है। फिर भी, किसी भी sport में प्रत्येक accidental event या injury को पूरी तरह prevent करने की guarantee नहीं दी जा सकती।'
                  : 'The Academy undertakes reasonable measures, trained supervision, and regular facility upkeep. However, given the active physical nature of sporting activities, an absolute guarantee against every accidental event or unforeseen occurrence cannot be provided by any sporting institution.'}
              </p>
              <p className="text-neutral-700">
                {modalHindi
                  ? 'Participants को अपनी physical fitness और किसी relevant medical condition के संबंध में आवश्यक सावधानी बरतनी चाहिए और activity शुरू करने से पहले, जहाँ आवश्यक हो, उचित medical advice लेना चाहिए।'
                  : 'Participants should exercise personal responsibility regarding their physical fitness and any relevant medical conditions, seeking appropriate professional medical advice prior to participating whenever prudent.'}
              </p>
            </div>

            {/* Section 2: Sports Activity & Injury Disclaimer */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#2C1A0E]">
                <HeartPulse className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold text-[#2C1A0E]">
                  {modalHindi ? '2. खेल गतिविधि एवं इंजरी अस्वीकरण (Sports Activity & Injury Disclaimer)' : '2. Sports Activity & Injury Disclaimer'}
                </h3>
              </div>
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs sm:text-sm text-neutral-800 space-y-2">
                <p>
                  {modalHindi
                    ? 'Sports activities में भाग लेते समय परिस्थितियों के कारण कुछ unforeseen incidents, accidental injuries या other physical risks पूरी तरह से समाप्त नहीं किए जा सकते। किसी participant को उनकी अपनी लापरवाही, safety instructions का पालन न करने, गलत तरीके से activity करने, पहले से मौजूद health/physical condition, अथवा किसी अप्रत्याशित accidental event के कारण injury होने पर Academy उस injury के लिए जिम्मेदार नहीं होगी, जहाँ लागू कानून के अनुसार Academy की कोई negligence, wilful misconduct या अन्य कानूनी liability स्थापित न हो।'
                    : 'While participating in sports activities, inherent unforeseen incidents, accidental injuries, or ordinary physical risks cannot be completely eliminated. The Academy shall not be held liable for any injury resulting from a participant’s own negligence, non-compliance with safety instructions, improper execution of activities, pre-existing health or physical conditions, or unforeseen accidental events, except where the Academy’s negligence, wilful misconduct, or legal liability is established under applicable law.'}
                </p>
              </div>
            </div>

            {/* Section 3: Participant Responsibility */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#2C1A0E]">
                <UserCheck className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-bold text-[#2C1A0E]">
                  {modalHindi ? '3. प्रतिभागी के दायित्व (Participant Responsibility)' : '3. Participant Responsibilities'}
                </h3>
              </div>
              <p className="text-xs text-neutral-600 font-semibold">
                {modalHindi
                  ? 'बुकिंग एवं सुविधा का उपयोग करते समय participant/customer यह स्वीकार करता है कि:'
                  : 'By booking and utilizing the academy facilities, the participant/customer acknowledges and affirms:'}
              </p>

              <ul className="space-y-2 text-xs sm:text-sm text-neutral-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>{modalHindi ? 'स्वास्थ्य एवं फिटनेस: ' : 'Physical Fitness: '}</strong>
                    {modalHindi
                      ? 'वह activity में भाग लेने के लिए स्वयं को medically/physically fit मानता है।'
                      : 'The participant considers themselves medically and physically fit to engage in the selected activity.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>{modalHindi ? 'नियम व निर्देश: ' : 'Rules & Staff Guidance: '}</strong>
                    {modalHindi
                      ? 'वह Academy के safety rules और staff/coach के instructions का पूर्ण पालन करेगा।'
                      : 'Strict compliance with all Academy safety rules and coaches/staff instructions at all times.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>{modalHindi ? 'सुरक्षित उपकरण उपयोग: ' : 'Safe Equipment Use: '}</strong>
                    {modalHindi
                      ? 'किसी equipment या facility का unsafe/improper use नहीं करेगा।'
                      : 'Ensuring safe, considerate, and proper usage of all turf nets, sports equipment, and swimming facilities.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>{modalHindi ? 'तत्काल सूचना: ' : 'Prompt Reporting: '}</strong>
                    {modalHindi
                      ? 'किसी असुविधा, चोट या health-related problem की स्थिति में तुरंत Academy staff को inform करेगा।'
                      : 'Immediately informing on-duty Academy staff in the event of any discomfort, injury, or health concern.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>{modalHindi ? 'नाबालिग प्रतिभागी (Minor Participants): ' : 'Minor Participants: '}</strong>
                    {modalHindi
                      ? 'Minor participant की booking होने पर parent/guardian उनकी participation के लिए आवश्यक consent और supervision सुनिश्चित करेगा।'
                      : 'For participants under 18 years of age, the parent or legal guardian provides required consent and ensures appropriate guidance.'}
                  </span>
                </li>
              </ul>
            </div>

            {/* Section 4: Emergency Assistance & Legal Safeguards */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#2C1A0E]">
                <AlertCircle className="w-5 h-5 text-indigo-700" />
                <h3 className="text-base font-bold text-[#2C1A0E]">
                  {modalHindi ? '4. आपातकालीन सहायता एवं विधिक स्पष्टीकरण (Emergency Assistance & Legal Note)' : '4. Emergency Assistance & Statutory Legal Protection'}
                </h3>
              </div>
              <p className="text-neutral-700">
                {modalHindi
                  ? 'किसी unexpected incident की स्थिति में Academy staff उपलब्ध reasonable assistance और emergency support प्रदान करने का प्रयास करेगा। आवश्यकता पड़ने पर participant/guardian को medical assistance लेने की सलाह दी जा सकती है।'
                  : 'In the event of an unexpected incident or injury, Academy staff will endeavor to provide reasonable available assistance and first-aid support. Where required, participants or their guardians will be advised to seek immediate professional medical care.'}
              </p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
                <strong>{modalHindi ? 'महत्वपूर्ण विधिक सूचना: ' : 'Statutory Clarification: '}</strong>
                {modalHindi
                  ? 'ये Terms Academy द्वारा जानबूझकर किए गए गलत कार्य, negligence, या ऐसी liability को exclude नहीं करतीं जिन्हें applicable law के अंतर्गत legally exclude नहीं किया जा सकता।'
                  : 'Nothing in these Terms excludes or restricts liability for wilful misconduct, gross negligence, or any statutory consumer rights that cannot legally be excluded under applicable Indian laws.'}
              </div>
            </div>

            {/* Section 5: Facility Etiquette & Slot Discipline */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#2C1A0E]">
                <Clock className="w-5 h-5 text-stone-700" />
                <h3 className="text-base font-bold text-[#2C1A0E]">
                  {modalHindi ? '5. समयबद्धता एवं परिसर शिष्टाचार (Discipline & Timing)' : '5. Timing Discipline & Facility Etiquette'}
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-700 list-disc list-inside">
                <li>
                  {modalHindi
                    ? 'कृपया अपने बुक किए गए स्लॉट समय से 10 मिनट पूर्व पधारें ताकि खेल का पूरा समय मिल सके।'
                    : 'Please arrive 10 minutes prior to your allocated slot to maximize training time.'}
                </li>
                <li>
                  {modalHindi
                    ? 'क्रिकेट टर्फ पर केवल नॉन-मार्किंग स्पोर्ट्स शूज़ मान्य हैं। स्विमिंग पूल में उचित स्विमवियर अनिवार्य है।'
                    : 'Clean non-marking sports shoes are required on cricket turfs. Proper swimwear is mandatory in the swimming pool.'}
                </li>
                <li>
                  {modalHindi
                    ? 'परिसर में गुटखा, तंबाकू, धूम्रपान या किसी भी प्रकार का नशा पूरी तरह प्रतिबंधित है।'
                    : 'Tobacco, smoking, alcohol, and hazardous materials are strictly prohibited within the academy premises.'}
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white p-4 sm:p-5 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span>
                {modalHindi
                  ? 'कुचामन स्पोर्ट्स एकेडमी • अधिकृत सेवा शर्तें'
                  : 'Kuchaman Sports Academy • Official Service Terms'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold text-xs transition-colors cursor-pointer"
              >
                {modalHindi ? 'बंद करें (Close)' : 'Close'}
              </button>

              {onAccept && (
                <button
                  type="button"
                  onClick={() => {
                    onAccept();
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{modalHindi ? 'मैंने पढ़ लिया और सहमत हूँ' : 'I Understand & Accept'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TermsModal;
