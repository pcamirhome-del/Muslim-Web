import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOSTS = [
  'archive.org',
  'mp3quran.net',
  'everyayah.com',
  'server17.mp3quran.net',
  'cdn.mp3quran.net',
];

function isAllowedUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url') || '';
  if (!isAllowedUrl(target)) {
    return NextResponse.json({ error: 'Invalid media source' }, { status: 400 });
  }

  try {
    const rangeHeader = req.headers.get('range');
    const upstreamHeaders: HeadersInit = {};
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstream = await fetch(target, {
      redirect: 'follow',
      cache: 'no-store',
      headers: upstreamHeaders,
    });
    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }

    const headers = new Headers();
    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    headers.set('Content-Type', contentType);
    headers.set('Accept-Ranges', acceptRanges);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentRange) headers.set('Content-Range', contentRange);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json({ error: 'Download proxy error' }, { status: 500 });
  }
}
