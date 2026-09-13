/**
 * WebSocket Event Contracts and Envelopes (Server-side)
 * Adheres strictly to Stage 4 specification.
 */

export type WebSocketEventType =
  | 'MATAM_MODE_TOGGLED'
  | 'SETTINGS_CHANGED'
  | 'NEW_CONTENT_PUBLISHED'
  | 'NEW_SUBMISSION_ALERT'
  | 'SUBMISSION_EVALUATED'
  | 'MAZAR_PROGRAMS_UPDATED'
  | 'BANNERS_UPDATED'
  | 'PRAYERS_UPDATED'
  | 'IMAMOLOGY_UPDATED';

export interface WebSocketEnvelope<T = any> {
  event: WebSocketEventType | 'AUTH_SUCCESS' | 'AUTH_ERROR' | 'PONG';
  timestamp: string;
  payload: T;
}

export interface MatamModeToggledPayload {
  matamMode: boolean;
}

export interface SettingsChangedPayload {
  systemTitle?: string;
  allowRetake?: boolean;
  showCorrectAnswerImmediately?: boolean;
  requireNameBeforeParticipation?: boolean;
  isMatamMode?: boolean;
  updatedAt?: string;
}

export interface NewContentPublishedPayload {
  contentId: string;
  title: string;
  type: string;
}

export interface NewSubmissionAlertPayload {
  submissionId: string;
  examTitle: string;
  submittedAt: string;
  totalScore?: number;
  maxScore?: number;
}

export interface SubmissionEvaluatedPayload {
  submissionId: string;
  totalScore: number;
  maxScore: number;
  feedback?: string;
  userId: string;
}

export interface ClientInboundMessage {
  type?: string;
  event?: string;
  token?: string;
  payload?: any;
}
