import { Router } from 'express';
import { getDatabase } from '../db/database';
import {
  authenticateToken,
  requireController,
  type AuthenticatedRequest,
} from '../middleware/auth';
import { wsManager } from '../ws/wsServer';

export const contentRouter = Router();

// 1. Get published content items (User portal) - Supports both GET / and GET /published
// Hides correctOptionIndex and explanation from public users
const handleGetPublishedContent = async (_req: any, res: any): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM content_items WHERE is_published = 1 ORDER BY display_order ASC, created_at DESC'
    );

    const items = result.rows.map((row) => {
      let sanitizedSubQuestions: any = undefined;
      if (row.sub_questions_json) {
        try {
          const parsed = JSON.parse(row.sub_questions_json as string);
          if (Array.isArray(parsed)) {
            sanitizedSubQuestions = parsed.map((sq: any) => {
              const { correctOptionIndex, explanation, ...rest } = sq;
              return rest;
            });
          }
        } catch {
          sanitizedSubQuestions = undefined;
        }
      }

      return {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content,
        category: row.category,
        options: row.options_json ? JSON.parse(row.options_json as string) : undefined,
        points: row.points ?? 0,
        estimatedReadMinutes: row.estimated_read_minutes ?? undefined,
        subQuestions: sanitizedSubQuestions,
        pollVotes: row.poll_votes_json ? JSON.parse(row.poll_votes_json as string) : undefined,
        isPublished: Boolean(row.is_published),
        order: row.display_order,
        createdAt: row.created_at,
      };
    });

    res.json({
      success: true,
      data: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

contentRouter.get('/', handleGetPublishedContent);
contentRouter.get('/published', handleGetPublishedContent);

// 1.1 Grade a single question/exam response without saving (Public endpoint for real-time feedback)
contentRouter.post('/:id/grade', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { selectedOptionIndex, subAnswers } = req.body;
    const db = getDatabase();

    const result = await db.execute({
      sql: 'SELECT id, type, points, correct_option_index, explanation, sub_questions_json FROM content_items WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'محتوای آزمون یافت نشد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const row = result.rows[0];
    const itemType = row.type as string;
    const itemPoints = row.points !== undefined && row.points !== null ? Number(row.points) : 10;
    const correctOptionIndex = row.correct_option_index !== null && row.correct_option_index !== undefined ? Number(row.correct_option_index) : undefined;
    const explanation = (row.explanation as string) || undefined;

    if (itemType === 'poll') {
      res.json({
        success: true,
        data: {
          isCorrect: true,
          scoreAwarded: itemPoints,
          maxScore: itemPoints,
          explanation,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (itemType === 'descriptive') {
      res.json({
        success: true,
        data: {
          isCorrect: false,
          scoreAwarded: 0,
          maxScore: itemPoints,
          explanation,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if subQuestions exist
    let subQuestions: any[] = [];
    if (row.sub_questions_json) {
      try {
        subQuestions = JSON.parse(row.sub_questions_json as string);
      } catch {
        subQuestions = [];
      }
    }

    if (Array.isArray(subQuestions) && subQuestions.length > 0) {
      let totalAwarded = 0;
      let maxTotal = 0;
      const gradedSubAnswers: Record<string, any> = {};

      for (const subQ of subQuestions) {
        const qMaxScore = subQ.points !== undefined && subQ.points !== null ? Number(subQ.points) : 10;
        maxTotal += qMaxScore;
        const userSub = subAnswers?.[subQ.id];

        if (subQ.type === 'multiple_choice') {
          const picked = userSub?.selectedOptionIndex;
          const isCorrect = picked !== undefined && picked !== null && Number(picked) === Number(subQ.correctOptionIndex);
          const scoreAwarded = isCorrect ? qMaxScore : 0;
          totalAwarded += scoreAwarded;

          gradedSubAnswers[subQ.id] = {
            type: 'multiple_choice',
            selectedOptionIndex: picked,
            isCorrect,
            scoreAwarded,
            maxScore: qMaxScore,
            correctOptionIndex: subQ.correctOptionIndex !== undefined ? Number(subQ.correctOptionIndex) : undefined,
            explanation: subQ.explanation || undefined,
          };
        } else {
          gradedSubAnswers[subQ.id] = {
            type: 'descriptive',
            textAnswer: userSub?.textAnswer || '',
            isCorrect: false,
            scoreAwarded: 0,
            maxScore: qMaxScore,
            explanation: subQ.explanation || undefined,
          };
        }
      }

      res.json({
        success: true,
        data: {
          isCorrect: totalAwarded > 0,
          scoreAwarded: totalAwarded,
          maxScore: maxTotal,
          subAnswers: gradedSubAnswers,
          explanation,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Standard single choice item
    const picked = selectedOptionIndex;
    const isCorrect = picked !== undefined && picked !== null && Number(picked) === correctOptionIndex;
    const scoreAwarded = isCorrect ? itemPoints : 0;

    res.json({
      success: true,
      data: {
        isCorrect,
        correctOptionIndex,
        scoreAwarded,
        maxScore: itemPoints,
        explanation,
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

// 2. Get all content items (Controller only - includes drafts)
contentRouter.get('/admin/all', authenticateToken, requireController, async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM content_items ORDER BY display_order ASC, created_at DESC'
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      category: row.category,
      options: row.options_json ? JSON.parse(row.options_json as string) : undefined,
      correctOptionIndex: row.correct_option_index ?? undefined,
      points: row.points ?? 0,
      explanation: row.explanation ?? undefined,
      estimatedReadMinutes: row.estimated_read_minutes ?? undefined,
      subQuestions: row.sub_questions_json ? JSON.parse(row.sub_questions_json as string) : undefined,
      pollVotes: row.poll_votes_json ? JSON.parse(row.poll_votes_json as string) : undefined,
      isPublished: Boolean(row.is_published),
      order: row.display_order,
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
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 3. Create or update a content item (Controller only - UPSERT)
contentRouter.post('/', authenticateToken, requireController, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const item = req.body;
    if (!item.title || !item.type) {
      res.status(400).json({
        success: false,
        message: 'عنوان و نوع محتوا الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const id = item.id || `item-${Date.now()}`;
    const createdAt = item.createdAt || new Date().toISOString();
    const db = getDatabase();

    // Check if item already exists -> perform UPDATE if exists, else INSERT
    const checkRes = await db.execute({
      sql: 'SELECT id FROM content_items WHERE id = ?',
      args: [id],
    });

    if (checkRes.rows.length > 0) {
      await db.execute({
        sql: `UPDATE content_items SET
          type = ?, title = ?, content = ?, category = ?, options_json = ?,
          correct_option_index = ?, points = ?, explanation = ?,
          estimated_read_minutes = ?, sub_questions_json = ?,
          poll_votes_json = ?, is_published = ?, display_order = ?
        WHERE id = ?`,
        args: [
          item.type,
          item.title,
          item.content || '',
          item.category || 'عمومی',
          item.options ? JSON.stringify(item.options) : null,
          item.correctOptionIndex ?? null,
          item.points ?? 0,
          item.explanation ?? null,
          item.estimatedReadMinutes ?? null,
          item.subQuestions ? JSON.stringify(item.subQuestions) : null,
          item.pollVotes ? JSON.stringify(item.pollVotes) : null,
          item.isPublished !== false ? 1 : 0,
          item.order ?? 0,
          id,
        ],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO content_items (
          id, type, title, content, category, options_json, correct_option_index,
          points, explanation, estimated_read_minutes, sub_questions_json,
          poll_votes_json, is_published, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.type,
          item.title,
          item.content || '',
          item.category || 'عمومی',
          item.options ? JSON.stringify(item.options) : null,
          item.correctOptionIndex ?? null,
          item.points ?? 0,
          item.explanation ?? null,
          item.estimatedReadMinutes ?? null,
          item.subQuestions ? JSON.stringify(item.subQuestions) : null,
          item.pollVotes ? JSON.stringify(item.pollVotes) : null,
          item.isPublished !== false ? 1 : 0,
          item.order ?? 0,
          createdAt,
        ],
      });
    }

    if (item.isPublished !== false) {
      wsManager.broadcastNewContent({
        contentId: id,
        title: item.title,
        type: item.type,
      });
    }

    res.status(201).json({
      success: true,
      data: { ...item, id, createdAt },
      message: 'محتوا با موفقیت ذخیره شد.',
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

// 4. Update an existing content item (Controller only)
contentRouter.put('/:id', authenticateToken, requireController, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const item = req.body;
    const db = getDatabase();

    await db.execute({
      sql: `UPDATE content_items SET
        type = ?, title = ?, content = ?, category = ?, options_json = ?,
        correct_option_index = ?, points = ?, explanation = ?,
        estimated_read_minutes = ?, sub_questions_json = ?,
        poll_votes_json = ?, is_published = ?, display_order = ?
      WHERE id = ?`,
      args: [
        item.type,
        item.title,
        item.content || '',
        item.category || 'عمومی',
        item.options ? JSON.stringify(item.options) : null,
        item.correctOptionIndex ?? null,
        item.points ?? 0,
        item.explanation ?? null,
        item.estimatedReadMinutes ?? null,
        item.subQuestions ? JSON.stringify(item.subQuestions) : null,
        item.pollVotes ? JSON.stringify(item.pollVotes) : null,
        item.isPublished !== false ? 1 : 0,
        item.order ?? 0,
        id,
      ],
    });

    if (item.isPublished !== false) {
      wsManager.broadcastNewContent({
        contentId: id,
        title: item.title,
        type: item.type,
      });
    }

    res.json({
      success: true,
      message: 'محتوا با موفقیت به‌روزرسانی شد.',
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

// 5. Delete a content item (Controller only)
contentRouter.delete('/:id', authenticateToken, requireController, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    await db.execute({
      sql: 'DELETE FROM content_items WHERE id = ?',
      args: [id],
    });

    // Notify connected clients that content item was removed
    wsManager.broadcastNewContent({
      contentId: id,
      title: 'حذف شد',
      type: 'delete',
    });

    res.json({
      success: true,
      message: 'محتوا با موفقیت حذف شد.',
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

// 6. Vote in a poll (Supports both /:id/vote and /:id/poll-vote)
async function handlePollVote(req: any, res: any): Promise<void> {
  try {
    const { id } = req.params;
    const optionIndex = req.body.optionIndex !== undefined ? req.body.optionIndex : req.body.option;
    const clientOperationId: string | undefined = req.body.clientOperationId || req.body.idempotencyKey;

    if (optionIndex === undefined || optionIndex === null) {
      res.status(400).json({
        success: false,
        message: 'شناسه گزینه الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT poll_votes_json FROM content_items WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'نظرسنجی یافت نشد.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let pollVotes: Record<string, any> = {};
    if (result.rows[0].poll_votes_json) {
      try {
        pollVotes = JSON.parse(result.rows[0].poll_votes_json as string);
      } catch {
        pollVotes = {};
      }
    }

    let votedOps: string[] = [];
    if (Array.isArray(pollVotes._voted_ops)) {
      votedOps = pollVotes._voted_ops;
    }

    // Idempotency: if this operation ID was already counted, do not increment again
    if (clientOperationId && votedOps.includes(clientOperationId)) {
      const cleanVotes: Record<string, number> = {};
      for (const [k, v] of Object.entries(pollVotes)) {
        if (k !== '_voted_ops') cleanVotes[k] = Number(v);
      }
      res.json({
        success: true,
        data: cleanVotes,
        message: 'رای شما قبلاً ثبت شده است (عملیات تکراری کنترل شد).',
        timestamp: new Date().toISOString(),
        isDuplicate: true,
      });
      return;
    }

    const currentCount = Number(pollVotes[String(optionIndex)] || 0);
    pollVotes[String(optionIndex)] = currentCount + 1;

    if (clientOperationId) {
      votedOps.push(clientOperationId);
      pollVotes._voted_ops = votedOps;
    }

    await db.execute({
      sql: 'UPDATE content_items SET poll_votes_json = ? WHERE id = ?',
      args: [JSON.stringify(pollVotes), id],
    });

    const cleanVotes: Record<string, number> = {};
    for (const [k, v] of Object.entries(pollVotes)) {
      if (k !== '_voted_ops') cleanVotes[k] = Number(v);
    }

    res.json({
      success: true,
      data: cleanVotes,
      message: 'رای شما با موفقیت ثبت شد.',
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

contentRouter.post('/:id/poll-vote', handlePollVote);
contentRouter.post('/:id/vote', handlePollVote);

