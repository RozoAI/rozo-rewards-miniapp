import { NextRequest } from 'next/server'

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace(
  '//us.i.',
  '//us-assets.i.',
).replace('//eu.i.', '//eu-assets.i.')

// Headers that should NOT be forwarded to PostHog (privacy + correctness)
const STRIP_HEADERS = new Set([
  'cookie',
  'authorization',
  'content-encoding',
  'content-length',
  'host',
  'origin',
  'referer',
])

function buildHeaders(req: NextRequest): Headers {
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  return headers
}

export async function GET(req: NextRequest) {
  return proxy(req)
}

export async function POST(req: NextRequest) {
  return proxy(req)
}

async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/posthog/, '')

  // Route static assets and remote config to the assets host (per PostHog docs)
  const upstream =
    path.startsWith('/static/') || path.startsWith('/array/')
      ? POSTHOG_ASSETS_HOST
      : POSTHOG_HOST

  const response = await fetch(`${upstream}${path}${url.search}`, {
    method: req.method,
    headers: buildHeaders(req),
    body: ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : await req.text(),
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
