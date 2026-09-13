import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    return 'sqm-app-secret-jwt-key-2025-production-fallback';
  }
  return secret.trim();
}

export interface AuthUserPayload {
  id: string;
  name: string;
  role: 'user' | 'controller';
  sid?: string; // Session ID in SQLite sessions table
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function generateToken(payload: AuthUserPayload, expiresIn: string = '15m'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function generateAccessToken(payload: AuthUserPayload): string {
  return generateToken(payload, '15m');
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'توکن احراز هویت الزامی است.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'توکن نامعتبر یا منقضی شده است.',
      timestamp: new Date().toISOString(),
    });
    return;
  }
}

export function requireController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'controller') {
    res.status(403).json({
      success: false,
      message: 'دسترسی غیرمجاز: این عملیات نیازمند سطح دسترسی کنترل‌گر است.',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
