/**
 * Settings Repository
 * Provides access to System Settings with Remote First & Local Fallback.
 */

import { ISettingsRepository } from '../architecture/contracts';
import { AdminSettings } from '../types';
import { remoteDataSource } from '../data/remote/remoteDataSource';
import { localDataSource } from '../data/local/localDataSource';
import { syncManager } from '../services/sync/syncManager';

export class SettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<AdminSettings> {
    const local = await localDataSource.getSettings();
    try {
      const res = await remoteDataSource.fetchSettings();
      if (res.success && res.data) {
        const merged: AdminSettings = {
          ...local,
          ...res.data,
          pinCode: res.data.pinCode || local.pinCode || 'Mohammad128',
        };
        await localDataSource.saveSettings(merged);
        return merged;
      }
    } catch (e) {
      console.warn('[SettingsRepository] Remote fetch failed, using local storage fallback:', e);
    }
    return local;
  }

  async updateSettings(settings: Partial<AdminSettings>): Promise<void> {
    const current = await localDataSource.getSettings();
    const updated = { ...current, ...settings };
    await localDataSource.saveSettings(updated);

    try {
      const res = await remoteDataSource.updateSettings(settings);
      if (!res.success) {
        throw new Error(res.message || 'Remote update settings failed');
      }
    } catch (e) {
      console.warn('[SettingsRepository] Failed to update remote settings, queuing for sync:', e);
      await syncManager.enqueueOperation('SETTINGS_UPDATE', settings);
    }
  }

  async setMatamMode(enabled: boolean): Promise<void> {
    const current = await localDataSource.getSettings();
    const updated = { ...current, isMatamMode: enabled };
    await localDataSource.saveSettings(updated);

    try {
      const res = await remoteDataSource.setMatamMode(enabled);
      if (!res.success) {
        throw new Error(res.message || 'Remote setMatamMode failed');
      }
    } catch (e) {
      console.warn('[SettingsRepository] Failed to set matam mode on server, queuing for sync:', e);
      await syncManager.enqueueOperation('MATAM_MODE_TOGGLE', { isMatamMode: enabled });
    }
  }
}

export const settingsRepository = new SettingsRepository();
