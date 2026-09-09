/**
 * Verified services listed on checkout.rozo.ai.
 *
 * Source of truth: https://checkout.rozo.ai/services (rendered from
 * ~/workspace/rozoai/rozo-rescue-landing/site/checkout-services.html).
 * This list is hardcoded on purpose — the rewards app has no API for it.
 * When a service is added / removed / renamed on checkout.rozo.ai, update
 * this file to match. Logos are served from checkout.rozo.ai/assets/img/.
 *
 * No prices are shown here: checkout.rozo.ai quotes them per-order.
 */
export type VerifiedService = {
  /** slug on checkout.rozo.ai — https://checkout.rozo.ai/services/<id> */
  id: string;
  name: string;
  description: string;
  logoUrl: string;
};

export const VERIFIED_SERVICES: VerifiedService[] = [
  {
    id: "venice",
    name: "Venice AI",
    description: "Private, uncensored AI — no logins, no tracking.",
    logoUrl: "https://checkout.rozo.ai/assets/img/venice-logo.png",
  },
  {
    id: "quicknode",
    name: "QuickNode",
    description: "Blockchain infrastructure — RPC nodes and APIs.",
    logoUrl: "https://checkout.rozo.ai/assets/img/quicknode-logo.png",
  },
  {
    id: "porkbun",
    name: "Porkbun",
    description: "Domain registrar — domains, hosting, SSL and email.",
    logoUrl: "https://checkout.rozo.ai/assets/img/porkbun-logo.png",
  },
  {
    id: "koinly",
    name: "Koinly",
    description: "Crypto tax and portfolio tracking, done automatically.",
    logoUrl: "https://checkout.rozo.ai/assets/img/koinly-logo.png",
  },
  {
    id: "compassmining",
    name: "Compass Mining",
    description: "Bitcoin mining hardware — hosting and colocation.",
    logoUrl: "https://checkout.rozo.ai/assets/img/compassmining-logo.png",
  },
  {
    id: "asksurf",
    name: "AskSurf",
    description:
      "AI crypto research — real-time market intelligence and signals.",
    logoUrl: "https://checkout.rozo.ai/assets/img/asksurf-logo.png",
  },
  {
    id: "interserver",
    name: "InterServer",
    description: "US web hosting, VPS and dedicated servers — from $3/mo.",
    logoUrl: "https://checkout.rozo.ai/assets/img/interserver-logo.png",
  },
];

export const CHECKOUT_SERVICE_URL = (id: string) =>
  `https://checkout.rozo.ai/services/${id}`;
