import { NextRequest } from 'next/server'

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

export async function GET(req: NextRequest) {
  return proxy(req)
}

export async function POST(req: NextRequest) {
  return proxy(req)
}

async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/posthog/, '')

  const response = await fetch(`${POSTHOG_HOST}${path}${url.search}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : await req.text(),
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
