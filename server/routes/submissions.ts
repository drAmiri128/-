import { Router } from 'express';
import { getDatabase } from '../db/database';
import {
  authenticateToken,
  requireController,
  optionalAuth,
  type AuthenticatedRequest,
} from '../middleware/auth';
import { wsManager } from '../ws/wsServer';

export const submissionsRouter = Router();

// 1. Submit exam answers
submissionsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const submission = req.body;
    if (!submission.userName || !submission.answers) {
      res.status(400).json({
        success: false,
        message: 'نام کاربر و برگه پاسخ‌ها الزامی است.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const id = submission.id || `sub-${Date.now()}`;
    const submittedAt = submission.submittedAt || new Date().toISOString();
    const userId = req.user?.id || submission.userId || null;
    const db = getDatabase();

    // Idempotency check: prevent duplicate submissions on retry or replay
    const existing = await db.execute({
      sql: 'SELECT id, user_id, submitted_at, total_score, max_score FROM submissions WHERE id = ?',
      args: [id],
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      res.status(200).json({
        success: true,
        data: {
          ...submission,
          id,
          userId: (row.user_id as string) || userId,
          submittedAt: (row.submitted_at as string) || submittedAt,
          totalScore: Number(row.total_score ?? submission.totalScore ?? 0),
          maxScore: Number(row.max_score ?? submission.maxScore ?? 0),
        },
        message: 'این برگه آزمون قبلاً در سرور ثبت شده است (عملیات تکراری کنترل شد).',
        timestamp: new Date().toISOString(),
        isDuplicate: true,
      });
      return;
    }

    // Server-side scoring validation:
    // Recalculate totalScore and maxScore by querying content_items from DB
    let computedTotalScore = 0;
    let computedMaxScore = 0;
    const validatedAnswers: Record<string, any> = {};
    const rawAnswers = submission.answers && typeof submission.answers === 'object' ? submission.answers : {};

    for (const [key, rawAns] of Object.entries(rawAnswers)) {
      const userAns = { ...(rawAns as any) };
      const targetItemId = userAns.itemId || key;

      const itemRes = await db.execute({
        sql: 'SELECT id, type, points, correct_option_index, explanation, sub_questions_json FROM content_items WHERE id = ?',
        args: [targetItemId],
      });

      if (itemRes.rows.length === 0) {
        validatedAnswers[key] = userAns;
        continue;
      }

      const itemRow = itemRes.rows[0];
      const itemType = itemRow.type as string;
      const defaultPoints = itemRow.points !== undefined && itemRow.points !== null ? Number(itemRow.points) : 10;

      if (itemType === 'poll') {
        userAns.isCorrect = true;
        userAns.scoreAwarded = defaultPoints;
        userAns.maxScore = defaultPoints;
        computedTotalScore += defaultPoints;
        computedMaxScore += defaultPoints;
      } else if (itemType === 'descriptive') {
        userAns.isCorrect = false;
        userAns.scoreAwarded = 0;
        userAns.maxScore = defaultPoints;
        computedMaxScore += defaultPoints;
      } else if (itemType === 'multiple_choice') {
        let subQuestions: any[] = [];
        if (itemRow.sub_questions_json) {
          try {
            subQuestions = JSON.parse(itemRow.sub_questions_json as string);
          } catch {
            subQuestions = [];
          }
        }

        if (Array.isArray(subQuestions) && subQuestions.length > 0) {
          let itemAwarded = 0;
          let itemMax = 0;
          const validatedSubs: Record<string, any> = {};

          for (const subQ of subQuestions) {
            const qMax = subQ.points !== undefined && subQ.points !== null ? Number(subQ.points) : 10;
            itemMax += qMax;
            const userSub = userAns.subAnswers?.[subQ.id];

            if (subQ.type === 'multiple_choice') {
              const picked = userSub?.selectedOptionIndex;
              const isCorrect = picked !== undefined && picked !== null && Number(picked) === Number(subQ.correctOptionIndex);
              const score = isCorrect ? qMax : 0;
              itemAwarded += score;
              validatedSubs[subQ.id] = {
                type: 'multiple_choice',
                selectedOptionIndex: picked,
                isCorrect,
                scoreAwarded: score,
                maxScore: qMax,
                correctOptionIndex: subQ.correctOptionIndex !== undefined ? Number(subQ.correctOptionIndex) : undefined,
                explanation: subQ.explanation || undefined,
              };
            } else {
              validatedSubs[subQ.id] = {
                type: 'descriptive',
                textAnswer: userSub?.textAnswer || '',
                isCorrect: false,
                scoreAwarded: 0,
                maxScore: qMax,
                explanation: subQ.explanation || undefined,
              };
            }
          }

          userAns.subAnswers = validatedSubs;
          userAns.isCorrect = itemAwarded > 0;
          userAns.scoreAwarded = itemAwarded;
          userAns.maxScore = itemMax;
          computedTotalScore += itemAwarded;
          computedMaxScore += itemMax;
        } else {
          // Single multiple choice
          const picked = userAns.selectedOptionIndex;
          const correctIdx = itemRow.correct_option_index !== null && itemRow.correct_option_index !== undefined ? Number(itemRow.correct_option_index) : undefined;
          const isCorrect = picked !== undefined && picked !== null && Number(picked) === correctIdx;
          const awarded = isCorrect ? defaultPoints : 0;

          userAns.isCorrect = isCorrect;
          userAns.scoreAwarded = awarded;
          userAns.maxScore = defaultPoints;
          userAns.correctOptionIndex = correctIdx;
          userAns.explanation = (itemRow.explanation as string) || undefined;
          computedTotalScore += awarded;
          computedMaxScore += defaultPoints;
        }
      }

      validatedAnswers[key] = userAns;
    }

    const finalTotalScore = computedTotalScore;
    const finalMaxScore = computedMaxScore;

    await db.execute({
      sql: `INSERT INTO submissions (
        id, user_id, user_name, user_contact, answers_json,
        total_score, max_score, feedback, controller_note_author,
        controller_note_date, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        userId,
        submission.userName,
        submission.userEmailOrPhone || null,
        JSON.stringify(validatedAnswers),
        finalTotalScore,
        finalMaxScore,
        submission.feedback ?? null,
        submission.controllerNoteAuthor ?? null,
        submission.controllerNoteDate ?? null,
        submittedAt,
      ],
    });

    // Alert connected controllers about new submission
    wsManager.broadcastNewSubmission({
      submissionId: id,
      examTitle: submission.examTitle || 'آزمون معارفی مزار',
      submittedAt,
      totalScore: finalTotalScore,
      maxScore: finalMaxScore,
    });

    res.status(201).json({
      success: true,
      data: {
        ...submission,
        id,
        userId,
        submittedAt,
        answers: validatedAnswers,
        totalScore: finalTotalScore,
        maxScore: finalMaxScore,
      },
      message: 'پاسخ‌های شما با موفقیت در سرور ثبت شد.',
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

// 2. Get submissions of current user or by user ID
const handleGetUserSubmissions = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const targetUserId = req.params.userId || req.user!.id;
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM submissions WHERE user_id = ? ORDER BY submitted_at DESC',
      args: [targetUserId],
    });

    const submissions = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmailOrPhone: row.user_contact,
      answers: JSON.parse(row.answers_json as string),
      totalScore: row.total_score,
      maxScore: row.max_score,
      feedback: row.feedback,
      controllerNoteAuthor: row.controller_note_author,
      controllerNoteDate: row.controller_note_date,
      submittedAt: row.submitted_at,
    }));

    res.json({
      success: true,
      data: submissions,
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

submissionsRouter.get('/my', authenticateToken, handleGetUserSubmissions);
submissionsRouter.get('/user/:userId', authenticateToken, handleGetUserSubmissions);

// 3. Get all submissions (Controller only)
submissionsRouter.get('/admin/all', authenticateToken, requireController, async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM submissions ORDER BY submitted_at DESC'
    );

    const submissions = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmailOrPhone: row.user_contact,
      answers: JSON.parse(row.answers_json as string),
      totalScore: row.total_score,
      maxScore: row.max_score,
      feedback: row.feedback,
      controllerNoteAuthor: row.controller_note_author,
      controllerNoteDate: row.controller_note_date,
      submittedAt: row.submitted_at,
    }));

    res.json({
      success: true,
      data: submissions,
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

// 4. Evaluate submission (Controller only)
submissionsRouter.put('/:id/evaluate', authenticateToken, requireController, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { totalScore, feedback, answers } = req.body;
    const db = getDatabase();

    const noteAuthor = req.user?.name || 'کنترل‌گر سامانه';
    const noteDate = new Date().toISOString();

    if (answers) {
      await db.execute({
        sql: `UPDATE submissions SET
          total_score = ?, feedback = ?, answers_json = ?,
          controller_note_author = ?, controller_note_date = ?
        WHERE id = ?`,
        args: [totalScore, feedback || null, JSON.stringify(answers), noteAuthor, noteDate, id],
      });
    } else {
      await db.execute({
        sql: `UPDATE submissions SET
          total_score = ?, feedback = ?,
          controller_note_author = ?, controller_note_date = ?
        WHERE id = ?`,
        args: [totalScore, feedback || null, noteAuthor, noteDate, id],
      });
    }

    // Retrieve target user_id and max_score to send real-time notification
    try {
      const subRes = await db.execute({
        sql: 'SELECT user_id, max_score FROM submissions WHERE id = ?',
        args: [id],
      });
      if (subRes.rows.length > 0) {
        const targetUserId = subRes.rows[0].user_id as string | null;
        const maxScore = Number(subRes.rows[0].max_score || 0);
        if (targetUserId) {
          wsManager.notifySubmissionEvaluated(targetUserId, {
            submissionId: id,
            totalScore: Number(totalScore),
            maxScore,
            feedback: feedback || undefined,
            userId: targetUserId,
          });
        }
      }
    } catch (wsErr) {
      console.warn('[WebSocket Warning] Failed to notify evaluated submission:', wsErr);
    }

    res.json({
      success: true,
      message: 'ارزیابی و نمره با موفقیت ثبت شد.',
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

// 5. Leaderboard / Top scores
submissionsRouter.get('/leaderboard', async (_req, res): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.execute(`
      SELECT user_name, MAX(user_id) as user_id, SUM(total_score) as aggregate_score, COUNT(*) as exams_count
      FROM submissions
      GROUP BY user_name
      ORDER BY aggregate_score DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: result.rows,
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

// 6. Delete submission (Controller only)
submissionsRouter.delete('/:id', authenticateToken, requireController, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    await db.execute({
      sql: 'DELETE FROM submissions WHERE id = ?',
      args: [id],
    });

    res.json({
      success: true,
      message: 'برگه آزمون با موفقیت حذف شد.',
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

