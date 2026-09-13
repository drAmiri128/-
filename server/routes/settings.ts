import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database';
import {
  authenticateToken,
  requireController,
  type AuthenticatedRequest,
} from '../middleware/auth';
import { wsManager } from '../ws/wsServer';

export const settingsRouter = Router();

// 1. Get current public settings
settingsRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM settings WHERE id = ?', ['default']);

    if (result.rows.length === 0) {
      res.json({
        success: true,
        data: {
          systemTitle: 'سامانه تعاملی مزار شهدای گمنام',
          allowRetake: true,
          showCorrectAnswerImmediately: true,
          requireNameBeforeParticipation: true,
          isMatamMode: false,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        systemTitle: row.system_title,
        allowRetake: Boolean(row.allow_retake),
        showCorrectAnswerImmediately: Boolean(row.show_correct_immediately),
        requireNameBeforeParticipation: Boolean(row.require_name),
        isMatamMode: Boolean(row.is_matam_mode),
        updatedAt: row.updated_at,
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

// Handler for updating settings
async function handleUpdateSettings(req: AuthenticatedRequest, res: any): Promise<void> {
  try {
    const {
      systemTitle,
      allowRetake,
      showCorrectAnswerImmediately,
      requireNameBeforeParticipation,
      isMatamMode,
      pinCode,
    } = req.body;

    const db = getDatabase();

    await db.execute({
      sql: `UPDATE settings SET
        system_title = COALESCE(?, system_title),
        allow_retake = COALESCE(?, allow_retake),
        show_correct_immediately = COALESCE(?, show_correct_immediately),
        require_name = COALESCE(?, require_name),
        is_matam_mode = COALESCE(?, is_matam_mode),
        updated_at = ?
      WHERE id = ?`,
      args: [
        systemTitle ?? null,
        allowRetake !== undefined ? (allowRetake ? 1 : 0) : null,
        showCorrectAnswerImmediately !== undefined ? (showCorrectAnswerImmediately ? 1 : 0) : null,
        requireNameBeforeParticipation !== undefined ? (requireNameBeforeParticipation ? 1 : 0) : null,
        isMatamMode !== undefined ? (isMatamMode ? 1 : 0) : null,
        new Date().toISOString(),
        'default',
      ],
    });

    // If new PIN code is supplied, update controller password hash
    if (pinCode && typeof pinCode === 'string' && pinCode.trim()) {
      const newHash = await bcrypt.hash(pinCode.trim(), 10);
      await db.execute({
        sql: 'UPDATE accounts SET password_hash = ? WHERE role = ?',
        args: [newHash, 'controller'],
      });
    }

    // Broadcast WebSocket updates
    if (isMatamMode !== undefined) {
      wsManager.broadcastMatamMode(Boolean(isMatamMode));
    }
    wsManager.broadcastSettingsChanged({
      systemTitle,
      allowRetake: allowRetake !== undefined ? Boolean(allowRetake) : undefined,
      showCorrectAnswerImmediately: showCorrectAnswerImmediately !== undefined ? Boolean(showCorrectAnswerImmediately) : undefined,
      requireNameBeforeParticipation: requireNameBeforeParticipation !== undefined ? Boolean(requireNameBeforeParticipation) : undefined,
      isMatamMode: isMatamMode !== undefined ? Boolean(isMatamMode) : undefined,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'تنظیمات با موفقیت ذخیره شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handler for fast matam mode toggle
async function handleMatamModeToggle(req: any, res: any): Promise<void> {
  try {
    const { isMatamMode } = req.body;
    if (typeof isMatamMode !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'مقدار حالت ماتم (isMatamMode) باید بولی (true/false) باشد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const db = getDatabase();
    await db.execute({
      sql: 'UPDATE settings SET is_matam_mode = ?, updated_at = ? WHERE id = ?',
      args: [isMatamMode ? 1 : 0, new Date().toISOString(), 'default'],
    });

    wsManager.broadcastMatamMode(isMatamMode);

    res.json({
      success: true,
      data: { isMatamMode },
      message: isMatamMode ? 'حالت ماتم و عزاداری فعال شد.' : 'حالت عادی فعال شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// 2. Update settings (Supports both PUT / and PUT /admin/update)
settingsRouter.put('/', authenticateToken, requireController, handleUpdateSettings);
settingsRouter.put('/admin/update', authenticateToken, requireController, handleUpdateSettings);

// 3. Fast Matam Mode toggle (Supports both PATCH /matam-mode and PATCH /admin/matam-mode)
settingsRouter.patch('/matam-mode', authenticateToken, requireController, handleMatamModeToggle);
settingsRouter.patch('/admin/matam-mode', authenticateToken, requireController, handleMatamModeToggle);

// 4. Get database configuration info (Controller only)
settingsRouter.get('/database-config', authenticateToken, requireController, async (_req: AuthenticatedRequest, res): Promise<void> => {
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

// 5. Update & test database URL (Controller only)
settingsRouter.post('/database-config', authenticateToken, requireController, async (req: AuthenticatedRequest, res): Promise<void> => {
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

