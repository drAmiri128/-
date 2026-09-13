import { Router } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, requireController } from '../middleware/auth';

export const prayersRouter = Router();

// Get published prayers
prayersRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM prayers WHERE is_published = 1 ORDER BY display_order ASC');
    const prayers = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      arabicText: row.arabic_text,
      persianTranslation: row.persian_translation ?? undefined,
      audioUrl: row.audio_url ?? undefined,
      reciter: row.reciter ?? undefined,
      duration: row.duration ?? undefined,
      category: row.category ?? undefined,
      order: row.display_order,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: prayers, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});

// Update prayers (Controller only)
prayersRouter.put('/admin/bulk', authenticateToken, requireController, async (req, res): Promise<void> => {
  try {
    const { prayers } = req.body;
    if (!Array.isArray(prayers)) {
      res.status(400).json({ success: false, message: 'لیست ادعیه باید آرایه باشد.', timestamp: new Date().toISOString() });
      return;
    }

    const db = getDatabase();
    await db.execute('DELETE FROM prayers');

    for (const p of prayers) {
      await db.execute({
        sql: `INSERT INTO prayers (
          id, title, subtitle, arabic_text, persian_translation, audio_url,
          reciter, duration, category, display_order, is_published, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id || `pr-${Date.now()}-${Math.random()}`,
          p.title,
          p.subtitle ?? null,
          p.arabicText,
          p.persianTranslation ?? null,
          p.audioUrl ?? null,
          p.reciter ?? null,
          p.duration ?? null,
          p.category ?? null,
          p.order ?? 0,
          p.isPublished !== false ? 1 : 0,
          p.createdAt || new Date().toISOString(),
        ],
      });
    }

    res.json({ success: true, message: 'فهرست ادعیه و زیارات با موفقیت ذخیره شد.', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});
