import { MadahiItem } from '../types';
import { getStoredNavaMadahi, saveStoredNavaMadahi } from '../utils/storage';
import { remoteDataSource } from '../data/remote/remoteDataSource';

class NavaRepository {
  async getNavaMadahi(): Promise<MadahiItem[]> {
    try {
      const response = await remoteDataSource.fetchNavaMadahi();
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        saveStoredNavaMadahi(response.data);
        return response.data;
      }
    } catch (error) {
      console.warn('[NavaRepository] Remote fetch failed, falling back to local storage:', error);
    }
    return getStoredNavaMadahi();
  }

  async saveNavaMadahi(item: MadahiItem): Promise<MadahiItem[]> {
    const current = getStoredNavaMadahi();
    const existingIndex = current.findIndex((m) => m.id === item.id);
    let updated: MadahiItem[];

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...current];
    }
    saveStoredNavaMadahi(updated);

    // Sync with remote database
    try {
      if (existingIndex >= 0) {
        await remoteDataSource.updateNavaMadahi(item.id, item);
      } else {
        await remoteDataSource.createNavaMadahi(item);
      }
    } catch (error) {
      console.warn('[NavaRepository] Remote save failed, preserved locally:', error);
    }

    return updated;
  }

  async deleteNavaMadahi(id: string): Promise<MadahiItem[]> {
    const current = getStoredNavaMadahi();
    const updated = current.filter((m) => m.id !== id);
    saveStoredNavaMadahi(updated);

    // Sync with remote database
    try {
      await remoteDataSource.deleteNavaMadahi(id);
    } catch (error) {
      console.warn('[NavaRepository] Remote delete failed, removed locally:', error);
    }

    return updated;
  }
}

export const navaRepository = new NavaRepository();
