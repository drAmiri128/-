import {
  ContentItem,
  AdminSettings,
  UserSubmission,
  Account,
  MazarProgram,
  BannerSlide,
  PrayerItem,
  UserProfileData,
  InfalliblePerson,
  MadahiItem,
} from '../types';
import {
  initialItems,
  defaultSettings,
  initialSampleSubmissions,
  initialAccounts,
  initialMazarPrograms,
  initialBannerSlides,
  initialPrayerItems,
} from '../data/initialData';
import { INITIAL_INFALLIBLES } from '../data/initialImamologyData';
import { initialMadahiList } from '../data/initialMadahi';

const ITEMS_KEY = 'sqm_content_items_v1';
const SUBMISSIONS_KEY = 'sqm_submissions_v1';
const SETTINGS_KEY = 'sqm_settings_v1';
const USER_PROFILE_KEY = 'sqm_user_profile_v1';
const ACCOUNTS_KEY = 'sqm_accounts_v1';
const ACTIVE_ACCOUNT_ID_KEY = 'sqm_active_account_id_v1';
const MAZAR_PROGRAMS_KEY = 'sqm_mazar_programs_v1';
const BANNERS_KEY = 'sqm_banners_v1';
const PRAYERS_KEY = 'sqm_prayers_v1';
const NAVA_MADAHI_KEY = 'sqm_nava_madahi_v1';
const USER_ONBOARDING_DRAFT_KEY = 'sqm_user_onboarding_draft_v1';
const USER_ONBOARDING_COMPLETED_KEY = 'sqm_user_onboarding_completed_v1';
const USER_PROFILE_DATA_KEY = 'sqm_user_profile_data_v1';

export function getStoredBannerSlides(): BannerSlide[] {
  try {
    const raw = localStorage.getItem(BANNERS_KEY);
    if (!raw) {
      localStorage.setItem(BANNERS_KEY, JSON.stringify(initialBannerSlides));
      return initialBannerSlides;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load banner slides:', e);
    return initialBannerSlides;
  }
}

export function saveStoredBannerSlides(slides: BannerSlide[]): void {
  try {
    localStorage.setItem(BANNERS_KEY, JSON.stringify(slides));
  } catch (e) {
    console.error('Failed to save banner slides:', e);
  }
}

export function getStoredPrayers(): PrayerItem[] {
  try {
    const raw = localStorage.getItem(PRAYERS_KEY);
    if (!raw) {
      localStorage.setItem(PRAYERS_KEY, JSON.stringify(initialPrayerItems));
      return initialPrayerItems;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load prayers:', e);
    return initialPrayerItems;
  }
}

export function saveStoredPrayers(prayers: PrayerItem[]): void {
  try {
    localStorage.setItem(PRAYERS_KEY, JSON.stringify(prayers));
  } catch (e) {
    console.error('Failed to save prayers:', e);
  }
}


export function getStoredMazarPrograms(): MazarProgram[] {
  try {
    const raw = localStorage.getItem(MAZAR_PROGRAMS_KEY);
    if (!raw) {
      localStorage.setItem(MAZAR_PROGRAMS_KEY, JSON.stringify(initialMazarPrograms));
      return initialMazarPrograms;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load mazar programs:', e);
    return initialMazarPrograms;
  }
}

export function saveStoredMazarPrograms(programs: MazarProgram[]): void {
  try {
    localStorage.setItem(MAZAR_PROGRAMS_KEY, JSON.stringify(programs));
  } catch (e) {
    console.error('Failed to save mazar programs:', e);
  }
}

export function deduplicateAccounts(accounts: Account[]): Account[] {
  if (!Array.isArray(accounts)) return [];
  const seen = new Set<string>();
  const result: Account[] = [];
  for (const acc of accounts) {
    if (!acc) continue;
    const id = acc.id || `acc-${Math.random()}`;
    if (!seen.has(id)) {
      seen.add(id);
      result.push(acc);
    }
  }
  return result;
}

export function deduplicateSubmissions(submissions: UserSubmission[]): UserSubmission[] {
  if (!Array.isArray(submissions)) return [];
  const seen = new Set<string>();
  const result: UserSubmission[] = [];
  for (const sub of submissions) {
    if (!sub) continue;
    const id = sub.id || `sub-${Math.random()}`;
    if (!seen.has(id)) {
      seen.add(id);
      result.push(sub);
    }
  }
  return result;
}

export function getStoredAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(initialAccounts));
      return initialAccounts;
    }
    const parsed: Account[] = JSON.parse(raw);
    const updated = parsed.map((acc) =>
      acc.role === 'controller' && (acc.pinCode === '1234' || !acc.pinCode)
        ? { ...acc, pinCode: 'Mohammad128' }
        : acc
    );
    const unique = deduplicateAccounts(updated);
    if (unique.length !== parsed.length) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(unique));
    }
    return unique;
  } catch (e) {
    console.error('Failed to load accounts from storage:', e);
    return initialAccounts;
  }
}

export function saveStoredAccounts(accounts: Account[]): void {
  try {
    const unique = deduplicateAccounts(accounts);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save accounts:', e);
  }
}

export function getStoredActiveAccountId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
    if (id) return id;
  } catch {
    // fallback
  }
  return 'usr-1'; // Default to first user
}

export function saveStoredActiveAccountId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, id);
  } catch (e) {
    console.error('Failed to save active account id:', e);
  }
}

export function getStoredItems(): ContentItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(initialItems));
      return initialItems;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load items from storage:', e);
    return initialItems;
  }
}

export function saveStoredItems(items: ContentItem[]): void {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items:', e);
  }
}

export function getStoredSubmissions(): UserSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    if (!raw) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(initialSampleSubmissions));
      return initialSampleSubmissions;
    }
    const parsed: UserSubmission[] = JSON.parse(raw);
    const unique = deduplicateSubmissions(parsed);
    if (unique.length !== parsed.length) {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(unique));
    }
    return unique;
  } catch (e) {
    console.error('Failed to load submissions:', e);
    return initialSampleSubmissions;
  }
}

export function saveStoredSubmissions(submissions: UserSubmission[]): void {
  try {
    const unique = deduplicateSubmissions(submissions);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save submissions:', e);
  }
}

export function getStoredSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    const parsed = JSON.parse(raw);
    const resolvedPin =
      !parsed.pinCode || parsed.pinCode === '1234' ? 'Mohammad128' : parsed.pinCode;
    return { ...defaultSettings, ...parsed, pinCode: resolvedPin };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return defaultSettings;
  }
}

export function saveStoredSettings(settings: AdminSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getStoredUserProfile(): { name: string; contact: string } {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return { name: '', contact: '' };
}

export function saveStoredUserProfile(profile: { name: string; contact: string }): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save user profile:', e);
  }
}

export function isUserOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(USER_ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUserOnboardingCompleted(completed: boolean): void {
  try {
    localStorage.setItem(USER_ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set onboarding status:', e);
  }
}

export function getUserOnboardingDraft(): {
  fullName: string;
  phoneNumber: string;
  email: string;
  age: string;
} {
  try {
    const raw = localStorage.getItem(USER_ONBOARDING_DRAFT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to get onboarding draft:', e);
  }
  return {
    fullName: '',
    phoneNumber: '',
    email: '',
    age: '',
  };
}

export function saveUserOnboardingDraft(draft: {
  fullName: string;
  phoneNumber: string;
  email: string;
  age: string;
}): void {
  try {
    localStorage.setItem(USER_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.error('Failed to save onboarding draft:', e);
  }
}

export function getStoredUserProfileData(): UserProfileData | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get user profile data:', e);
  }
  return null;
}

export function saveStoredUserProfileData(data: UserProfileData): void {
  try {
    localStorage.setItem(USER_PROFILE_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save user profile data:', e);
  }
}

const DARK_MODE_KEY = 'sqm_dark_mode_v1';

export function getStoredDarkMode(): boolean {
  try {
    const raw = localStorage.getItem(DARK_MODE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export function saveStoredDarkMode(enabled: boolean): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save dark mode:', e);
  }
}

const IMAMOLOGY_KEY = 'sqm_imamology_data_v1';

export function getStoredImamologyData(): InfalliblePerson[] {
  try {
    const raw = localStorage.getItem(IMAMOLOGY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get stored imamology data:', e);
  }
  return INITIAL_INFALLIBLES;
}

export function saveStoredImamologyData(data: InfalliblePerson[]): void {
  try {
    localStorage.setItem(IMAMOLOGY_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save imamology data:', e);
  }
}

export function getStoredNavaMadahi(): MadahiItem[] {
  try {
    const raw = localStorage.getItem(NAVA_MADAHI_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    localStorage.setItem(NAVA_MADAHI_KEY, JSON.stringify(initialMadahiList));
  } catch (e) {
    console.error('Failed to get stored nava madahi data:', e);
  }
  return initialMadahiList;
}

export function saveStoredNavaMadahi(items: MadahiItem[]): void {
  try {
    localStorage.setItem(NAVA_MADAHI_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save nava madahi data:', e);
  }
}

export function resetAllData(): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(initialItems));
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(initialSampleSubmissions));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(initialAccounts));
  localStorage.setItem(ACTIVE_ACCOUNT_ID_KEY, 'usr-1');
  localStorage.setItem(MAZAR_PROGRAMS_KEY, JSON.stringify(initialMazarPrograms));
  localStorage.setItem(BANNERS_KEY, JSON.stringify(initialBannerSlides));
  localStorage.setItem(PRAYERS_KEY, JSON.stringify(initialPrayerItems));
  localStorage.setItem(IMAMOLOGY_KEY, JSON.stringify(INITIAL_INFALLIBLES));
  localStorage.removeItem(USER_ONBOARDING_COMPLETED_KEY);
  localStorage.removeItem(USER_ONBOARDING_DRAFT_KEY);
  localStorage.removeItem(USER_PROFILE_DATA_KEY);
}

