/**
 * Offline Sync Queue Storage Engine
 * Manages persisted FIFO queue in localStorage under key 'sqm_sync_queue_v1'.
 * Survives page reloads and browser restarts without data loss.
 */

import { SyncQueueItem } from './types';

export const SYNC_QUEUE_STORAGE_KEY = 'sqm_sync_queue_v1';

export class SyncQueue {
  /**
   * Retrieves all items currently in the sync queue
   */
  static getItems(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[SyncQueue] Failed to load queue from storage:', e);
      return [];
    }
  }

  /**
   * Saves the list of items to localStorage
   */
  static saveItems(items: SyncQueueItem[]): void {
    try {
      localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[SyncQueue] Failed to save queue to storage:', e);
    }
  }

  /**
   * Appends a new operation item to the end of the queue (FIFO)
   */
  static enqueue(item: SyncQueueItem): void {
    const items = this.getItems();
    // Prevent duplicate enqueuing of the exact same client operation ID
    const exists = items.some((i) => i.id === item.id);
    if (!exists) {
      items.push(item);
      this.saveItems(items);
    }
  }

  /**
   * Updates an existing item in the queue (e.g. status, retryCount, lastError)
   */
  static updateItem(id: string, updates: Partial<SyncQueueItem>): void {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates };
      this.saveItems(items);
    }
  }

  /**
   * Removes a processed item from the queue
   */
  static removeItem(id: string): void {
    const items = this.getItems();
    const filtered = items.filter((i) => i.id !== id);
    this.saveItems(filtered);
  }

  /**
   * Gets all pending items ordered by createdAt (FIFO)
   */
  static getPendingItems(): SyncQueueItem[] {
    return this.getItems()
      .filter(
        (i) =>
          !i.permanentError &&
          i.status !== 'failed' &&
          (i.retryCount || 0) < (i.maxRetries || 5)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Returns queue statistics (pending count, failed count)
   */
  static getStats(): { pendingCount: number; failedCount: number } {
    const items = this.getItems();
    let pendingCount = 0;
    let failedCount = 0;
    for (const item of items) {
      if (item.status === 'failed' || item.permanentError) {
        failedCount++;
      } else {
        pendingCount++;
      }
    }
    return { pendingCount, failedCount };
  }

  /**
   * Clears all failed or permanent error items from the queue
   */
  static clearFailed(): void {
    const items = this.getItems().filter((i) => i.status !== 'failed' && !i.permanentError);
    this.saveItems(items);
  }
}
