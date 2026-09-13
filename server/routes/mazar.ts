import { Router } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, requireController } from '../middleware/auth';

export const mazarRouter = Router();

// Get all mazar programs
mazarRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM mazar_programs ORDER BY created_at ASC');
    const programs = result.rows.map((row) => ({
      id: row.id,
      day: row.day,
      title: row.title,
      time: row.time ?? undefined,
      description: row.description ?? undefined,
      speakerOrMaddah: row.speaker_or_maddah ?? undefined,
      location: row.location ?? undefined,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: programs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});

// Update or bulk save mazar programs (Controller only)
mazarRouter.put('/admin/bulk', authenticateToken, requireController, async (req, res): Promise<void> => {
  try {
    const { programs } = req.body;
    if (!Array.isArray(programs)) {
      res.status(400).json({ success: false, message: 'لیست برنامه‌ها باید آرایه باشد.', timestamp: new Date().toISOString() });
      return;
    }

    const db = getDatabase();
    await db.execute('DELETE FROM mazar_programs');

    for (const prog of programs) {
      await db.execute({
        sql: `INSERT INTO mazar_programs (
          id, day, title, time, description, speaker_or_maddah, location, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          prog.id || `mp-${Date.now()}-${Math.random()}`,
          prog.day,
          prog.title,
          prog.time ?? null,
          prog.description ?? null,
          prog.speakerOrMaddah ?? null,
          prog.location ?? null,
          prog.createdAt || new Date().toISOString(),
        ],
      });
    }

    res.json({ success: true, message: 'برنامه‌های مزار با موفقیت به‌روزرسانی شدند.', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});
