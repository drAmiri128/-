/**
 * Submission & Leaderboard Repository
 * Handles user test submissions and score rankings with Remote Leaderboard & LocalStorage Fallback.
 */

import { UserSubmission } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';

export interface LeaderboardEntry {
  user_name: string;
  user_id?: string;
  aggregate_score: number;
  exams_count: number;
}

export class SubmissionRepository {
  async getSubmissions(): Promise<UserSubmission[]> {
    try {
      const res = await remoteDataSource.fetchAllSubmissionsAdmin();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveSubmissions(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[SubmissionRepository] Remote fetch failed, using local storage fallback:', e);
    }
    return localDataSource.getSubmissions();
  }

  async getUserSubmissions(userId: string): Promise<UserSubmission[]> {
    const all = await this.getSubmissions();
    return all.filter((s) => s.userId === userId);
  }

  async saveSubmission(submission: UserSubmission): Promise<void> {
    const all = await localDataSource.getSubmissions();
    const existingIndex = all.findIndex((s) => s.id === submission.id);
    let updated: UserSubmission[];
    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = submission;
    } else {
      updated = [submission, ...all.filter((s) => s.id !== submission.id)];
    }
    await localDataSource.saveSubmissions(updated);

    // Queue for sync with idempotency key
    try {
      await syncManager.enqueueOperation('SUBMISSION_CREATE', submission);
    } catch (e) {
      console.warn('[SubmissionRepository] Failed to enqueue submission for sync:', e);
    }
  }

  async evaluateSubmission(submissionId: string, feedback: string, totalScore: number): Promise<void> {
    const all = await localDataSource.getSubmissions();
    const updated = all.map((s) =>
      s.id === submissionId
        ? { ...s, feedback, totalScore, status: 'reviewed' as const }
        : s
    );
    await localDataSource.saveSubmissions(updated);

    try {
      const res = await remoteDataSource.evaluateSubmission(submissionId, feedback, totalScore);
      if (!res.success) throw new Error(res.message);
    } catch (e) {
      console.warn('[SubmissionRepository] Remote evaluate failed, queuing for sync:', e);
      await syncManager.enqueueOperation('SUBMISSION_EVALUATE', {
        submissionId,
        feedback,
        score: totalScore,
      });
    }
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    const all = await localDataSource.getSubmissions();
    const updated = all.filter((s) => s.id !== submissionId);
    await localDataSource.saveSubmissions(updated);

    try {
      await remoteDataSource.deleteSubmission(submissionId);
    } catch (e) {
      console.warn('[SubmissionRepository] Remote delete submission failed:', e);
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await remoteDataSource.fetchLeaderboard();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((row: any) => ({
          user_name: row.user_name || 'کاربر سیستم',
          user_id: row.user_id,
          aggregate_score: Number(row.aggregate_score || 0),
          exams_count: Number(row.exams_count || 0),
        }));
      }
    } catch (e) {
      console.warn('[SubmissionRepository] Remote leaderboard fetch failed, calculating locally:', e);
    }

    // Local calculation fallback from stored submissions
    const submissions = await localDataSource.getSubmissions();
    const map = new Map<string, { totalScore: number; count: number; userId?: string }>();

    for (const sub of submissions) {
      const key = sub.userName || 'کاربر سیستم';
      const cur = map.get(key) || { totalScore: 0, count: 0, userId: sub.userId };
      cur.totalScore += sub.totalScore || 0;
      cur.count += 1;
      map.set(key, cur);
    }

    const leaderboard: LeaderboardEntry[] = Array.from(map.entries()).map(([name, stat]) => ({
      user_name: name,
      user_id: stat.userId,
      aggregate_score: stat.totalScore,
      exams_count: stat.count,
    }));

    leaderboard.sort((a, b) => b.aggregate_score - a.aggregate_score);
    return leaderboard;
  }
}

export const submissionRepository = new SubmissionRepository();
