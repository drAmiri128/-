/**
 * Content Repository
 * Provides access to Content Items & Quizzes with Remote First & Local Fallback.
 */

import { IContentRepository } from '../architecture/contracts';
import { ContentItem } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';
import { SyncQueue } from '../services/sync/syncQueue';

export class ContentRepository implements IContentRepository {
  async getContentItems(forceRefresh = false): Promise<ContentItem[]> {
    const hasPending = SyncQueue.getPendingItems().some(
      (i) => i.type === 'CONTENT_SAVE' || i.type === 'CONTENT_DELETE'
    );
    if (hasPending && !forceRefresh) {
      return localDataSource.getItems();
    }

    try {
      const res = await remoteDataSource.fetchPublishedContent();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveItems(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[ContentRepository] Remote fetch failed, using local storage fallback:', e);
    }
    // Safe Offline Fallback to localStorage
    return localDataSource.getItems();
  }

  async getContentItemsForAdmin(forceRefresh = false): Promise<ContentItem[]> {
    const hasPending = SyncQueue.getPendingItems().some(
      (i) => i.type === 'CONTENT_SAVE' || i.type === 'CONTENT_DELETE'
    );
    if (hasPending && !forceRefresh) {
      return localDataSource.getItems();
    }

    try {
      const res = await remoteDataSource.fetchAllContentAdmin();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveItems(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[ContentRepository] Remote admin fetch failed, using local storage fallback:', e);
    }
    return localDataSource.getItems();
  }

  async saveContentItem(item: ContentItem): Promise<void> {
    const current = await localDataSource.getItems();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: ContentItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    await localDataSource.saveItems(updated);

    try {
      const res = await remoteDataSource.createOrUpdateContent(item);
      if (!res.success) {
        throw new Error(res.message || 'Remote save content failed');
      }
    } catch (e) {
      console.warn('[ContentRepository] Failed to save content on server, queuing for sync:', e);
      await syncManager.enqueueOperation('CONTENT_SAVE', item);
    }
  }

  async deleteContentItem(id: string): Promise<void> {
    const current = await localDataSource.getItems();
    const updated = current.filter((i) => i.id !== id);
    await localDataSource.saveItems(updated);

    try {
      const res = await remoteDataSource.deleteContent(id);
      if (!res.success) {
        throw new Error(res.message || 'Remote delete content failed');
      }
    } catch (e) {
      console.warn('[ContentRepository] Failed to delete content on server, queuing for sync:', e);
      await syncManager.enqueueOperation('CONTENT_DELETE', { id });
    }
  }

  async submitPollVote(itemId: string, optionIndex: number): Promise<void> {
    const current = await localDataSource.getItems();
    const updated = current.map((item) => {
      if (item.id === itemId) {
        const votes = { ...(item.pollVotes || {}) };
        votes[optionIndex] = (votes[optionIndex] || 0) + 1;
        return { ...item, pollVotes: votes };
      }
      return item;
    });
    await localDataSource.saveItems(updated);

    // Queue poll vote for sync with unique idempotency clientOperationId
    const clientOperationId = `vote-${itemId}-${optionIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      await syncManager.enqueueOperation('POLL_VOTE', {
        itemId,
        optionIndex,
        clientOperationId,
      });
    } catch (e) {
      console.warn('[ContentRepository] Failed to enqueue poll vote for sync:', e);
    }
  }
}

export const contentRepository = new ContentRepository();
