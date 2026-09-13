/**
 * Imamology Repository
 * Remote First with LocalStorage Fallback
 */

import { InfalliblePerson } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';

export class ImamologyRepository {
  async getImamologyData(): Promise<InfalliblePerson[]> {
    try {
      const res = await remoteDataSource.fetchImamology();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveImamologyData(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[ImamologyRepository] Remote fetch failed, using local storage fallback:', e);
    }
    return localDataSource.getImamologyData();
  }

  async saveImamologyData(data: InfalliblePerson[]): Promise<void> {
    await localDataSource.saveImamologyData(data);
    try {
      const res = await remoteDataSource.updateImamology(data);
      if (!res.success) throw new Error(res.message);
    } catch (e) {
      console.warn('[ImamologyRepository] Remote update failed, queuing for sync:', e);
      await syncManager.enqueueOperation('IMAMOLOGY_UPDATE', { data });
    }
  }
}

export const imamologyRepository = new ImamologyRepository();
