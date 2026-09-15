/**
 * Owner Notification Service for Kuchaman Sports Academy
 * 
 * Supports:
 * 1. Automated Meta WhatsApp Cloud API delivery (when configured in environment).
 * 2. Safe bypass when WhatsApp API is not yet configured (without faking delivery).
 * 3. Direct WhatsApp Click-to-Chat deep link generator for instant messaging.
 */

export interface BookingNotificationDetails {
  id: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  amountPaid: number;
  sport: string;
  resourceName?: string;
  date: string;
  timeRange: string;
  durationHours?: number;
  transactionId?: string;
}

export interface NotificationResult {
  success: boolean;
  delivered: boolean;
  channel: 'whatsapp_api' | 'none';
  reason?: string;
  messageText: string;
  whatsappLink: string;
}

// Owner WhatsApp Number as default fallback: 8142731917
const DEFAULT_OWNER_WHATSAPP = '918142731917';

/**
 * Resolves the active owner WhatsApp phone number dynamically.
 * Priority:
 * 1. Explicitly passed customPhone
 * 2. Stored configuration in StorageService (set in Admin)
 * 3. WHATSAPP_OWNER_NUMBER environment variable
 * 4. DEFAULT_OWNER_WHATSAPP (8142731917)
 */
export function resolveOwnerWhatsApp(customPhone?: string): string {
  if (customPhone && customPhone.trim()) {
    return customPhone.trim();
  }
  return process.env.WHATSAPP_OWNER_NUMBER || DEFAULT_OWNER_WHATSAPP;
}

/**
 * Generate a deterministic verification signature token for one-click verification
 */
export function generateVerificationToken(bookingId: string): string {
  const secret = process.env.VERIFICATION_SECRET || 'ksa_owner_whatsapp_secret_salt_2026';
  let hash = 0;
  const str = `${bookingId}_${secret}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate a verification signature token
 */
export function isValidVerificationToken(bookingId: string, token: string): boolean {
  if (!bookingId || !token) return false;
  return generateVerificationToken(bookingId) === token.trim();
}

/**
 * Build the exact verification notification message required by KSA with 1-Click YES / NO links
 */
export function buildOwnerVerificationMessage(
  booking: BookingNotificationDetails,
  baseUrl?: string
): string {
  const sportLabel = booking.sport ? booking.sport.toUpperCase() : 'SPORTS';
  const resourceLabel = booking.resourceName ? ` (${booking.resourceName})` : '';
  const token = generateVerificationToken(booking.id);

  const origin =
    baseUrl ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://ais-dev-2c2mifsqqifvreyllk6nht-554160794174.asia-southeast1.run.app');

  const cleanOrigin = origin.replace(/\/$/, '');
  const yesLink = `${cleanOrigin}/verify-booking?id=${encodeURIComponent(booking.id)}&action=approve&token=${token}`;
  const noLink = `${cleanOrigin}/verify-booking?id=${encodeURIComponent(booking.id)}&action=reject&token=${token}`;

  return (
    `🔔 *नया बुकिंग व पेमेंट अनुरोध (KSA)*\n\n` +
    `👤 *ग्राहक का नाम:* ${booking.userName}\n` +
    `📱 *मोबाइल नंबर:* ${booking.userPhone}\n` +
    `⏰ *तारीख व समय:* ${booking.date} (${booking.timeRange || 'चयनित स्लॉट'})\n` +
    `🏏 *खेल / सुविधा:* ${sportLabel}${resourceLabel}\n` +
    `💰 *भुगतान राशि:* ₹${booking.amountPaid}\n` +
    `🆔 *बुकिंग ID:* ${booking.id}\n` +
    (booking.transactionId ? `🔢 *UTR / Ref No:* ${booking.transactionId}\n` : '') +
    `\n📢 *सूचना:* इस नाम (*${booking.userName}*) के बंदे ने इस टाइम पर *₹${booking.amountPaid}* का पेमेंट सबमिट किया है।\n\n` +
    `⚠️ *कृपया अपने बैंक खाते / PhonePe / GPay में चेक करें कि क्या ₹${booking.amountPaid} सच में आ गए हैं?*\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👇 *फैसला लें (1-क्लिक वेरिफिकेशन):*\n\n` +
    `✅ *YES (पेमेंट आ गया है - कन्फर्म करें):*\n` +
    `${yesLink}\n\n` +
    `❌ *NO (पेमेंट नहीं आया - रिजेक्ट करें):*\n` +
    `${noLink}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *नोट:* आपके Yes या No पर क्लिक करते ही वेबसाइट पर यह बुकिंग तुरंत कन्फर्म या रिजेक्ट हो जाएगी।`
  );
}

/**
 * Generate a direct WhatsApp click-to-chat URL for the owner
 */
export function generateOwnerWhatsAppLink(
  bookingOrText: BookingNotificationDetails | string,
  customPhone?: string,
  baseUrl?: string
): string {
  const messageText =
    typeof bookingOrText === 'string'
      ? bookingOrText
      : buildOwnerVerificationMessage(bookingOrText, baseUrl);
  const rawPhone = resolveOwnerWhatsApp(customPhone);
  const phone = rawPhone.replace(/\D/g, '');
  const normalizedPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone.slice(-10)}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageText)}`;
}

/**
 * Send notification to the owner immediately upon verification submission
 */
export async function notifyOwnerOfPendingVerification(
  booking: BookingNotificationDetails,
  baseUrl?: string,
  customOwnerPhone?: string
): Promise<NotificationResult> {
  const resolvedPhone = resolveOwnerWhatsApp(customOwnerPhone);
  const messageText = buildOwnerVerificationMessage(booking, baseUrl);
  const whatsappLink = generateOwnerWhatsAppLink(messageText, resolvedPhone, baseUrl);

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toPhone = resolvedPhone.replace(/\D/g, '');
  const normalizedToPhone = toPhone.startsWith('91') && toPhone.length === 12 ? toPhone : `91${toPhone.slice(-10)}`;

  // Safe Check: If WhatsApp Cloud API is configured in environment
  if (token && phoneNumberId && toPhone) {
    try {
      const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedToPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      if (res.ok) {
        console.log(`[WhatsApp Notification] Message delivered successfully to owner for booking ${booking.id}`);
        return {
          success: true,
          delivered: true,
          channel: 'whatsapp_api',
          messageText,
          whatsappLink,
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[WhatsApp Notification] Delivery notice:', errJson);
        return {
          success: false,
          delivered: false,
          channel: 'whatsapp_api',
          reason: errJson?.error?.message || 'WhatsApp Cloud API returned non-200 status',
          messageText,
          whatsappLink,
        };
      }
    } catch (apiErr: any) {
      console.warn('[WhatsApp Notification] Connection notice:', apiErr?.message);
      return {
        success: false,
        delivered: false,
        channel: 'whatsapp_api',
        reason: apiErr?.message,
        messageText,
        whatsappLink,
      };
    }
  }

  // Safe Bypass: Do NOT pretend a message was sent when credentials are absent
  console.log(
    `[WhatsApp Notification] WhatsApp Cloud API credentials not configured in environment. ` +
    `Pending verification recorded for booking ${booking.id}. Owner can review in Admin Panel or via WhatsApp link.`
  );

  return {
    success: true,
    delivered: false,
    channel: 'none',
    reason: 'WhatsApp API credentials not configured in environment. Ready for connection.',
    messageText,
    whatsappLink,
  };
}
