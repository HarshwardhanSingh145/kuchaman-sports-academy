export type SportType = 'cricket' | 'swimming';

export type SlotStatus = 'AVAILABLE' | 'LIMITED' | 'FULL' | 'CLOSED';

export interface CricketNet {
  id: string;
  name: string;
  code: string;
  description: string;
  turfType: string;
  capacityPerSlot: number;
  isActive: boolean;
  order: number;
  isBigBox?: boolean;
  pricePerPerson?: number;
  maxPlayers?: number | null;
}

export interface CricketSlot {
  id: string;
  netId: string;
  netName?: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  timeRange: string;
  capacity: number;
  booked: number;
  remaining: number;
  status: SlotStatus;
  price: number;
}

export interface SwimmingSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  timeRange: string;
  title: string;
  category: 'Morning Laps' | 'Technical Coaching' | 'Open Conditioning' | 'Evening Performance';
  capacity: number;
  booked: number;
  remaining: number;
  status: SlotStatus;
  price: number;
}

export interface Booking {
  id: string;
  sport: SportType | 'admission';
  category?: string; // e.g., 'cricket_bigbox', 'cricket_net', 'swimming', 'admission'
  resourceId: string;
  resourceName: string;
  date: string;
  timeRange: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  hourlyRate?: number;
  originalAmount?: number;
  discountAmount?: number;
  userName: string;
  userPhone: string;
  userEmail?: string;
  playerCount: number;
  experienceLevel?: string;
  notes?: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  // Payment Proof & Status Details
  amountPaid?: number;
  paymentStatus?: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  paymentScreenshot?: string; // Base64 data URL
  transactionId?: string; // UTR / Reference ID
  paymentMethod?: 'UPI_QR' | 'CASH' | 'ONLINE';
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface HourlyRatesConfig {
  cricketBigBox: number; // e.g. 1000
  cricketPracticeNet: number; // e.g. 500 (or 100 per person)
  swimmingPool: number; // e.g. 100
  admission: number; // e.g. 1000
}

export interface DateSpecificBlock {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "07:00 PM"
  endTime: string; // e.g. "09:00 PM"
  timeRange: string; // e.g. "07:00 PM – 09:00 PM"
  reason?: string; // e.g. "Blocked by Owner"
  blockedAt: string;
}

export interface BookingTimingConfig {
  startHour: number; // 0-23 (e.g. 6 for 06:00 AM)
  endHour: number; // 0-23 or 26 (e.g. 2 for 02:00 AM next day)
  operatingHoursText: string; // e.g. "06:00 AM – 02:00 AM"
  blockedHours: number[]; // Global daily blocked hours, e.g. [8, 14]
  dateSpecificBlocks: DateSpecificBlock[];
}

export interface DiscountPopupConfig {
  enabled: boolean;
  title: string; // e.g., "त्योहार स्पेशल ऑफर 🏏 🏊" / "Special Event Discount"
  discountBadge: string; // e.g., "15% EXTRA OFF" or "FLAT 20% DISCOUNT"
  discountPercentage: number; // e.g., 15 or 20
  discountText?: string; // e.g. "FLAT 20% OFF"
  description: string; // e.g., "स्पेशल इवेंट पर कुचामन स्पोर्ट्स एकैडमी के क्रिकेट टर्फ और स्विमिंग स्लॉट पर पाएं विशेष छूट!"
  couponCode?: string; // e.g., "KSAEVENT2026"
  validTill?: string; // e.g., "30 सितम्बर तक मान्य (Limited Time)"
  imageUrl?: string; // Optional promotional image
  applicableSport?: 'all' | 'cricket' | 'swimming' | 'admission';
  buttonText?: string; // e.g., "अभी डिस्काउंट क्लेम करें (Book Now)"
  ctaAction?: 'booking' | 'external_url' | 'coupon_only';
  ctaUrl?: string;
  displayDelaySeconds?: number;
}

export interface AcademyConfig {
  name: string;
  shortName: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  operatingHours: string;
  disabledDates: string[];
  // Owner QR & Payment Settings
  upiQrCodeUrl?: string; // Base64 data URL or image path
  upiId?: string; // e.g. 9829084421@paytm
  upiAccountName?: string; // e.g. Kuchaman Sports Academy
  bankName?: string;
  paymentInstructions?: string;
  paymentNotes?: string;
  // Special Event Discount Pop-up Configuration
  discountPopup?: DiscountPopupConfig;
  // Dynamic Hourly Rate Management
  hourlyRates?: HourlyRatesConfig;
  // Global & Date-specific Booking Timing Controls
  bookingTiming?: BookingTimingConfig;
}

// ----------------------------------------------------
// KSA STUDENT MANAGEMENT SYSTEM TYPES
// ----------------------------------------------------

export type StudentCategory = 'SOLO' | 'ACADEMIC' | 'SCHOOL';

export type StudentStatus = 'ACTIVE' | 'COMPLETED' | 'REMOVED' | 'REPLACED' | 'EXPIRED';

export type TenureStatus = 'IN_PROGRESS' | 'COMPLETED' | 'EXTENDED' | 'TERMINATED';

export type CertificateStatus = 'NONE' | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE';

export interface StudentHistoryEntry {
  action: string;
  date: string;
  time: string;
  performedBy: string;
  details?: string;
  prevValue?: string;
  newValue?: string;
}

export interface StudentAttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

export interface ReplacementRecord {
  replacedDate: string;
  replacedBy: string;
  reason: string;
  replacementStudentId: string;
  replacementStudentName: string;
}

export interface RemovalRecord {
  removedDate: string;
  removedBy: string;
  reason: string;
  previousStatus: StudentStatus;
}

export interface Student {
  id: string; // e.g. KSA-SOLO-2026-1049, KSA-ACAD-2026-2104, KSA-SCH-2026-3021
  name: string;
  age: number;
  fatherName: string;
  address: string;
  contact: string;
  category: StudentCategory;
  admissionDate: string; // YYYY-MM-DD
  admissionTime: string; // HH:mm
  status: StudentStatus;
  
  // Organization / Mentor details
  academyName?: string;
  schoolName?: string;
  mentorId?: string;
  mentorName?: string;
  mentorContact?: string;
  
  // Tenure details
  tenureDurationMonths: number;
  tenureStartDate: string;
  tenureEndDate: string;
  tenureStatus: TenureStatus;
  
  // Historical / Modification states
  isReplaced?: boolean;
  replacementInfo?: ReplacementRecord;
  originalStudentId?: string; // If this student replaced someone
  isRemoved?: boolean;
  removalInfo?: RemovalRecord;
  
  // Attendance and Certificate summary
  attendanceStats?: StudentAttendanceStats;
  certificateId?: string;
  certificateStatus: CertificateStatus;
  
  history: StudentHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Mentor {
  id: string;
  username: string; // e.g. abcacademy.rahul
  password: string;
  name: string;
  contact: string;
  organizationName: string; // Academy or School Name
  category: 'ACADEMIC' | 'SCHOOL';
  isFirstLogin: boolean;
  signatureUrl?: string; // Base64 data URL
  assignedStudentIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string; // `${studentId}_${date}`
  studentId: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  markedBy: string;
  markedAt: string;
}

export interface Certificate {
  id: string; // e.g. CERT-KSA-2026-0042
  certificateNumber: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  category: StudentCategory;
  organizationName?: string; // Academy or School name
  mentorId?: string;
  mentorName?: string;
  tenureStartDate: string;
  tenureEndDate: string;
  attendancePercentage: number;
  status: CertificateStatus;
  
  requestedAt: string;
  requestedBy: string;
  rejectionReason?: string;
  
  ownerName: string; // "JAY PRAKASH BHAKAR"
  ownerSignatureUrl?: string;
  mentorSignatureUrl?: string;
  
  approvedBy?: string;
  approvedAt?: string;
  issuedAt?: string;
}

export interface SignatureConfig {
  ownerName: string; // "JAY PRAKASH BHAKAR"
  ownerTitle: string; // "Founder & Director, KSA"
  ownerSignatureUrl: string; // Base64 data URL
  academySealUrl: string; // Base64 data URL
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  date: string;
  time: string;
  timestamp: string;
  performedBy: string;
  entityType?: string;
  entityId?: string;
  studentId?: string;
  studentName?: string;
  details: string;
  prevValue?: string;
  newValue?: string;
}

