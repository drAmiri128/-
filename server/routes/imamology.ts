import { Router } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, requireController } from '../middleware/auth';

export const imamologyRouter = Router();

// Get all 14 Infallibles data
imamologyRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM infallibles ORDER BY display_order ASC');
    const infallibles = result.rows.map((row) => ({
      id: row.id,
      order: row.display_order,
      name: row.name,
      title: row.title,
      epithet: row.epithet,
      kunya: row.kunya,
      fatherName: row.father_name,
      motherName: row.mother_name,
      birthDate: row.birth_date,
      birthPlace: row.birth_place,
      martyrdomDate: row.martyrdom_date,
      martyrdomPlace: row.martyrdom_place,
      imamatPeriod: row.imamat_period ?? undefined,
      biography: row.biography,
      virtues: row.virtues,
      hadith: row.hadith_json ? JSON.parse(row.hadith_json as string) : { arabic: '', persian: '' },
      specialZiyarahSnippet: row.special_ziyarah ?? undefined,
    }));

    res.json({ success: true, data: infallibles, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});

// Update specific infallible (Controller only)
imamologyRouter.put('/:id', authenticateToken, requireController, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const person = req.body;
    const db = getDatabase();

    await db.execute({
      sql: `UPDATE infallibles SET
        name = ?, title = ?, epithet = ?, kunya = ?,
        father_name = ?, mother_name = ?, birth_date = ?, birth_place = ?,
        martyrdom_date = ?, martyrdom_place = ?, imamat_period = ?,
        biography = ?, virtues = ?, hadith_json = ?, special_ziyarah = ?
      WHERE id = ?`,
      args: [
        person.name,
        person.title,
        person.epithet,
        person.kunya,
        person.fatherName ?? null,
        person.motherName ?? null,
        person.birthDate ?? null,
        person.birthPlace ?? null,
        person.martyrdomDate ?? null,
        person.martyrdomPlace ?? null,
        person.imamatPeriod ?? null,
        person.biography,
        person.virtues ?? null,
        person.hadith ? JSON.stringify(person.hadith) : JSON.stringify({ arabic: '', persian: '' }),
        person.specialZiyarahSnippet ?? null,
        id,
      ],
    });

    res.json({ success: true, message: `اطلاعات «${person.name || id}» با موفقیت ذخیره شد.`, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
  }
});
