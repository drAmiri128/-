import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database';
import {
  generateToken,
  authenticateToken,
  requireController,
  getJwtSecret,
  type AuthenticatedRequest,
} from '../middleware/auth';
import {
  createSession,
  verifyAndRotateSession,
  revokeSession,
  revokeSessionByToken,
  revokeAllSessionsForAccount,
  getActiveSessionsForAccount,
} from '../db/sessions';

export const authRouter = Router();

function getClientMeta(req: any) {
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const clientIp = rawIp.split(',')[0].trim();
  const userAgent = (req.headers['user-agent'] as string) || '';
  let deviceLabel = 'مرورگر وب';
  if (/android/i.test(userAgent)) deviceLabel = 'گوشی / تبلت اندروید';
  else if (/iphone/i.test(userAgent)) deviceLabel = 'گوشی آیفون (iOS)';
  else if (/ipad/i.test(userAgent)) deviceLabel = 'آیپد (iPadOS)';
  else if (/windows/i.test(userAgent)) deviceLabel = 'رایانه ویندوز';
  else if (/macintosh|mac os/i.test(userAgent)) deviceLabel = 'رایانه مک (macOS)';
  else if (/linux/i.test(userAgent)) deviceLabel = 'رایانه لینوکس';
  return { clientIp, deviceLabel };
}

// In-memory rate limiting with composite key (IP + Target Identifier) and periodic cleanup
interface RateLimitRecord {
  count: number;
  lockUntil: number;
  lastAttempt: number;
}

const failedAttemptsMap = new Map<string, RateLimitRecord>();

// Periodic sweep every 10 minutes to clean expired records and prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of failedAttemptsMap.entries()) {
    if (record.lockUntil <= now && now - record.lastAttempt > 10 * 60 * 1000) {
      failedAttemptsMap.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

function getRateLimitKey(prefix: string, ip: string, identifier?: string): string {
  const cleanId = (identifier || 'default').trim().toLowerCase();
  return `${prefix}:${ip}:${cleanId}`;
}

function checkRateLimit(key: string): { allowed: boolean; remainingSeconds?: number } {
  const record = failedAttemptsMap.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  if (record.lockUntil <= now && record.count >= 5) {
    // Lock expired, reset
    failedAttemptsMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { count: 0, lockUntil: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= 5) {
    record.lockUntil = now + 5 * 60 * 1000; // 5 minutes lockout
  }
  failedAttemptsMap.set(key, record);
}

function clearFailedAttempts(key: string): void {
  failedAttemptsMap.delete(key);
}

// 1. Controller Login via Password or PIN (e.g. 'Mohammad128')
authRouter.post('/controller-login', async (req, res): Promise<void> => {
  try {
    const { clientIp, deviceLabel } = getClientMeta(req);
    const rateLimitKey = getRateLimitKey('ctrl', clientIp, 'controller');
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        message: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً پس از ${rateLimit.remainingSeconds} ثانیه مجدداً تلاش کنید.`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const passwordInput = req.body.password || req.body.pinCode || req.body.pin || req.body.controllerPassword;
    if (!passwordInput || typeof passwordInput !== 'string') {
      res.status(400).json({
        success: false,
        message: 'کلمه عبور یا کد دسترسی (PIN) الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM accounts WHERE role = ? LIMIT 1',
      args: ['controller'],
    });

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'حساب کاربری کنترل‌گر در سیستم یافت نشد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const controllerRow = result.rows[0];
    const passwordHash = controllerRow.password_hash as string;

    const isMatch = await bcrypt.compare(passwordInput.trim(), passwordHash);
    if (!isMatch) {
      recordFailedAttempt(rateLimitKey);
      res.status(401).json({
        success: false,
        message: 'رمز عبور یا کد دسترسی کنترل‌گر نادرست است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Clear failed attempts on success
    clearFailedAttempts(rateLimitKey);

    const session = await createSession(controllerRow.id as string, {
      deviceLabel,
      ipAddress: clientIp,
    });

    const token = generateToken({
      id: controllerRow.id as string,
      name: controllerRow.name as string,
      role: 'controller',
      sid: session.sessionId,
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken: session.refreshToken,
        account: {
          id: controllerRow.id,
          name: controllerRow.name,
          nickname: controllerRow.nickname,
          role: controllerRow.role,
          emailOrPhone: controllerRow.email_or_phone,
          badgeTitle: controllerRow.badge_title,
          hasPassword: true,
          createdAt: controllerRow.created_at,
        },
      },
      message: 'ورود کنترل‌گر با موفقیت انجام شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در احراز هویت کنترل‌گر',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. User Onboarding / Registration
authRouter.post('/user-onboard', async (req, res): Promise<void> => {
  try {
    const { fullName, phoneNumber, email, age, password } = req.body;
    const { clientIp, deviceLabel } = getClientMeta(req);

    if (!fullName || !fullName.trim()) {
      res.status(400).json({
        success: false,
        message: 'نام و نام خانوادگی الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const cleanPhone = phoneNumber ? String(phoneNumber).trim().replace(/\s+|-/g, '') : '';
    const db = getDatabase();

    // Check if an account already exists with this phone number
    if (cleanPhone) {
      const existing = await db.execute({
        sql: 'SELECT id, name, phone, password_hash FROM accounts WHERE phone = ? OR email_or_phone = ?',
        args: [cleanPhone, cleanPhone],
      });

      if (existing.rows.length > 0) {
        res.status(409).json({
          success: false,
          code: 'DUPLICATE_PHONE',
          message: 'این شماره قبلاً در سامانه ثبت شده است. لطفاً وارد حساب کاربری خود شوید.',
          data: {
            hasPassword: Boolean(existing.rows[0].password_hash),
            accountId: existing.rows[0].id,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    const userId = `usr-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const cleanPassword = password && typeof password === 'string' ? password.trim() : null;
    const passwordHash = cleanPassword ? await bcrypt.hash(cleanPassword, 10) : null;

    await db.execute({
      sql: `INSERT INTO accounts (
        id, name, role, email_or_phone, phone, email, age, badge_title, password_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        fullName.trim(),
        'user',
        cleanPhone || email || '',
        cleanPhone || null,
        email || null,
        age ? String(age) : null,
        'زائر گرامی',
        passwordHash,
        createdAt,
      ],
    });

    const session = await createSession(userId, {
      deviceLabel,
      ipAddress: clientIp,
    });

    const token = generateToken({
      id: userId,
      name: fullName.trim(),
      role: 'user',
      sid: session.sessionId,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken: session.refreshToken,
        account: {
          id: userId,
          name: fullName.trim(),
          role: 'user',
          emailOrPhone: cleanPhone || email || '',
          phone: cleanPhone,
          email,
          age,
          badgeTitle: 'زائر گرامی',
          hasPassword: Boolean(passwordHash),
          createdAt,
        },
      },
      message: 'ثبت‌نام کاربر با موفقیت انجام شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ثبت‌نام کاربر',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2.1 User Login with Phone & Password (for existing accounts) with rate limiting
authRouter.post('/user-login', async (req, res): Promise<void> => {
  try {
    const { clientIp, deviceLabel } = getClientMeta(req);
    const { phoneNumber, password } = req.body;
    const cleanPhone = phoneNumber ? String(phoneNumber).trim().replace(/\s+|-/g, '') : '';
    const rateLimitKey = getRateLimitKey('user', clientIp, cleanPhone || 'anonymous');
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        message: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً پس از ${rateLimit.remainingSeconds} ثانیه مجدداً تلاش کنید.`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!cleanPhone) {
      res.status(400).json({
        success: false,
        message: 'شماره تماس الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const cleanPass = password ? String(password).trim() : '';
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM accounts WHERE phone = ? OR email_or_phone = ?',
      args: [cleanPhone, cleanPhone],
    });

    if (result.rows.length === 0) {
      recordFailedAttempt(rateLimitKey);
      res.status(404).json({
        success: false,
        message: 'شماره تماس وارد شده در سامانه ثبت نشده است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const user = result.rows[0];

    // If account has a password, verify strictly with bcrypt
    if (user.password_hash) {
      const isMatch = cleanPass ? await bcrypt.compare(cleanPass, user.password_hash as string) : false;
      if (!isMatch) {
        recordFailedAttempt(rateLimitKey);
        res.status(401).json({
          success: false,
          message: 'اخطار: شماره تماس یا رمز عبور وارد شده نادرست است.',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(rateLimitKey);

    const userRole: 'user' | 'controller' = user.role === 'controller' ? 'controller' : 'user';

    const session = await createSession(user.id as string, {
      deviceLabel,
      ipAddress: clientIp,
    });

    const token = generateToken({
      id: user.id as string,
      name: user.name as string,
      role: userRole,
      sid: session.sessionId,
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken: session.refreshToken,
        account: {
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          role: user.role,
          emailOrPhone: user.email_or_phone,
          phone: user.phone,
          email: user.email,
          age: user.age,
          badgeTitle: user.badge_title,
          avatarUrl: user.avatar_url,
          hasPassword: Boolean(user.password_hash),
          createdAt: user.created_at,
        },
      },
      message: 'ورود با موفقیت انجام شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ورود کاربر',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2.2 Refresh Token
authRouter.post('/refresh', async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        message: 'توکن نوسازی (refreshToken) الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { clientIp, deviceLabel } = getClientMeta(req);
    const rotated = await verifyAndRotateSession(refreshToken, {
      deviceLabel,
      ipAddress: clientIp,
    });

    if (!rotated) {
      res.status(401).json({
        success: false,
        message: 'نشست نامعتبر یا منقضی شده است. لطفاً دوباره وارد حساب کاربری شوید.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const newAccessToken = generateToken({
      id: rotated.account.id,
      name: rotated.account.name,
      role: (rotated.account.role === 'controller' ? 'controller' : 'user'),
      sid: rotated.session.id,
    });

    res.json({
      success: true,
      data: {
        token: newAccessToken,
        refreshToken: rotated.newRefreshToken,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در نوسازی نشست',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2.3 Safe Logout - Terminates active session
authRouter.post('/logout', async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeSessionByToken(refreshToken);
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        if (decoded?.sid) {
          await revokeSession(decoded.sid);
        }
      } catch {
        // Safe to ignore token verification errors on logout
      }
    }

    res.json({
      success: true,
      message: 'خروج از حساب کاربری با موفقیت انجام شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در خروج از حساب',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2.4 User Active Sessions List
authRouter.get('/sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessions = await getActiveSessionsForAccount(req.user!.id);
    const data = sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: s.id === req.user?.sid,
    }));

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در دریافت فهرست دستگاه‌ها',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2.5 Terminate a specific session
authRouter.delete('/sessions/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await revokeSession(id, req.user!.id);
    res.json({
      success: true,
      message: 'نشست مورد نظر با موفقیت خاتمه یافت.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در خاتمه نشست',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2.6 User Change Password
authRouter.put('/user-password', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({
        success: false,
        message: 'رمز عبور باید حداقل ۴ کاراکتر باشد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const cleanPass = newPassword.trim();
    const hash = await bcrypt.hash(cleanPass, 10);
    const db = getDatabase();

    await db.execute({
      sql: 'UPDATE accounts SET password_hash = ? WHERE id = ?',
      args: [hash, req.user!.id],
    });

    // Revoke all other sessions on password change
    await revokeAllSessionsForAccount(req.user!.id, req.user?.sid);

    res.json({
      success: true,
      message: 'رمز عبور با موفقیت به‌روزرسانی شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در تغییر رمز عبور',
      timestamp: new Date().toISOString(),
    });
  }
});

// 3. Get Current User Profile
authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT id, name, nickname, role, email_or_phone, phone, email, age, avatar_url, badge_title, password_hash, created_at FROM accounts WHERE id = ?',
      args: [req.user!.id],
    });

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        nickname: row.nickname,
        role: row.role,
        emailOrPhone: row.email_or_phone,
        phone: row.phone,
        email: row.email,
        age: row.age,
        avatarUrl: row.avatar_url,
        badgeTitle: row.badge_title,
        hasPassword: Boolean(row.password_hash),
        createdAt: row.created_at,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 4. Get all accounts (Admin/Controller only)
authRouter.get('/accounts', authenticateToken, requireController, async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT id, name, nickname, role, email_or_phone, phone, email, age, avatar_url, badge_title, password_hash, created_at FROM accounts ORDER BY created_at DESC'
    );
    const accounts = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      nickname: row.nickname,
      role: row.role,
      emailOrPhone: row.email_or_phone,
      phone: row.phone,
      email: row.email,
      age: row.age,
      avatarUrl: row.avatar_url,
      badgeTitle: row.badge_title,
      hasPassword: Boolean(row.password_hash),
      createdAt: row.created_at,
    }));
    res.json({
      success: true,
      data: accounts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 5. Delete an account (Admin/Controller or account management)
authRouter.delete('/accounts/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    await revokeAllSessionsForAccount(id);
    await db.execute({
      sql: 'DELETE FROM accounts WHERE id = ?',
      args: [id],
    });
    res.json({
      success: true,
      message: 'حساب کاربری با موفقیت حذف شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
