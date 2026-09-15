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

const DEFAULT_OWNER_WHATSAPP = '919829084421'; // KSA Director Contact: 9829084421

/**
 * Build the exact verification notification message required by KSA
 */
export function buildOwnerVerificationMessage(booking: BookingNotificationDetails): string {
  const sportLabel = booking.sport ? booking.sport.toUpperCase() : 'SPORTS';
  const resourceLabel = booking.resourceName ? ` (${booking.resourceName})` : '';

  return (
    `🔔 *New Payment Verification Required*\n\n` +
    `A new customer has submitted a booking after the UPI payment flow.\n\n` +
    `*Customer:* ${booking.userName} (${booking.userPhone})\n` +
    `*Amount:* ₹${booking.amountPaid}\n` +
    `*Booking ID:* ${booking.id}\n` +
    `*Sport:* ${sportLabel}${resourceLabel}\n` +
    `*Date:* ${booking.date}\n` +
    `*Booking Time:* ${booking.timeRange || 'Selected slot'}\n` +
    (booking.transactionId ? `*Transaction / UTR:* ${booking.transactionId}\n` : '') +
    `\n*Action Required:*\n` +
    `"Please check your bank/UPI account to confirm whether this payment has actually been received."\n` +
    `"If the payment has been received, open the Admin Panel → Payment Verification and approve the booking."\n` +
    `"Do not approve the booking unless the payment is actually visible in your bank/UPI transaction history."`
  );
}

/**
 * Generate a direct WhatsApp click-to-chat URL for the owner
 */
export function generateOwnerWhatsAppLink(
  bookingOrText: BookingNotificationDetails | string,
  customPhone?: string
): string {
  const messageText =
    typeof bookingOrText === 'string'
      ? bookingOrText
      : buildOwnerVerificationMessage(bookingOrText);
  const phone = (customPhone || process.env.WHATSAPP_OWNER_NUMBER || DEFAULT_OWNER_WHATSAPP)
    .replace(/\D/g, '');
  const normalizedPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone.slice(-10)}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageText)}`;
}

/**
 * Send notification to the owner immediately upon verification submission
 */
export async function notifyOwnerOfPendingVerification(
  booking: BookingNotificationDetails
): Promise<NotificationResult> {
  const messageText = buildOwnerVerificationMessage(booking);
  const whatsappLink = generateOwnerWhatsAppLink(messageText);

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const toPhone = (process.env.WHATSAPP_OWNER_NUMBER || DEFAULT_OWNER_WHATSAPP).replace(/\D/g, '');
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
