// worker/src/middleware/auth.ts
// Authentication & Authorization middleware

import { createMiddleware } from 'hono/factory';
import type { Env, JWTPayload } from '../../types/env';
import { extractToken, verifyToken } from '../utils/auth';

// ============================================================
//  Auth Middleware
// ============================================================
export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: { user: JWTPayload } }>(
  async (c, next) => {
    const token = extractToken(c.req.header('Authorization'));
    
    if (!token) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Token tidak ditemukan' }
      }, 401);
    }
    
    const payload = await verifyToken(token, c.env);
    
    if (!payload) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Token tidak valid atau kadaluarsa' }
      }, 401);
    }
    
    // Verify user still exists and active
    const user = await c.env.DB.prepare(
      'SELECT user_id, email, nama, role, aktif FROM users WHERE user_id = ? AND aktif = "YA"'
    ).bind(payload.user_id).first();
    
    if (!user) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'User tidak ditemukan atau nonaktif' }
      }, 401);
    }
    
    c.set('user', { ...payload, ...user });
    await next();
  }
);

// ============================================================
//  Role Middleware
// ============================================================
export function requireRole(...allowedRoles: ('admin' | 'user')[]) {
  return createMiddleware<{ Bindings: Env; Variables: { user: any } }>(
    async (c, next) => {
      const user = c.get('user');
      
      if (!user || !allowedRoles.includes(user.role)) {
        return c.json<Env['ApiResponse']>({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Akses ditolak: role tidak mencukupi' }
        }, 403);
      }
      
      await next();
    }
  );
}

export const requireAdmin = requireRole('admin');

// ============================================================
//  Optional Auth (for public endpoints that can benefit from user context)
// ============================================================
export const optionalAuth = createMiddleware<{ Bindings: Env; Variables: { user?: any } }>(
  async (c, next) => {
    const token = extractToken(c.req.header('Authorization'));
    
    if (token) {
      const payload = await verifyToken(token, c.env);
      if (payload) {
        const user = await c.env.DB.prepare(
          'SELECT user_id, email, nama, role, aktif FROM users WHERE user_id = ? AND aktif = "YA"'
        ).bind(payload.user_id).first();
        
        if (user) c.set('user', { ...payload, ...user });
      }
    }
    
    await next();
  }
);