import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database';
import { revokeAllSessionsForAccount } from '../db/sessions';
import {
  authenticateToken,
  requireController,
  type AuthenticatedRequest,
} from '../middleware/auth';

export const adminRouter = Router();

// Apply authentication and controller authorization to ALL admin routes
adminRouter.use(authenticateToken);
adminRouter.use(requireController);

// ==========================================
// 1. User Accounts Management (/api/v1/admin/accounts)
// ==========================================

// GET /api/v1/admin/accounts - Get all registered user accounts
adminRouter.get('/accounts', async (_req, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT id, name, nickname, role, email_or_phone, phone, email, age, badge_title, avatar_url, password_hash, created_at FROM accounts ORDER BY created_at DESC'
    );

    const accounts = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      nickname: row.nickname ?? '',
      role: row.role,
      emailOrPhone: row.email_or_phone ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      age: row.age ? String(row.age) : '',
      badgeTitle: row.badge_title ?? 'زائر گرامی',
      avatarUrl: row.avatar_url ?? '',
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

// POST /api/v1/admin/accounts - Create a new user or controller account directly
adminRouter.post('/accounts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, age, role, badgeTitle, plainPassword, password } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'نام و نام خانوادگی الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const id = req.body.id || `usr-${Date.now()}`;
    const cleanPass = (plainPassword || password || '').trim();
    const passwordHash = cleanPass ? await bcrypt.hash(cleanPass, 10) : null;
    const createdAt = req.body.createdAt || new Date().toISOString();
    const db = getDatabase();

    await db.execute({
      sql: `INSERT INTO accounts (
        id, name, nickname, role, email_or_phone, phone, email, age, badge_title, password_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name.trim(),
        req.body.nickname || '',
        role || 'user',
        phone?.trim() || email?.trim() || '',
        phone?.trim() || null,
        email?.trim() || null,
        age ? String(age).trim() : null,
        badgeTitle?.trim() || (role === 'controller' ? 'کنترل‌گر مزار' : 'زائر گرامی'),
        passwordHash,
        createdAt,
      ],
    });

    res.json({
      success: true,
      message: 'حساب کاربری جدید با موفقیت ایجاد گردید.',
      data: {
        id,
        name: name.trim(),
        role: role || 'user',
        phone,
        email,
        age,
        badgeTitle,
        hasPassword: Boolean(passwordHash),
        createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ایجاد حساب کاربری',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/v1/admin/accounts/:id - Update user account details or password
adminRouter.put('/accounts/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email, age, role, badgeTitle, plainPassword, password } = req.body;
    const db = getDatabase();

    let passwordHashUpdate = '';
    const args: any[] = [
      name?.trim(),
      phone?.trim() || null,
      email?.trim() || null,
      age ? String(age).trim() : null,
      role || 'user',
      badgeTitle || 'زائر گرامی',
    ];

    const passToUpdate = plainPassword !== undefined ? plainPassword : password;
    if (passToUpdate !== undefined) {
      const cleanPass = passToUpdate ? String(passToUpdate).trim() : null;
      const hash = cleanPass ? await bcrypt.hash(cleanPass, 10) : null;
      args.push(hash);
      passwordHashUpdate = ', password_hash = ?';
      // Revoke active sessions on password reset
      await revokeAllSessionsForAccount(id);
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE accounts SET
        name = ?, phone = ?, email = ?, age = ?, role = ?, badge_title = ?
        ${passwordHashUpdate}
      WHERE id = ?`,
      args,
    });

    res.json({
      success: true,
      message: 'حساب کاربری با موفقیت به‌روزرسانی شد.',
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

// DELETE /api/v1/admin/accounts/:id - Delete a user account
adminRouter.delete('/accounts/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.user?.id) {
      res.status(400).json({
        success: false,
        message: 'امکان حذف حساب کاربری جاری خودتان وجود ندارد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const db = getDatabase();
    await revokeAllSessionsForAccount(id);
    await db.execute({
      sql: 'DELETE FROM accounts WHERE id = ?',
      args: [id],
    });

    res.json({
      success: true,
      message: 'حساب کاربری با موفقیت حذف گردید.',
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

// ==========================================
// 2. Database Config (/api/v1/admin/database-config)
// ==========================================

// GET /api/v1/admin/database-config
adminRouter.get('/database-config', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { getCurrentDatabaseInfo } = await import('../db/database');
    const info = getCurrentDatabaseInfo();
    res.json({
      success: true,
      data: {
        databaseUrl: info.maskedUrl,
        rawUrl: info.url.startsWith('file:') ? info.url : undefined,
        databaseType: info.type,
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

// POST /api/v1/admin/database-config
adminRouter.post('/database-config', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { databaseUrl, authToken } = req.body;
    if (!databaseUrl || typeof databaseUrl !== 'string') {
      res.status(400).json({
        success: false,
        message: 'لطفاً آدرس پایگاه داده (databaseUrl) را وارد نمایید.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { updateAndTestDatabaseUrl, getCurrentDatabaseInfo } = await import('../db/database');
    const result = await updateAndTestDatabaseUrl(databaseUrl, authToken);
    const info = getCurrentDatabaseInfo();

    res.json({
      success: true,
      message: result.message,
      data: {
        databaseUrl: info.maskedUrl,
        databaseType: result.type,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `خطا در برقراری ارتباط با پایگاه داده: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});
