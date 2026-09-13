import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { CricketNet, CricketSlot, SwimmingSession, Booking, AcademyConfig } from './types';
import { DEFAULT_NETS, DEFAULT_CONFIG } from './defaults';

// Collection Names
const NETS_COLLECTION = 'cricket_nets';
const BOOKINGS_COLLECTION = 'bookings';
const CUSTOM_SLOTS_COLLECTION = 'custom_slots';
const CONFIG_COLLECTION = 'academy_config';
const STUDENTS_COLLECTION = 'students';
const MENTORS_COLLECTION = 'mentors';
const ATTENDANCE_COLLECTION = 'attendance';
const CERTIFICATES_COLLECTION = 'certificates';
const SIGNATURES_COLLECTION = 'signatures';
const AUDIT_LOGS_COLLECTION = 'audit_logs';

/**
 * Remove undefined values recursively from objects prior to Firestore mutations,
 * preventing 'Unsupported field value: undefined' errors.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanFirestoreData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Fetch all cricket nets from Firestore, seeding defaults if empty
 */
export async function getFirestoreNets(): Promise<CricketNet[]> {
  try {
    const snap = await getDocs(collection(db, NETS_COLLECTION));
    if (snap.empty) {
      return DEFAULT_NETS;
    }
    const list: CricketNet[] = [];
    snap.forEach((d) => {
      list.push(d.data() as CricketNet);
    });
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.warn('Notice reading Firestore nets, using fallback:', error);
    return DEFAULT_NETS;
  }
}

/**
 * Save or update a cricket net in Firestore
 */
export async function saveFirestoreNet(net: CricketNet): Promise<void> {
  const path = `${NETS_COLLECTION}/${net.id}`;
  try {
    const payload = cleanFirestoreData({
      ...net,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, NETS_COLLECTION, net.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a cricket net from Firestore
 */
export async function deleteFirestoreNet(netId: string): Promise<void> {
  const path = `${NETS_COLLECTION}/${netId}`;
  try {
    await deleteDoc(doc(db, NETS_COLLECTION, netId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all bookings from Firestore
 */
export async function getFirestoreBookings(filters?: {
  sport?: string;
  date?: string;
  phone?: string;
}): Promise<Booking[]> {
  try {
    const ref = collection(db, BOOKINGS_COLLECTION);
    const snap = await getDocs(ref);
    const list: Booking[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Booking);
    });

    let filtered = list;
    if (filters?.sport && filters.sport !== 'all') {
      filtered = filtered.filter((b) => b.sport === filters.sport);
    }
    if (filters?.date) {
      filtered = filtered.filter((b) => b.date === filters.date);
    }
    if (filters?.phone) {
      filtered = filtered.filter((b) => b.userPhone.includes(filters.phone!));
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.warn('Notice reading Firestore bookings:', error);
    return [];
  }
}

/**
 * Realtime listener for bookings
 */
export function subscribeToBookings(
  callback: (bookings: Booking[]) => void
): Unsubscribe {
  const ref = collection(db, BOOKINGS_COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Booking);
      });
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, BOOKINGS_COLLECTION);
    }
  );
}

/**
 * Create a new player reservation in Firestore
 */
export async function createFirestoreBooking(booking: Booking): Promise<Booking> {
  const path = `${BOOKINGS_COLLECTION}/${booking.id}`;
  try {
    const cleanBooking = cleanFirestoreData(booking);
    await setDoc(doc(db, BOOKINGS_COLLECTION, booking.id), cleanBooking);
    return booking;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return booking;
  }
}

/**
 * Update booking status and payment details in Firestore
 */
export async function updateFirestoreBookingStatus(
  bookingId: string,
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
  paymentUpdates?: {
    paymentStatus?: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
    verifiedAt?: string;
    verifiedBy?: string;
  }
): Promise<void> {
  const path = `${BOOKINGS_COLLECTION}/${bookingId}`;
  try {
    const cleanUpdates = cleanFirestoreData({
      status,
      ...(paymentUpdates || {}),
    });
    await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a booking from Firestore
 */
export async function deleteFirestoreBooking(bookingId: string): Promise<void> {
  const path = `${BOOKINGS_COLLECTION}/${bookingId}`;
  try {
    await deleteDoc(doc(db, BOOKINGS_COLLECTION, bookingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save academy config (including QR and payment settings) to Firestore
 */
export async function saveFirestoreConfig(config: AcademyConfig): Promise<void> {
  const path = `${CONFIG_COLLECTION}/main`;
  try {
    const cleanConfig = cleanFirestoreData({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, CONFIG_COLLECTION, 'main'), cleanConfig);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save custom slot override in Firestore
 */
export async function saveFirestoreSlotOverride(
  slotKey: string,
  sport: 'cricket' | 'swimming',
  updates: Record<string, any>
): Promise<void> {
  const docId = `${sport}_${slotKey}`.replace(/[\/\s:]+/g, '_');
  const path = `${CUSTOM_SLOTS_COLLECTION}/${docId}`;
  try {
    const cleanPayload = cleanFirestoreData({
      id: docId,
      slotKey,
      sport,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(
      doc(db, CUSTOM_SLOTS_COLLECTION, docId),
      cleanPayload,
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch all custom slot overrides
 */
export async function getFirestoreSlotOverrides(): Promise<Record<string, any>> {
  try {
    const snap = await getDocs(collection(db, CUSTOM_SLOTS_COLLECTION));
    const map: Record<string, any> = {};
    snap.forEach((d) => {
      const data = d.data();
      if (data.slotKey) {
        map[data.slotKey] = data;
      }
    });
    return map;
  } catch (error) {
    console.warn('Notice reading Firestore slot overrides:', error);
    return {};
  }
}

/**
 * Fetch academy config from Firestore
 */
export async function getFirestoreConfig(): Promise<AcademyConfig> {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, 'main'));
    if (snap.exists()) {
      return snap.data() as AcademyConfig;
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.warn('Notice reading Firestore config, using fallback:', error);
    return DEFAULT_CONFIG;
  }
}

// ----------------------------------------------------
// STUDENTS FIRESTORE SERVICES
// ----------------------------------------------------

export async function getFirestoreStudents(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, STUDENTS_COLLECTION));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (error) {
    console.warn('Notice reading Firestore students:', error);
    return [];
  }
}

export async function saveFirestoreStudent(student: any): Promise<void> {
  const path = `${STUDENTS_COLLECTION}/${student.id}`;
  try {
    const payload = cleanFirestoreData({
      ...student,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, STUDENTS_COLLECTION, student.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreStudent(studentId: string): Promise<void> {
  const path = `${STUDENTS_COLLECTION}/${studentId}`;
  try {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// MENTORS FIRESTORE SERVICES
// ----------------------------------------------------

export async function getFirestoreMentors(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, MENTORS_COLLECTION));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (error) {
    console.warn('Notice reading Firestore mentors:', error);
    return [];
  }
}

export async function saveFirestoreMentor(mentor: any): Promise<void> {
  const path = `${MENTORS_COLLECTION}/${mentor.id}`;
  try {
    const payload = cleanFirestoreData({
      ...mentor,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, MENTORS_COLLECTION, mentor.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreMentor(mentorId: string): Promise<void> {
  const path = `${MENTORS_COLLECTION}/${mentorId}`;
  try {
    await deleteDoc(doc(db, MENTORS_COLLECTION, mentorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// ATTENDANCE FIRESTORE SERVICES
// ----------------------------------------------------

export async function getFirestoreAttendance(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, ATTENDANCE_COLLECTION));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (error) {
    console.warn('Notice reading Firestore attendance:', error);
    return [];
  }
}

export async function saveFirestoreAttendance(record: any): Promise<void> {
  const path = `${ATTENDANCE_COLLECTION}/${record.id}`;
  try {
    const payload = cleanFirestoreData(record);
    await setDoc(doc(db, ATTENDANCE_COLLECTION, record.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// CERTIFICATES FIRESTORE SERVICES
// ----------------------------------------------------

export async function getFirestoreCertificates(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, CERTIFICATES_COLLECTION));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (error) {
    console.warn('Notice reading Firestore certificates:', error);
    return [];
  }
}

export async function saveFirestoreCertificate(cert: any): Promise<void> {
  const path = `${CERTIFICATES_COLLECTION}/${cert.id}`;
  try {
    const payload = cleanFirestoreData(cert);
    await setDoc(doc(db, CERTIFICATES_COLLECTION, cert.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreCertificate(certId: string): Promise<void> {
  const path = `${CERTIFICATES_COLLECTION}/${certId}`;
  try {
    await deleteDoc(doc(db, CERTIFICATES_COLLECTION, certId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// SIGNATURES FIRESTORE SERVICES
// ----------------------------------------------------

export async function getFirestoreSignatures(): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, SIGNATURES_COLLECTION, 'main'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn('Notice reading Firestore signatures:', error);
    return null;
  }
}

export async function saveFirestoreSignatures(signatures: any): Promise<void> {
  const path = `${SIGNATURES_COLLECTION}/main`;
  try {
    const payload = cleanFirestoreData({
      ...signatures,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, SIGNATURES_COLLECTION, 'main'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// AUDIT LOGS FIRESTORE SERVICES
// ----------------------------------------------------

export async function getFirestoreAuditLogs(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, AUDIT_LOGS_COLLECTION));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn('Notice reading Firestore audit logs:', error);
    return [];
  }
}

export async function saveFirestoreAuditLog(log: any): Promise<void> {
  const path = `${AUDIT_LOGS_COLLECTION}/${log.id}`;
  try {
    const payload = cleanFirestoreData(log);
    await setDoc(doc(db, AUDIT_LOGS_COLLECTION, log.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

