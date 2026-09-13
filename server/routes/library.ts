import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, requireController, type AuthenticatedRequest } from '../middleware/auth';

export const libraryRouter = Router();

// GET /api/v1/library - Get all published books (or all if controller)
libraryRouter.get('/', async (req, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM library_books ORDER BY display_order ASC, created_at DESC'
    );

    const books = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author || 'ناشناس',
      description: row.description || '',
      coverUrl: row.cover_url || '',
      textContent: row.content_text || '',
      pdfUrl: row.pdf_url || '',
      pdfFileName: row.pdf_file_name || undefined,
      category: row.category || 'عمومی',
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: books,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در دریافت لیست کتاب‌ها',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/v1/library - Add new book (Controller only)
libraryRouter.post('/', authenticateToken, requireController, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, author, description, coverUrl, textContent, pdfUrl, pdfFileName, category, isPublished } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        message: 'عنوان کتاب الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const id = req.body.id || `book-${Date.now()}`;
    const createdAt = req.body.createdAt || new Date().toISOString();
    const db = getDatabase();

    await db.execute({
      sql: `INSERT INTO library_books (
        id, title, author, description, cover_url, content_text, pdf_url, pdf_file_name, category, is_published, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title.trim(),
        author?.trim() || 'گردآورنده مزار',
        description?.trim() || '',
        coverUrl?.trim() || '',
        textContent?.trim() || '',
        pdfUrl || '',
        pdfFileName || null,
        category?.trim() || 'دفاع مقدس و سیره شهدا',
        isPublished !== false ? 1 : 0,
        createdAt,
      ],
    });

    res.json({
      success: true,
      message: 'کتاب با موفقیت در کتابخانه ثبت شد.',
      data: {
        id,
        title,
        author,
        description,
        coverUrl,
        textContent,
        pdfUrl,
        pdfFileName,
        category,
        isPublished: isPublished !== false,
        createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ثبت کتاب جدید',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/v1/library/:id - Update book (Controller only)
libraryRouter.put('/:id', authenticateToken, requireController, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, author, description, coverUrl, textContent, pdfUrl, pdfFileName, category, isPublished } = req.body;

    const db = getDatabase();
    await db.execute({
      sql: `UPDATE library_books SET
        title = ?, author = ?, description = ?, cover_url = ?, content_text = ?,
        pdf_url = ?, pdf_file_name = ?, category = ?, is_published = ?
      WHERE id = ?`,
      args: [
        title?.trim() || 'بدون عنوان',
        author?.trim() || '',
        description?.trim() || '',
        coverUrl?.trim() || '',
        textContent?.trim() || '',
        pdfUrl || '',
        pdfFileName || null,
        category?.trim() || 'عمومی',
        isPublished !== false ? 1 : 0,
        id,
      ],
    });

    res.json({
      success: true,
      message: 'مشخصات کتاب با موفقیت به‌روزرسانی شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در ویرایش کتاب',
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/v1/library/:id - Delete book (Controller only)
libraryRouter.delete('/:id', authenticateToken, requireController, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    await db.execute({
      sql: 'DELETE FROM library_books WHERE id = ?',
      args: [id],
    });

    res.json({
      success: true,
      message: 'کتاب مورد نظر از کتابخانه حذف شد.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطا در حذف کتاب',
      timestamp: new Date().toISOString(),
    });
  }
});
