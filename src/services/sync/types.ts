/**
 * Types for Stage 5 Online/Offline Sync Engine
 */

import { UserSubmission, UserProfileData } from '../../types';

export type SyncState = 'online' | 'offline' | 'syncing' | 'pending' | 'error';

export type QueueOperationType =
  | 'SUBMISSION_CREATE'
  | 'POLL_VOTE'
  | 'USER_ONBOARD'
  | 'CONTENT_SAVE'
  | 'CONTENT_DELETE'
  | 'SETTINGS_UPDATE'
  | 'MATAM_MODE_TOGGLE'
  | 'MAZAR_UPDATE'
  | 'BANNERS_UPDATE'
  | 'PRAYERS_UPDATE'
  | 'IMAMOLOGY_UPDATE'
  | 'SUBMISSION_EVALUATE';

export interface SyncQueueItem {
  id: string; // clientOperationId (unique idempotency key)
  type: QueueOperationType;
  payload: any;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
  lastError?: string;
  permanentError?: boolean;
}

export interface SyncStats {
  state: SyncState;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: string | null;
  message?: string;
}

export interface SubmissionPayload extends UserSubmission {
  clientOperationId: string;
}

export interface PollVotePayload {
  itemId: string;
  optionIndex: number;
  clientOperationId: string;
}

export interface UserOnboardPayload extends UserProfileData {
  clientOperationId: string;
}
