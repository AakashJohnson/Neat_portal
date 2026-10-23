// Runtime configuration. Server-only values never reach the browser bundle.

/** Express API origin, used server-side only (BFF and session routes). */
export const API_ORIGIN = process.env.NEAT_API_ORIGIN ?? 'http://localhost:4000';

/**
 * Public origin that serves uploaded files (/files/..., /upload/...).
 * Replaces the Angular `imageUrl` constant from app.component.ts.
 */
export const FILES_ORIGIN = process.env.NEXT_PUBLIC_FILES_ORIGIN ?? 'http://localhost:4000';

/** Name of the httpOnly cookie that holds the API JWT. */
export const TOKEN_COOKIE = 'neat_token';

/** JWT lifetime (minutes) — same as the API (JWT_TTL). */
export const TOKEN_TTL_MINUTES = Number(process.env.NEAT_JWT_TTL ?? 60);
