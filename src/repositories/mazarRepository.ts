/**
 * Mazar Programs Repository
 * Remote First with LocalStorage Fallback
 */

import { MazarProgram } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';

export class MazarRepository {
  async getMazarPrograms(): Promise<MazarProgram[]> {
    try {
      const res = await remoteDataSource.fetchMazarPrograms();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveMazarPrograms(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[MazarRepository] Remote fetch failed, using local storage fallback:', e);
    }
    return localDataSource.getMazarPrograms();
  }

  async saveMazarPrograms(programs: MazarProgram[]): Promise<void> {
    await localDataSource.saveMazarPrograms(programs);
    try {
      const res = await remoteDataSource.updateMazarPrograms(programs);
      if (!res.success) throw new Error(res.message);
    } catch (e) {
      console.warn('[MazarRepository] Remote update failed, queuing for sync:', e);
      await syncManager.enqueueOperation('MAZAR_UPDATE', { programs });
    }
  }
}

export const mazarRepository = new MazarRepository();
