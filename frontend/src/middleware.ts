import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting in-memory store
const apiRateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkApiRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute
  const maxRequests = 60;
  
  const record = apiRateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    apiRateLimitStore.set(ip, { count: 1, resetTime: now + limitWindow });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Let same-origin/non-browser requests pass
  
  const allowedOrigins = [
    "https://sendly.uz",
    "https://www.sendly.uz"
  ];
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  // Allow localhost for local development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes
  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    
    // 2. CORS Protection - Origin check
    if (origin && !isOriginAllowed(origin)) {
      return new NextResponse(JSON.stringify({ error: "CORS Not Allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Handle OPTIONS Preflight
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      if (origin && isOriginAllowed(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }
      return response;
    }

    // 1. API Rate Limiting - IP based (Max 60 requests per minute)
    const rawIp = request.ip || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || "127.0.0.1";
    const ip = rawIp.split(",")[0].trim();
    if (!checkApiRateLimit(ip)) {
      return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. CSRF Protection for API POST requests
    if (request.method === "POST") {
      const xRequestedWith = request.headers.get("x-requested-with");
      const referer = request.headers.get("referer");
      let isCsrfSafe = false;

      if (xRequestedWith) {
        isCsrfSafe = true;
      } else {
        if (origin && isOriginAllowed(origin)) {
          isCsrfSafe = true;
        } else if (referer) {
          try {
            const refererUrl = new URL(referer);
            if (isOriginAllowed(refererUrl.origin)) {
              isCsrfSafe = true;
            }
          } catch {
            // Invalid referer URL
          }
        }
      }

      if (!isCsrfSafe) {
        return new NextResponse(JSON.stringify({ error: "CSRF Validation Failed" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Add CORS headers to successful API response
    const response = NextResponse.next();
    if (origin && isOriginAllowed(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
  }

  // Non-API Routes (Page requests)
  const response = NextResponse.next();

  // Add standard security headers (Issue 392 - Security Audit Compliance)
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  
  // Content Security Policy (CSP) - allows self, fonts, scripts, and google/facebook OAuth integration
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-src 'self' https://*.facebook.com https://*.google.com https://accounts.google.com; object-src 'none';"
  );

  return response;
}

export const config = {
  matcher: [
    // Apply security headers, CORS, CSRF, and Rate Limiting to all pages and API routes
    // excluding Next.js internals, static files, and media
    "/((?!_next/static|_next/image|assets|favicon.ico|icon.svg|logo.svg).*)",
  ],
};
