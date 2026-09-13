import { useState, useEffect } from 'react';
import {
  ContentItem,
  UserSubmission,
  AdminSettings,
  ViewMode,
  UserAnswer,
  Account,
  AccountRole,
  isControllerRole,
  isUserRole,
  MazarProgram,
  BannerSlide,
  PrayerItem,
  InfalliblePerson,
  BookItem,
  MadahiItem,
} from './types';
import {
  getStoredItems,
  saveStoredItems,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredSettings,
  saveStoredSettings,
  getStoredUserProfile,
  saveStoredUserProfile,
  getStoredAccounts,
  saveStoredAccounts,
  deduplicateAccounts,
  deduplicateSubmissions,
  getStoredActiveAccountId,
  saveStoredActiveAccountId,
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
  resetAllData,
  isUserOnboardingCompleted,
  setUserOnboardingCompleted,
  saveStoredUserProfileData,
  saveUserOnboardingDraft,
  getStoredDarkMode,
  saveStoredDarkMode,
} from './utils/storage';
import { getStoredBooks, saveStoredBooks } from './utils/libraryStorage';
import { INITIAL_INFALLIBLES } from './data/initialImamologyData';
import { Navbar } from './components/Navbar';
import { UserPortal } from './components/UserPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BottomLeftSwitcher } from './components/BottomLeftSwitcher';
import { PersonalAccountModal } from './components/PersonalAccountModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { UserOnboardingPage } from './components/UserOnboardingPage';
import { ConnectedDevicesModal } from './components/ConnectedDevicesModal';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { formatPersianNumber } from './utils/formatters';
import {
  contentRepository,
  settingsRepository,
  mazarRepository,
  bannersRepository,
  prayersRepository,
  imamologyRepository,
  submissionRepository,
  authRepository,
  libraryRepository,
  navaRepository,
} from './repositories';
import { wsClient } from './services/websocket/wsClient';
import { apiClient } from './services/api/apiClient';
import { syncManager } from './services/sync/syncManager';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('user');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Onboarding status: gatekeeping user access until profile information is submitted
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() =>
    isUserOnboardingCompleted()
  );

  // App data states
  const [items, setItems] = useState<ContentItem[]>(() => getStoredItems());
  const [submissions, setSubmissions] = useState<UserSubmission[]>(() => getStoredSubmissions());
  const [settings, setSettings] = useState<AdminSettings>(() => getStoredSettings());
  const [mazarPrograms, setMazarPrograms] = useState<MazarProgram[]>(() => getStoredMazarPrograms());
  const [banners, setBanners] = useState<BannerSlide[]>(() => getStoredBannerSlides());
  const [prayers, setPrayers] = useState<PrayerItem[]>(() => getStoredPrayers());
  const [infallibles, setInfallibles] = useState<InfalliblePerson[]>(() =>
    getStoredImamologyData()
  );
  const [userProfile, setUserProfile] = useState<{ name: string; contact: string }>(() =>
    getStoredUserProfile()
  );

  // Personal accounts state
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string>(() =>
    getStoredActiveAccountId()
  );
  const [books, setBooks] = useState<BookItem[]>(() => getStoredBooks());
  const [madahiList, setMadahiList] = useState<MadahiItem[]>(() => getStoredNavaMadahi());

  // Modals state
  const [isPersonalAccountModalOpen, setIsPersonalAccountModalOpen] = useState(false);
  const [inspectingAccount, setInspectingAccount] = useState<Account | null>(null);
  const [isAccountManagerModalOpen, setIsAccountManagerModalOpen] = useState(false);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);

  // Active prayer reader state (hide bottom-left switcher when dedicated prayer view with audio is open)
  const [isReadingPrayer, setIsReadingPrayer] = useState(false);

  // Theme Modes: Dark Mode and Matam (Mourning) Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => getStoredDarkMode());

  // Apply dark mode class to documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('app-dark-mode');
    } else {
      document.documentElement.classList.remove('app-dark-mode');
    }
  }, [isDarkMode]);

  // Apply matam mode class to documentElement (overrides dark mode globally)
  useEffect(() => {
    if (settings.isMatamMode) {
      document.documentElement.classList.add('app-matam-mode');
    } else {
      document.documentElement.classList.remove('app-matam-mode');
    }
  }, [settings.isMatamMode]);

  // Stage 3 & 5: Load data via Repositories & Trigger Online/Offline Sync
  useEffect(() => {
    let isMounted = true;

    const refreshAllDataFromServer = () => {
      syncManager.triggerOnlineCheckAndSync().catch((e) => {
        console.warn('[App] Online sync notice:', e);
      });

      contentRepository.getContentItems(true).then((fetchedItems) => {
        if (isMounted && Array.isArray(fetchedItems)) {
          setItems(fetchedItems);
        }
      });

      settingsRepository.getSettings().then((fetchedSettings) => {
        if (isMounted && fetchedSettings) {
          setSettings((prev) => ({
            ...prev,
            ...fetchedSettings,
            pinCode: prev.pinCode,
          }));
        }
      });

      mazarRepository.getMazarPrograms().then((fetchedMazar) => {
        if (isMounted && Array.isArray(fetchedMazar)) {
          setMazarPrograms(fetchedMazar);
        }
      });

      bannersRepository.getBanners().then((fetchedBanners) => {
        if (isMounted && Array.isArray(fetchedBanners)) {
          setBanners(fetchedBanners);
        }
      });

      prayersRepository.getPrayers().then((fetchedPrayers) => {
        if (isMounted && Array.isArray(fetchedPrayers)) {
          setPrayers(fetchedPrayers);
        }
      });

      imamologyRepository.getImamologyData().then((fetchedImamology) => {
        if (isMounted && Array.isArray(fetchedImamology)) {
          setInfallibles(fetchedImamology);
        }
      });

      libraryRepository.getBooks().then((fetchedBooks) => {
        if (isMounted && Array.isArray(fetchedBooks)) {
          setBooks(fetchedBooks);
        }
      });

      authRepository.getAccounts().then((fetchedAccounts) => {
        if (isMounted && Array.isArray(fetchedAccounts)) {
          setAccounts(deduplicateAccounts(fetchedAccounts));
        }
      });

      navaRepository.getNavaMadahi().then((fetchedMadahi) => {
        if (isMounted && Array.isArray(fetchedMadahi)) {
          setMadahiList(fetchedMadahi);
        }
      });
    };

    // Initial pull from server
    refreshAllDataFromServer();

    // Re-pull whenever the app gains focus or user returns to tab on mobile
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        wsClient.connect();
        refreshAllDataFromServer();
      }
    };

    const handleOnline = () => {
      wsClient.connect();
      refreshAllDataFromServer();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    const unsubData = syncManager.onDataUpdate((type, data) => {
      if (!isMounted) return;
      if (type === 'CONTENT_ITEMS' && Array.isArray(data)) {
        setItems(data);
      } else if (type === 'SETTINGS' && data) {
        setSettings((prev) => ({ ...prev, ...data, pinCode: prev.pinCode }));
      } else if (type === 'MAZAR_PROGRAMS' && Array.isArray(data)) {
        setMazarPrograms(data);
      } else if (type === 'BANNERS' && Array.isArray(data)) {
        setBanners(data);
      } else if (type === 'PRAYERS' && Array.isArray(data)) {
        setPrayers(data);
      } else if (type === 'IMAMOLOGY' && Array.isArray(data)) {
        setInfallibles(data);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
      unsubData();
    };
  }, []);

  // Stage 4: WebSocket Real-Time Event Subscriptions
  useEffect(() => {
    wsClient.connect();

    // 1. Matam mode fast toggle event
    const unsubMatam = wsClient.on('MATAM_MODE_TOGGLED', (payload) => {
      if (payload && typeof payload.matamMode === 'boolean') {
        setSettings((prev) => ({
          ...prev,
          isMatamMode: payload.matamMode,
        }));
      }
    });

    // 2. Settings updated event
    const unsubSettings = wsClient.on('SETTINGS_CHANGED', (payload) => {
      if (payload) {
        setSettings((prev) => ({
          ...prev,
          ...payload,
          pinCode: prev.pinCode,
        }));
      }
    });

    // 3. New content published -> pull latest items from REST
    const unsubContent = wsClient.on('NEW_CONTENT_PUBLISHED', () => {
      contentRepository.getContentItems().then((fetchedItems) => {
        if (Array.isArray(fetchedItems)) {
          setItems(fetchedItems);
        }
      });
    });

    // 4. New submission alert -> refresh submissions for controllers
    const unsubSubmissionAlert = wsClient.on('NEW_SUBMISSION_ALERT', () => {
      submissionRepository.getSubmissions().then((fetchedSubs) => {
        if (Array.isArray(fetchedSubs)) {
          setSubmissions(deduplicateSubmissions(fetchedSubs));
        }
      });
    });

    // 5. Submission evaluated -> refresh evaluations
    const unsubEvaluated = wsClient.on('SUBMISSION_EVALUATED', () => {
      submissionRepository.getSubmissions().then((fetchedSubs) => {
        if (Array.isArray(fetchedSubs)) {
          setSubmissions(deduplicateSubmissions(fetchedSubs));
        }
      });
    });

    const unsubMazar = wsClient.on('MAZAR_PROGRAMS_UPDATED', () => {
      mazarRepository.getMazarPrograms().then((fetchedMazar) => {
        if (Array.isArray(fetchedMazar)) setMazarPrograms(fetchedMazar);
      });
    });

    const unsubBanners = wsClient.on('BANNERS_UPDATED', () => {
      bannersRepository.getBanners().then((fetchedBanners) => {
        if (Array.isArray(fetchedBanners)) setBanners(fetchedBanners);
      });
    });

    const unsubPrayers = wsClient.on('PRAYERS_UPDATED', () => {
      prayersRepository.getPrayers().then((fetchedPrayers) => {
        if (Array.isArray(fetchedPrayers)) setPrayers(fetchedPrayers);
      });
    });

    const unsubImamology = wsClient.on('IMAMOLOGY_UPDATED', () => {
      imamologyRepository.getImamologyData().then((fetchedImamology) => {
        if (Array.isArray(fetchedImamology)) setInfallibles(fetchedImamology);
      });
    });

    return () => {
      unsubMatam();
      unsubSettings();
      unsubContent();
      unsubSubmissionAlert();
      unsubEvaluated();
      unsubMazar();
      unsubBanners();
      unsubPrayers();
      unsubImamology();
    };
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      saveStoredDarkMode(next);
      return next;
    });
  };

  const handleToggleMatamMode = () => {
    const nextMatam = !settings.isMatamMode;
    setSettings((prev) => {
      const next = {
        ...prev,
        isMatamMode: nextMatam,
      };
      saveStoredSettings(next);
      return next;
    });
    settingsRepository.setMatamMode(nextMatam).catch((e) => {
      console.warn('[App] Failed to update matam mode in repository:', e);
    });
  };

  // Active account computation - primary criterion for role is activeAccount.role
  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ||
    accounts[0] || {
      id: 'usr-default',
      name: 'کاربر سیستم',
      role: 'user' as const,
      avatarColor: 'bg-emerald-600',
    };

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Sync state & handler for top floating card
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState(() => syncManager.getStats());

  useEffect(() => {
    const unsub = syncManager.subscribe((newStats) => {
      setSyncStats(newStats);
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await syncManager.triggerOnlineCheckAndSync();
      showToast('همگام‌سازی اطلاعات با سرور انجام شد');
    } catch (err) {
      console.warn('[App] Manual sync error:', err);
      showToast('خطا در ارتباط با سرور، اطلاعات ذخیره محلی شد');
    } finally {
      setTimeout(() => {
        setIsManualSyncing(false);
      }, 1500);
    }
  };

  const isSyncingActive = isManualSyncing || syncStats.isSyncing;

  // Keep userProfile aligned with activeAccount if active account is a user
  useEffect(() => {
    if (activeAccount && isUserRole(activeAccount.role)) {
      setUserProfile({
        name: activeAccount.name,
        contact: activeAccount.emailOrPhone || '',
      });
      saveStoredUserProfile({
        name: activeAccount.name,
        contact: activeAccount.emailOrPhone || '',
      });
    }
  }, [activeAccount.id, activeAccount.name]);

  // Mode & view navigation:
  // if role == CONTROLLER -> allow entry directly without password.
  // if role == USER -> prompt for controller password to upgrade role.
  const handleViewChange = (newView: ViewMode) => {
    setIsReadingPrayer(false);
    if (newView === 'admin') {
      if (isControllerRole(activeAccount.role)) {
        setCurrentView('admin');
      } else {
        setIsLoginModalOpen(true);
      }
    } else {
      setCurrentView('user');
    }
  };

  // Initial role upgrade: USER -> CONTROLLER upon typing correct controller PIN
  const handleAdminLoginSuccess = () => {
    setIsLoginModalOpen(false);

    // Promote the CURRENT active account to CONTROLLER role permanently
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === activeAccount.id) {
        return {
          ...acc,
          role: 'controller' as AccountRole,
          badgeTitle:
            acc.badgeTitle && acc.badgeTitle !== 'کاربر جدید' && acc.badgeTitle !== 'دانشجو'
              ? acc.badgeTitle
              : 'کنترل‌گر و ارزیاب',
        };
      }
      return acc;
    });

    setAccounts(updatedAccounts);
    saveStoredAccounts(updatedAccounts);
    saveStoredActiveAccountId(activeAccount.id);

    // Complete onboarding if user directly logged in as controller on first run
    if (!isOnboardingCompleted) {
      setUserOnboardingCompleted(true);
      setIsOnboardingCompleted(true);
    }

    setCurrentView('admin');
    syncManager.onAuthSuccess();
    showToast('رمز عبور تایید شد. نقش حساب شما به «کنترل‌گر» ارتقا یافت و ذخیره شد.');
  };

  // Return to user section (maintains the account's CONTROLLER role permanently)
  const handleLockAdmin = () => {
    setCurrentView('user');
    showToast('به بخش کاربر بازگشتید.');
  };

  // Account switching
  const handleSelectAccount = (account: Account) => {
    setActiveAccountId(account.id);
    saveStoredActiveAccountId(account.id);
    setIsAccountManagerModalOpen(false);

    if (isControllerRole(account.role)) {
      setCurrentView('admin');
    } else {
      setCurrentView('user');
      setUserProfile({
        name: account.name,
        contact: account.emailOrPhone || '',
      });
      saveStoredUserProfile({
        name: account.name,
        contact: account.emailOrPhone || '',
      });
    }

    showToast(`حساب کاربری "${account.name}" فعال شد.`);
  };

  const handleCreateAccount = async (newAccount: Account) => {
    try {
      await authRepository.createAccount(newAccount);
    } catch (e: any) {
      console.warn('[App] Remote auth createAccount notice:', e);
    }
    setAccounts((prev) => {
      const updated = deduplicateAccounts([newAccount, ...prev.filter((a) => a.id !== newAccount.id)]);
      saveStoredAccounts(updated);
      return updated;
    });
    handleSelectAccount(newAccount);
    showToast(`حساب شخصی برای "${newAccount.name}" ایجاد و فعال شد.`);
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await authRepository.deleteAccount(id);
    } catch (e: any) {
      console.warn('[App] Remote auth deleteAccount notice:', e);
    }
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveStoredAccounts(next);
      return next;
    });

    if (activeAccountId === id) {
      const remaining = accounts.filter((a) => a.id !== id);
      const fallback = remaining[0] || {
        id: 'usr-guest',
        name: 'کاربر مهمان',
        role: 'user' as const,
        avatarColor: 'bg-emerald-600',
      };
      setActiveAccountId(fallback.id);
      saveStoredActiveAccountId(fallback.id);
      if (isControllerRole(fallback.role)) {
        setCurrentView('admin');
      } else {
        setCurrentView('user');
        setUserProfile({ name: fallback.name, contact: fallback.emailOrPhone || '' });
        saveStoredUserProfile({ name: fallback.name, contact: fallback.emailOrPhone || '' });
      }
    }

    showToast('حساب کاربری با موفقیت حذف گردید.');
  };

  const handleSavePersonalNotes = (accountId: string, notes: string) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === accountId ? { ...a, personalNotes: notes } : a));
      saveStoredAccounts(updated);
      return updated;
    });
    showToast('یادداشت شخصی در حساب با موفقیت ثبت شد.');
  };

  const handleUpdateAccountPhoto = (accountId: string, photoUrl: string) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === accountId ? { ...a, avatarUrl: photoUrl } : a));
      saveStoredAccounts(updated);
      return updated;
    });
    showToast('تصویر پروفایل شما با موفقیت ذخیره شد.');
  };

  // Content Items Handlers
  const handleSaveItem = (item: ContentItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === item.id);
      let updated: ContentItem[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = item;
      } else {
        updated = [item, ...prev];
      }
      saveStoredItems(updated);
      return updated;
    });
    contentRepository.saveContentItem(item).catch((e) => {
      console.warn('[App] Failed to save item in repository:', e);
    });
    showToast(`مورد "${item.title}" با موفقیت ذخیره شد.`);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      saveStoredItems(updated);
      return updated;
    });
    contentRepository.deleteContentItem(itemId).catch((e) => {
      console.warn('[App] Failed to delete item in repository:', e);
    });
    showToast('مورد با موفقیت حذف گردید.');
  };

  // Mazar Programs Handlers
  const handleSaveMazarProgram = (program: MazarProgram) => {
    setMazarPrograms((prev) => {
      const existingIdx = prev.findIndex((p) => p.id === program.id);
      let updated: MazarProgram[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = program;
      } else {
        updated = [program, ...prev];
      }
      saveStoredMazarPrograms(updated);
      mazarRepository.saveMazarPrograms(updated).catch((e) => {
        console.warn('[App] Failed to save mazar programs in repository:', e);
      });
      return updated;
    });
    showToast(`برنامه "${program.title}" ثبت و بروزرسانی شد.`);
  };

  const handleDeleteMazarProgram = (programId: string) => {
    setMazarPrograms((prev) => {
      const updated = prev.filter((p) => p.id !== programId);
      saveStoredMazarPrograms(updated);
      mazarRepository.saveMazarPrograms(updated).catch((e) => {
        console.warn('[App] Failed to delete mazar program in repository:', e);
      });
      return updated;
    });
    showToast('برنامه مزار با موفقیت حذف شد.');
  };

  // Banner Slides Handlers
  const handleSaveBannerSlide = (slide: BannerSlide) => {
    setBanners((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === slide.id);
      let updated: BannerSlide[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = slide;
      } else {
        updated = [slide, ...prev];
      }
      saveStoredBannerSlides(updated);
      bannersRepository.saveBanners(updated).catch((e) => {
        console.warn('[App] Failed to save banners in repository:', e);
      });
      return updated;
    });
    showToast('بنر با موفقیت ثبت و ذخیره شد.');
  };

  const handleDeleteBannerSlide = (slideId: string) => {
    setBanners((prev) => {
      const updated = prev.filter((b) => b.id !== slideId);
      saveStoredBannerSlides(updated);
      bannersRepository.saveBanners(updated).catch((e) => {
        console.warn('[App] Failed to delete banner in repository:', e);
      });
      return updated;
    });
    showToast('بنر با موفقیت حذف شد.');
  };

  // Prayers & Ziyarat Handlers
  const handleSavePrayer = (prayer: PrayerItem) => {
    setPrayers((prev) => {
      const existingIdx = prev.findIndex((p) => p.id === prayer.id);
      let updated: PrayerItem[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = prayer;
      } else {
        updated = [prayer, ...prev];
      }
      saveStoredPrayers(updated);
      prayersRepository.savePrayers(updated).catch((e) => {
        console.warn('[App] Failed to save prayers in repository:', e);
      });
      return updated;
    });
    showToast('دعا / زیارت با موفقیت ذخیره شد.');
  };

  const handleDeletePrayer = (prayerId: string) => {
    setPrayers((prev) => {
      const updated = prev.filter((p) => p.id !== prayerId);
      saveStoredPrayers(updated);
      prayersRepository.savePrayers(updated).catch((e) => {
        console.warn('[App] Failed to delete prayer in repository:', e);
      });
      return updated;
    });
    showToast('دعا / زیارت با موفقیت حذف شد.');
  };

  // Poll voting handler
  const handleVotePoll = (itemId: string, optionIndex: number) => {
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === itemId) {
          const currentVotes = { ...(item.pollVotes || {}) };
          currentVotes[optionIndex] = (currentVotes[optionIndex] || 0) + 1;
          return { ...item, pollVotes: currentVotes };
        }
        return item;
      });
      saveStoredItems(updated);
      return updated;
    });

    // Enqueue poll vote for offline/online sync via repository
    contentRepository.submitPollVote(itemId, optionIndex).catch((e) => {
      console.warn('[App] Failed to enqueue poll vote for sync:', e);
    });

    showToast('رأی شما در نظرسنجی با موفقیت ثبت شد.');
  };

  const handleTogglePublish = (itemId: string) => {
    setItems((prev) => {
      const itemToUpdate = prev.find((item) => item.id === itemId);
      if (itemToUpdate) {
        contentRepository
          .saveContentItem({ ...itemToUpdate, isPublished: !itemToUpdate.isPublished })
          .catch((e) => {
            console.warn('[App] Failed to toggle publish in repository:', e);
          });
      }
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, isPublished: !item.isPublished } : item
      );
      saveStoredItems(updated);
      return updated;
    });
  };

  // User Submissions Handlers
  const handleSubmitUserAnswer = (
    userName: string,
    contact: string,
    answer: UserAnswer
  ) => {
    setSubmissions((prev) => {
      const existingIdx = prev.findIndex(
        (s) =>
          (s.userId && s.userId === activeAccount.id) ||
          s.userName.trim().toLowerCase() === userName.trim().toLowerCase()
      );

      let updatedSubmissions: UserSubmission[];

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const newAnswers: Record<string, UserAnswer> = {
          ...existing.answers,
          [answer.itemId]: answer,
        };

        const totalScore = Object.values(newAnswers).reduce(
          (sum, ans) => sum + (ans.scoreAwarded || 0),
          0
        );
        const maxScore = Object.values(newAnswers).reduce(
          (sum, ans) => sum + (ans.maxScore || 0),
          0
        );

        const updated: UserSubmission = {
          ...existing,
          userId: activeAccount.id,
          userName: userName.trim() || activeAccount.name,
          submittedAt: new Date().toISOString(),
          answers: newAnswers,
          totalScore,
          maxScore,
          userEmailOrPhone: contact || activeAccount.emailOrPhone || existing.userEmailOrPhone,
        };

        updatedSubmissions = [...prev];
        updatedSubmissions[existingIdx] = updated;
      } else {
        const newSubmission: UserSubmission = {
          id: `sub-${Date.now()}`,
          userId: activeAccount.id,
          userName: userName.trim() || activeAccount.name,
          userEmailOrPhone: (contact || activeAccount.emailOrPhone || '').trim(),
          submittedAt: new Date().toISOString(),
          answers: { [answer.itemId]: answer },
          totalScore: answer.scoreAwarded || 0,
          maxScore: answer.maxScore || 0,
        };
        updatedSubmissions = deduplicateSubmissions([newSubmission, ...prev]);
      }

      saveStoredSubmissions(updatedSubmissions);

      // Enqueue submission for online/offline sync
      const targetSubmission = existingIdx >= 0 ? updatedSubmissions[existingIdx] : updatedSubmissions[0];
      if (targetSubmission) {
        submissionRepository.saveSubmission(targetSubmission).catch((e) => {
          console.warn('[App] Failed to enqueue submission for sync:', e);
        });
      }

      return updatedSubmissions;
    });

    showToast('پاسخ شما با موفقیت در کارنامه حساب شخصی ثبت شد.');
  };

  const handleRetakeQuestion = (userName: string, itemId: string) => {
    setSubmissions((prev) => {
      const existingIdx = prev.findIndex(
        (s) =>
          (s.userId && s.userId === activeAccount.id) ||
          s.userName.trim().toLowerCase() === userName.trim().toLowerCase()
      );
      if (existingIdx < 0) return prev;

      const existing = prev[existingIdx];
      const newAnswers: Record<string, UserAnswer> = { ...existing.answers };
      delete newAnswers[itemId];

      const totalScore = Object.values(newAnswers).reduce(
        (sum, ans) => sum + (ans.scoreAwarded || 0),
        0
      );
      const maxScore = Object.values(newAnswers).reduce(
        (sum, ans) => sum + (ans.maxScore || 0),
        0
      );

      const updatedSubmissions = [...prev];
      updatedSubmissions[existingIdx] = {
        ...existing,
        answers: newAnswers,
        totalScore,
        maxScore,
      };

      saveStoredSubmissions(updatedSubmissions);
      return updatedSubmissions;
    });
    showToast('پاسخ قبلی پاک شد؛ می‌توانید مجدداً آزمون را تکرار فرمایید.');
  };

  const handleDeleteSubmission = (subId: string) => {
    setSubmissions((prev) => {
      const updated = prev.filter((s) => s.id !== subId);
      saveStoredSubmissions(updated);
      return updated;
    });
    submissionRepository.deleteSubmission(subId).catch((e) => {
      console.warn('[App] Failed to delete submission on server:', e);
    });
    showToast('پاسخ کاربر حذف شد.');
  };

  const handleUpdateSubmissionFeedback = (
    subId: string,
    feedback: string,
    newTotalScore: number
  ) => {
    setSubmissions((prev) => {
      const updated = prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              feedback,
              totalScore: newTotalScore,
              controllerNoteAuthor:
                isControllerRole(activeAccount.role)
                  ? activeAccount.name
                  : 'کنترل‌گر سیستم',
              controllerNoteDate: new Date().toISOString(),
            }
          : s
      );
      saveStoredSubmissions(updated);
      return updated;
    });
    submissionRepository.evaluateSubmission(subId, feedback, newTotalScore).catch((e) => {
      console.warn('[App] Failed to evaluate submission in repository:', e);
    });
    showToast('یادداشت، ارزیابی و نمره در حساب کاربر ثبت شد.');
  };

  // Settings Handlers
  const handleUpdateSettings = (newSettings: AdminSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    settingsRepository.updateSettings(newSettings).catch((e) => {
      console.warn('[App] Failed to update settings in repository:', e);
    });
    showToast('تنظیمات سامانه ذخیره گردید.');
  };

  const handleResetData = () => {
    resetAllData();
    setItems(getStoredItems());
    setSubmissions(getStoredSubmissions());
    setSettings(getStoredSettings());
    setAccounts(getStoredAccounts());
    setActiveAccountId(getStoredActiveAccountId());
    setMazarPrograms(getStoredMazarPrograms());
    setBanners(getStoredBannerSlides());
    setPrayers(getStoredPrayers());
    setInfallibles(getStoredImamologyData());
    setIsOnboardingCompleted(isUserOnboardingCompleted());
    showToast('داده‌ها به حالت نمونه اولیه بازنشانی شدند.');
  };

  const handleSaveInfallible = (updatedPerson: InfalliblePerson) => {
    setInfallibles((prev) => {
      const next = prev.map((p) => (p.id === updatedPerson.id ? updatedPerson : p));
      saveStoredImamologyData(next);
      imamologyRepository.saveImamologyData(next).catch((e) => {
        console.warn('[App] Failed to save infallible in repository:', e);
      });
      return next;
    });
    showToast(`اطلاعات «${updatedPerson.name}» ذخیره شد.`);
  };

  const handleResetImamology = () => {
    setInfallibles(INITIAL_INFALLIBLES);
    saveStoredImamologyData(INITIAL_INFALLIBLES);
    showToast('متون دانشنامه امام‌شناسی به حالت اولیه بازنشانی شد.');
  };

  const handleImportData = (
    importedItems: ContentItem[],
    importedSubmissions: UserSubmission[]
  ) => {
    setItems(importedItems);
    saveStoredItems(importedItems);
    if (importedSubmissions.length > 0) {
      const clean = deduplicateSubmissions(importedSubmissions);
      setSubmissions(clean);
      saveStoredSubmissions(clean);
    }
    showToast('اطلاعات با موفقیت وارد سامانه شد.');
  };

  const handleUpdateUserProfile = (profile: { name: string; contact: string }) => {
    setUserProfile(profile);
    saveStoredUserProfile(profile);

    // Also update current activeAccount name if role is user
    if (isUserRole(activeAccount.role)) {
      setAccounts((prev) => {
        const updated = prev.map((a) =>
          a.id === activeAccount.id
            ? { ...a, name: profile.name, emailOrPhone: profile.contact }
            : a
        );
        saveStoredAccounts(updated);
        return updated;
      });
    }

    showToast(`مشخصات با نام "${profile.name}" ذخیره شد.`);
  };

  const handleOnboardingComplete = (data: {
    fullName: string;
    phoneNumber: string;
    email: string;
    age: string;
  }) => {
    setUserOnboardingCompleted(true);
    setIsOnboardingCompleted(true);

    // Save detailed profile data
    saveStoredUserProfileData({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      email: data.email,
      age: data.age,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    });

    // Save simple profile for compatibility with answers & submissions
    const profile = {
      name: data.fullName,
      contact: data.phoneNumber || data.email,
    };
    setUserProfile(profile);
    saveStoredUserProfile(profile);

    // Non-blocking background registration with backend API (Stage 3 Auth bridge)
    authRepository
      .onboardUser({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email,
        age: data.age,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      })
      .then(() => {
        const token = apiClient.getToken();
        if (token) {
          wsClient.authenticate(token);
        }
      })
      .catch((err) => {
        console.warn('[Onboarding] Remote user registration offline/notice:', err);
        // Enqueue user onboarding for offline sync
        syncManager.enqueueOperation('USER_ONBOARD', {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          age: data.age,
        }).catch((e) => console.warn('[Onboarding] Failed to enqueue onboard:', e));
      });

    // Update activeAccount and accounts list with real user information
    setAccounts((prev) => {
      const updated = prev.map((acc) => {
        if (acc.id === activeAccountId || (isUserRole(acc.role) && acc.id === 'usr-1')) {
          return {
            ...acc,
            name: data.fullName,
            emailOrPhone: data.phoneNumber || data.email,
            phone: data.phoneNumber,
            email: data.email,
            age: data.age,
          };
        }
        return acc;
      });
      saveStoredAccounts(updated);
      return updated;
    });

    showToast(`اطلاعات شما با موفقیت ثبت شد. به سامانه خوش آمدید!`);
  };

  // Digital Library Handlers
  const handleSaveBook = async (book: BookItem) => {
    const updated = await libraryRepository.saveBook(book);
    setBooks(updated);
    showToast(`کتاب «${book.title}» با موفقیت ذخیره شد.`);
  };

  const handleDeleteBook = async (id: string) => {
    const updated = await libraryRepository.deleteBook(id);
    setBooks(updated);
    showToast('کتاب با موفقیت از کتابخانه دیجیتال حذف شد.');
  };

  // Nava Madahi Handlers
  const handleSaveMadahi = async (item: MadahiItem) => {
    try {
      const updated = await navaRepository.saveNavaMadahi(item);
      setMadahiList(updated);
      showToast(`نوای «${item.title}» با موفقیت ذخیره و منتشر شد.`);
    } catch (err) {
      console.error('Failed to save madahi:', err);
      showToast('خطا در ذخیره نوای مداحی');
    }
  };

  const handleDeleteMadahi = async (id: string) => {
    try {
      const updated = await navaRepository.deleteNavaMadahi(id);
      setMadahiList(updated);
      showToast('نوای مداحی با موفقیت حذف شد.');
    } catch (err) {
      console.error('Failed to delete madahi:', err);
      showToast('خطا در حذف نوای مداحی');
    }
  };

  const handleLogout = async () => {
    // 1. Terminate remote session via authRepository without deleting user account
    try {
      await authRepository.logout();
    } catch (e: any) {
      console.warn('[App] Remote auth logout notice:', e);
    }

    // 2. Clear stored user profiles, draft, and active account id
    saveStoredUserProfile({ name: '', contact: '' });
    saveStoredUserProfileData(null as any);
    saveUserOnboardingDraft({
      fullName: '',
      phoneNumber: '',
      email: '',
      age: '',
    });
    saveStoredActiveAccountId('');
    setActiveAccountId('');

    // 3. Mark onboarding as false to safely direct to onboarding / sign-in
    setUserOnboardingCompleted(false);
    setIsOnboardingCompleted(false);

    // 4. Ensure currentView is user and close any open modals
    setCurrentView('user');
    setIsPersonalAccountModalOpen(false);
    setIsAccountManagerModalOpen(false);
    setIsDevicesModalOpen(false);

    showToast('خروج از حساب کاربری با موفقیت انجام شد.');
  };

  const activeItemsCount = items.filter((i) => i.isPublished).length;

  // Gatekeeping: If onboarding is not completed and user is not in admin dashboard, render UserOnboardingPage
  if (!isOnboardingCompleted && currentView !== 'admin') {
    return (
      <div className="min-h-screen bg-stone-950 font-sans">
        <UserOnboardingPage
          existingAccounts={accounts}
          onComplete={handleOnboardingComplete}
          onAdminLoginClick={() => setIsLoginModalOpen(true)}
        />

        {/* Admin Login Modal (for controller access directly from onboarding) */}
        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={handleAdminLoginSuccess}
          correctPin={settings.pinCode}
        />

        {toastMsg && (
          <div
            id="onboarding-toast-notification"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-700 text-xs sm:text-sm animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    );
  }

  // Find submission for account being viewed in modal
  const targetAccountForModal = inspectingAccount || activeAccount;
  const targetSubmissionForModal =
    submissions.find(
      (s) =>
        (s.userId && s.userId === targetAccountForModal.id) ||
        s.userName.trim().toLowerCase() === targetAccountForModal.name.trim().toLowerCase()
    ) || null;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-100 selection:text-amber-900 pb-16">
      {/* Floating Header Card at Top: مزار شهدای گمنام (لمس برای همگام‌سازی) */}
      <div
        id="top-floating-card-mazar"
        className="fixed top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[92vw] max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl"
      >
        <button
          type="button"
          id="top-floating-card-mazar-btn"
          onClick={handleManualSync}
          title="مزار شهدای گمنام (برای همگام‌سازی اطلاعات با سرور لمس نمایید)"
          className="w-full flex items-center justify-between gap-3 sm:gap-6 px-6 sm:px-10 py-2.5 sm:py-3.5 bg-stone-900/95 text-white border-2 border-stone-700/90 hover:border-amber-400/60 rounded-full shadow-2xl backdrop-blur-md select-none transition-all duration-300 active:scale-95 cursor-pointer group"
        >
          {/* توپ سمت راست (در چیدمان راست‌به‌چپ): سبز با خاموش و روشن شدن */}
          <div className="flex items-center gap-1.5 shrink-0" title="نشانگر سبز (روشن و خاموش)">
            <span className="relative flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.95)] animate-blink-ball" />
            </span>
          </div>

          {/* نوشته مزار شهدای گمنام و نمایش وضعیت همگام‌سازی */}
          <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
            {isSyncingActive && (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className="text-sm sm:text-base md:text-lg font-black tracking-wider text-white whitespace-nowrap text-center transition-colors group-hover:text-amber-300">
              {isSyncingActive ? 'درحال همگام‌سازی اطلاعات...' : 'مزار شهدای گمنام'}
            </span>
          </div>

          {/* توپ سمت چپ (در چیدمان راست‌به‌چپ): قرمز با خاموش و روشن شدن */}
          <div className="flex items-center gap-1.5 shrink-0" title="نشانگر قرمز (روشن و خاموش)">
            <span className="relative flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.95)] animate-blink-ball" />
            </span>
          </div>
        </button>
      </div>

      {/* Top spacing bar for the floating header */}
      <div className="h-16 sm:h-18 shrink-0" aria-hidden="true" />

      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        isAdminUnlocked={isControllerRole(activeAccount.role)}
        onLockAdmin={handleLockAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentView === 'admin' ? (
          <AdminDashboard
            items={items}
            submissions={submissions}
            settings={settings}
            accounts={accounts}
            activeAccount={activeAccount}
            onLockAdmin={handleLockAdmin}
            onOpenUserAccountModal={(acc) => {
              setInspectingAccount(acc);
              setIsPersonalAccountModalOpen(true);
            }}
            onSaveItem={handleSaveItem}
            onDeleteItem={handleDeleteItem}
            onTogglePublish={handleTogglePublish}
            onDeleteSubmission={handleDeleteSubmission}
            onUpdateSubmissionFeedback={handleUpdateSubmissionFeedback}
            onUpdateSettings={handleUpdateSettings}
            onResetData={handleResetData}
            onImportData={handleImportData}
            mazarPrograms={mazarPrograms}
            onSaveMazarProgram={handleSaveMazarProgram}
            onDeleteMazarProgram={handleDeleteMazarProgram}
            banners={banners}
            onSaveBannerSlide={handleSaveBannerSlide}
            onDeleteBannerSlide={handleDeleteBannerSlide}
            prayers={prayers}
            onSavePrayer={handleSavePrayer}
            onDeletePrayer={handleDeletePrayer}
            onActivePrayerChange={setIsReadingPrayer}
            infallibles={infallibles}
            onSaveInfallible={handleSaveInfallible}
            onResetImamology={handleResetImamology}
            isMatamMode={Boolean(settings.isMatamMode)}
            onToggleMatamMode={handleToggleMatamMode}
            books={books}
            onSaveBook={handleSaveBook}
            onDeleteBook={handleDeleteBook}
            madahiItems={madahiList}
            onSaveMadahi={handleSaveMadahi}
            onDeleteMadahi={handleDeleteMadahi}
            onDeleteAccount={handleDeleteAccount}
            onOpenAccountManagerModal={() => setIsAccountManagerModalOpen(true)}
          />
        ) : (
          <UserPortal
            items={items}
            submissions={submissions}
            settings={settings}
            userProfile={userProfile}
            activeAccount={activeAccount}
            accounts={accounts}
            banners={banners}
            prayers={prayers}
            mazarPrograms={mazarPrograms}
            infallibles={infallibles}
            onSaveInfallible={handleSaveInfallible}
            isDarkMode={isDarkMode}
            isMatamMode={Boolean(settings.isMatamMode)}
            books={books}
            onSaveBook={handleSaveBook}
            onDeleteBook={handleDeleteBook}
            onOpenControllerMazar={() => handleViewChange('admin')}
            onOpenPersonalAccount={() => {
              setInspectingAccount(activeAccount);
              setIsPersonalAccountModalOpen(true);
            }}
            onUpdateUserProfile={handleUpdateUserProfile}
            onUpdateAccountPhoto={(url) => handleUpdateAccountPhoto(activeAccount.id, url)}
            onSubmitUserAnswer={handleSubmitUserAnswer}
            onRetakeQuestion={handleRetakeQuestion}
            onVotePoll={handleVotePoll}
            onSavePrayer={handleSavePrayer}
            onDeletePrayer={handleDeletePrayer}
            onActivePrayerChange={setIsReadingPrayer}
            madahiItems={madahiList}
            onSaveMadahi={handleSaveMadahi}
            onDeleteMadahi={handleDeleteMadahi}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* FLOATING BOTTOM-LEFT SWITCHER & ACCOUNT CONTROLS (Hidden when reading prayer with floating audio player) */}
      {!isReadingPrayer && (
        <BottomLeftSwitcher
          currentView={currentView}
          onViewChange={handleViewChange}
          isAdminUnlocked={isControllerRole(activeAccount.role)}
          onLockAdmin={handleLockAdmin}
          activeAccount={activeAccount}
          onLogout={handleLogout}
          onOpenConnectedDevices={() => setIsDevicesModalOpen(true)}
          onOpenPersonalAccount={() => {
            setInspectingAccount(activeAccount);
            setIsPersonalAccountModalOpen(true);
          }}
          totalSubmissionsCount={submissions.length}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          isMatamMode={Boolean(settings.isMatamMode)}
        />
      )}

      {/* Toast Notification (Positioned at bottom-right) */}
      {toastMsg && (
        <div
          id="global-toast-notification"
          className="fixed bottom-14 right-4 z-50 flex items-center gap-2 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-700 text-xs sm:text-sm animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Connected Devices / Sessions Modal */}
      <ConnectedDevicesModal
        isOpen={isDevicesModalOpen}
        onClose={() => setIsDevicesModalOpen(false)}
        onCurrentSessionRevoked={handleLogout}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
        correctPin={settings.pinCode}
      />

      {/* Personal Account & Exam Results Modal */}
      <PersonalAccountModal
        isOpen={isPersonalAccountModalOpen}
        onClose={() => {
          setIsPersonalAccountModalOpen(false);
          setInspectingAccount(null);
        }}
        account={targetAccountForModal}
        items={items}
        submission={targetSubmissionForModal}
        onSavePersonalNotes={handleSavePersonalNotes}
        onUpdateAccountPhoto={(url) => handleUpdateAccountPhoto(targetAccountForModal.id, url)}
        isControllerViewing={currentView === 'admin'}
        onControllerSaveFeedback={(subId, fb, newScore) => {
          handleUpdateSubmissionFeedback(subId, fb, newScore);
        }}
      />

      {/* Account Manager Modal */}
      <AccountManagerModal
        isOpen={isAccountManagerModalOpen}
        onClose={() => setIsAccountManagerModalOpen(false)}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={handleSelectAccount}
        onCreateAccount={handleCreateAccount}
        onDeleteAccount={handleDeleteAccount}
        submissions={submissions}
      />
    </div>
  );
}
