/**
 * Local Data Source
 * Implementation of ILocalDataSource using browser localStorage
 */

import { ILocalDataSource } from '../../architecture/contracts';
import {
  ContentItem,
  UserSubmission,
  AdminSettings,
  Account,
  MazarProgram,
  BannerSlide,
  PrayerItem,
  InfalliblePerson,
  UserProfileData,
  MadahiItem,
} from '../../types';
import {
  getStoredItems,
  saveStoredItems,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredSettings,
  saveStoredSettings,
  getStoredAccounts,
  saveStoredAccounts,
  getStoredActiveAccountId,
  saveStoredActiveAccountId,
  getStoredUserProfileData,
  saveStoredUserProfileData,
  getStoredDarkMode,
  saveStoredDarkMode,
  getStoredMazarPrograms,
  saveStoredMazarPrograms,
  getStoredBannerSlides,
  saveStoredBannerSlides,
  getStoredPrayers,
  saveStoredPrayers,
  getStoredImamologyData,
  saveStoredImamologyData,
  getStoredNavaMadahi,
  saveStoredNavaMadahi,
} from '../../utils/storage';

export class LocalDataSource implements ILocalDataSource {
  async getItems(): Promise<ContentItem[]> {
    return getStoredItems();
  }

  async saveItems(items: ContentItem[]): Promise<void> {
    saveStoredItems(items);
  }

  async getSubmissions(): Promise<UserSubmission[]> {
    return getStoredSubmissions();
  }

  async saveSubmissions(submissions: UserSubmission[]): Promise<void> {
    saveStoredSubmissions(submissions);
  }

  async getAccounts(): Promise<Account[]> {
    return getStoredAccounts();
  }

  async saveAccounts(accounts: Account[]): Promise<void> {
    saveStoredAccounts(accounts);
  }

  async getActiveAccountId(): Promise<string> {
    return getStoredActiveAccountId();
  }

  async saveActiveAccountId(id: string): Promise<void> {
    saveStoredActiveAccountId(id);
  }

  async getUserProfileData(): Promise<UserProfileData | null> {
    return getStoredUserProfileData();
  }

  async saveUserProfileData(data: UserProfileData): Promise<void> {
    saveStoredUserProfileData(data);
  }

  async getSettings(): Promise<AdminSettings> {
    return getStoredSettings();
  }

  async saveSettings(settings: AdminSettings): Promise<void> {
    saveStoredSettings(settings);
  }

  async getDarkMode(): Promise<boolean> {
    return getStoredDarkMode();
  }

  async saveDarkMode(enabled: boolean): Promise<void> {
    saveStoredDarkMode(enabled);
  }

  async getMazarPrograms(): Promise<MazarProgram[]> {
    return getStoredMazarPrograms();
  }

  async saveMazarPrograms(programs: MazarProgram[]): Promise<void> {
    saveStoredMazarPrograms(programs);
  }

  async getBanners(): Promise<BannerSlide[]> {
    return getStoredBannerSlides();
  }

  async saveBanners(banners: BannerSlide[]): Promise<void> {
    saveStoredBannerSlides(banners);
  }

  async getPrayers(): Promise<PrayerItem[]> {
    return getStoredPrayers();
  }

  async savePrayers(prayers: PrayerItem[]): Promise<void> {
    saveStoredPrayers(prayers);
  }

  async getImamologyData(): Promise<InfalliblePerson[]> {
    return getStoredImamologyData();
  }

  async saveImamologyData(data: InfalliblePerson[]): Promise<void> {
    saveStoredImamologyData(data);
  }

  async getNavaMadahi(): Promise<MadahiItem[]> {
    return getStoredNavaMadahi();
  }

  async saveNavaMadahi(items: MadahiItem[]): Promise<void> {
    saveStoredNavaMadahi(items);
  }
}

export const localDataSource = new LocalDataSource();
