import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public rewards / discovery site. Allow crawling of the landing and discovery
// surfaces; keep private/transactional and logged-in merchant paths out of the
// index. Individual private routes ( /merchants ) also set noindex in their own
// layout as defence-in-depth.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/merchants", "/pay", "/qr", "/refer"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
