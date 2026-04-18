/**
 * Canonical API response helpers.
 *
 * All routes return { success, data, error } as defined in src/types/index.ts.
 * Use these helpers to avoid shape drift across route handlers.
 */

import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

/** Successful response with data. */
export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, error: null }, { status })
}

/** Error response. Generic T lets callers with typed return annotations avoid type errors. */
export function fail<T = never>(error: string, status = 400): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: false, data: null, error }, { status }) as NextResponse<ApiResponse<T>>
}

/** Rate limit exceeded — includes standard RL headers. */
export function rateLimited<T = never>(retryAfterSeconds: number, resetAt: number, limit: number): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: false, data: null, error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  ) as NextResponse<ApiResponse<T>>
}
