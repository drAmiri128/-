/**
 * معماری آینده آنلاین (Online Architecture Contracts)
 *
 * این فایل قراردادها و Interfaceهای لایه‌های مختلف معماری را مطابق استاندارد Clean Architecture
 * و الگوی پیشنهادی کاربر تعریف می‌کند:
 *
 * App / UI
 *   ↓
 * ViewModel / State Manager
 *   ↓
 * UseCase (Domain Layer)
 *   ↓
 * Repository
 *   ↓           ↓
 * LocalDataSource   RemoteDataSource (HTTPS API)
 *                       ↓
 *                     Backend (Database)
 *                       ↓
 *                     WebSocket (Realtime Events)
 */

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
} from '../types';

// ==========================================
// 1. استانداردهای ارتباط شبکه (Network & API)
// ==========================================

export type SyncState = 'synced' | 'pending_sync' | 'offline_cached' | 'error';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==========================================
// 2. قراردادهای Data Source (محلی و ریموت)
// ==========================================

export interface ILocalDataSource {
  // Items & Exams
  getItems(): Promise<ContentItem[]>;
  saveItems(items: ContentItem[]): Promise<void>;

  // Submissions
  getSubmissions(): Promise<UserSubmission[]>;
  saveSubmissions(submissions: UserSubmission[]): Promise<void>;

  // Accounts & Profile
  getAccounts(): Promise<Account[]>;
  saveAccounts(accounts: Account[]): Promise<void>;
  getActiveAccountId(): Promise<string>;
  saveActiveAccountId(id: string): Promise<void>;
  getUserProfileData(): Promise<UserProfileData | null>;
  saveUserProfileData(data: UserProfileData): Promise<void>;

  // Settings & Theme
  getSettings(): Promise<AdminSettings>;
  saveSettings(settings: AdminSettings): Promise<void>;
  getDarkMode(): Promise<boolean>;
  saveDarkMode(enabled: boolean): Promise<void>;

  // Mazar, Banners, Prayers, Imamology
  getMazarPrograms(): Promise<MazarProgram[]>;
  saveMazarPrograms(programs: MazarProgram[]): Promise<void>;
  getBanners(): Promise<BannerSlide[]>;
  saveBanners(banners: BannerSlide[]): Promise<void>;
  getPrayers(): Promise<PrayerItem[]>;
  savePrayers(prayers: PrayerItem[]): Promise<void>;
  getImamologyData(): Promise<InfalliblePerson[]>;
  saveImamologyData(data: InfalliblePerson[]): Promise<void>;
}

export interface IRemoteDataSource {
  // Auth & Account
  loginController(pinCode: string): Promise<ApiResponse<{ token: string; account: Account }>>;
  loginOrRegisterUser(profile: UserProfileData): Promise<ApiResponse<{ token: string; account: Account }>>;
  fetchProfile(accountId: string): Promise<ApiResponse<Account>>;

  // Content & Exams
  fetchPublishedContent(): Promise<ApiResponse<ContentItem[]>>;
  fetchAllContentAdmin(): Promise<ApiResponse<ContentItem[]>>;
  createOrUpdateContent(item: ContentItem): Promise<ApiResponse<ContentItem>>;
  deleteContent(id: string): Promise<ApiResponse<void>>;
  submitPollVote(itemId: string, optionIndex: number, clientOperationId?: string): Promise<ApiResponse<Record<string, number>>>;

  // Submissions
  submitExamAnswers(submission: UserSubmission): Promise<ApiResponse<UserSubmission>>;
  fetchUserSubmissions(userId: string): Promise<ApiResponse<UserSubmission[]>>;
  fetchAllSubmissionsAdmin(): Promise<ApiResponse<UserSubmission[]>>;
  evaluateSubmission(submissionId: string, feedback: string, score: number): Promise<ApiResponse<UserSubmission>>;
  deleteSubmission(submissionId: string): Promise<ApiResponse<void>>;

  // Settings & Realtime Controls
  fetchSettings(): Promise<ApiResponse<AdminSettings>>;
  updateSettings(settings: Partial<AdminSettings>): Promise<ApiResponse<AdminSettings>>;
  setMatamMode(isMatamMode: boolean): Promise<ApiResponse<void>>;

  // Mazar Programs, Banners, Prayers, Imamology
  fetchMazarPrograms(): Promise<ApiResponse<MazarProgram[]>>;
  updateMazarPrograms(programs: MazarProgram[]): Promise<ApiResponse<void>>;
  fetchBanners(): Promise<ApiResponse<BannerSlide[]>>;
  updateBanners(banners: BannerSlide[]): Promise<ApiResponse<void>>;
  fetchPrayers(): Promise<ApiResponse<PrayerItem[]>>;
  updatePrayers(prayers: PrayerItem[]): Promise<ApiResponse<void>>;
  fetchImamology(): Promise<ApiResponse<InfalliblePerson[]>>;
  updateImamology(data: InfalliblePerson[]): Promise<ApiResponse<void>>;
}

// ==========================================
// 3. قراردادهای Repository (منبع واحد حقیقت)
// ==========================================

export interface IContentRepository {
  getContentItems(forceRefresh?: boolean): Promise<ContentItem[]>;
  getContentItemsForAdmin?(forceRefresh?: boolean): Promise<ContentItem[]>;
  saveContentItem(item: ContentItem): Promise<void>;
  deleteContentItem(id: string): Promise<void>;
  submitPollVote(itemId: string, optionIndex: number): Promise<void>;
}

export interface ISubmissionRepository {
  getUserSubmissions(userId: string): Promise<UserSubmission[]>;
  getAllSubmissions(): Promise<UserSubmission[]>;
  submitAnswers(submission: UserSubmission): Promise<UserSubmission>;
  evaluateSubmission(submissionId: string, feedback: string, totalScore: number): Promise<void>;
  syncPendingSubmissions(): Promise<number>; // بازگرداندن تعداد همگام‌سازی‌شده‌ها
}

export interface ISettingsRepository {
  getSettings(): Promise<AdminSettings>;
  updateSettings(settings: Partial<AdminSettings>): Promise<void>;
  setMatamMode(enabled: boolean): Promise<void>;
}

export interface IAuthRepository {
  getCurrentAccount(): Promise<Account | null>;
  verifyControllerPin(pin: string): Promise<boolean>;
  ensureControllerToken(): Promise<string | null>;
  onboardUser(data: UserProfileData): Promise<Account>;
  logout(): Promise<void>;
  getSessions?(): Promise<any[]>;
  revokeSession?(id: string): Promise<void>;
}

// ==========================================
// 4. قراردادهای رویدادهای زنده (WebSocket Contracts)
// ==========================================

export type WebSocketEventType =
  | 'MATAM_MODE_TOGGLED'
  | 'SETTINGS_CHANGED'
  | 'CONTENT_UPDATED'
  | 'MAZAR_PROGRAM_UPDATED'
  | 'NEW_SUBMISSION'
  | 'SUBMISSION_EVALUATED'
  | 'LEADERBOARD_UPDATED';

export interface WebSocketEventMessage<T = unknown> {
  event: WebSocketEventType;
  payload: T;
  timestamp: string;
  senderId?: string;
}

export interface MatamModePayload {
  isMatamMode: boolean;
  activatedBy: string;
  updatedAt: string;
}

export interface SubmissionFeedbackPayload {
  submissionId: string;
  userId: string;
  feedback: string;
  scoreAwarded: number;
}
