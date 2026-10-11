// worker/src/utils/auth.ts
// JWT & Password utilities using jose and bcryptjs

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';
import type { Env, JWTPayload as AppJWTPayload } from '../types/env';

// ============================================================
//  Password Hashing (bcrypt)
// ============================================================
export async function hashPassword(password: string): Promise<string> {
  // cost factor 12 = ~250ms on modern CPU
  return bcryptHash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptCompare(password, hash);
}

// ============================================================
//  JWT (using jose - Edge compatible)
// ============================================================
function getSecretKey(env: Env): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signToken(payload: AppJWTPayload, env: Env): Promise<string> {
  const secret = getSecretKey(env);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyToken(token: string, env: Env): Promise<AppJWTPayload | null> {
  try {
    const secret = getSecretKey(env);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AppJWTPayload;
  } catch {
    return null;
  }
}

// ============================================================
//  Token helpers
// ============================================================
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function createAuthHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// ============================================================
//  Role check
// ============================================================
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isAdmin(role: string): boolean {
  return role === 'admin';
}