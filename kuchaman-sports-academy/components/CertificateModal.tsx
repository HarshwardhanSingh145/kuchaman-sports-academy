'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Certificate } from '@/lib/types';
import { Award, CheckCircle2, Printer, ShieldCheck, X } from 'lucide-react';

interface CertificateModalProps {
  certificate: Certificate;
  isOpen: boolean;
  onClose: () => void;
}

export default function CertificateModal({ certificate, isOpen, onClose }: CertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !certificate || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIssued = certificate.status === 'ISSUED';
  const isApproved = certificate.status === 'APPROVED' || isIssued;
  const isPending = certificate.status === 'PENDING_APPROVAL';

  const modalContent = (
    <div
      id="certificate-modal-backdrop"
      className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Centering wrapper that allows full scroll from the very top */}
      <div className="min-h-full flex items-start justify-center py-4 sm:py-8">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#2C1A0E]/20 my-auto flex flex-col">
          {/* Top Control Bar - Sticky so buttons are ALWAYS visible */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#2C1A0E] text-white print:hidden border-b border-[#8C5A32]/30 shadow-sm">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#8C5A32]/40 border border-[#8C5A32] flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-[#E6AF6E]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif font-bold tracking-wide text-sm sm:text-base text-white truncate">
                    Official KSA Certificate
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-sans font-semibold tracking-wider ${
                      isIssued
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isApproved
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : isPending
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                    }`}
                  >
                    {certificate.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                id="print-cert-btn"
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#8C5A32] hover:bg-[#A36D42] text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Print / PDF</span>
              </button>
              <button
                id="close-cert-btn"
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Close certificate preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Swipe Hint Banner */}
          <div className="sm:hidden flex items-center justify-between px-4 py-1.5 bg-amber-50/90 border-b border-amber-200/60 text-[11px] text-amber-900 font-medium print:hidden">
            <span>↔ Swipe horizontally to see full certificate</span>
            <span className="text-[10px] font-mono text-amber-700">Official Diploma</span>
          </div>

          {/* Certificate Canvas with Horizontal Scroll Wrapper for Mobile */}
          <div className="w-full overflow-x-auto bg-[#FAF8F5]">
            <div
              ref={certRef}
              id="ksa-certificate-canvas"
              className="min-w-[620px] sm:min-w-0 p-4 sm:p-8 md:p-12 bg-[#FAF8F5] relative select-none print:p-8 print:m-0 print:shadow-none print:min-w-0"
              style={{ minHeight: '560px' }}
            >
              {/* Outer Border Frame */}
              <div className="relative border-4 border-[#8C5A32] p-5 sm:p-8 rounded-xl bg-white shadow-inner">
                {/* Inner Decorative Dashed Border */}
                <div className="absolute inset-2 border-2 border-dashed border-[#E6AF6E]/60 pointer-events-none rounded-lg" />

                {/* Corner Emblems (Positioned inside to prevent cutting off) */}
                <div className="absolute top-1 left-1 w-3.5 h-3.5 bg-[#8C5A32] rotate-45 pointer-events-none" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#8C5A32] rotate-45 pointer-events-none" />
                <div className="absolute bottom-1 left-1 w-3.5 h-3.5 bg-[#8C5A32] rotate-45 pointer-events-none" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-[#8C5A32] rotate-45 pointer-events-none" />

                {/* Watermark for Draft / Pending */}
                {!isApproved && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                    <span className="text-6xl sm:text-7xl md:text-8xl font-black tracking-widest text-stone-300/35 uppercase -rotate-25 border-4 border-stone-300/35 px-8 py-4 rounded-2xl">
                      {certificate.status}
                    </span>
                  </div>
                )}

                {/* Certificate Header */}
                <div className="text-center space-y-2 mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#8C5A32]/30 text-[#8C5A32] text-[11px] sm:text-xs tracking-widest font-semibold uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Kuchaman Sports Academy • Government Affiliated
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2C1A0E] tracking-tight">
                    KUCHAMAN SPORTS ACADEMY
                  </h1>
                  <p className="text-[11px] sm:text-xs md:text-sm text-stone-600 font-sans tracking-widest uppercase px-2">
                    Premier Sports Training & Athletic Excellence Center • Didwana-Kuchaman (Rajasthan)
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <div className="h-0.5 w-16 bg-[#8C5A32]" />
                    <div className="w-2.5 h-2.5 bg-[#8C5A32] rotate-45" />
                    <div className="h-0.5 w-16 bg-[#8C5A32]" />
                  </div>
                </div>

                {/* Certificate Title */}
                <div className="text-center my-5 sm:my-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-serif italic text-[#8C5A32] font-semibold tracking-wide">
                    Certificate of Sports Training & Completion
                  </h2>
                  <p className="text-xs text-stone-500 tracking-wider uppercase mt-1">
                    Certificate No: <span className="font-mono font-bold text-[#2C1A0E]">{certificate.certificateNumber}</span>
                  </p>
                </div>

                {/* Certificate Body Text */}
                <div className="text-center max-w-2xl mx-auto space-y-4 text-stone-700 text-xs sm:text-sm md:text-base leading-relaxed">
                  <p className="font-serif italic text-stone-600">This is to proudly certify that</p>
                  
                  <div className="border-b-2 border-[#2C1A0E]/30 pb-2 max-w-md mx-auto">
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1A0E] tracking-wide">
                      {certificate.studentName}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm">
                    Son / Daughter of <strong className="text-[#2C1A0E]">{certificate.fatherName}</strong>
                    <br />
                    Student ID: <span className="font-mono font-semibold text-[#8C5A32]">{certificate.studentId}</span>
                    {' • '}
                    Category: <span className="font-semibold text-[#2C1A0E]">{certificate.category}</span>
                    {certificate.organizationName && (
                      <>
                        {' • '}
                        Organization: <span className="font-semibold text-[#2C1A0E]">{certificate.organizationName}</span>
                      </>
                    )}
                  </p>

                  <p className="text-xs sm:text-sm text-stone-600 px-2 sm:px-4">
                    has successfully completed the prescribed sports training and conditioning tenure at{' '}
                    <strong className="text-[#2C1A0E]">Kuchaman Sports Academy</strong> from{' '}
                    <span className="font-semibold text-[#2C1A0E]">{certificate.tenureStartDate}</span> to{' '}
                    <span className="font-semibold text-[#2C1A0E]">{certificate.tenureEndDate}</span>, demonstrating commendable dedication, discipline, and an overall attendance rate of{' '}
                    <strong className="text-emerald-700 font-bold">{certificate.attendancePercentage}%</strong>.
                  </p>
                </div>

                {/* Signatures & Seal Section */}
                <div className="grid grid-cols-3 items-end mt-8 sm:mt-10 pt-6 border-t border-stone-200 gap-2 sm:gap-4 text-center">
                  {/* Mentor Signature */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="h-14 sm:h-16 flex items-center justify-center mb-1">
                      {certificate.mentorSignatureUrl ? (
                        <img
                          src={certificate.mentorSignatureUrl}
                          alt="Mentor Signature"
                          className="max-h-12 sm:max-h-14 max-w-[110px] sm:max-w-[140px] object-contain"
                        />
                      ) : (
                        <span className="font-serif italic text-stone-500 text-xs sm:text-sm">
                          {certificate.mentorName || 'Personal Mentor'}
                        </span>
                      )}
                    </div>
                    <div className="w-24 sm:w-32 border-b border-stone-400 mb-1" />
                    <p className="font-serif font-semibold text-[11px] sm:text-xs text-[#2C1A0E] truncate max-w-full">
                      {certificate.mentorName || 'Personal Mentor'}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wider">
                      Personal Mentor
                    </p>
                  </div>

                  {/* Academy Seal */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 border-[#8C5A32] flex items-center justify-center p-1 bg-[#FAF8F5] shadow-sm relative">
                      <div className="w-full h-full rounded-full border border-dashed border-[#E6AF6E] flex flex-col items-center justify-center text-center p-1">
                        <span className="text-[7px] sm:text-[8px] font-bold tracking-widest text-[#8C5A32] uppercase">
                          KSA
                        </span>
                        <span className="text-[9px] sm:text-[10px] md:text-xs font-black text-[#2C1A0E] uppercase">
                          SEAL
                        </span>
                        <span className="text-[7px] sm:text-[8px] text-stone-500 font-mono">
                          2026
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-[#8C5A32] font-semibold uppercase tracking-wider mt-2">
                      Official Verification Seal
                    </p>
                  </div>

                  {/* Owner Signature */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="h-14 sm:h-16 flex items-center justify-center mb-1">
                      {certificate.ownerSignatureUrl ? (
                        <img
                          src={certificate.ownerSignatureUrl}
                          alt="Owner Signature"
                          className="max-h-12 sm:max-h-14 max-w-[110px] sm:max-w-[140px] object-contain"
                        />
                      ) : (
                        <span className="font-serif italic text-stone-800 text-sm sm:text-base font-bold">
                          Jay Prakash Bhakar
                        </span>
                      )}
                    </div>
                    <div className="w-24 sm:w-32 border-b border-stone-400 mb-1" />
                    <p className="font-serif font-bold text-[11px] sm:text-xs text-[#2C1A0E] truncate max-w-full">
                      {certificate.ownerName || 'JAY PRAKASH BHAKAR'}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-[#8C5A32] font-semibold uppercase tracking-wider">
                      Founder & Director, KSA
                    </p>
                  </div>
                </div>

                {/* Certificate Footer Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-400 pt-6 mt-4 border-t border-dashed border-stone-200">
                  <span>Verified ID: {certificate.id}</span>
                  <span>Issued at: {certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : 'Pending Approval'}</span>
                  <span>KSA Portal • Kuchaman City</span>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Notice / Actions Bottom Bar */}
          <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 print:hidden">
            <div className="flex items-center gap-2">
              {isApproved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-emerald-800">
                    Officially Approved by Academy Owner {certificate.ownerName}
                  </span>
                </>
              ) : (
                <span className="text-amber-700">
                  Notice: Certificate requires Owner Approval ({certificate.ownerName}) before official issuance.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#2C1A0E] hover:bg-[#3D2514] text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Download / Print A4 Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Mount into document.body to break free of any ancestor transforms or overflow constraints
  return createPortal(modalContent, document.body);
}
