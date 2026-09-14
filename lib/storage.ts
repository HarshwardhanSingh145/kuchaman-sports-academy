import {
  AcademyConfig,
  Booking,
  CricketNet,
  CricketSlot,
  SlotStatus,
  SwimmingSession,
  Student,
  Mentor,
  AttendanceRecord,
  Certificate,
  SignatureConfig,
  AuditLog,
  StudentCategory,
  StudentStatus,
  TenureStatus,
  AttendanceStatus,
  CertificateStatus,
} from './types';
import fs from 'fs';
import path from 'path';
import { parseTimeRange, checkBookingConflict } from './timing-helper';
import {
  DEFAULT_NETS,
  CRICKET_TIME_SLOTS,
  SWIMMING_TIME_SLOTS,
  DEFAULT_CONFIG,
  DEFAULT_OWNER_SIGNATURE,
  DEFAULT_ACADEMY_SEAL,
  DEFAULT_SIGNATURE_CONFIG,
  INITIAL_MENTORS,
  INITIAL_STUDENTS,
  INITIAL_CERTIFICATES,
  INITIAL_AUDIT_LOGS,
} from './defaults';
import {
  getFirestoreNets,
  saveFirestoreNet,
  deleteFirestoreNet,
  getFirestoreBookings,
  createFirestoreBooking,
  updateFirestoreBookingStatus,
  deleteFirestoreBooking,
  saveFirestoreConfig,
  getFirestoreConfig,
  saveFirestoreSlotOverride,
  getFirestoreSlotOverrides,
  getFirestoreStudents,
  saveFirestoreStudent,
  deleteFirestoreStudent,
  getFirestoreMentors,
  saveFirestoreMentor,
  deleteFirestoreMentor,
  getFirestoreAttendance,
  saveFirestoreAttendance,
  getFirestoreCertificates,
  saveFirestoreCertificate,
  deleteFirestoreCertificate,
  getFirestoreSignatures,
  saveFirestoreSignatures,
  getFirestoreAuditLogs,
  saveFirestoreAuditLog,
} from './firestore-service';

// Re-export defaults so all existing consumers remain 100% compatible
export {
  DEFAULT_NETS,
  CRICKET_TIME_SLOTS,
  SWIMMING_TIME_SLOTS,
  DEFAULT_CONFIG,
  DEFAULT_OWNER_SIGNATURE,
  DEFAULT_ACADEMY_SEAL,
  DEFAULT_SIGNATURE_CONFIG,
  INITIAL_MENTORS,
  INITIAL_STUDENTS,
  INITIAL_CERTIFICATES,
  INITIAL_AUDIT_LOGS,
};

/**
 * Asynchronously sync an individual entity change to Google Cloud Firestore (write-through)
 */
function syncEntityToFirestore(type: string, data: any) {
  try {
    switch (type) {
      case 'student':
        saveFirestoreStudent(data).catch((e) => console.warn('[Firestore] Sync student notice:', e));
        break;
      case 'mentor':
        saveFirestoreMentor(data).catch((e) => console.warn('[Firestore] Sync mentor notice:', e));
        break;
      case 'attendance':
        saveFirestoreAttendance(data).catch((e) => console.warn('[Firestore] Sync attendance notice:', e));
        break;
      case 'certificate':
        saveFirestoreCertificate(data).catch((e) => console.warn('[Firestore] Sync certificate notice:', e));
        break;
      case 'signature':
        saveFirestoreSignatures(data).catch((e) => console.warn('[Firestore] Sync signature notice:', e));
        break;
      case 'booking':
        createFirestoreBooking(data).catch((e) => console.warn('[Firestore] Sync booking notice:', e));
        break;
      case 'config':
        saveFirestoreConfig(data).catch((e) => console.warn('[Firestore] Sync config notice:', e));
        break;
      case 'net':
        saveFirestoreNet(data).catch((e) => console.warn('[Firestore] Sync net notice:', e));
        break;
      case 'audit_log':
        saveFirestoreAuditLog(data).catch((e) => console.warn('[Firestore] Sync audit log notice:', e));
        break;
    }
  } catch (err) {
    console.warn('[Firestore] syncEntityToFirestore error:', err);
  }
}

/**
 * Full two-way state reconciliation with Google Cloud Firestore
 */
export async function syncAllFromFirestore(): Promise<void> {
  try {
    const [nets, config, mentors, students, attendance, certificates, sig, bookings, logs, slots] = await Promise.all([
      getFirestoreNets().catch(() => []),
      getFirestoreConfig().catch(() => null),
      getFirestoreMentors().catch(() => []),
      getFirestoreStudents().catch(() => []),
      getFirestoreAttendance().catch(() => []),
      getFirestoreCertificates().catch(() => []),
      getFirestoreSignatures().catch(() => null),
      getFirestoreBookings().catch(() => []),
      getFirestoreAuditLogs().catch(() => []),
      getFirestoreSlotOverrides().catch(() => ({})),
    ]);

    if (nets && nets.length > 0) {
      runtimeData.nets = nets;
    }
    if (config && config.name) {
      runtimeData.config = config;
    }
    if (mentors && mentors.length > 0) {
      runtimeData.mentors = mentors;
    }
    if (students && students.length > 0) {
      runtimeData.students = students;
    }
    if (attendance && attendance.length > 0) {
      runtimeData.attendance = attendance;
    }
    if (certificates && certificates.length > 0) {
      runtimeData.certificates = certificates;
    }
    if (sig && sig.ownerName) {
      runtimeData.signatureConfig = sig;
    }
    if (bookings && bookings.length > 0) {
      runtimeData.bookings = bookings;
    }
    if (logs && logs.length > 0) {
      runtimeData.auditLogs = logs;
    }
    if (slots && Object.keys(slots).length > 0) {
      for (const [key, val] of Object.entries(slots)) {
        if (val && typeof val === 'object') {
          if (val.sport === 'cricket') {
            runtimeData.customCricketSlots[key] = val;
          } else if (val.sport === 'swimming') {
            runtimeData.customSwimmingSessions[key] = val;
          }
        }
      }
    }

    saveToFile();
    console.log('[Firestore] Successfully synchronized state with Google Cloud Firestore.');
  } catch (err) {
    console.warn('[Firestore] Background cloud sync error:', err);
  }
}


interface StoredData {
  nets: CricketNet[];
  customCricketSlots: Record<string, Partial<CricketSlot>>; // key: `${netId}_${date}_${startTime}`
  customSwimmingSessions: Record<string, Partial<SwimmingSession>>; // key: `${date}_${startTime}`
  bookings: Booking[];
  config: AcademyConfig;
  students: Student[];
  mentors: Mentor[];
  attendance: AttendanceRecord[];
  certificates: Certificate[];
  signatureConfig: SignatureConfig;
  auditLogs: AuditLog[];
}

// In-memory runtime singleton
let runtimeData: StoredData = {
  nets: DEFAULT_NETS,
  customCricketSlots: {},
  customSwimmingSessions: {},
  bookings: [
    {
      id: 'KSA-CRK-1082',
      sport: 'cricket',
      resourceId: 'net-1',
      resourceName: 'Net 01 — Match Turf',
      date: new Date().toISOString().split('T')[0],
      timeRange: '06:00 AM – 07:00 AM',
      userName: 'Vikram Shekhawat',
      userPhone: '+91 94140 12890',
      userEmail: 'vikram.s@gmail.com',
      playerCount: 2,
      experienceLevel: 'Intermediate',
      notes: 'Pace bowling practice with match ball',
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'KSA-SWM-4921',
      sport: 'swimming',
      resourceId: 'swm-0700',
      resourceName: 'Olympic Facility — Precision Stroke',
      date: new Date().toISOString().split('T')[0],
      timeRange: '07:00 AM – 08:00 AM',
      userName: 'Aaditya Sharma',
      userPhone: '+91 98281 77209',
      playerCount: 1,
      experienceLevel: 'Advanced',
      notes: 'Freestyle speed endurance drills',
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ],
  config: DEFAULT_CONFIG,
  students: INITIAL_STUDENTS,
  mentors: INITIAL_MENTORS,
  attendance: [],
  certificates: INITIAL_CERTIFICATES,
  signatureConfig: DEFAULT_SIGNATURE_CONFIG,
  auditLogs: INITIAL_AUDIT_LOGS,
};

// File persistence fallback
const DATA_FILE = path.join(process.cwd(), '.ksa_storage.json');

function loadFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.nets) {
        runtimeData = { ...runtimeData, ...parsed };
      }
    }
    // Ensure student management collections are initialized
    if (!runtimeData.students || runtimeData.students.length === 0) {
      runtimeData.students = INITIAL_STUDENTS;
    }
    if (!runtimeData.mentors || runtimeData.mentors.length === 0) {
      runtimeData.mentors = INITIAL_MENTORS;
    }
    if (!runtimeData.attendance) {
      runtimeData.attendance = [];
    }
    if (!runtimeData.certificates || runtimeData.certificates.length === 0) {
      runtimeData.certificates = INITIAL_CERTIFICATES;
    }
    if (!runtimeData.signatureConfig) {
      runtimeData.signatureConfig = DEFAULT_SIGNATURE_CONFIG;
    }
    if (!runtimeData.auditLogs || runtimeData.auditLogs.length === 0) {
      runtimeData.auditLogs = INITIAL_AUDIT_LOGS;
    }
    if (!runtimeData.config.hourlyRates) {
      runtimeData.config.hourlyRates = DEFAULT_CONFIG.hourlyRates;
    }
    if (!runtimeData.config.bookingTiming) {
      runtimeData.config.bookingTiming = DEFAULT_CONFIG.bookingTiming;
    }
    if (!runtimeData.config.discountPopup) {
      runtimeData.config.discountPopup = DEFAULT_CONFIG.discountPopup;
    }

    // Ensure the 5 nets match the 4 practice nets (fee ₹100, max 4) + 1 Cricket/football/Hockey big box turf (fee ₹100, no limit)
    const hasBigBox = runtimeData.nets?.some(
      (n) =>
        n.name?.toUpperCase().includes('BIG BOX') ||
        n.name?.toUpperCase().includes('CRICKET/FOOTBALL/HOCKEY') ||
        n.id === 'net-big-box'
    );
    const hasNet4 = runtimeData.nets?.some((n) => n.id === 'net-4');
    if (!hasBigBox || !hasNet4 || runtimeData.nets?.length !== 5) {
      runtimeData.nets = DEFAULT_NETS;
    }
    saveToFile();

    // Trigger cloud synchronization with Google Cloud Firestore
    syncAllFromFirestore().catch((err) => {
      console.warn('[Firestore] Initial sync notice:', err);
    });
  } catch (err) {
    console.error('Failed reading storage file', err);
  }
}

function saveToFile() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(runtimeData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed writing storage file', err);
  }
}

// Initialize on first load
loadFromFile();

export class StorageService {
  /**
   * Manually trigger full cloud synchronization with Firestore
   */
  static async forceSyncCloud(): Promise<void> {
    await syncAllFromFirestore();
  }

  static getConfig(): AcademyConfig {
    if (!runtimeData.config.hourlyRates) {
      runtimeData.config.hourlyRates = DEFAULT_CONFIG.hourlyRates;
    }
    if (!runtimeData.config.bookingTiming) {
      runtimeData.config.bookingTiming = DEFAULT_CONFIG.bookingTiming;
    }
    if (!runtimeData.config.discountPopup) {
      runtimeData.config.discountPopup = DEFAULT_CONFIG.discountPopup;
    }
    return runtimeData.config;
  }

  static updateConfig(config: Partial<AcademyConfig>): AcademyConfig {
    runtimeData.config = {
      ...runtimeData.config,
      ...config,
      hourlyRates: {
        ...(runtimeData.config.hourlyRates || DEFAULT_CONFIG.hourlyRates!),
        ...(config.hourlyRates || {}),
      },
      bookingTiming: {
        ...(runtimeData.config.bookingTiming || DEFAULT_CONFIG.bookingTiming!),
        ...(config.bookingTiming || {}),
      },
      discountPopup: {
        ...(runtimeData.config.discountPopup || DEFAULT_CONFIG.discountPopup!),
        ...(config.discountPopup || {}),
      },
    };
    saveToFile();
    syncEntityToFirestore('config', runtimeData.config);
    return runtimeData.config;
  }

  static addDateSpecificBlock(block: {
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }) {
    if (!runtimeData.config.bookingTiming) {
      runtimeData.config.bookingTiming = { ...DEFAULT_CONFIG.bookingTiming! };
    }
    const newBlock = {
      id: `block-${Date.now()}`,
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      timeRange: `${block.startTime} – ${block.endTime}`,
      reason: block.reason || 'Blocked by Owner',
      blockedAt: new Date().toISOString(),
    };
    runtimeData.config.bookingTiming.dateSpecificBlocks = [
      ...(runtimeData.config.bookingTiming.dateSpecificBlocks || []),
      newBlock,
    ];
    saveToFile();
    syncEntityToFirestore('config', runtimeData.config);
    return newBlock;
  }

  static deleteDateSpecificBlock(blockId: string): boolean {
    if (!runtimeData.config.bookingTiming?.dateSpecificBlocks) return false;
    const initialLen = runtimeData.config.bookingTiming.dateSpecificBlocks.length;
    runtimeData.config.bookingTiming.dateSpecificBlocks = runtimeData.config.bookingTiming.dateSpecificBlocks.filter(
      (b) => b.id !== blockId
    );
    saveToFile();
    syncEntityToFirestore('config', runtimeData.config);
    return runtimeData.config.bookingTiming.dateSpecificBlocks.length < initialLen;
  }

  static toggleBlockedHour(hour: number): number[] {
    if (!runtimeData.config.bookingTiming) {
      runtimeData.config.bookingTiming = { ...DEFAULT_CONFIG.bookingTiming! };
    }
    const current = runtimeData.config.bookingTiming.blockedHours || [];
    const exists = current.includes(hour);
    const updated = exists ? current.filter((h) => h !== hour) : [...current, hour].sort((a, b) => a - b);
    runtimeData.config.bookingTiming.blockedHours = updated;
    saveToFile();
    syncEntityToFirestore('config', runtimeData.config);
    return updated;
  }

  static getNets(): CricketNet[] {
    return runtimeData.nets.sort((a, b) => a.order - b.order);
  }

  static addNet(net: Omit<CricketNet, 'id'>): CricketNet {
    const id = `net-${Date.now()}`;
    const newNet: CricketNet = { ...net, id };
    runtimeData.nets.push(newNet);
    saveToFile();
    syncEntityToFirestore('net', newNet);
    return newNet;
  }

  static updateNet(id: string, updates: Partial<CricketNet>): CricketNet | null {
    const idx = runtimeData.nets.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    runtimeData.nets[idx] = { ...runtimeData.nets[idx], ...updates };
    saveToFile();
    syncEntityToFirestore('net', runtimeData.nets[idx]);
    return runtimeData.nets[idx];
  }

  static deleteNet(id: string): boolean {
    const initialLen = runtimeData.nets.length;
    runtimeData.nets = runtimeData.nets.filter((n) => n.id !== id);
    saveToFile();
    deleteFirestoreNet(id).catch((e) => console.warn('[Firestore] Delete net notice:', e));
    return runtimeData.nets.length < initialLen;
  }

  static getCricketSlotsForDate(date: string): CricketSlot[] {
    const activeNets = runtimeData.nets.filter((n) => n.isActive);
    const slots: CricketSlot[] = [];

    const isDateDisabled = runtimeData.config.disabledDates.includes(date);

    activeNets.forEach((net) => {
      CRICKET_TIME_SLOTS.forEach((template) => {
        const slotKey = `${net.id}_${date}_${template.startTime}`;
        const custom = runtimeData.customCricketSlots[slotKey] || {};

        // Calculate booked count from real bookings
        const bookedCount = runtimeData.bookings
          .filter(
            (b) =>
              b.sport === 'cricket' &&
              b.resourceId === net.id &&
              b.date === date &&
              b.timeRange === template.timeRange &&
              b.status === 'CONFIRMED'
          )
          .reduce((sum, b) => sum + b.playerCount, 0);

        const isBigBox = Boolean(net.isBigBox || net.name?.toUpperCase().includes('BIG BOX') || net.code === 'BOX-CRICKET' || net.code === 'BOX-TURF');
        const capacity = isBigBox ? 100 : (custom.capacity ?? net.capacityPerSlot ?? 4);
        const totalBooked = bookedCount + (custom.booked ?? 0);
        const remaining = isBigBox ? 99 : Math.max(0, capacity - totalBooked);

        let status: SlotStatus = 'AVAILABLE';
        if (isDateDisabled || custom.status === 'CLOSED') {
          status = 'CLOSED';
        } else if (!isBigBox && (remaining === 0 || custom.status === 'FULL')) {
          status = 'FULL';
        } else if (!isBigBox && remaining <= 2) {
          status = 'LIMITED';
        }

        slots.push({
          id: slotKey,
          netId: net.id,
          netName: net.name,
          date,
          startTime: template.startTime,
          endTime: template.endTime,
          timeRange: template.timeRange,
          capacity,
          booked: totalBooked,
          remaining,
          status,
          price: 100, // Dynamic ₹100 per person fee
        });
      });
    });

    return slots;
  }

  static getSwimmingSessionsForDate(date: string): SwimmingSession[] {
    const sessions: SwimmingSession[] = [];
    const isDateDisabled = runtimeData.config.disabledDates.includes(date);

    SWIMMING_TIME_SLOTS.forEach((template) => {
      const sessionKey = `${date}_${template.startTime}`;
      const custom = runtimeData.customSwimmingSessions[sessionKey] || {};

      // Real confirmed booking count
      const bookedCount = runtimeData.bookings
        .filter(
          (b) =>
            b.sport === 'swimming' &&
            b.date === date &&
            b.timeRange === template.timeRange &&
            b.status === 'CONFIRMED'
        )
        .reduce((sum, b) => sum + b.playerCount, 0);

      const capacity = custom.capacity ?? template.capacity;
      const totalBooked = bookedCount + (custom.booked ?? 0);
      const remaining = Math.max(0, capacity - totalBooked);

      let status: SlotStatus = 'AVAILABLE';
      if (isDateDisabled || custom.status === 'CLOSED') {
        status = 'CLOSED';
      } else if (remaining === 0 || custom.status === 'FULL') {
        status = 'FULL';
      } else if (remaining <= 4) {
        status = 'LIMITED';
      }

      sessions.push({
        id: sessionKey,
        date,
        startTime: template.startTime,
        endTime: template.endTime,
        timeRange: template.timeRange,
        title: template.title,
        category: template.category,
        capacity,
        booked: totalBooked,
        remaining,
        status,
        price: custom.price ?? template.price,
      });
    });

    return sessions;
  }

  static updateCricketSlot(
    slotKey: string,
    updates: Partial<CricketSlot>
  ): void {
    runtimeData.customCricketSlots[slotKey] = {
      ...runtimeData.customCricketSlots[slotKey],
      ...updates,
    };
    saveToFile();
    saveFirestoreSlotOverride(slotKey, 'cricket', updates).catch((e) =>
      console.warn('[Firestore] Update cricket slot notice:', e)
    );
  }

  static updateSwimmingSession(
    sessionKey: string,
    updates: Partial<SwimmingSession>
  ): void {
    runtimeData.customSwimmingSessions[sessionKey] = {
      ...runtimeData.customSwimmingSessions[sessionKey],
      ...updates,
    };
    saveToFile();
    saveFirestoreSlotOverride(sessionKey, 'swimming', updates).catch((e) =>
      console.warn('[Firestore] Update swimming session notice:', e)
    );
  }

  static getBookings(filters?: { sport?: string; date?: string; status?: string }): Booking[] {
    let list = [...runtimeData.bookings];
    if (filters?.sport) {
      list = list.filter((b) => b.sport === filters.sport);
    }
    if (filters?.date) {
      list = list.filter((b) => b.date === filters.date);
    }
    if (filters?.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static createBooking(bookingData: {
    sport: 'cricket' | 'swimming' | 'admission';
    category?: string;
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
    amountPaid?: number;
    paymentStatus?: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
    paymentScreenshot?: string;
    transactionId?: string;
    paymentMethod?: 'UPI_QR' | 'CASH' | 'ONLINE';
  }): { success: boolean; booking?: Booking; error?: string } {
    // 1. Conflict Prevention & Overlap Checking
    const { sport, resourceId, date, timeRange, playerCount } = bookingData;

    if (timeRange && sport !== 'admission') {
      const [reqStart, reqEnd] = parseTimeRange(timeRange);
      if (reqStart > 0 && reqEnd > reqStart) {
        const conflict = checkBookingConflict({
          date,
          reqStartMinutes: reqStart,
          reqEndMinutes: reqEnd,
          resourceId,
          sport,
          bookings: runtimeData.bookings,
          dateSpecificBlocks: runtimeData.config?.bookingTiming?.dateSpecificBlocks || [],
          blockedHours: runtimeData.config?.bookingTiming?.blockedHours || [],
        });

        if (conflict.hasConflict) {
          return {
            success: false,
            error: conflict.conflictReason || 'Selected time slot is already booked or blocked by the owner.',
          };
        }
      }
    }

    const net = sport === 'cricket' ? this.getNets().find((n) => n.id === resourceId) : null;
    const isBigBox = Boolean(
      net?.isBigBox ||
      net?.name?.toUpperCase().includes('BIG BOX') ||
      net?.code === 'BOX-CRICKET' ||
      net?.code === 'BOX-TURF' ||
      resourceId === 'net-big-box'
    );

    if (sport === 'cricket' && !isBigBox && playerCount > 4) {
      return {
        success: false,
        error: 'Regular cricket practice nets allow a maximum of 4 players.',
      };
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = sport === 'cricket' ? 'KSA-CRK' : sport === 'swimming' ? 'KSA-SWM' : 'KSA-ADM';
    const bookingId = `${prefix}-${randomNum}`;

    // Sanitize bookingData to remove undefined properties
    const cleanBookingData: Record<string, any> = {};
    for (const [key, value] of Object.entries(bookingData)) {
      if (value !== undefined) {
        cleanBookingData[key] = value;
      }
    }

    const newBooking: Booking = {
      ...(cleanBookingData as any),
      id: bookingId,
      amountPaid: bookingData.amountPaid ?? 0,
      status: 'CONFIRMED',
      paymentStatus: bookingData.paymentStatus || (bookingData.paymentScreenshot || bookingData.transactionId ? 'PENDING_VERIFICATION' : 'APPROVED'),
      createdAt: new Date().toISOString(),
    };

    // Strip any remaining undefined keys
    for (const key of Object.keys(newBooking)) {
      if ((newBooking as any)[key] === undefined) {
        delete (newBooking as any)[key];
      }
    }

    runtimeData.bookings.push(newBooking);
    saveToFile();
    syncEntityToFirestore('booking', newBooking);

    return { success: true, booking: newBooking };
  }

  static updateBookingStatus(
    bookingId: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  ): Booking | null {
    const booking = runtimeData.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;
    booking.status = status;
    saveToFile();
    updateFirestoreBookingStatus(bookingId, status).catch((e) =>
      console.warn('[Firestore] Update booking status notice:', e)
    );
    return booking;
  }

  static updateBookingPaymentStatus(
    bookingId: string,
    paymentStatus: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED',
    status?: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
    verifiedBy?: string
  ): Booking | null {
    const booking = runtimeData.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;
    booking.paymentStatus = paymentStatus;
    if (status) {
      booking.status = status;
    } else if (paymentStatus === 'APPROVED') {
      booking.status = 'CONFIRMED';
    } else if (paymentStatus === 'REJECTED') {
      booking.status = 'CANCELLED';
    }
    booking.verifiedAt = new Date().toISOString();
    if (verifiedBy) booking.verifiedBy = verifiedBy;
    saveToFile();
    updateFirestoreBookingStatus(bookingId, booking.status, {
      paymentStatus,
      verifiedAt: booking.verifiedAt,
      verifiedBy,
    }).catch((e) => console.warn('[Firestore] Update payment notice:', e));
    return booking;
  }

  static deleteBooking(bookingId: string): boolean {
    const initialLen = runtimeData.bookings.length;
    runtimeData.bookings = runtimeData.bookings.filter((b) => b.id !== bookingId);
    saveToFile();
    deleteFirestoreBooking(bookingId).catch((e) =>
      console.warn('[Firestore] Delete booking notice:', e)
    );
    return runtimeData.bookings.length < initialLen;
  }

  // =========================================================================
  // STUDENT MANAGEMENT SYSTEM
  // =========================================================================

  /**
   * Generates a guaranteed unique Student ID.
   */
  static generateUniqueStudentId(category: StudentCategory): string {
    const year = new Date().getFullYear();
    const prefix = category === 'SOLO' ? 'KSA-SOLO' : category === 'ACADEMIC' ? 'KSA-ACAD' : 'KSA-SCH';
    
    let candidateId = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 1000) {
      attempts++;
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      candidateId = `${prefix}-${year}-${randomNum}`;
      if (!runtimeData.students.some((s) => s.id === candidateId)) {
        isUnique = true;
      }
    }

    return candidateId;
  }

  /**
   * Generates an easy-to-remember unique mentor username.
   */
  static generateUniqueMentorUsername(orgName: string, mentorName: string): string {
    const cleanOrg = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const cleanMentor = mentorName
      .toLowerCase()
      .split(' ')[0]
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    
    const baseUsername = `${cleanOrg || 'ksa'}.${cleanMentor || 'mentor'}`;
    let candidate = baseUsername;
    let counter = 1;

    while (runtimeData.mentors.some((m) => m.username.toLowerCase() === candidate.toLowerCase())) {
      candidate = `${baseUsername}${counter}`;
      counter++;
    }

    return candidate;
  }

  /**
   * Generates a secure temporary password.
   */
  static generateTempPassword(): string {
    const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return `KSA@${new Date().getFullYear()}#${code}`;
  }

  /**
   * Generates an official Certificate Number.
   */
  static generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const count = (runtimeData.certificates?.length || 0) + 1;
    const padded = String(count).padStart(4, '0');
    return `CERT-KSA-${year}-${padded}`;
  }

  // --- Students CRUD ---

  static getStudents(filters?: {
    category?: StudentCategory;
    mentorId?: string;
    status?: StudentStatus;
    search?: string;
  }): Student[] {
    let list = [...(runtimeData.students || [])];

    if (filters?.category) {
      list = list.filter((s) => s.category === filters.category);
    }
    if (filters?.mentorId) {
      list = list.filter((s) => s.mentorId === filters.mentorId);
    }
    if (filters?.status) {
      list = list.filter((s) => s.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          (s.academyName && s.academyName.toLowerCase().includes(q)) ||
          (s.schoolName && s.schoolName.toLowerCase().includes(q)) ||
          (s.mentorName && s.mentorName.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getStudentById(id: string): Student | null {
    return runtimeData.students.find((s) => s.id === id) || null;
  }

  static createStudent(
    studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'status' | 'certificateStatus'> & {
      status?: StudentStatus;
    },
    performedBy: string = 'System Admin'
  ): Student {
    const studentId = this.generateUniqueStudentId(studentData.category);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const newStudent: Student = {
      ...studentData,
      id: studentId,
      status: studentData.status || 'ACTIVE',
      certificateStatus: 'NONE',
      attendanceStats: {
        totalDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        percentage: 0,
      },
      history: [
        {
          action: 'STUDENT_ADDED',
          date: dateStr,
          time: timeStr,
          performedBy,
          details: `Enrolled as ${studentData.category} student with ID ${studentId}`,
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    runtimeData.students.push(newStudent);

    // If assigned to a mentor, add to mentor's assignedStudentIds
    if (newStudent.mentorId) {
      const mentor = runtimeData.mentors.find((m) => m.id === newStudent.mentorId);
      if (mentor && !mentor.assignedStudentIds.includes(studentId)) {
        mentor.assignedStudentIds.push(studentId);
        syncEntityToFirestore('mentor', mentor);
      }
    }

    this.addAuditLog({
      action: 'STUDENT_ADDED',
      performedBy,
      studentId,
      studentName: newStudent.name,
      details: `New ${newStudent.category} student added (${newStudent.name})`,
      newValue: studentId,
    });

    saveToFile();
    syncEntityToFirestore('student', newStudent);
    return newStudent;
  }

  static updateStudent(id: string, updates: Partial<Student>, performedBy: string = 'Admin'): Student | null {
    const student = runtimeData.students.find((s) => s.id === id);
    if (!student) return null;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Track changes for history
    const changeDetails: string[] = [];
    if (updates.name && updates.name !== student.name) changeDetails.push(`Name: ${student.name} → ${updates.name}`);
    if (updates.status && updates.status !== student.status) changeDetails.push(`Status: ${student.status} → ${updates.status}`);
    if (updates.contact && updates.contact !== student.contact) changeDetails.push(`Contact updated`);

    Object.assign(student, updates, { updatedAt: now.toISOString() });

    student.history.push({
      action: 'STUDENT_EDITED',
      date: dateStr,
      time: timeStr,
      performedBy,
      details: changeDetails.length > 0 ? changeDetails.join(', ') : 'Profile details updated',
    });

    this.addAuditLog({
      action: 'STUDENT_EDITED',
      performedBy,
      studentId: student.id,
      studentName: student.name,
      details: changeDetails.length > 0 ? changeDetails.join(', ') : 'Student profile modified',
    });

    saveToFile();
    syncEntityToFirestore('student', student);
    return student;
  }

  static removeStudent(id: string, reason: string, performedBy: string): Student | null {
    const student = runtimeData.students.find((s) => s.id === id);
    if (!student) return null;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const prevStatus = student.status;

    student.status = 'REMOVED';
    student.isRemoved = true;
    student.removalInfo = {
      removedDate: dateStr,
      removedBy: performedBy,
      reason,
      previousStatus: prevStatus,
    };
    student.updatedAt = now.toISOString();

    student.history.push({
      action: 'STUDENT_REMOVED',
      date: dateStr,
      time: timeStr,
      performedBy,
      details: `Student deactivated/removed. Reason: ${reason}`,
      prevValue: prevStatus,
      newValue: 'REMOVED',
    });

    this.addAuditLog({
      action: 'STUDENT_REMOVED',
      performedBy,
      studentId: student.id,
      studentName: student.name,
      details: `Student marked REMOVED. Reason: ${reason}`,
      prevValue: prevStatus,
      newValue: 'REMOVED',
    });

    saveToFile();
    syncEntityToFirestore('student', student);
    return student;
  }

  static replaceStudent(
    oldStudentId: string,
    newStudentData: {
      name: string;
      age: number;
      fatherName: string;
      address: string;
      contact: string;
    },
    reason: string,
    performedBy: string
  ): { oldStudent: Student; newStudent: Student } | null {
    const oldStudent = runtimeData.students.find((s) => s.id === oldStudentId);
    if (!oldStudent) return null;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // 1. Create the new replacement student
    const newStudentId = this.generateUniqueStudentId(oldStudent.category);
    const newStudent: Student = {
      id: newStudentId,
      name: newStudentData.name.trim(),
      age: Number(newStudentData.age) || 16,
      fatherName: newStudentData.fatherName.trim(),
      address: newStudentData.address.trim(),
      contact: newStudentData.contact.trim(),
      category: oldStudent.category,
      admissionDate: dateStr,
      admissionTime: timeStr,
      status: 'ACTIVE',
      academyName: oldStudent.academyName,
      schoolName: oldStudent.schoolName,
      mentorId: oldStudent.mentorId,
      mentorName: oldStudent.mentorName,
      mentorContact: oldStudent.mentorContact,
      tenureDurationMonths: oldStudent.tenureDurationMonths,
      tenureStartDate: dateStr,
      tenureEndDate: oldStudent.tenureEndDate,
      tenureStatus: 'IN_PROGRESS',
      originalStudentId: oldStudent.id,
      attendanceStats: {
        totalDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        percentage: 0,
      },
      certificateStatus: 'NONE',
      history: [
        {
          action: 'STUDENT_ADDED',
          date: dateStr,
          time: timeStr,
          performedBy,
          details: `Enrolled as replacement for student ${oldStudent.name} (${oldStudent.id}). Reason: ${reason}`,
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    runtimeData.students.push(newStudent);

    // 2. Mark old student as REPLACED without deleting history
    const prevStatus = oldStudent.status;
    oldStudent.status = 'REPLACED';
    oldStudent.isReplaced = true;
    oldStudent.replacementInfo = {
      replacedDate: dateStr,
      replacedBy: performedBy,
      reason,
      replacementStudentId: newStudent.id,
      replacementStudentName: newStudent.name,
    };
    oldStudent.updatedAt = now.toISOString();

    oldStudent.history.push({
      action: 'STUDENT_REPLACED',
      date: dateStr,
      time: timeStr,
      performedBy,
      details: `Student replaced by ${newStudent.name} (${newStudent.id}). Reason: ${reason}`,
      prevValue: prevStatus,
      newValue: 'REPLACED',
    });

    // 3. Update mentor's assigned students
    if (oldStudent.mentorId) {
      const mentor = runtimeData.mentors.find((m) => m.id === oldStudent.mentorId);
      if (mentor) {
        mentor.assignedStudentIds = mentor.assignedStudentIds.map((sid) =>
          sid === oldStudentId ? newStudentId : sid
        );
      }
    }

    this.addAuditLog({
      action: 'STUDENT_REPLACED',
      performedBy,
      studentId: oldStudent.id,
      studentName: oldStudent.name,
      details: `Replaced by ${newStudent.name} (${newStudent.id}). Reason: ${reason}`,
      prevValue: oldStudent.id,
      newValue: newStudent.id,
    });

    saveToFile();
    syncEntityToFirestore('student', oldStudent);
    syncEntityToFirestore('student', newStudent);
    if (oldStudent.mentorId) {
      const mentor = runtimeData.mentors.find((m) => m.id === oldStudent.mentorId);
      if (mentor) syncEntityToFirestore('mentor', mentor);
    }
    return { oldStudent, newStudent };
  }

  static updateTenureStatus(
    studentId: string,
    tenureStatus: TenureStatus,
    performedBy: string
  ): Student | null {
    const student = runtimeData.students.find((s) => s.id === studentId);
    if (!student) return null;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const prevTenure = student.tenureStatus;

    student.tenureStatus = tenureStatus;
    if (tenureStatus === 'COMPLETED') {
      student.status = 'COMPLETED';
      // Automatically create a certificate in DRAFT state if none exists yet!
      if (!student.certificateId) {
        const cert = this.createCertificateDraft(student.id, performedBy);
        if (cert) {
          student.certificateId = cert.id;
          student.certificateStatus = 'DRAFT';
        }
      }
    }

    student.history.push({
      action: 'TENURE_UPDATED',
      date: dateStr,
      time: timeStr,
      performedBy,
      details: `Tenure marked as ${tenureStatus}`,
      prevValue: prevTenure,
      newValue: tenureStatus,
    });

    this.addAuditLog({
      action: 'TENURE_UPDATED',
      performedBy,
      studentId: student.id,
      studentName: student.name,
      details: `Student tenure marked as ${tenureStatus}`,
      prevValue: prevTenure,
      newValue: tenureStatus,
    });

    saveToFile();
    syncEntityToFirestore('student', student);
    return student;
  }

  // --- Mentors Management & Auth ---

  static getMentors(): Mentor[] {
    return runtimeData.mentors || [];
  }

  static getMentorById(id: string): Mentor | null {
    return runtimeData.mentors.find((m) => m.id === id) || null;
  }

  static getMentorByUsername(username: string): Mentor | null {
    return runtimeData.mentors.find((m) => m.username.toLowerCase() === username.toLowerCase()) || null;
  }

  static createMentor(data: {
    name: string;
    contact: string;
    organizationName: string;
    category: 'ACADEMIC' | 'SCHOOL';
    preferredUsername?: string;
  }): { mentor: Mentor; tempPassword: string } {
    const id = `mentor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const username = data.preferredUsername || this.generateUniqueMentorUsername(data.organizationName, data.name);
    const tempPassword = this.generateTempPassword();

    // Default clean mentor signature based on name
    const defaultMentorSig = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70"><path d="M20,45 C40,25 60,60 80,30 C95,20 120,50 140,25 C160,35 180,20 200,45 M35,52 L195,48" fill="none" stroke="%238C5A32" stroke-width="2.2" stroke-linecap="round"/><text x="30" y="65" font-family="cursive" font-size="13" fill="%238C5A32">${data.name}</text></svg>`;

    const newMentor: Mentor = {
      id,
      username,
      password: tempPassword,
      name: data.name.trim(),
      contact: data.contact.trim(),
      organizationName: data.organizationName.trim(),
      category: data.category,
      isFirstLogin: true,
      signatureUrl: defaultMentorSig,
      assignedStudentIds: [],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    runtimeData.mentors.push(newMentor);

    this.addAuditLog({
      action: 'MENTOR_CREATED',
      performedBy: 'System Admission Flow',
      details: `Created mentor account for ${newMentor.name} (Username: ${newMentor.username})`,
      newValue: newMentor.username,
    });

    saveToFile();
    syncEntityToFirestore('mentor', newMentor);
    return { mentor: newMentor, tempPassword };
  }

  static verifyMentorAuth(
    username: string,
    pass: string
  ): { success: boolean; mentor?: Mentor; requiresPasswordChange?: boolean; error?: string } {
    const mentor = this.getMentorByUsername(username);
    if (!mentor) {
      return { success: false, error: 'Mentor account not found' };
    }
    if (mentor.status === 'INACTIVE') {
      return { success: false, error: 'Mentor account is inactive. Please contact KSA Admin.' };
    }
    if (mentor.password !== pass) {
      return { success: false, error: 'Incorrect password' };
    }

    return {
      success: true,
      mentor,
      requiresPasswordChange: mentor.isFirstLogin,
    };
  }

  static changeMentorPassword(mentorId: string, newPassword: string): boolean {
    const mentor = runtimeData.mentors.find((m) => m.id === mentorId);
    if (!mentor) return false;
    mentor.password = newPassword;
    mentor.isFirstLogin = false;
    mentor.updatedAt = new Date().toISOString();

    this.addAuditLog({
      action: 'MENTOR_PASSWORD_CHANGED',
      performedBy: mentor.name,
      details: `Password updated for mentor account ${mentor.username}`,
    });

    saveToFile();
    syncEntityToFirestore('mentor', mentor);
    return true;
  }

  static updateMentor(mentorId: string, updates: Partial<Mentor>): Mentor | null {
    const mentor = runtimeData.mentors.find((m) => m.id === mentorId);
    if (!mentor) return null;
    Object.assign(mentor, updates, { updatedAt: new Date().toISOString() });
    saveToFile();
    syncEntityToFirestore('mentor', mentor);
    return mentor;
  }

  // --- Daily Attendance System ---

  static getAttendance(params?: {
    studentId?: string;
    mentorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): AttendanceRecord[] {
    let records = [...(runtimeData.attendance || [])];

    if (params?.studentId) {
      records = records.filter((r) => r.studentId === params.studentId);
    }
    if (params?.mentorId) {
      records = records.filter((r) => r.mentorId === params.mentorId);
    }
    if (params?.date) {
      records = records.filter((r) => r.date === params.date);
    }
    if (params?.startDate) {
      records = records.filter((r) => r.date >= params.startDate!);
    }
    if (params?.endDate) {
      records = records.filter((r) => r.date <= params.endDate!);
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static markAttendance(
    entries: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>,
    mentorId: string,
    date: string,
    performedBy: string
  ): { success: boolean; count: number } {
    const mentor = runtimeData.mentors.find((m) => m.id === mentorId);
    const mentorName = mentor ? mentor.name : performedBy;
    const now = new Date().toISOString();
    let count = 0;

    for (const entry of entries) {
      const student = runtimeData.students.find((s) => s.id === entry.studentId);
      if (!student) continue;

      const recordId = `${entry.studentId}_${date}`;
      const existingIdx = runtimeData.attendance.findIndex((r) => r.id === recordId);

      const record: AttendanceRecord = {
        id: recordId,
        studentId: entry.studentId,
        studentName: student.name,
        mentorId,
        mentorName,
        date,
        status: entry.status,
        notes: entry.notes || '',
        markedBy: performedBy,
        markedAt: now,
      };

      if (existingIdx >= 0) {
        runtimeData.attendance[existingIdx] = record;
      } else {
        runtimeData.attendance.push(record);
      }
      count++;
      syncEntityToFirestore('attendance', record);

      // Recalculate student attendance statistics
      const studentRecords = runtimeData.attendance.filter((r) => r.studentId === student.id);
      const totalDays = studentRecords.length;
      const present = studentRecords.filter((r) => r.status === 'PRESENT').length;
      const absent = studentRecords.filter((r) => r.status === 'ABSENT').length;
      const leave = studentRecords.filter((r) => r.status === 'LEAVE').length;
      const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

      student.attendanceStats = {
        totalDays,
        present,
        absent,
        leave,
        percentage,
      };
      student.updatedAt = now;
      syncEntityToFirestore('student', student);
    }

    this.addAuditLog({
      action: 'ATTENDANCE_MARKED',
      performedBy,
      details: `Marked attendance for ${count} students on ${date}`,
      newValue: `${count} records`,
    });

    saveToFile();
    return { success: true, count };
  }

  // --- Certificate & Owner Approval System ---

  static getCertificates(filters?: {
    status?: CertificateStatus;
    studentId?: string;
  }): Certificate[] {
    let list = [...(runtimeData.certificates || [])];
    if (filters?.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.studentId) {
      list = list.filter((c) => c.studentId === filters.studentId);
    }
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  static getCertificateById(id: string): Certificate | null {
    return runtimeData.certificates.find((c) => c.id === id) || null;
  }

  static createCertificateDraft(studentId: string, requestedBy: string): Certificate | null {
    const student = runtimeData.students.find((s) => s.id === studentId);
    if (!student) return null;

    // Check if an existing active certificate exists
    const existing = runtimeData.certificates.find((c) => c.studentId === studentId);
    if (existing) {
      return existing;
    }

    const certId = `CERT-${student.id}`;
    const certNum = this.generateCertificateNumber();
    const mentor = student.mentorId ? runtimeData.mentors.find((m) => m.id === student.mentorId) : null;
    const sigConfig = this.getSignatureConfig();

    const cert: Certificate = {
      id: certId,
      certificateNumber: certNum,
      studentId: student.id,
      studentName: student.name,
      fatherName: student.fatherName,
      category: student.category,
      organizationName: student.academyName || student.schoolName || 'Kuchaman Sports Academy',
      mentorId: student.mentorId,
      mentorName: student.mentorName,
      tenureStartDate: student.tenureStartDate,
      tenureEndDate: student.tenureEndDate,
      attendancePercentage: student.attendanceStats?.percentage || 90,
      status: 'DRAFT',
      requestedAt: new Date().toISOString(),
      requestedBy,
      ownerName: sigConfig.ownerName || 'JAY PRAKASH BHAKAR',
      ownerSignatureUrl: sigConfig.ownerSignatureUrl,
      mentorSignatureUrl: mentor?.signatureUrl || sigConfig.ownerSignatureUrl,
    };

    runtimeData.certificates.push(cert);
    student.certificateId = cert.id;
    student.certificateStatus = 'DRAFT';

    this.addAuditLog({
      action: 'CERTIFICATE_DRAFT_CREATED',
      performedBy: requestedBy,
      studentId: student.id,
      studentName: student.name,
      details: `Generated Certificate Draft ${certNum} for student ${student.name}`,
    });

    saveToFile();
    syncEntityToFirestore('certificate', cert);
    syncEntityToFirestore('student', student);
    return cert;
  }

  static submitCertificateForApproval(certificateId: string, requestedBy: string): Certificate | null {
    const cert = runtimeData.certificates.find((c) => c.id === certificateId);
    if (!cert) return null;

    cert.status = 'PENDING_APPROVAL';
    cert.requestedBy = requestedBy;
    cert.requestedAt = new Date().toISOString();

    const student = runtimeData.students.find((s) => s.id === cert.studentId);
    if (student) {
      student.certificateStatus = 'PENDING_APPROVAL';
      syncEntityToFirestore('student', student);
    }

    this.addAuditLog({
      action: 'CERTIFICATE_SUBMITTED_FOR_APPROVAL',
      performedBy: requestedBy,
      studentId: cert.studentId,
      studentName: cert.studentName,
      details: `Submitted certificate ${cert.certificateNumber} for Owner Approval`,
    });

    saveToFile();
    syncEntityToFirestore('certificate', cert);
    return cert;
  }

  static approveCertificate(certificateId: string, approvedBy: string = 'JAY PRAKASH BHAKAR'): Certificate | null {
    const cert = runtimeData.certificates.find((c) => c.id === certificateId);
    if (!cert) return null;

    const now = new Date().toISOString();
    cert.status = 'APPROVED';
    cert.approvedBy = approvedBy;
    cert.approvedAt = now;
    cert.rejectionReason = undefined;

    const student = runtimeData.students.find((s) => s.id === cert.studentId);
    if (student) {
      student.certificateStatus = 'APPROVED';
      syncEntityToFirestore('student', student);
    }

    this.addAuditLog({
      action: 'CERTIFICATE_APPROVED',
      performedBy: approvedBy,
      studentId: cert.studentId,
      studentName: cert.studentName,
      details: `Owner ${approvedBy} approved certificate ${cert.certificateNumber}`,
    });

    saveToFile();
    syncEntityToFirestore('certificate', cert);
    return cert;
  }

  static rejectCertificate(certificateId: string, reason: string, rejectedBy: string = 'JAY PRAKASH BHAKAR'): Certificate | null {
    const cert = runtimeData.certificates.find((c) => c.id === certificateId);
    if (!cert) return null;

    cert.status = 'REJECTED';
    cert.rejectionReason = reason;

    const student = runtimeData.students.find((s) => s.id === cert.studentId);
    if (student) {
      student.certificateStatus = 'REJECTED';
      syncEntityToFirestore('student', student);
    }

    this.addAuditLog({
      action: 'CERTIFICATE_REJECTED',
      performedBy: rejectedBy,
      studentId: cert.studentId,
      studentName: cert.studentName,
      details: `Certificate ${cert.certificateNumber} rejected. Reason: ${reason}`,
    });

    saveToFile();
    syncEntityToFirestore('certificate', cert);
    return cert;
  }

  static issueCertificate(certificateId: string, issuedBy: string = 'JAY PRAKASH BHAKAR'): Certificate | null {
    const cert = runtimeData.certificates.find((c) => c.id === certificateId);
    if (!cert) return null;

    const now = new Date().toISOString();
    cert.status = 'ISSUED';
    cert.issuedAt = now;
    if (!cert.approvedBy) {
      cert.approvedBy = issuedBy;
      cert.approvedAt = now;
    }

    const student = runtimeData.students.find((s) => s.id === cert.studentId);
    if (student) {
      student.certificateStatus = 'ISSUED';
      syncEntityToFirestore('student', student);
    }

    this.addAuditLog({
      action: 'CERTIFICATE_ISSUED',
      performedBy: issuedBy,
      studentId: cert.studentId,
      studentName: cert.studentName,
      details: `Certificate ${cert.certificateNumber} officially issued to ${cert.studentName}`,
    });

    saveToFile();
    syncEntityToFirestore('certificate', cert);
    return cert;
  }

  // --- Signature Management ---

  static getSignatureConfig(): SignatureConfig {
    return runtimeData.signatureConfig || DEFAULT_SIGNATURE_CONFIG;
  }

  static updateSignatureConfig(updates: Partial<SignatureConfig>): SignatureConfig {
    runtimeData.signatureConfig = {
      ...(runtimeData.signatureConfig || DEFAULT_SIGNATURE_CONFIG),
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addAuditLog({
      action: 'SIGNATURES_CONFIG_UPDATED',
      performedBy: 'Owner / Admin',
      details: 'Updated Academy Owner signature and seal configuration',
    });

    saveToFile();
    syncEntityToFirestore('signature', runtimeData.signatureConfig);
    return runtimeData.signatureConfig;
  }

  // --- Audit Logs ---

  static getAuditLogs(limit: number = 200): AuditLog[] {
    const logs = [...(runtimeData.auditLogs || [])];
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  static addAuditLog(entry: {
    action: string;
    performedBy: string;
    details: string;
    studentId?: string;
    studentName?: string;
    prevValue?: string;
    newValue?: string;
  }): AuditLog {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: entry.action,
      date,
      time,
      timestamp: now.toISOString(),
      performedBy: entry.performedBy,
      studentId: entry.studentId,
      studentName: entry.studentName,
      details: entry.details,
      prevValue: entry.prevValue,
      newValue: entry.newValue,
    };

    if (!runtimeData.auditLogs) {
      runtimeData.auditLogs = [];
    }
    runtimeData.auditLogs.unshift(newLog);
    saveToFile();
    syncEntityToFirestore('audit_log', newLog);
    return newLog;
  }
}

