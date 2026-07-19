import { NextRequest } from "next/server";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// MetaMask WebView blocks cross-origin requests to known analytics domains.
// This proxy routes all PostHog traffic through our own domain.

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}

async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const posthogPath = url.pathname.replace(/^\/api\/posthog/, "");

  try {
    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);

    const res = await fetch(
      `${POSTHOG_HOST}${posthogPath}${url.search}`,
      {
        method: req.method,
        headers,
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? await req.text()
            : undefined,
      },
    );

    const responseHeaders = new Headers();
    const resContentType = res.headers.get("content-type");
    if (resContentType) responseHeaders.set("Content-Type", resContentType);

    return new Response(await res.text(), {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Proxy Error", { status: 502 });
  }
}
