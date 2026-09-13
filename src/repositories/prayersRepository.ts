/**
 * Prayers Repository
 * Remote First with LocalStorage Fallback
 */

import { PrayerItem } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';

export class PrayersRepository {
  async getPrayers(): Promise<PrayerItem[]> {
    try {
      const res = await remoteDataSource.fetchPrayers();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.savePrayers(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[PrayersRepository] Remote fetch failed, using local storage fallback:', e);
    }
    return localDataSource.getPrayers();
  }

  async savePrayers(prayers: PrayerItem[]): Promise<void> {
    await localDataSource.savePrayers(prayers);
    try {
      const res = await remoteDataSource.updatePrayers(prayers);
      if (!res.success) throw new Error(res.message);
    } catch (e) {
      console.warn('[PrayersRepository] Remote update failed, queuing for sync:', e);
      await syncManager.enqueueOperation('PRAYERS_UPDATE', { prayers });
    }
  }
}

export const prayersRepository = new PrayersRepository();
