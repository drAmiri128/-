import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';

export const usersRouter = Router();

// GET /api/v1/users/profile - Returns current user's profile
usersRouter.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT id, name, nickname, role, email_or_phone, phone, email, age, avatar_url, badge_title, created_at FROM accounts WHERE id = ?',
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

// GET /api/v1/users/:id - Returns user profile by ID
usersRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT id, name, nickname, role, email_or_phone, phone, email, age, avatar_url, badge_title, created_at FROM accounts WHERE id = ?',
      args: [id],
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

