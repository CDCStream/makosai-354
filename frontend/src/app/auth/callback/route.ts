import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // Redirect to client-side handler with all query params preserved
  const handleUrl = new URL('/auth/callback/handle', requestUrl.origin);

  // Copy all search params to the new URL
  requestUrl.searchParams.forEach((value, key) => {
    handleUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(handleUrl);
}


