import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, requireController, type AuthenticatedRequest } from '../middleware/auth';

export const navaRouter = Router();

// GET /api/v1/nava - Get all madahi audio tracks
navaRouter.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM nava_madahi ORDER BY display_order ASC, created_at DESC'
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      maddah: row.maddah || 'مداح اهل بیت',
      category: row.category || 'مداحی و مراثی',
      audioUrl: row.audio_url || '',
      coverUrl: row.cover_url || '',
      duration: row.duration || '۰۴:۰۰',
      description: row.description || '',
      isPublished: Boolean(row.is_published),
      order: Number(row.display_order) || 0,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در دریافت لیست نواها و مداحی‌ها',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/v1/nava - Upload/add new madahi audio track (Controller only)
navaRouter.post('/', authenticateToken, requireController, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, maddah, category, audioUrl, coverUrl, duration, description, isPublished, order } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        message: 'عنوان قطعه صوتی الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!audioUrl || !audioUrl.trim()) {
      res.status(400).json({
        success: false,
        message: 'فایل صوتی یا آدرس صوت الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const id = req.body.id || `nava-${Date.now()}`;
    const createdAt = req.body.createdAt || new Date().toISOString();
    const db = getDatabase();

    await db.execute({
      sql: `INSERT INTO nava_madahi (
        id, title, maddah, category, audio_url, cover_url, duration, description, is_published, display_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title.trim(),
        maddah?.trim() || 'مداح اهل بیت',
        category?.trim() || 'مداحی و مراثی',
        audioUrl.trim(),
        coverUrl?.trim() || '',
        duration?.trim() || '۰۴:۰۰',
        description?.trim() || '',
        isPublished !== false ? 1 : 0,
        order ?? 0,
        createdAt,
      ],
    });

    res.json({
      success: true,
      message: 'قطعه صوتی با موفقیت در بخش نوا افزوده شد.',
      data: {
        id,
        title,
        maddah,
        category,
        audioUrl,
        coverUrl,
        duration,
        description,
        isPublished: isPublished !== false,
        order: order ?? 0,
        createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ثبت قطعه صوتی نوا',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/v1/nava/:id - Update madahi audio track (Controller only)
navaRouter.put('/:id', authenticateToken, requireController, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, maddah, category, audioUrl, coverUrl, duration, description, isPublished, order } = req.body;

    const db = getDatabase();
    await db.execute({
      sql: `UPDATE nava_madahi SET
        title = ?, maddah = ?, category = ?, audio_url = ?, cover_url = ?, duration = ?, description = ?, is_published = ?, display_order = ?
      WHERE id = ?`,
      args: [
        title?.trim() || 'بدون عنوان',
        maddah?.trim() || 'مداح اهل بیت',
        category?.trim() || 'مداحی و مراثی',
        audioUrl?.trim() || '',
        coverUrl?.trim() || '',
        duration?.trim() || '۰۴:۰۰',
        description?.trim() || '',
        isPublished !== false ? 1 : 0,
        order ?? 0,
        id,
      ],
    });

    res.json({
      success: true,
      message: 'مشخصات قطعه صوتی به‌روزرسانی شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ویرایش قطعه صوتی',
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/v1/nava/:id - Delete madahi audio track (Controller only)
navaRouter.delete('/:id', authenticateToken, requireController, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    await db.execute({
      sql: 'DELETE FROM nava_madahi WHERE id = ?',
      args: [id],
    });

    res.json({
      success: true,
      message: 'قطعه صوتی مورد نظر با موفقیت حذف گردید.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در حذف قطعه صوتی',
      timestamp: new Date().toISOString(),
    });
  }
});
