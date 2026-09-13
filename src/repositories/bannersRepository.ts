/**
 * Banners Repository
 * Remote First with LocalStorage Fallback
 */

import { BannerSlide } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';

export class BannersRepository {
  async getBanners(): Promise<BannerSlide[]> {
    try {
      const res = await remoteDataSource.fetchBanners();
      if (res.success && Array.isArray(res.data)) {
        await localDataSource.saveBanners(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('[BannersRepository] Remote fetch failed, using local storage fallback:', e);
    }
    return localDataSource.getBanners();
  }

  async saveBanners(banners: BannerSlide[]): Promise<void> {
    await localDataSource.saveBanners(banners);
    try {
      const res = await remoteDataSource.updateBanners(banners);
      if (!res.success) throw new Error(res.message);
    } catch (e) {
      console.warn('[BannersRepository] Remote update failed, queuing for sync:', e);
      await syncManager.enqueueOperation('BANNERS_UPDATE', { banners });
    }
  }
}

export const bannersRepository = new BannersRepository();
