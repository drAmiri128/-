import { Router } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, requireController } from '../middleware/auth';

export const bannersRouter = Router();

// Get banner slides
bannersRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM banner_slides WHERE is_published = 1 ORDER BY display_order ASC');
    const banners = result.rows.map((row) => ({
      id: row.id,
      imageUrl: row.image_url,
      title: row.title ?? undefined,
      subtitle: row.subtitle ?? undefined,
      linkUrl: row.link_url ?? undefined,
      order: row.display_order,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: banners, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});

// Update banner slides (Controller only)
bannersRouter.put('/admin/bulk', authenticateToken, requireController, async (req, res): Promise<void> => {
  try {
    const { banners } = req.body;
    if (!Array.isArray(banners)) {
      res.status(400).json({ success: false, message: 'لیست بنرها باید آرایه باشد.', timestamp: new Date().toISOString() });
      return;
    }

    const db = getDatabase();
    await db.execute('DELETE FROM banner_slides');

    for (const b of banners) {
      await db.execute({
        sql: `INSERT INTO banner_slides (
          id, image_url, title, subtitle, link_url, display_order, is_published, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          b.id || `b-${Date.now()}-${Math.random()}`,
          b.imageUrl,
          b.title ?? null,
          b.subtitle ?? null,
          b.linkUrl ?? null,
          b.order ?? 0,
          b.isPublished !== false ? 1 : 0,
          b.createdAt || new Date().toISOString(),
        ],
      });
    }

    res.json({ success: true, message: 'اسلایدر بنرها با موفقیت ذخیره شد.', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});
