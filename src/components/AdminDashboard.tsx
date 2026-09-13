import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import {
  ContentItem,
  UserSubmission,
  AdminSettings,
  AdminTab,
  ItemType,
  Account,
  MazarProgram,
  BannerSlide,
  PrayerItem,
  InfalliblePerson,
  BookItem,
  MadahiItem,
  isUserRole,
} from '../types';
import {
  Plus,
  FileText,
  HelpCircle,
  MessageSquare,
  Users,
  Settings,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Unlock,
  Download,
  Upload,
  RefreshCw,
  Search,
  Award,
  AlertCircle,
  UserCheck,
  Shield,
  BookOpen,
  GraduationCap,
  Phone,
  Mail,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Clock,
  UserPlus,
  FileSignature,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Image,
  Headphones,
  Vote,
  ArrowRightLeft,
  Flame,
  KeyRound,
  Radio,
} from 'lucide-react';
import { formatPersianNumber, formatPersianDate, formatTimeAgo } from '../utils/formatters';
import { deduplicateAccounts, deduplicateSubmissions } from '../utils/storage';
import { ItemEditorModal } from './ItemEditorModal';
import { SubmissionDetailsModal } from './SubmissionDetailsModal';
import { MazarProgramsManager } from './MazarProgramsManager';
import { BannerSlidesManager } from './BannerSlidesManager';
import { PrayersPage } from './PrayersPage';
import { ImamologyManager } from './ImamologyManager';
import { DatabaseConfigCard } from './DatabaseConfigCard';
import { LibraryManager } from './LibraryManager';
import { NavaPage } from './NavaPage';

interface AdminDashboardProps {
  items: ContentItem[];
  submissions: UserSubmission[];
  settings: AdminSettings;
  accounts?: Account[];
  activeAccount?: Account;
  mazarPrograms?: MazarProgram[];
  banners?: BannerSlide[];
  prayers?: PrayerItem[];
  books?: BookItem[];
  isMatamMode?: boolean;
  onToggleMatamMode?: () => void;
  onOpenUserAccountModal?: (account: Account) => void;
  onOpenAccountManagerModal?: () => void;
  onLockAdmin?: () => void;
  onSaveItem: (item: ContentItem) => void;
  onDeleteItem: (itemId: string) => void;
  onTogglePublish: (itemId: string) => void;
  onDeleteSubmission: (submissionId: string) => void;
  onUpdateSubmissionFeedback: (
    submissionId: string,
    feedback: string,
    newTotalScore: number
  ) => void;
  onUpdateSettings: (newSettings: AdminSettings) => void;
  onResetData: () => void;
  onImportData: (importedItems: ContentItem[], importedSubmissions: UserSubmission[]) => void;
  onSaveMazarProgram?: (program: MazarProgram) => void;
  onDeleteMazarProgram?: (id: string) => void;
  onSaveBannerSlide?: (slide: BannerSlide) => void;
  onDeleteBannerSlide?: (id: string) => void;
  onSavePrayer?: (prayer: PrayerItem) => void;
  onDeletePrayer?: (id: string) => void;
  onActivePrayerChange?: (hasActivePrayer: boolean) => void;
  infallibles?: InfalliblePerson[];
  onSaveInfallible?: (person: InfalliblePerson) => void;
  onResetImamology?: () => void;
  onSaveBook?: (book: BookItem) => void;
  onDeleteBook?: (id: string) => void;
  onDeleteAccount?: (id: string) => void;
  madahiItems?: MadahiItem[];
  onSaveMadahi?: (item: MadahiItem) => void;
  onDeleteMadahi?: (id: string) => void;
}

export function AdminDashboard({
  items,
  submissions,
  settings,
  accounts = [],
  activeAccount,
  mazarPrograms = [],
  banners = [],
  prayers = [],
  infallibles = [],
  books = [],
  madahiItems = [],
  isMatamMode,
  onToggleMatamMode,
  onOpenUserAccountModal,
  onOpenAccountManagerModal,
  onLockAdmin,
  onSaveItem,
  onDeleteItem,
  onTogglePublish,
  onDeleteSubmission,
  onUpdateSubmissionFeedback,
  onUpdateSettings,
  onResetData,
  onImportData,
  onSaveMazarProgram,
  onDeleteMazarProgram,
  onSaveBannerSlide,
  onDeleteBannerSlide,
  onSavePrayer,
  onDeletePrayer,
  onActivePrayerChange,
  onSaveInfallible,
  onResetImamology,
  onSaveBook,
  onDeleteBook,
  onDeleteAccount,
  onSaveMadahi,
  onDeleteMadahi,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('content');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [inspectingSubmission, setInspectingSubmission] = useState<UserSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // In-app deletion & reset confirmation target (avoids window.confirm blocked in sandboxed iframes)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'item' | 'submission' | 'reset' | 'account';
    id?: string;
    title: string;
  } | null>(null);

  // Users & Results tab state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'tested' | 'pending' | 'evaluated'>('all');
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  const toggleUserExpand = (userId: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // PIN change state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Settings form state
  const [sysTitle, setSysTitle] = useState(settings.systemTitle);
  const [allowRetake, setAllowRetake] = useState(settings.allowRetake);
  const [showImmediateAnswer, setShowImmediateAnswer] = useState(
    settings.showCorrectAnswerImmediately
  );
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState(false);

  const isMatamActive = Boolean(isMatamMode ?? settings.isMatamMode);
  const [isMatamModeSetting, setIsMatamModeSetting] = useState<boolean>(() =>
    Boolean(settings.isMatamMode)
  );

  useEffect(() => {
    setIsMatamModeSetting(Boolean(settings.isMatamMode));
  }, [settings.isMatamMode]);

  const handleToggleMatam = () => {
    if (onToggleMatamMode) {
      onToggleMatamMode();
    } else {
      onUpdateSettings({
        ...settings,
        isMatamMode: !isMatamActive,
      });
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    return (
      sub.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.userEmailOrPhone && sub.userEmailOrPhone.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Process and enrich all user accounts with their test results
  const userAccounts = deduplicateAccounts(accounts.filter((a) => isUserRole(a.role)));
  const cleanSubmissions = deduplicateSubmissions(submissions);

  // Group unmatched submissions by participant (so each guest/participant appears only once)
  const unmatchedParticipantsMap = new Map<string, UserSubmission>();
  for (const sub of cleanSubmissions) {
    const matchesRegistered = userAccounts.some(
      (a) =>
        a.id === sub.userId ||
        a.name.trim().toLowerCase() === sub.userName.trim().toLowerCase()
    );
    if (!matchesRegistered) {
      const pKey = sub.userId
        ? `uid_${sub.userId}`
        : `name_${sub.userName.trim().toLowerCase()}_${(sub.userEmailOrPhone || '').trim().toLowerCase()}`;
      const existing = unmatchedParticipantsMap.get(pKey);
      if (!existing || new Date(sub.submittedAt).getTime() > new Date(existing.submittedAt).getTime()) {
        unmatchedParticipantsMap.set(pKey, sub);
      }
    }
  }
  const unmatchedSubmissions = Array.from(unmatchedParticipantsMap.values());

  interface EnrichedUser {
    account: Account;
    submission: UserSubmission | null;
    hasTested: boolean;
    scorePercent: number | null;
    totalAnswersCount: number;
    correctCount: number;
    wrongCount: number;
    descriptiveCount: number;
    hasFeedback: boolean;
  }

  const rawEnrichedUsers: EnrichedUser[] = [
    ...userAccounts.map((acc) => {
      const sub =
        cleanSubmissions.find(
          (s) =>
            (s.userId && s.userId === acc.id) ||
            s.userName.trim().toLowerCase() === acc.name.trim().toLowerCase()
        ) || null;

      let correctCount = 0;
      let wrongCount = 0;
      let descriptiveCount = 0;
      let totalAnswersCount = 0;
      let scorePercent: number | null = null;

      if (sub) {
        const answersArr = Object.values(sub.answers || {});
        totalAnswersCount = answersArr.length;
        answersArr.forEach((ans) => {
          if (ans.isCorrect) correctCount++;
          else if (ans.isCorrect === false) wrongCount++;
          else descriptiveCount++;
        });
        if (sub.maxScore && sub.maxScore > 0) {
          scorePercent = Math.round((sub.totalScore / sub.maxScore) * 100);
        }
      }

      return {
        account: acc,
        submission: sub,
        hasTested: Boolean(sub),
        scorePercent,
        totalAnswersCount,
        correctCount,
        wrongCount,
        descriptiveCount,
        hasFeedback: Boolean(sub?.feedback && sub.feedback.trim().length > 0),
      };
    }),
    ...unmatchedSubmissions.map((sub, idx) => {
      const answersArr = Object.values(sub.answers || {});
      let correctCount = 0;
      let wrongCount = 0;
      let descriptiveCount = 0;
      answersArr.forEach((ans) => {
        if (ans.isCorrect) correctCount++;
        else if (ans.isCorrect === false) wrongCount++;
        else descriptiveCount++;
      });
      const scorePercent =
        sub.maxScore && sub.maxScore > 0
          ? Math.round((sub.totalScore / sub.maxScore) * 100)
          : null;

      const syntheticAccount: Account = {
        id: sub.userId
          ? `guest-${sub.userId}-${sub.id || idx}`
          : `guest-unregistered-${sub.id || idx}`,
        name: sub.userName,
        role: 'user',
        emailOrPhone: sub.userEmailOrPhone || '',
        nationalOrStudentId: 'ثبت نشده',
        badgeTitle: 'کاربر مهمان / ثبت‌شده',
        avatarColor: 'bg-teal-600',
        createdAt: sub.submittedAt,
        personalNotes: '',
      };

      return {
        account: syntheticAccount,
        submission: sub,
        hasTested: true,
        scorePercent,
        totalAnswersCount: answersArr.length,
        correctCount,
        wrongCount,
        descriptiveCount,
        hasFeedback: Boolean(sub.feedback && sub.feedback.trim().length > 0),
      };
    }),
  ];

  // Guarantee absolute uniqueness of user accounts by id
  const seenAccountIds = new Set<string>();
  const enrichedUsers: EnrichedUser[] = [];
  for (const eu of rawEnrichedUsers) {
    if (!seenAccountIds.has(eu.account.id)) {
      seenAccountIds.add(eu.account.id);
      enrichedUsers.push(eu);
    }
  }

  // Sort enriched users strictly by latest exam submission date (most recent first)
  enrichedUsers.sort((a, b) => {
    if (a.submission && b.submission) {
      return (
        new Date(b.submission.submittedAt).getTime() -
        new Date(a.submission.submittedAt).getTime()
      );
    }
    if (a.submission && !b.submission) return -1;
    if (!a.submission && b.submission) return 1;
    const timeA = a.account.createdAt ? new Date(a.account.createdAt).getTime() : 0;
    const timeB = b.account.createdAt ? new Date(b.account.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const filteredEnrichedUsers = enrichedUsers.filter((u) => {
    const q = userSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.account.name.toLowerCase().includes(q) ||
      (u.account.phone && u.account.phone.toLowerCase().includes(q)) ||
      (u.account.email && u.account.email.toLowerCase().includes(q)) ||
      (u.account.age && String(u.account.age).toLowerCase().includes(q)) ||
      (u.account.emailOrPhone &&
        u.account.emailOrPhone.toLowerCase().includes(q)) ||
      (u.account.nationalOrStudentId &&
        u.account.nationalOrStudentId.toLowerCase().includes(q)) ||
      (u.account.badgeTitle &&
        u.account.badgeTitle.toLowerCase().includes(q));

    let matchesStatus = true;
    if (userFilterStatus === 'tested') matchesStatus = u.hasTested;
    else if (userFilterStatus === 'pending') matchesStatus = !u.hasTested;
    else if (userFilterStatus === 'evaluated') matchesStatus = u.hasFeedback;

    return matchesSearch && matchesStatus;
  });

  const totalUsersCount = enrichedUsers.length;
  const testedUsersCount = enrichedUsers.filter((u) => u.hasTested).length;
  const pendingUsersCount = enrichedUsers.filter((u) => !u.hasTested).length;
  const evaluatedUsersCount = enrichedUsers.filter((u) => u.hasFeedback).length;
  const averageScorePercent =
    testedUsersCount > 0
      ? Math.round(
          enrichedUsers
            .filter((u) => u.scorePercent !== null)
            .reduce((sum, u) => sum + (u.scorePercent || 0), 0) /
            (enrichedUsers.filter((u) => u.scorePercent !== null).length || 1)
        )
      : 0;

  const handleOpenNewEditor = () => {
    setEditingItem(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditItem = (item: ContentItem) => {
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  const handleSaveItemModal = (item: ContentItem) => {
    onSaveItem(item);
    setIsEditorOpen(false);
  };

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      systemTitle: sysTitle,
      allowRetake,
      showCorrectAnswerImmediately: showImmediateAnswer,
      isMatamMode: isMatamModeSetting,
    });
    setSettingsSuccessMsg(true);
    setTimeout(() => setSettingsSuccessMsg(false), 2500);
  };

  const handleChangePin = (e: FormEvent) => {
    e.preventDefault();
    if (currentPinInput.trim() !== settings.pinCode.trim()) {
      setPinChangeMsg({ text: 'رمز عبور فعلی نادرست است.', isError: true });
      return;
    }
    if (!newPinInput.trim() || newPinInput.length < 3) {
      setPinChangeMsg({ text: 'رمز جدید باید حداقل دارای ۳ کاراکتر باشد.', isError: true });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeMsg({ text: 'رمز جدید و تکرار آن با یکدیگر مطابقت ندارند.', isError: true });
      return;
    }

    onUpdateSettings({
      ...settings,
      pinCode: newPinInput.trim(),
    });
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinChangeMsg({ text: 'رمز عبور بخش کنترل‌گر با موفقیت تغییر یافت!', isError: false });
    setTimeout(() => setPinChangeMsg(null), 3000);
  };

  const handleExportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      items,
      submissions,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.items && Array.isArray(parsed.items)) {
          onImportData(parsed.items, parsed.submissions || []);
          alert('اطلاعات با موفقیت بازیابی شد.');
        } else {
          alert('فرمت فایل نامعتبر است.');
        }
      } catch (err) {
        alert('خطا در خواندن فایل JSON.');
      }
    };
    reader.readAsText(file);
  };

  const totalQuestions = items.filter((i) => i.type !== 'text').length;
  const totalTexts = items.filter((i) => i.type === 'text').length;
  const totalPublished = items.filter((i) => i.isPublished).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Admin Context */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950">
                بخش کنترل‌گر (مدیریت)
              </span>
              <span className="text-xs text-stone-300">محیط امن و محافظت‌شده</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-2">
              مدیریت پرسش‌ها، مقالات و بررسی پاسخ‌های مخاطبان
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-xl leading-relaxed">
              از این بخش می‌توانید محتوای جدید اضافه کنید، سوالات تستی و تشریحی بسازید، و پاسخ‌هایی
              که کاربران ارسال کرده‌اند را مشاهده و ارزیابی نمایید.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Matam Mode Button - Requested: در بخش کنترلر یک کلمه طراحی کن به نام ماتم */}
            <button
              id="admin-matam-toggle-btn"
              type="button"
              onClick={handleToggleMatam}
              title={
                isMatamActive
                  ? 'غیرفعال‌سازی حالت ماتم'
                  : 'فعال‌سازی حالت ماتم (تبدیل رنگ‌ها به قرمز غلیظ و بخش‌های سفید به مشکی)'
              }
              className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0 shadow-sm border select-none ${
                isMatamActive
                  ? 'bg-[#800000] text-white border-red-500 ring-2 ring-red-500/50 shadow-[0_0_15px_rgba(128,0,0,0.6)]'
                  : 'bg-stone-800/95 text-red-300 hover:text-white border-stone-700 hover:bg-stone-800 hover:border-red-900/60'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isMatamActive ? 'bg-red-500 animate-ping' : 'bg-red-700'
                }`}
              />
              <Flame className={`w-4 h-4 ${isMatamActive ? 'text-red-300' : 'text-red-400'}`} />
              <span className="text-xs sm:text-sm font-black tracking-wide">ماتم</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  isMatamActive
                    ? 'bg-red-950 text-red-100 border border-red-700'
                    : 'bg-stone-900 text-stone-400 border border-stone-700'
                }`}
              >
                {isMatamActive ? 'روشن' : 'خاموش'}
              </span>
            </button>

            {onLockAdmin && (
              <button
                id="admin-dashboard-lock-btn"
                type="button"
                onClick={onLockAdmin}
                title="بازگشت به بخش کاربر"
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-stone-800/90 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>بازگشت به بخش کاربر</span>
              </button>
            )}

            <button
              id="admin-quick-create-btn"
              type="button"
              onClick={handleOpenNewEditor}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد مطلب یا سوال جدید</span>
            </button>
          </div>
        </div>

        {/* Mini stats counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-800 text-xs">
          <div className="bg-stone-800/60 p-3 rounded-xl">
            <div className="text-stone-400">کل محتوا و سوالات</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {formatPersianNumber(items.length)}
            </div>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-xl">
            <div className="text-stone-400">آزمون‌ها و سوالات</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {formatPersianNumber(totalQuestions)}
            </div>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-xl">
            <div className="text-stone-400">مقالات و متون</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {formatPersianNumber(totalTexts)}
            </div>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-xl">
            <div className="text-stone-400">پاسخ‌های دریافتی</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">
              {formatPersianNumber(submissions.length)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1">
        <button
          type="button"
          id="admin-tab-content-btn"
          onClick={() => {
            setActiveTab('content');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'content'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>مدیریت مطالب و سوالات</span>
          <span className="text-xs px-1.5 py-0.2 bg-stone-700/20 rounded-md">
            {formatPersianNumber(items.length)}
          </span>
        </button>

        {/* Dedicated Users and Exam Results Tab */}
        <button
          type="button"
          id="admin-tab-users-btn"
          onClick={() => {
            setActiveTab('users');
            setUserSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>کاربران و نتایج آزمون‌ها</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-700 font-bold rounded-full">
            {formatPersianNumber(totalUsersCount)} کاربر
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-submissions-btn"
          onClick={() => {
            setActiveTab('submissions');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>پاسخ‌های دریافتی مخاطبان</span>
          <span className="text-xs px-1.5 py-0.2 bg-stone-700/20 rounded-md">
            {formatPersianNumber(submissions.length)}
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-mazar-btn"
          onClick={() => setActiveTab('mazar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'mazar'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-emerald-400" />
          <span>برنامه‌های مزار</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-700 font-bold rounded-full">
            {formatPersianNumber(mazarPrograms.length)} برنامه
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-banners-btn"
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'banners'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Image className="w-4 h-4 text-amber-400" />
          <span>مدیریت بنرهای تصویری</span>
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-700 font-bold rounded-full">
            {formatPersianNumber(banners.length)} بنر
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-prayers-btn"
          onClick={() => setActiveTab('prayers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'prayers'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Headphones className="w-4 h-4 text-emerald-400" />
          <span>ادعیه و زیارات</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-700 font-bold rounded-full">
            {formatPersianNumber(prayers.length)} دعا
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-imamology-btn"
          onClick={() => setActiveTab('imamology')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'imamology'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>امام‌شناسی</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-700 font-bold rounded-full">
            ۱۴ معصوم
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-library-btn"
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'library'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span>کتابخانه و کتب</span>
          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-700 font-bold rounded-full">
            {formatPersianNumber(books.length)} کتاب
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-nava-btn"
          onClick={() => setActiveTab('nava')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'nava'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Radio className="w-4 h-4 text-red-500" />
          <span>نوای مداحی</span>
          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-700 font-bold rounded-full">
            {formatPersianNumber(madahiItems.length)} قطعه
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-settings-btn"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>تنظیمات و امنیت رمز عبور</span>
        </button>
      </div>

      {/* TAB 1: Content & Question Management */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {/* Controls Bar: Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                id="search-items-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در عنوان، متن یا دسته‌بندی..."
                className="w-full pl-4 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-stone-900"
              />
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
            </div>

            {/* Type filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                id="filter-all-items-btn"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                همه ({formatPersianNumber(items.length)})
              </button>
              <button
                type="button"
                id="filter-multiple-choice-btn"
                onClick={() => setFilterType('multiple_choice')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === 'multiple_choice'
                    ? 'bg-amber-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                تستی ({formatPersianNumber(items.filter((i) => i.type === 'multiple_choice').length)})
              </button>
              <button
                type="button"
                id="filter-descriptive-btn"
                onClick={() => setFilterType('descriptive')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === 'descriptive'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                تشریحی ({formatPersianNumber(items.filter((i) => i.type === 'descriptive').length)})
              </button>
              <button
                type="button"
                id="filter-poll-btn"
                onClick={() => setFilterType('poll')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === 'poll'
                    ? 'bg-purple-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                نظرسنجی ({formatPersianNumber(items.filter((i) => i.type === 'poll').length)})
              </button>
              <button
                type="button"
                id="filter-text-btn"
                onClick={() => setFilterType('text')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === 'text'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                مطالب ({formatPersianNumber(items.filter((i) => i.type === 'text').length)})
              </button>
            </div>
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-6">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">هیچ موردی یافت نشد</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                موردی مطابق با جستجو یا فیلتر جاری وجود ندارد. می‌توانید مورد جدیدی ایجاد کنید.
              </p>
              <button
                type="button"
                onClick={handleOpenNewEditor}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800"
              >
                <Plus className="w-4 h-4" />
                ایجاد اولین مورد
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <div
                  key={`admin-item-${item.id}-${index}`}
                  id={`admin-item-row-${item.id}`}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'multiple_choice'
                          ? 'bg-amber-100 text-amber-800'
                          : item.type === 'descriptive'
                          ? 'bg-indigo-100 text-indigo-800'
                          : item.type === 'poll'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.type === 'multiple_choice' && <HelpCircle className="w-5 h-5" />}
                      {item.type === 'descriptive' && <MessageSquare className="w-5 h-5" />}
                      {item.type === 'poll' && <Vote className="w-5 h-5" />}
                      {item.type === 'text' && <FileText className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                          {item.type === 'multiple_choice'
                            ? 'سوال تستی'
                            : item.type === 'descriptive'
                            ? 'سوال تشریحی'
                            : item.type === 'poll'
                            ? 'نظرسنجی'
                            : 'مطلب آموزشی'}
                        </span>
                        <span className="text-[11px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                          {item.category}
                        </span>
                        {item.points ? (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {formatPersianNumber(item.points)} امتیاز
                          </span>
                        ) : null}
                        {item.estimatedReadMinutes ? (
                          <span className="text-[11px] text-stone-500">
                            {formatPersianNumber(item.estimatedReadMinutes)} دقیقه مطالعه
                          </span>
                        ) : null}
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 mt-1.5 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-start">
                    {/* Active/Inactive Toggle */}
                    <button
                      type="button"
                      id={`toggle-publish-${item.id}`}
                      onClick={() => onTogglePublish(item.id)}
                      title={item.isPublished ? 'مطلب فعال است (کلیک جهت غیرفعال‌سازی)' : 'مطلب غیرفعال است'}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                        item.isPublished
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200 border border-stone-200'
                      }`}
                    >
                      {item.isPublished ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>فعال</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>پیش‌نویس</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      id={`edit-item-${item.id}`}
                      onClick={() => handleOpenEditItem(item)}
                      className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="ویرایش این مورد"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      id={`delete-item-${item.id}`}
                      onClick={() =>
                        setDeleteTarget({
                          type: 'item',
                          id: item.id,
                          title: item.title,
                        })
                      }
                      className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف این مورد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: User Submissions & Grading */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                id="search-submissions-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام کاربر یا اطلاعات تماس..."
                className="w-full pl-4 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-stone-900"
              />
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
            </div>

            <div className="text-xs text-stone-500 font-medium self-center">
              تعداد کل مشارکت‌ها: {formatPersianNumber(submissions.length)} نفر
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-6">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">هنوز پاسخی ثبت نشده است</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                به محض اینکه کاربران در بخش کاربر به سوالات پاسخ دهند، پاسخ‌ها و نمرات در این جدول
                نمایش داده می‌شوند.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub, index) => {
                const answerCount = Object.keys(sub.answers).length;
                return (
                  <div
                    key={`admin-sub-${sub.id}-${index}`}
                    id={`submission-row-${sub.id}`}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {sub.userName.slice(0, 1) || 'ک'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900">{sub.userName}</h4>
                          {sub.userEmailOrPhone && (
                            <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              {sub.userEmailOrPhone}
                            </span>
                          )}
                          <span className="text-[11px] text-stone-400">
                            {formatTimeAgo(sub.submittedAt)} ({formatPersianDate(sub.submittedAt)})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center gap-1 font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              نمره: {formatPersianNumber(sub.totalScore)} از{' '}
                              {formatPersianNumber(sub.maxScore)}
                            </span>
                          </div>

                          <div className="text-stone-500">
                            {formatPersianNumber(answerCount)} پاسخ ثبت‌شده
                          </div>

                          {sub.feedback ? (
                            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              بازخورد ارسال شده
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              نیاز به بازخورد
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      {onOpenUserAccountModal && (
                        <button
                          type="button"
                          id={`view-account-${sub.id}-btn`}
                          onClick={() => {
                            const matchedAcc =
                              accounts.find((a) => a.id === sub.userId) ||
                              accounts.find(
                                (a) =>
                                  a.name.trim().toLowerCase() === sub.userName.trim().toLowerCase()
                              ) || {
                                id: sub.userId || `usr-${sub.id}`,
                                name: sub.userName,
                                role: 'user' as const,
                                emailOrPhone: sub.userEmailOrPhone,
                                badgeTitle: 'کاربر آزمون',
                                avatarColor: 'bg-indigo-600',
                                createdAt: sub.submittedAt,
                                personalNotes: '',
                              };
                            onOpenUserAccountModal(matchedAcc);
                          }}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="مشاهده کارنامه و حساب شخصی کاربر"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>کارنامه و حساب شخصی</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id={`inspect-submission-${sub.id}-btn`}
                        onClick={() => setInspectingSubmission(sub)}
                        className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>بررسی و ثبت بازخورد</span>
                      </button>

                      <button
                        type="button"
                        id={`delete-submission-${sub.id}-btn`}
                        onClick={() =>
                          setDeleteTarget({
                            type: 'submission',
                            id: sub.id,
                            title: `پاسخ‌های ${sub.userName}`,
                          })
                        }
                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="حذف این پاسخ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Dedicated Users and Exam Results View */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-1">
                <span>تعداد کل کاربران</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                {formatPersianNumber(totalUsersCount)} <span className="text-xs font-normal text-stone-500">نفر</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">حساب‌های کاربری ثبت‌شده در سامانه</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-1">
                <span>شرکت در آزمون</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700">
                {formatPersianNumber(testedUsersCount)} <span className="text-xs font-normal text-stone-500">از {formatPersianNumber(totalUsersCount)}</span>
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">
                {totalUsersCount > 0
                  ? formatPersianNumber(Math.round((testedUsersCount / totalUsersCount) * 100))
                  : 0}
                ٪ مشارکت در آزمون‌ها
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-1">
                <span>دارای ارزیابی کنترل‌گر</span>
                <FileSignature className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700">
                {formatPersianNumber(evaluatedUsersCount)} <span className="text-xs font-normal text-stone-500">کارنامه</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                {formatPersianNumber(testedUsersCount - evaluatedUsersCount)} در انتظار بازخورد
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-1">
                <span>میانگین نمرات کل</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-700">
                {formatPersianNumber(averageScorePercent)}٪
              </div>
              <p className="text-[11px] text-stone-400 mt-1">میانگین کسب نمره از سوالات آزمون</p>
            </div>
          </div>

          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="relative flex-1">
              <input
                id="search-users-input"
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="جستجو در تمام مشخصات کاربر (نام، تلفن، ایمیل، سن، رمز عبور، کد دانشجویی...)"
                className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </div>
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Open Account Manager Modal */}
            {onOpenAccountManagerModal && (
              <button
                type="button"
                id="admin-open-account-manager-btn"
                onClick={onOpenAccountManagerModal}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>مدیریت کامل حساب‌ها و افزودن کاربر</span>
              </button>
            )}

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setUserFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  userFilterStatus === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                همه ({formatPersianNumber(totalUsersCount)})
              </button>
              <button
                type="button"
                onClick={() => setUserFilterStatus('tested')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  userFilterStatus === 'tested'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                آزمون داده ({formatPersianNumber(testedUsersCount)})
              </button>
              <button
                type="button"
                onClick={() => setUserFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  userFilterStatus === 'pending'
                    ? 'bg-amber-800 text-white'
                    : 'bg-stone-100 text-amber-800 hover:bg-amber-50'
                }`}
              >
                در انتظار آزمون ({formatPersianNumber(pendingUsersCount)})
              </button>
              <button
                type="button"
                onClick={() => setUserFilterStatus('evaluated')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  userFilterStatus === 'evaluated'
                    ? 'bg-indigo-800 text-white'
                    : 'bg-stone-100 text-indigo-800 hover:bg-indigo-50'
                }`}
              >
                دارای بازخورد ({formatPersianNumber(evaluatedUsersCount)})
              </button>
            </div>

          </div>

          {/* User Cards List */}
          {filteredEnrichedUsers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
              <Users className="w-10 h-10 text-stone-300 mx-auto" />
              <h4 className="text-sm font-bold text-stone-800">کاربری مطابق جستجو پیدا نشد</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                عبارت جستجو یا وضعیت فیلتر را تغییر دهید.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEnrichedUsers.map((u, idx) => {
                const sub = u.submission;
                const isExpanded = expandedUserIds.has(u.account.id);
                const scoreColor =
                  u.scorePercent !== null
                    ? u.scorePercent >= 80
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : u.scorePercent >= 60
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-stone-600 bg-stone-50 border-stone-200';

                return (
                  <div
                    key={`enriched-user-${u.account.id}-${idx}`}
                    id={`user-row-card-${u.account.id}`}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20'
                        : 'border-stone-200 shadow-2xs hover:border-stone-300'
                    }`}
                  >
                    {/* CONCISE VIEW (IN INITIAL LOOK): Click on name and address or card to toggle all info */}
                    <div
                      id={`user-concise-bar-${u.account.id}`}
                      className="p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer select-none hover:bg-stone-50/70 transition-colors"
                      onClick={() => toggleUserExpand(u.account.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl ${
                            u.account.avatarColor || 'bg-indigo-600'
                          } text-white flex items-center justify-center font-black text-base shadow-xs shrink-0`}
                        >
                          {u.account.name.charAt(0) || 'ک'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Clickable Name */}
                            <span
                              className="text-sm sm:text-base font-black text-stone-900 hover:text-amber-700 transition-colors cursor-pointer"
                              title="کلیک برای مشاهده تمام اطلاعات"
                            >
                              {u.account.name}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                              {u.account.badgeTitle || 'کاربر سیستم'}
                            </span>
                          </div>

                          {/* Clickable Address & Contact and Password preview in concise bar */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="font-mono text-stone-800 font-medium">
                                {u.account.phone || u.account.emailOrPhone || 'بدون تلفن'}
                              </span>
                            </span>

                            {u.account.age && (
                              <span className="text-stone-400">
                                • {formatPersianNumber(u.account.age)} ساله
                              </span>
                            )}

                            {/* Password security status badge */}
                            <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <Lock className="w-2.5 h-2.5 text-stone-500" />
                              <span>{u.account.hasPassword ? 'دارای رمز' : 'بدون رمز'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Latest Exam Brief Status & Expand Indicator */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {sub ? (
                          <div className="flex items-center gap-2">
                            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${scoreColor}`}>
                              آخرین آزمون: {formatPersianNumber(sub.totalScore)} از {formatPersianNumber(sub.maxScore)} ({u.scorePercent !== null ? `${formatPersianNumber(u.scorePercent)}٪` : '-'})
                            </div>
                            <span className="text-[11px] text-stone-400 hidden lg:inline">
                              {formatTimeAgo(sub.submittedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                            در انتظار آزمون
                          </span>
                        )}

                        <button
                          type="button"
                          id={`toggle-expand-btn-${u.account.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUserExpand(u.account.id);
                          }}
                          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            isExpanded
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>{isExpanded ? 'بستن جزئیات' : 'مشاهده تمام مشخصات'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-amber-800" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-stone-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED FULL DETAILS (WHEN CLICKED ON NAME / ADDRESS / TOGGLE) */}
                    {isExpanded && (
                      <div className="border-t border-stone-200 bg-stone-50/50 animate-fadeIn">
                        {/* Detailed Identity & Action Bar */}
                        <div className="p-4 sm:p-5 border-b border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="text-xs font-bold text-stone-800 flex items-center gap-2">
                              <span>مشخصات کامل حساب کاربری:</span>
                              {u.hasTested ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>آزمون ثبت شده</span>
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>در انتظار شرکت در آزمون</span>
                                </span>
                              )}
                            </div>

                            {/* Full User Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-stone-700">
                              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                <div>
                                  <span className="text-stone-400 block text-[10px]">نام و نام خانوادگی:</span>
                                  <strong className="text-stone-900 font-bold">{u.account.name}</strong>
                                </div>
                              </div>

                              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="text-stone-400 block text-[10px]">شماره تماس همراه:</span>
                                  <strong className="font-mono text-stone-900 font-bold">{u.account.phone || u.account.emailOrPhone || 'ثبت‌نشده'}</strong>
                                </div>
                              </div>

                              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <div>
                                  <span className="text-stone-400 block text-[10px]">پست الکترونیک (ایمیل):</span>
                                  <strong className="font-mono text-stone-900">{u.account.email || 'ثبت‌نشده'}</strong>
                                </div>
                              </div>

                              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <div>
                                  <span className="text-stone-400 block text-[10px]">سن کاربر:</span>
                                  <strong className="text-stone-900">{u.account.age ? `${formatPersianNumber(u.account.age)} سال` : 'ثبت‌نشده'}</strong>
                                </div>
                              </div>

                              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2">
                                <Award className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                <div>
                                  <span className="text-stone-400 block text-[10px]">کد شناسایی / دانشجویی:</span>
                                  <strong className="font-mono text-stone-900">{u.account.nationalOrStudentId || 'ندارد'}</strong>
                                </div>
                              </div>

                              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                <div>
                                  <span className="text-stone-400 block text-[10px]">تاریخ عضویت:</span>
                                  <strong className="text-stone-900">{u.account.createdAt ? formatPersianDate(u.account.createdAt) : '-'}</strong>
                                </div>
                              </div>
                            </div>

                            {/* ACCOUNT SECURITY STATUS */}
                            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-stone-700 text-white flex items-center justify-center shrink-0">
                                  <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-stone-700">امنیت حساب کاربری:</div>
                                  <div className="text-xs font-bold text-stone-900 mt-0.5">
                                    {u.account.hasPassword
                                      ? 'دارای رمز عبور اختصاصی (محافظت‌شده با هش امنیتی Bcrypt)'
                                      : 'بدون رمز عبور اختصاصی (ورود پیش‌فرض)'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {onOpenUserAccountModal && (
                              <button
                                type="button"
                                id={`view-profile-btn-${u.account.id}`}
                                onClick={() => onOpenUserAccountModal(u.account)}
                                className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>مشاهده پرونده و کارنامه کامل</span>
                              </button>
                            )}
                            {sub && (
                              <button
                                type="button"
                                id={`inspect-sub-btn-${u.account.id}`}
                                onClick={() => setInspectingSubmission(sub)}
                                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <FileSignature className="w-3.5 h-3.5 text-amber-600" />
                                <span>بررسی پاسخ‌ها و ارزیابی</span>
                              </button>
                            )}
                            {onDeleteAccount && accounts.length > 1 && (
                              <button
                                type="button"
                                id={`delete-account-btn-${u.account.id}`}
                                onClick={() => {
                                  setDeleteTarget({
                                    type: 'account',
                                    id: u.account.id,
                                    title: `حساب کاربری «${u.account.name}»`,
                                  });
                                }}
                                className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="حذف حساب کاربری"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span className="hidden sm:inline">حذف</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Personal Notes Box if user entered any */}
                        {u.account.personalNotes && (
                          <div className="px-4 sm:px-5 py-3 bg-amber-50/70 border-b border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
                            <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <strong className="font-bold text-amber-950">یادداشت ثبت‌شده توسط خود کاربر: </strong>
                              <span>{u.account.personalNotes}</span>
                            </div>
                          </div>
                        )}

                        {/* Comprehensive Exam Results & Metrics */}
                        <div className="p-4 sm:p-5">
                          {sub ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Score & Percentage */}
                                <div className={`p-3.5 rounded-xl border ${scoreColor} space-y-1.5`}>
                                  <div className="text-[11px] font-bold text-stone-600 flex items-center justify-between">
                                    <span>نمره نهایی آزمون:</span>
                                    <span className="font-extrabold text-sm">
                                      {u.scorePercent !== null ? `${formatPersianNumber(u.scorePercent)}٪` : '-'}
                                    </span>
                                  </div>
                                  <div className="text-lg font-black text-stone-900">
                                    {formatPersianNumber(sub.totalScore)} از {formatPersianNumber(sub.maxScore)} نمره
                                  </div>
                                  {/* Progress bar */}
                                  {u.scorePercent !== null && (
                                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          u.scorePercent >= 80
                                            ? 'bg-emerald-600'
                                            : u.scorePercent >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, u.scorePercent)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Questions Breakdown */}
                                <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-1">
                                  <div className="text-[11px] font-bold text-stone-500">تفکیک پاسخ‌های ثبت‌شده:</div>
                                  <div className="flex items-center gap-2 pt-1 text-xs">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                      {formatPersianNumber(u.correctCount)} صحیح
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                      {formatPersianNumber(u.wrongCount)} نادرست
                                    </span>
                                    {u.descriptiveCount > 0 && (
                                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                        {formatPersianNumber(u.descriptiveCount)} تشریحی
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-400 pt-0.5">
                                    مجموع پاسخ‌ها: {formatPersianNumber(u.totalAnswersCount)} مورد
                                  </p>
                                </div>

                                {/* Submission Time & Status */}
                                <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-1">
                                  <div className="text-[11px] font-bold text-stone-500">زمان ثبت آزمون:</div>
                                  <div className="text-xs font-bold text-stone-800">
                                    {formatPersianDate(sub.submittedAt)}
                                  </div>
                                  <p className="text-[11px] text-stone-500">
                                    {formatTimeAgo(sub.submittedAt)}
                                  </p>
                                </div>
                              </div>

                              {/* Controller Evaluation Feedback Display */}
                              <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-stone-100 text-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                                    <FileSignature className="w-4 h-4 text-amber-600" />
                                    <span>ارزیابی و یادداشت کنترل‌گر:</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setInspectingSubmission(sub)}
                                    className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer"
                                  >
                                    {sub.feedback ? 'ویرایش بازخورد و نمره' : 'ثبت بازخورد جدید'}
                                  </button>
                                </div>

                                {sub.feedback ? (
                                  <div className="space-y-1.5">
                                    <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                                      {sub.feedback}
                                    </p>
                                    <div className="flex items-center gap-3 text-[11px] text-stone-400">
                                      {sub.controllerNoteAuthor && (
                                        <span>ثبت توسط: <strong>{sub.controllerNoteAuthor}</strong></span>
                                      )}
                                      {sub.controllerNoteDate && (
                                        <span>• {formatTimeAgo(sub.controllerNoteDate)}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-stone-400 flex items-center justify-between py-1">
                                    <span>هنوز نظری برای این پاسخ ثبت نشده است.</span>
                                    <button
                                      type="button"
                                      onClick={() => setInspectingSubmission(sub)}
                                      className="text-amber-700 hover:text-amber-900 font-bold text-xs underline cursor-pointer"
                                    >
                                      ثبت بازخورد و ارزیابی
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Bottom Collapse Button */}
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleUserExpand(u.account.id)}
                                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 font-bold cursor-pointer"
                                >
                                  <span>بستن جزئیات اطلاعات کاربر</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 px-3 bg-white rounded-xl border border-stone-200 text-center space-y-2">
                              <p className="text-xs font-semibold text-stone-600">
                                این کاربر تا این لحظه در آزمونی شرکت نکرده است.
                              </p>
                              <p className="text-[11px] text-stone-400">
                                به محض ارسال پاسخ‌ها توسط این کاربر، نتایج، درصدها و امکان ارزیابی در این بخش فعال خواهد شد.
                              </p>
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleUserExpand(u.account.id)}
                                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 font-bold cursor-pointer"
                                >
                                  <span>بستن جزئیات</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Mazar Programs Management */}
      {activeTab === 'mazar' && (
        <MazarProgramsManager
          programs={mazarPrograms}
          onSaveProgram={onSaveMazarProgram || (() => {})}
          onDeleteProgram={onDeleteMazarProgram || (() => {})}
        />
      )}

      {/* TAB: Banner Slides Management */}
      {activeTab === 'banners' && (
        <BannerSlidesManager
          slides={banners}
          onSaveSlide={onSaveBannerSlide || (() => {})}
          onDeleteSlide={onDeleteBannerSlide || (() => {})}
        />
      )}

      {/* TAB: Prayers & Ziyarat Management */}
      {activeTab === 'prayers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              مدیریت ادعیه و زیارات معنوی مزار (ویرایش متن، صوت و اطلاعات)
            </h3>
            <span className="text-xs text-stone-500">
              {formatPersianNumber(prayers.length)} مورد ثبت‌شده
            </span>
          </div>
          <PrayersPage
            prayers={prayers}
            isController={true}
            onBack={() => {
              onActivePrayerChange?.(false);
              setActiveTab('content');
            }}
            onSavePrayer={onSavePrayer}
            onDeletePrayer={onDeletePrayer}
            onActivePrayerChange={onActivePrayerChange}
          />
        </div>
      )}

      {activeTab === 'imamology' && (
        <ImamologyManager
          infallibles={infallibles}
          onSaveInfallible={(person) => onSaveInfallible?.(person)}
          onResetImamology={() => onResetImamology?.()}
        />
      )}

      {activeTab === 'library' && (
        <LibraryManager
          books={books}
          onSaveBook={onSaveBook || (() => {})}
          onDeleteBook={onDeleteBook || (() => {})}
        />
      )}

      {/* TAB: Nava & Madahi Management */}
      {activeTab === 'nava' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              مدیریت و بارگذاری نوای مداحی مزار (آپلود صوت، تصویر کاور، ویرایش و حذف)
            </h3>
            <span className="text-xs text-stone-500">
              {formatPersianNumber(madahiItems.length)} قطعه ثبت‌شده
            </span>
          </div>
          <NavaPage
            items={madahiItems}
            activeAccount={activeAccount || { id: 'admin', name: 'کنترل‌گر', role: 'controller', emailOrPhone: '', createdAt: '' }}
            onBack={() => setActiveTab('content')}
            onSaveMadahi={onSaveMadahi || (() => {})}
            onDeleteMadahi={onDeleteMadahi || (() => {})}
            allowManage={true}
          />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Configuration Card (Prominent at top of settings) */}
          <div className="md:col-span-2">
            <DatabaseConfigCard />
          </div>

          {/* Change PIN / Access Code Box */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">تغییر رمز عبور بخش کنترل‌گر</h3>
                <p className="text-xs text-stone-500">
                  برای جلوگیری از دسترسی دیگران به پنل کنترل‌گر
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label
                  htmlFor="current-pin-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  رمز عبور فعلی:
                </label>
                <input
                  id="current-pin-input"
                  type="password"
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  placeholder="رمز فعلی را وارد کنید..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label
                  htmlFor="new-pin-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  رمز عبور جدید:
                </label>
                <input
                  id="new-pin-input"
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="رمز جدید..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-new-pin-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  تکرار رمز عبور جدید:
                </label>
                <input
                  id="confirm-new-pin-input"
                  type="password"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="مجدداً تکرار کنید..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              {pinChangeMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-1.5 ${
                    pinChangeMsg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  }`}
                >
                  {pinChangeMsg.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pinChangeMsg.text}</span>
                </div>
              )}

              <button
                id="submit-change-pin-btn"
                type="submit"
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors mt-2"
              >
                به‌روزرسانی رمز عبور کنترل‌گر
              </button>

              {onLockAdmin && (
                <button
                  id="admin-settings-lock-btn"
                  type="button"
                  onClick={onLockAdmin}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4 text-stone-600" />
                  <span>بازگشت به بخش کاربر</span>
                </button>
              )}
            </form>
          </div>

          {/* System Settings Box */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
              <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">تنظیمات رفتار سامانه و آزمون‌ها</h3>
                <p className="text-xs text-stone-500">پیکربندی نحوه نمایش و پاسخ‌دهی کاربران</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label
                  htmlFor="system-title-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  عنوان اصلی سامانه:
                </label>
                <input
                  id="system-title-input"
                  type="text"
                  value={sysTitle}
                  onChange={(e) => setSysTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      امکان آزمون مجدد برای کاربران
                    </span>
                    <span className="text-[11px] text-stone-500">
                      کاربران بتوانند مجدداً به سوالات پاسخ دهند
                    </span>
                  </div>
                  <input
                    id="toggle-allow-retake-input"
                    type="checkbox"
                    checked={allowRetake}
                    onChange={(e) => setAllowRetake(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      نمایش فوری پاسخ صحیح پس از ثبت
                    </span>
                    <span className="text-[11px] text-stone-500">
                      در سوالات تستی بلافاصله کلید و توضیح نمایش داده شود
                    </span>
                  </div>
                  <input
                    id="toggle-immediate-answer-input"
                    type="checkbox"
                    checked={showImmediateAnswer}
                    onChange={(e) => setShowImmediateAnswer(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-0"
                  />
                </label>

                {/* Matam Mode Setting Toggle */}
                <label className="flex items-center justify-between p-3 bg-red-50/80 rounded-xl border border-red-200 cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-bold text-red-900 block">
                        حالت ماتم (سراسری: رنگ‌ها به قرمز غلیظ و بخش‌های سفید به مشکی)
                      </span>
                    </div>
                    <span className="text-[11px] text-red-700/90 mt-0.5 block">
                      با فعال شدن ماتم، بدون توجه به وضعیت حالت تاریک، کلیه رنگ‌ها به قرمز خون و بخش‌های سفید به مشکی تبدیل می‌شوند.
                    </span>
                  </div>
                  <input
                    id="toggle-matam-mode-input"
                    type="checkbox"
                    checked={isMatamModeSetting}
                    onChange={(e) => setIsMatamModeSetting(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-0"
                  />
                </label>
              </div>

              {settingsSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  تنظیمات با موفقیت ذخیره گردید.
                </div>
              )}

              <button
                id="submit-system-settings-btn"
                type="submit"
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                ذخیره تنظیمات سامانه
              </button>
            </form>
          </div>

          {/* Backup & Restore Box (Full width) */}
          <div className="md:col-span-2 bg-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              مدیریت داده‌ها، نسخه پشتیبان و بازنشانی
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              می‌توانید از تمامی پرسش‌ها، مقالات و پاسخ‌های ثبت شده کاربران یک نسخه پشتیبان با فرمت JSON
              دانلود کنید یا اطلاعات را در دستگاه دیگر بازیابی نمایید.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                id="export-backup-btn"
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 text-stone-800 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>دانلود نسخه پشتیبان (JSON)</span>
              </button>

              <label
                id="import-backup-label"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 text-stone-800 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Upload className="w-4 h-4 text-stone-600" />
                <span>بازیابی از فایل JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                id="reset-factory-data-btn"
                onClick={() =>
                  setDeleteTarget({
                    type: 'reset',
                    title: 'بازنشانی تمام داده‌ها به حالت اولیه کارخانه',
                  })
                }
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors mr-auto cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-rose-600" />
                <span>بازنشانی به داده‌های اولیه کارخانه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Adding/Editing Items */}
      <ItemEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveItemModal}
        initialItem={editingItem}
      />

      {/* Submission Details Modal for reviewing user answers */}
      <SubmissionDetailsModal
        isOpen={inspectingSubmission !== null}
        onClose={() => setInspectingSubmission(null)}
        submission={inspectingSubmission}
        items={items}
        onUpdateFeedback={(subId, fb, newScore) => {
          onUpdateSubmissionFeedback(subId, fb, newScore);
          if (inspectingSubmission && inspectingSubmission.id === subId) {
            setInspectingSubmission({
              ...inspectingSubmission,
              feedback: fb,
              totalScore: newScore,
            });
          }
        }}
      />

      {/* Delete / Reset In-App Confirmation Modal */}
      {deleteTarget && (
        <div
          id="delete-confirmation-modal"
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full border border-stone-200 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  {deleteTarget.type === 'reset' ? 'تایید بازنشانی داده‌ها' : 'تایید حذف مورد'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  این عملیات بلافاصله انجام شده و غیرقابل بازگشت است.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/80">
              {deleteTarget.type === 'reset'
                ? 'آیا مطمئن هستید؟ با این کار تمام داده‌ها و سوالات به حالت نمونه اولیه کارخانه بازنشانی می‌شوند.'
                : `آیا از حذف «${deleteTarget.title}» اطمینان کامل دارید؟`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="cancel-delete-btn"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                id="confirm-delete-action-btn"
                onClick={() => {
                  if (deleteTarget.type === 'item' && deleteTarget.id) {
                    onDeleteItem(deleteTarget.id);
                  } else if (deleteTarget.type === 'submission' && deleteTarget.id) {
                    onDeleteSubmission(deleteTarget.id);
                  } else if (deleteTarget.type === 'account' && deleteTarget.id && onDeleteAccount) {
                    onDeleteAccount(deleteTarget.id);
                  } else if (deleteTarget.type === 'reset') {
                    onResetData();
                  }
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {deleteTarget.type === 'reset' ? 'بله، بازنشانی شود' : 'بله، حذف شود'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
