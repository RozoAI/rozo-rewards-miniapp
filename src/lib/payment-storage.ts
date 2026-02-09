/**
 * Payment Storage Utility
 *
 * Manages payment receipts in localStorage using a single array-based storage.
 * All payments are stored under the key "payment_receipts" as an array.
 */

const STORAGE_KEY = "payment_receipts";

export interface PaymentData {
  from_address: string;
  to_handle: string;
  amount_usd_cents: number;
  amount_local: number;
  currency_local: string;
  timestamp: number;
  order_id: string;
  about: string;
  is_using_points: boolean;
  service_name?: string;
  service_domain?: string;
  restaurant_name?: string;
  restaurant_address?: string;
}

/**
 * Retrieves all payment receipts from localStorage
 */
function getAllPayments(): PaymentData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log("[PaymentStorage] getAllPayments - Raw data:", stored);

    if (!stored) {
      console.log("[PaymentStorage] getAllPayments - No data found, returning empty array");
      return [];
    }

    const parsed = JSON.parse(stored);
    console.log("[PaymentStorage] getAllPayments - Parsed data:", parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[PaymentStorage] getAllPayments - Error:", error);
    return [];
  }
}

/**
 * Saves all payment receipts to localStorage
 */
function saveAllPayments(payments: PaymentData[]): void {
  try {
    const serialized = JSON.stringify(payments);
    console.log("[PaymentStorage] saveAllPayments - Saving", payments.length, "payments");
    console.log("[PaymentStorage] saveAllPayments - Data:", payments);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log("[PaymentStorage] saveAllPayments - Successfully saved to localStorage");
  } catch (error) {
    console.error("[PaymentStorage] saveAllPayments - Error:", error);
  }
}

/**
 * Saves a payment receipt to localStorage
 * @param paymentId - Unique identifier for the payment (e.g., "NS-CAFE-1234567890")
 * @param data - Payment receipt data
 */
export function savePaymentReceipt(paymentId: string, data: PaymentData): void {
  console.log("[PaymentStorage] savePaymentReceipt - START");
  console.log("[PaymentStorage] savePaymentReceipt - Payment ID:", paymentId);
  console.log("[PaymentStorage] savePaymentReceipt - Original payment data:", data);

  // Always normalize the stored order_id to the paymentId we use in URLs/local lookups.
  // Backend responses may include their own numeric order IDs; for the frontend history
  // and receipt pages we consistently key everything off paymentId (e.g. "ZEN-123...").
  const normalizedData: PaymentData = {
    ...data,
    order_id: paymentId,
  };

  console.log("[PaymentStorage] savePaymentReceipt - Normalized payment data:", normalizedData);

  try {
    const payments = getAllPayments();
    console.log("[PaymentStorage] savePaymentReceipt - Current payments count:", payments.length);

    // Remove existing payment with same order_id if it exists
    const filteredPayments = payments.filter(p => p.order_id !== paymentId);
    if (filteredPayments.length < payments.length) {
      console.log("[PaymentStorage] savePaymentReceipt - Replaced existing payment with order_id:", paymentId);
    }

    // Add new payment
    filteredPayments.push(normalizedData);
    console.log("[PaymentStorage] savePaymentReceipt - New payments count:", filteredPayments.length);

    // Save to localStorage
    saveAllPayments(filteredPayments);
    console.log("[PaymentStorage] savePaymentReceipt - SUCCESS");
  } catch (error) {
    console.error("[PaymentStorage] savePaymentReceipt - FAILED:", error);
  }
}

/**
 * Retrieves a payment receipt by payment ID
 * @param paymentId - Unique identifier for the payment
 * @returns Payment data or null if not found
 */
export function getPaymentReceipt(paymentId: string): PaymentData | null {
  console.log("[PaymentStorage] getPaymentReceipt - START");
  console.log("[PaymentStorage] getPaymentReceipt - Looking for payment ID:", paymentId);

  try {
    const payments = getAllPayments();
    console.log("[PaymentStorage] getPaymentReceipt - Total payments in storage:", payments.length);

    const payment = payments.find(p => p.order_id === paymentId);

    if (payment) {
      console.log("[PaymentStorage] getPaymentReceipt - FOUND:", payment);
    } else {
      console.log("[PaymentStorage] getPaymentReceipt - NOT FOUND");
      console.log("[PaymentStorage] getPaymentReceipt - Available order_ids:", payments.map(p => p.order_id));
    }

    return payment || null;
  } catch (error) {
    console.error("[PaymentStorage] getPaymentReceipt - Error:", error);
    return null;
  }
}

/**
 * Removes a specific payment receipt from localStorage
 * @param paymentId - Unique identifier for the payment to remove
 */
export function clearPaymentReceipt(paymentId: string): void {
  console.log("[PaymentStorage] clearPaymentReceipt - START");
  console.log("[PaymentStorage] clearPaymentReceipt - Payment ID:", paymentId);

  try {
    const payments = getAllPayments();
    const filteredPayments = payments.filter(p => p.order_id !== paymentId);

    if (filteredPayments.length < payments.length) {
      console.log("[PaymentStorage] clearPaymentReceipt - Payment removed");
      saveAllPayments(filteredPayments);
    } else {
      console.log("[PaymentStorage] clearPaymentReceipt - Payment not found, nothing to remove");
    }
  } catch (error) {
    console.error("[PaymentStorage] clearPaymentReceipt - Error:", error);
  }
}

/**
 * Retrieves all payment IDs stored in localStorage
 * @returns Array of payment order_ids
 */
export function getAllPaymentIds(): string[] {
  console.log("[PaymentStorage] getAllPaymentIds - START");

  try {
    const payments = getAllPayments();
    const ids = payments.map(p => p.order_id);
    console.log("[PaymentStorage] getAllPaymentIds - Found", ids.length, "payment IDs:", ids);
    return ids;
  } catch (error) {
    console.error("[PaymentStorage] getAllPaymentIds - Error:", error);
    return [];
  }
}

/**
 * Cleans up old payment receipts older than the specified number of days
 * @param daysToKeep - Number of days to keep receipts (default: 30)
 * @returns Number of receipts removed
 */
export function cleanupOldPayments(daysToKeep: number = 30): number {
  console.log("[PaymentStorage] cleanupOldPayments - START");
  console.log("[PaymentStorage] cleanupOldPayments - Days to keep:", daysToKeep);

  try {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    console.log("[PaymentStorage] cleanupOldPayments - Cutoff timestamp:", cutoffTime);

    const payments = getAllPayments();
    const recentPayments = payments.filter(p => p.timestamp >= cutoffTime);
    const removedCount = payments.length - recentPayments.length;

    if (removedCount > 0) {
      console.log("[PaymentStorage] cleanupOldPayments - Removing", removedCount, "old payments");
      saveAllPayments(recentPayments);
    } else {
      console.log("[PaymentStorage] cleanupOldPayments - No old payments to remove");
    }

    return removedCount;
  } catch (error) {
    console.error("[PaymentStorage] cleanupOldPayments - Error:", error);
    return 0;
  }
}
