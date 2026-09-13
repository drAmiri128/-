/**
 * Online/Offline Sync Manager
 *
 * Implements Stage 5 Online/Offline Sync Engine adhering to Clean Architecture:
 * - REST as the Source of Truth
 * - WebSocket for notification triggers only
 * - Offline Queue with idempotency (sqm_sync_queue_v1)
 * - Conflict resolution: Server Wins for content/settings, Idempotent append for submissions/votes
 * - Network connectivity detection (navigator.onLine + /api/v1/health probe)
 * - Exponential backoff retry policy
 * - Concurrent sync mutex lock
 */

import { SyncQueue } from './syncQueue';
import { SyncStats, SyncState, QueueOperationType } from './types';
import { remoteDataSource } from '../../data/remote/remoteDataSource';
import { localDataSource } from '../../data/local/localDataSource';
import { wsClient } from '../websocket/wsClient';
import { apiClient, authSessionManager } from '../api/apiClient';
import { ContentItem, AdminSettings, UserSubmission } from '../../types';

export class SyncError extends Error {
  status?: number;
  errorCode?: string;

  constructor(message: string, status?: number, errorCode?: string) {
    super(message);
    this.name = 'SyncError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

const ADMIN_OPERATION_TYPES: ReadonlySet<string> = new Set([
  'CONTENT_SAVE',
  'CONTENT_DELETE',
  'SETTINGS_UPDATE',
  'MATAM_MODE_TOGGLE',
  'MAZAR_UPDATE',
  'BANNERS_UPDATE',
  'PRAYERS_UPDATE',
  'IMAMOLOGY_UPDATE',
  'SUBMISSION_EVALUATE',
]);

export class SyncManager {
  private static instance: SyncManager;

  private isProcessingQueue = false;
  private isPulling = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private lastSyncTime: string | null = null;
  private listeners: Set<(stats: SyncStats) => void> = new Set();
  private dataListeners: Set<(type: string, data?: any) => void> = new Set();
  private healthCheckInterval: any = null;
  private authBlocked = false;

  private constructor() {
    this.initEventListeners();
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Subscribes a callback to receive real-time data update notifications
   */
  public onDataUpdate(listener: (type: string, data?: any) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  public notifyDataUpdate(type: string, data?: any): void {
    this.dataListeners.forEach((fn) => {
      try {
        fn(type, data);
      } catch (e) {
        console.error('[SyncManager] Data update listener error:', e);
      }
    });
  }

  /**
   * Initializes browser listeners and WebSocket event hooks
   */
  private initEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncManager] Browser reported ONLINE event');
        this.triggerOnlineCheckAndSync();
      });

      window.addEventListener('offline', () => {
        console.log('[SyncManager] Browser reported OFFLINE event');
        this.isOnline = false;
        this.notify();
      });

      // Periodic connectivity check every 60 seconds
      this.healthCheckInterval = setInterval(() => {
        this.checkConnectivityAndSyncIfNeeded();
      }, 60000);
    }

    // Attach to Stage 4 WebSocket events for real-time notification triggers
    this.attachWebSocketTriggers();
  }

  /**
   * Connects WebSocket event notifications to targeted REST data refresh
   */
  private attachWebSocketTriggers(): void {
    wsClient.on('NEW_CONTENT_PUBLISHED', async () => {
      console.log('[SyncManager] WS NEW_CONTENT_PUBLISHED -> triggering REST content pull');
      await this.pullPublishedContent();
    });

    wsClient.on('SETTINGS_CHANGED', async () => {
      console.log('[SyncManager] WS SETTINGS_CHANGED -> triggering REST settings pull');
      await this.pullSettings();
    });

    wsClient.on('MATAM_MODE_TOGGLED', async () => {
      console.log('[SyncManager] WS MATAM_MODE_TOGGLED -> triggering REST settings pull');
      await this.pullSettings();
    });

    wsClient.on('SUBMISSION_EVALUATED', async (payload: any) => {
      console.log('[SyncManager] WS SUBMISSION_EVALUATED -> triggering submission update', payload);
      await this.handleRemoteSubmissionEvaluation(payload);
    });

    wsClient.on('MAZAR_PROGRAMS_UPDATED', async () => {
      console.log('[SyncManager] WS MAZAR_PROGRAMS_UPDATED -> triggering REST pull');
      await this.pullMazarPrograms();
    });

    wsClient.on('BANNERS_UPDATED', async () => {
      console.log('[SyncManager] WS BANNERS_UPDATED -> triggering REST pull');
      await this.pullBanners();
    });

    wsClient.on('PRAYERS_UPDATED', async () => {
      console.log('[SyncManager] WS PRAYERS_UPDATED -> triggering REST pull');
      await this.pullPrayers();
    });

    wsClient.on('IMAMOLOGY_UPDATED', async () => {
      console.log('[SyncManager] WS IMAMOLOGY_UPDATED -> triggering REST pull');
      await this.pullImamology();
    });
  }

  /**
   * Subscribes a callback to receive sync state updates
   */
  public subscribe(listener: (stats: SyncStats) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const stats = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(stats);
      } catch (err) {
        console.error('[SyncManager] Subscriber notification error:', err);
      }
    });
  }

  public getStats(): SyncStats {
    const { pendingCount, failedCount } = SyncQueue.getStats();
    let state: SyncState = 'online';

    if (!this.isOnline) {
      state = 'offline';
    } else if (this.isProcessingQueue || this.isPulling) {
      state = 'syncing';
    } else if (failedCount > 0 || this.authBlocked) {
      state = 'error';
    } else if (pendingCount > 0) {
      state = 'pending';
    }

    return {
      state,
      isOnline: this.isOnline,
      isSyncing: this.isProcessingQueue || this.isPulling,
      pendingCount,
      failedCount,
      lastSyncTime: this.lastSyncTime,
      message: this.authBlocked ? 'نیازمند احراز هویت مجدد' : undefined,
    };
  }

  /**
   * Performs an actual HTTP probe to /api/v1/health to confirm backend reachability
   */
  public async checkBackendConnectivity(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/v1/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const ok = res.status >= 200 && res.status < 300;
      this.isOnline = ok;
      return ok;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Checks connectivity and triggers full sync if online
   */
  public async triggerOnlineCheckAndSync(): Promise<void> {
    const connected = await this.checkBackendConnectivity();
    this.notify();
    if (connected) {
      this.authBlocked = false;
      await this.syncAll();
    }
  }

  private async checkConnectivityAndSyncIfNeeded(): Promise<void> {
    const { pendingCount } = SyncQueue.getStats();
    const connected = await this.checkBackendConnectivity();
    this.notify();
    if (connected && pendingCount > 0) {
      await this.processQueue();
    }
  }

  /**
   * Enqueues an offline write operation with an idempotent client operation ID
   */
  public async enqueueOperation(type: QueueOperationType, payload: any): Promise<string> {
    const clientOperationId =
      payload.clientOperationId ||
      payload.id ||
      `op-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    SyncQueue.enqueue({
      id: clientOperationId,
      type,
      payload: { ...payload, clientOperationId },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5,
      status: 'pending',
    });

    this.notify();

    // Trigger immediate background sync if currently online
    if (this.isOnline && !this.isProcessingQueue) {
      this.processQueue().catch((e) =>
        console.warn('[SyncManager] Background processQueue failed:', e)
      );
    }

    return clientOperationId;
  }

  /**
   * Main sync processor: executes pending queue operations sequentially (FIFO)
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      console.log('[SyncManager] processQueue: already in progress (locked).');
      return;
    }

    this.isProcessingQueue = true;
    this.notify();

    try {
      const isConnected = await this.checkBackendConnectivity();
      if (!isConnected) {
        console.log('[SyncManager] Backend is currently unreachable. Pausing queue.');
        return;
      }

      const pending = SyncQueue.getPendingItems();
      console.log(`[SyncManager] Processing ${pending.length} pending items in offline queue...`);

      for (const item of pending) {
        // If authentication was rejected previously, attempt auto-acquisition before skipping
        if (this.authBlocked) {
          const recovered = await this.ensureControllerAuth();
          if (!recovered) {
            console.warn('[SyncManager] Queue halted: authentication required.');
            break;
          }
        }

        SyncQueue.updateItem(item.id, { status: 'processing' });
        this.notify();

        try {
          const success = await this.executeQueueItem(item);
          if (success) {
            SyncQueue.removeItem(item.id);
          }
        } catch (err: any) {
          console.error(`[SyncManager] Error executing queue item ${item.id}:`, err);

          const isAuthError =
            err?.status === 401 ||
            err?.errorCode === '401' ||
            err?.errorCode === 'UNAUTHORIZED' ||
            (typeof err?.message === 'string' &&
              (err.message.includes('توکن') || err.message.includes('احراز هویت')));

          if (isAuthError) {
            // Attempt automatic recovery: fetch controller token
            const recovered = await this.ensureControllerAuth();
            if (recovered) {
              try {
                const retrySuccess = await this.executeQueueItem(item);
                if (retrySuccess) {
                  SyncQueue.removeItem(item.id);
                  continue;
                }
              } catch (reErr) {
                console.warn(`[SyncManager] Retry after auth recovery failed for ${item.id}:`, reErr);
              }
            }

            this.authBlocked = true;
            SyncQueue.updateItem(item.id, {
              status: 'pending',
              lastError: 'احراز هویت الزامی است.',
            });
            break;
          }

          const isClientError =
            (err?.status >= 400 && err?.status < 500 && err?.status !== 429) ||
            err?.status === 403 ||
            err?.status === 404;
          const retryCount = (item.retryCount || 0) + 1;

          if (isClientError || retryCount >= (item.maxRetries || 5)) {
            SyncQueue.updateItem(item.id, {
              status: 'failed',
              permanentError: true,
              retryCount,
              lastError: err?.message || 'خطای دائمی در پردازش عملیات',
            });
          } else {
            SyncQueue.updateItem(item.id, {
              status: 'pending',
              retryCount,
              lastError: err?.message || 'خطای موقت در ارتباط با سرور',
            });

            // Exponential backoff wait before next item
            const backoffMs = Math.min(8000, 1000 * Math.pow(2, retryCount));
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.notify();
    }
  }

  /**
   * Ensures controller JWT token is available in storage for manager operations
   */
  public async ensureControllerAuth(): Promise<boolean> {
    const existing = authSessionManager.getToken();
    if (existing) {
      this.authBlocked = false;
      return true;
    }

    try {
      const settings = await localDataSource.getSettings();
      const pin = settings.pinCode || 'Mohammad128';
      const res = await remoteDataSource.loginController(pin);
      if (res.success && res.data?.token) {
        authSessionManager.setToken(res.data.token);
        this.authBlocked = false;
        console.log('[SyncManager] Auto-authenticated controller session successfully.');
        return true;
      }
    } catch (e) {
      console.warn('[SyncManager] Auto-controller auth attempt failed:', e);
    }
    return false;
  }

  /**
   * Dispatches an individual queue item to its corresponding REST endpoint
   */
  private async executeQueueItem(item: any): Promise<boolean> {
    // Proactively verify / acquire controller auth for admin actions
    if (ADMIN_OPERATION_TYPES.has(item.type)) {
      await this.ensureControllerAuth();
    }

    switch (item.type) {
      case 'SUBMISSION_CREATE': {
        const submission: UserSubmission = item.payload;
        const res = await remoteDataSource.submitExamAnswers(submission);
        if (res.success || (res as any).isDuplicate) {
          console.log(`[SyncManager] Submission ${item.id} synced successfully.`);
          return true;
        }
        throw new SyncError(res.message || 'خطا در ارسال برگه آزمون به سرور', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'POLL_VOTE': {
        const { itemId, optionIndex, clientOperationId } = item.payload;
        const res = await remoteDataSource.submitPollVote(
          itemId,
          optionIndex,
          clientOperationId || item.id
        );
        if (res.success || (res as any).isDuplicate) {
          console.log(`[SyncManager] Poll vote ${item.id} synced successfully.`);
          return true;
        }
        throw new SyncError(res.message || 'خطا در ثبت رأی نظرسنجی در سرور', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'USER_ONBOARD': {
        const profile = item.payload;
        const res = await remoteDataSource.loginOrRegisterUser(profile);
        if (res.success && res.data?.token) {
          apiClient.setToken(res.data.token);
          console.log(`[SyncManager] User onboarding ${item.id} synced with token.`);
          return true;
        }
        throw new SyncError(res.message || 'خطا در ثبت‌نام کاربر در سرور', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'CONTENT_SAVE': {
        const contentItem: ContentItem = item.payload;
        const res = await remoteDataSource.createOrUpdateContent(contentItem);
        if (res.success) {
          console.log(`[SyncManager] Content ${contentItem.id} saved to server.`);
          return true;
        }
        throw new SyncError(res.message || 'خطا در ذخیره محتوا در سرور', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'CONTENT_DELETE': {
        const { id } = item.payload;
        const res = await remoteDataSource.deleteContent(id);
        // If content was already deleted on server (404), consider operation fulfilled
        if (res.success || res.errorCode === '404' || res.message?.includes('یافت نشد')) {
          console.log(`[SyncManager] Content ${id} deleted (or already absent) on server.`);
          return true;
        }
        throw new SyncError(res.message || 'خطا در حذف محتوا از سرور', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'SETTINGS_UPDATE': {
        const settings = item.payload;
        const res = await remoteDataSource.updateSettings(settings);
        if (res.success) {
          console.log('[SyncManager] Settings updated on server.');
          return true;
        }
        throw new SyncError(res.message || 'خطا در به‌روزرسانی تنظیمات', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'MATAM_MODE_TOGGLE': {
        const { isMatamMode } = item.payload;
        const res = await remoteDataSource.setMatamMode(isMatamMode);
        if (res.success) {
          console.log('[SyncManager] Matam mode toggled on server.');
          return true;
        }
        throw new SyncError(res.message || 'خطا در تغییر وضعیت حالت ماتم', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'MAZAR_UPDATE': {
        const { programs } = item.payload;
        const res = await remoteDataSource.updateMazarPrograms(programs);
        if (res.success) return true;
        throw new SyncError(res.message || 'خطا در ذخیره برنامه‌های مزار', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'BANNERS_UPDATE': {
        const { banners } = item.payload;
        const res = await remoteDataSource.updateBanners(banners);
        if (res.success) return true;
        throw new SyncError(res.message || 'خطا در ذخیره بنرها', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'PRAYERS_UPDATE': {
        const { prayers } = item.payload;
        const res = await remoteDataSource.updatePrayers(prayers);
        if (res.success) return true;
        throw new SyncError(res.message || 'خطا در ذخیره ادعیه', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'IMAMOLOGY_UPDATE': {
        const { data } = item.payload;
        const res = await remoteDataSource.updateImamology(data);
        if (res.success) return true;
        throw new SyncError(res.message || 'خطا در ذخیره دانشنامه امام‌شناسی', Number(res.errorCode) || 500, res.errorCode);
      }

      case 'SUBMISSION_EVALUATE': {
        const { submissionId, feedback, score } = item.payload;
        const res = await remoteDataSource.evaluateSubmission(submissionId, feedback, score);
        if (res.success) return true;
        throw new SyncError(res.message || 'خطا در ثبت ارزیابی برگه', Number(res.errorCode) || 500, res.errorCode);
      }

      default:
        console.warn(`[SyncManager] Unknown operation type: ${item.type}`);
        return true;
    }
  }

  /**
   * Pulls latest authoritative data from server and updates local cache
   * Strategy: Server Wins for public content & settings
   */
  public async pullServerData(): Promise<void> {
    if (this.isPulling) {
      console.log('[SyncManager] pullServerData: already running (locked).');
      return;
    }

    this.isPulling = true;
    this.notify();

    try {
      const isConnected = await this.checkBackendConnectivity();
      if (!isConnected) return;

      console.log('[SyncManager] Pulling server data to synchronize local cache...');

      // 1. Content Items (Server Authoritative)
      await this.pullPublishedContent();

      // 2. Settings (Server Authoritative)
      await this.pullSettings();

      // 3. Mazar Programs, Banners, Prayers, Imamology
      await this.pullAuxiliaryData();

      // 4. Submissions (User evaluations update)
      await this.pullUserSubmissions();

      this.lastSyncTime = new Date().toISOString();
      console.log('[SyncManager] Pull sync completed at', this.lastSyncTime);
    } catch (err) {
      console.warn('[SyncManager] Error during server pull sync:', err);
    } finally {
      this.isPulling = false;
      this.notify();
    }
  }

  /**
   * Pulls published content from REST and updates local cache
   */
  public async pullPublishedContent(): Promise<void> {
    const hasPending = SyncQueue.getPendingItems().some(
      (i) => i.type === 'CONTENT_SAVE' || i.type === 'CONTENT_DELETE'
    );
    if (hasPending) {
      console.log('[SyncManager] Skipping pullPublishedContent: pending content changes in queue.');
      return;
    }

    try {
      const res = await remoteDataSource.fetchPublishedContent();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveItems(res.data);
        this.notifyDataUpdate('CONTENT_ITEMS', res.data);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull published content:', e);
    }
  }

  /**
   * Pulls system settings and merges safely without overwriting local controller PIN
   */
  public async pullSettings(): Promise<void> {
    const hasPending = SyncQueue.getPendingItems().some(
      (i) => i.type === 'SETTINGS_UPDATE' || i.type === 'MATAM_MODE_TOGGLE'
    );
    if (hasPending) {
      console.log('[SyncManager] Skipping pullSettings: pending settings changes in queue.');
      return;
    }

    try {
      const res = await remoteDataSource.fetchSettings();
      if (res.success && res.data) {
        const local = await localDataSource.getSettings();
        const merged: AdminSettings = {
          ...local,
          ...res.data,
          pinCode: res.data.pinCode || local.pinCode || 'Mohammad128',
        };
        await localDataSource.saveSettings(merged);
        this.notifyDataUpdate('SETTINGS', merged);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull settings:', e);
    }
  }

  public async pullMazarPrograms(): Promise<void> {
    try {
      const res = await remoteDataSource.fetchMazarPrograms();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveMazarPrograms(res.data);
        this.notifyDataUpdate('MAZAR_PROGRAMS', res.data);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull mazar programs:', e);
    }
  }

  public async pullBanners(): Promise<void> {
    try {
      const res = await remoteDataSource.fetchBanners();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveBanners(res.data);
        this.notifyDataUpdate('BANNERS', res.data);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull banners:', e);
    }
  }

  public async pullPrayers(): Promise<void> {
    try {
      const res = await remoteDataSource.fetchPrayers();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.savePrayers(res.data);
        this.notifyDataUpdate('PRAYERS', res.data);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull prayers:', e);
    }
  }

  public async pullImamology(): Promise<void> {
    try {
      const res = await remoteDataSource.fetchImamology();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveImamologyData(res.data);
        this.notifyDataUpdate('IMAMOLOGY', res.data);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull imamology:', e);
    }
  }

  /**
   * Pulls auxiliary collections: Mazar Programs, Banners, Prayers, Imamology
   */
  private async pullAuxiliaryData(): Promise<void> {
    await Promise.allSettled([
      this.pullMazarPrograms(),
      this.pullBanners(),
      this.pullPrayers(),
      this.pullImamology(),
    ]);
  }

  /**
   * Pulls user submissions from server and merges evaluations into local storage
   */
  public async pullUserSubmissions(): Promise<void> {
    try {
      const activeId = await localDataSource.getActiveAccountId();
      if (!activeId) return;

      const res = await remoteDataSource.fetchUserSubmissions(activeId);
      if (res.success && Array.isArray(res.data)) {
        const localSubs = await localDataSource.getSubmissions();
        const serverMap = new Map<string, UserSubmission>(res.data.map((s) => [s.id, s]));

        // Merge: If server has feedback or score for submission, update local record
        const updated = localSubs.map((sub) => {
          const remote = serverMap.get(sub.id);
          if (remote) {
            return {
              ...sub,
              totalScore: remote.totalScore ?? sub.totalScore,
              feedback: remote.feedback ?? sub.feedback,
              controllerNoteAuthor: remote.controllerNoteAuthor ?? sub.controllerNoteAuthor,
              controllerNoteDate: remote.controllerNoteDate ?? sub.controllerNoteDate,
            };
          }
          return sub;
        });

        await localDataSource.saveSubmissions(updated);
      }
    } catch (e) {
      console.warn('[SyncManager] Failed to pull user submissions:', e);
    }
  }

  /**
   * Handles real-time WebSocket feedback update for a single evaluated submission
   */
  private async handleRemoteSubmissionEvaluation(payload: any): Promise<void> {
    if (!payload?.submissionId) return;
    try {
      const localSubs = await localDataSource.getSubmissions();
      const updated = localSubs.map((s) =>
        s.id === payload.submissionId
          ? {
              ...s,
              feedback: payload.feedback || s.feedback,
              totalScore: payload.scoreAwarded ?? s.totalScore,
              status: 'reviewed' as const,
            }
          : s
      );
      await localDataSource.saveSubmissions(updated);
      this.notify();
    } catch (e) {
      console.warn('[SyncManager] Failed to update evaluated submission locally:', e);
    }
  }

  /**
   * Full Synchronize: Push pending queue first, then pull latest server state
   */
  public async syncAll(): Promise<void> {
    console.log('[SyncManager] syncAll initiated.');
    await this.processQueue();
    await this.pullServerData();
  }

  /**
   * Resets authentication block after a fresh login
   */
  public onAuthSuccess(): void {
    this.authBlocked = false;
    this.notify();
    this.processQueue().catch((e) => console.warn('[SyncManager] Post-login queue sync error:', e));
  }

  /**
   * Clears failed items manually
   */
  public clearFailedQueueItems(): void {
    SyncQueue.clearFailed();
    this.notify();
  }
}

export const syncManager = SyncManager.getInstance();
