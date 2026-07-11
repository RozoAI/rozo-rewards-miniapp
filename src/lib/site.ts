// Canonical site URL used for metadataBase and absolute OG image URLs.
//
// NEXT_PUBLIC_URL is set to "https://rewards.rozo.ai/" (with a trailing slash)
// in the environment, which produced double-slash OG URLs like ".../\/api/og".
// Trim it here once so every consumer gets a clean base.
//
// rewards.rozo.ai is the primary host; ns.rozo.ai / dev.rozo.ai are aliases.
// metadataBase resolves relative canonical/OG URLs against this single origin —
// acceptable since the OG image content is identical across hosts.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_URL || "https://rewards.rozo.ai"
).replace(/\/+$/, "");

export const SITE_URL_OBJECT = new URL(SITE_URL);
