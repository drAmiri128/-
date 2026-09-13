/**
 * Remote Data Source
 * Implementation of IRemoteDataSource using apiClient (HTTPS REST API)
 */

import { IRemoteDataSource, ApiResponse } from '../../architecture/contracts';
import {
  ContentItem,
  UserSubmission,
  AdminSettings,
  Account,
  MazarProgram,
  BannerSlide,
  PrayerItem,
  InfalliblePerson,
  UserProfileData,
  BookItem,
  MadahiItem,
} from '../../types';
import { apiClient } from '../../services/api/apiClient';

export class RemoteDataSource implements IRemoteDataSource {
  // Auth & Accounts
  async loginController(pinCode: string): Promise<ApiResponse<{ token: string; refreshToken?: string; account: Account }>> {
    return apiClient.post('/auth/controller-login', { pinCode });
  }

  async loginOrRegisterUser(profile: UserProfileData): Promise<ApiResponse<{ token: string; refreshToken?: string; account: Account }>> {
    return apiClient.post('/auth/user-onboard', profile);
  }

  async loginUserWithPassword(phoneNumber: string, password?: string): Promise<ApiResponse<{ token: string; refreshToken?: string; account: Account }>> {
    return apiClient.post('/auth/user-login', { phoneNumber, password });
  }

  async fetchProfile(accountId: string): Promise<ApiResponse<Account>> {
    return apiClient.get(`/users/${encodeURIComponent(accountId)}`);
  }

  async logout(refreshToken?: string): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/logout', { refreshToken });
  }

  async fetchSessions(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
  }

  // Content & Exams
  async fetchPublishedContent(): Promise<ApiResponse<ContentItem[]>> {
    return apiClient.get('/content');
  }

  async fetchAllContentAdmin(): Promise<ApiResponse<ContentItem[]>> {
    return apiClient.get('/content/admin/all');
  }

  async createOrUpdateContent(item: ContentItem): Promise<ApiResponse<ContentItem>> {
    return apiClient.post('/content', item);
  }

  async deleteContent(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/content/${encodeURIComponent(id)}`);
  }

  async submitPollVote(
    itemId: string,
    optionIndex: number,
    clientOperationId?: string
  ): Promise<ApiResponse<Record<string, number>>> {
    return apiClient.post(`/content/${encodeURIComponent(itemId)}/vote`, {
      optionIndex,
      clientOperationId,
    });
  }

  async gradeContentItem(
    itemId: string,
    payload: { selectedOptionIndex?: number; subAnswers?: Record<string, any> }
  ): Promise<
    ApiResponse<{
      isCorrect: boolean;
      correctOptionIndex?: number;
      scoreAwarded: number;
      maxScore: number;
      subAnswers?: Record<string, any>;
      explanation?: string;
    }>
  > {
    return apiClient.post(`/content/${encodeURIComponent(itemId)}/grade`, payload);
  }

  // Submissions
  async submitExamAnswers(submission: UserSubmission): Promise<ApiResponse<UserSubmission>> {
    return apiClient.post('/submissions', submission);
  }

  async fetchUserSubmissions(userId: string): Promise<ApiResponse<UserSubmission[]>> {
    return apiClient.get(`/submissions/user/${encodeURIComponent(userId)}`);
  }

  async fetchAllSubmissionsAdmin(): Promise<ApiResponse<UserSubmission[]>> {
    return apiClient.get('/submissions/admin/all');
  }

  async evaluateSubmission(
    submissionId: string,
    feedback: string,
    score: number
  ): Promise<ApiResponse<UserSubmission>> {
    return apiClient.put(`/submissions/${encodeURIComponent(submissionId)}/evaluate`, {
      feedback,
      totalScore: score,
    });
  }

  async deleteSubmission(submissionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/submissions/${encodeURIComponent(submissionId)}`);
  }

  // Settings
  async fetchSettings(): Promise<ApiResponse<AdminSettings>> {
    return apiClient.get('/settings');
  }

  async updateSettings(settings: Partial<AdminSettings>): Promise<ApiResponse<AdminSettings>> {
    return apiClient.put('/settings', settings);
  }

  async setMatamMode(isMatamMode: boolean): Promise<ApiResponse<void>> {
    return apiClient.patch('/settings/matam-mode', { isMatamMode });
  }

  // Mazar Programs
  async fetchMazarPrograms(): Promise<ApiResponse<MazarProgram[]>> {
    return apiClient.get('/mazar-programs');
  }

  async updateMazarPrograms(programs: MazarProgram[]): Promise<ApiResponse<void>> {
    return apiClient.put('/mazar-programs/admin/bulk', { programs });
  }

  // Banners
  async fetchBanners(): Promise<ApiResponse<BannerSlide[]>> {
    return apiClient.get('/banners');
  }

  async updateBanners(banners: BannerSlide[]): Promise<ApiResponse<void>> {
    return apiClient.put('/banners/admin/bulk', { banners });
  }

  // Prayers
  async fetchPrayers(): Promise<ApiResponse<PrayerItem[]>> {
    return apiClient.get('/prayers');
  }

  async updatePrayers(prayers: PrayerItem[]): Promise<ApiResponse<void>> {
    return apiClient.put('/prayers/admin/bulk', { prayers });
  }

  // Imamology
  async fetchImamology(): Promise<ApiResponse<InfalliblePerson[]>> {
    return apiClient.get('/imamology');
  }

  async updateImamology(data: InfalliblePerson[]): Promise<ApiResponse<void>> {
    return apiClient.put('/imamology/admin/bulk', { data });
  }

  // Accounts (Admin Controller Management)
  async fetchAccounts(): Promise<ApiResponse<Account[]>> {
    return apiClient.get('/admin/accounts');
  }

  async createAccount(account: Account): Promise<ApiResponse<Account>> {
    return apiClient.post('/admin/accounts', account);
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
    return apiClient.put(`/admin/accounts/${encodeURIComponent(id)}`, data);
  }

  async deleteAccount(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/admin/accounts/${encodeURIComponent(id)}`);
  }

  // Leaderboard
  async fetchLeaderboard(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/submissions/leaderboard');
  }

  // Library Books
  async fetchLibraryBooks(): Promise<ApiResponse<BookItem[]>> {
    return apiClient.get('/library');
  }

  async updateLibraryBooks(books: BookItem[]): Promise<ApiResponse<void>> {
    return apiClient.put('/library/admin/bulk', { books });
  }

  async createLibraryBook(book: BookItem): Promise<ApiResponse<BookItem>> {
    return apiClient.post('/library', book);
  }

  async updateLibraryBook(id: string, book: BookItem): Promise<ApiResponse<BookItem>> {
    return apiClient.put(`/library/${encodeURIComponent(id)}`, book);
  }

  async deleteLibraryBook(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/library/${encodeURIComponent(id)}`);
  }

  // Nava / Madahi
  async fetchNavaMadahi(): Promise<ApiResponse<MadahiItem[]>> {
    return apiClient.get('/nava');
  }

  async createNavaMadahi(item: MadahiItem): Promise<ApiResponse<MadahiItem>> {
    return apiClient.post('/nava', item);
  }

  async updateNavaMadahi(id: string, item: Partial<MadahiItem>): Promise<ApiResponse<void>> {
    return apiClient.put(`/nava/${encodeURIComponent(id)}`, item);
  }

  async deleteNavaMadahi(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/nava/${encodeURIComponent(id)}`);
  }
}

export const remoteDataSource = new RemoteDataSource();
