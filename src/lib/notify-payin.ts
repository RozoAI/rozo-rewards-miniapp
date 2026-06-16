// notify-payin: report the on-chain txHash to the Rozo backend so a Stellar
// CONTRACT payment settles via the instant fast-path instead of waiting for the
// every-minute cron (17-42s).
//
// Trigger contract (backend, rozo-intents-api, already shipped — commit 133b51b):
//   POST /payments/{id}/payin  body { txHash, fromAddress? }  — NO auth header.
// The backend point-looks-up the tx's payment_event over Soroban RPC, runs the
// full validation chain (contractId allowlist + topic + official USDC + 1:1 memo
// + amount gate + CAS), and settles in seconds. On-chain amount <= $20 settles
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
// look up a tx that doesn't match this order → it rejects, no side effect.

const PAYMENT_API_BASE =
  process.env.NEXT_PUBLIC_ROZO_PAYMENT_API ??
  "https://aozudqtlykbhzbuzalzz.supabase.co/functions/v1/payment-api";

/**
 * Tell the backend to settle a contract payin immediately.
 *
 * Returns nothing and never throws — call it WITHOUT await right before navigating
 * away. `keepalive: true` lets the request outlive the page transition (router.push).
 *
 * @param paymentId Rozo payment UUID (PaymentResponse.id). No-op if falsy.
 * @param txHash    Stellar contract pay() tx hash (64 hex, no 0x). No-op if falsy.
 * @param fromAddress Optional payer address; backend works without it.
 */
export function notifyPayin(
  paymentId: string | undefined,
  txHash: string | undefined,
  fromAddress?: string,
): void {
  if (!paymentId || !txHash) return;
  try {
    // No await: kick off the request synchronously so it's queued in the network
    // stack before the caller navigates. keepalive keeps it alive across the nav.
    void fetch(`${PAYMENT_API_BASE}/payments/${paymentId}/payin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, fromAddress }),
      keepalive: true,
    })
      .then((res) => {
        // A 4xx/5xx RESOLVES (fetch only rejects on network/CORS/abort), so an
        // HTTP error would be fully silent without this check. Cron still backs
        // it up, so we only log — never surface to UI.
        if (!res.ok) {
          console.warn(
            `[notifyPayin] fast-path hint got HTTP ${res.status} (cron will back it up)`,
          );
        }
      })
      .catch((err) => {
        // Network/CORS/abort. Cron is the backstop, so a failed hint never costs
        // a payment. Log for observability, never surface to UI.
        console.warn("[notifyPayin] fast-path hint failed (cron will back it up):", err);
      });
  } catch (err) {
    // Defensive: even constructing the request must not break the payment flow.
    console.warn("[notifyPayin] fast-path hint threw (cron will back it up):", err);
  }
}
