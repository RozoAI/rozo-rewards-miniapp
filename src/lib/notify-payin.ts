// notify-payin: report the on-chain txHash to the Rozo intents backend so a
// Stellar CONTRACT payment settles via the instant fast-path instead of waiting
// for the every-minute cron (17-42s).
//
// Uses the SDK's updatePaymentPayInTxHash (POST /payment-api/payments/{id}/payin)
// rather than a hand-rolled fetch. That matters: it shares the SAME apiClient base
// URL that createPayment used (intentapiv4.rozo.ai by default), so the /payin call
// can never drift to a different backend than the one that created the payment —
// otherwise the paymentId wouldn't exist there.
//
// Backend trigger contract (rozo-intents-api, already shipped — commit 133b51b):
// it point-looks-up the tx's payment_event over Soroban RPC, runs the full
// validation chain (contractId allowlist + topic + official USDC + 1:1 memo +
// amount gate + CAS), and settles in seconds. On-chain amount <= $20 settles
// instantly; > $20 defers to cron. If the tx is not yet indexed (we fired before
// confirmation) the backend schedules one 5s recheck, then cron is the backstop.
//
// FIRE-AND-FORGET: this must NEVER block or break the payment UI. The payment is
// already successful once the wallet returns a hash; /payin is only a "hey backend,
// go look at this tx now" hint. Cron is the safety net if this call never lands.
//
// SECURITY: /payin takes no secret by design. txHash is public on-chain data; the
// backend settles purely on its own validation (memo is 1:1 with the order, asset
// must be the official USDC issuer), so a forged/wrong txHash just makes the backend
// look up a tx that doesn't match this order -> it rejects, no side effect.

import { updatePaymentPayInTxHash } from "@rozoai/intent-common";

/**
 * Tell the backend to settle a contract payin immediately.
 *
 * Returns nothing and never throws — call it WITHOUT await right before navigating
 * away. The request is kicked off synchronously so it's in flight before the caller
 * navigates (router.push); an in-flight SPA navigation does not cancel it.
 *
 * @param paymentId Rozo payment UUID (PaymentResponse.id). No-op if falsy.
 * @param txHash    Stellar contract pay() tx hash (64 hex, no 0x). No-op if falsy.
 * @param fromAddress Optional payer address; backend works without it (advisory).
 */
export function notifyPayin(
  paymentId: string | undefined,
  txHash: string | undefined,
  fromAddress?: string,
): void {
  if (!paymentId || !txHash) return;
  try {
    // No await: kick off the request synchronously so it's in flight before the
    // caller navigates. Cron is the backstop, so any failure only gets logged.
    void updatePaymentPayInTxHash({
      paymentId,
      txHash,
      senderAddress: fromAddress,
    })
      .then((res) => {
        // The SDK NEVER rejects: fetchApi catches HTTP 4xx/5xx and network errors
        // internally and resolves { data: null, error, status: null }. So a .catch()
        // alone would silently treat a backend rejection as success — we must inspect
        // res.error / res.data here. Cron backs it up, so we only log, never surface.
        if (res?.error || !res?.data) {
          console.warn(
            "[notifyPayin] fast-path hint not accepted (cron will back it up):",
            res?.error ?? `status=${res?.status ?? "unknown"}`,
          );
        }
      })
      .catch((err) => {
        // Defensive: SDK shouldn't reject, but if a future version does, don't let
        // it become an unhandled rejection.
        console.warn("[notifyPayin] fast-path hint threw (cron will back it up):", err);
      });
  } catch (err) {
    // Defensive: even constructing the request must not break the payment flow.
    console.warn("[notifyPayin] fast-path hint threw (cron will back it up):", err);
  }
}
