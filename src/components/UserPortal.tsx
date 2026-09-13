import { useState, useMemo, type FormEvent } from 'react';
import {
  ContentItem,
  UserSubmission,
  UserAnswer,
  AdminSettings,
  UserTabFilter,
  Account,
  MazarProgram,
  DayOfWeek,
  BannerSlide,
  PrayerItem,
  InfalliblePerson,
  isControllerRole,
  BookItem,
  MadahiItem,
} from '../types';
import { DAYS_OF_WEEK } from '../data/initialData';
import { MazarProgramsCard } from './MazarProgramsCard';
import { QuizzesAndExamsPage } from './QuizzesAndExamsPage';
import { BannerSlider } from './BannerSlider';
import { LeaderboardModal } from './LeaderboardModal';
import { PrayersPage } from './PrayersPage';
import { ImamologyPage } from './ImamologyPage';
import { LibraryPage } from './LibraryPage';
import { NavaPage } from './NavaPage';
import {
  BookOpen,
  BookMarked,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Search,
  Award,
  Clock,
  User,
  Check,
  Sparkles,
  AlertCircle,
  FileCheck,
  Shield,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Landmark,
  CalendarDays,
  Sun,
  Compass,
  Heart,
  Flame,
  Calendar,
  Trophy,
  Headphones,
  Vote,
  Layers,
  ArrowLeft,
  Radio,
  LogOut,
} from 'lucide-react';
import {
  formatPersianNumber,
  formatPersianDate,
} from '../utils/formatters';

interface UserPortalProps {
  items: ContentItem[];
  submissions: UserSubmission[];
  settings: AdminSettings;
  userProfile: { name: string; contact: string };
  activeAccount: Account;
  accounts?: Account[];
  banners?: BannerSlide[];
  prayers?: PrayerItem[];
  mazarPrograms?: MazarProgram[];
  infallibles?: InfalliblePerson[];
  onSaveInfallible?: (person: InfalliblePerson) => void;
  isDarkMode?: boolean;
  isMatamMode?: boolean;
  onOpenControllerMazar?: () => void;
  onOpenPersonalAccount: () => void;
  onUpdateUserProfile: (profile: { name: string; contact: string }) => void;
  onUpdateAccountPhoto?: (photoUrl: string) => void;
  onSubmitUserAnswer: (userName: string, contact: string, answer: UserAnswer) => void;
  onRetakeQuestion: (userName: string, itemId: string) => void;
  onVotePoll?: (itemId: string, optionIndex: number) => void;
  onSavePrayer?: (prayer: PrayerItem) => void;
  onDeletePrayer?: (id: string) => void;
  onActivePrayerChange?: (hasActivePrayer: boolean) => void;
  books?: BookItem[];
  onSaveBook?: (book: BookItem) => void;
  onDeleteBook?: (id: string) => void;
  madahiItems?: MadahiItem[];
  onSaveMadahi?: (item: MadahiItem) => void;
  onDeleteMadahi?: (id: string) => void;
  onLogout?: () => void;
}

export function UserPortal({
  items,
  submissions,
  settings,
  userProfile,
  activeAccount,
  accounts = [],
  banners = [],
  prayers = [],
  mazarPrograms = [],
  infallibles = [],
  onSaveInfallible,
  isDarkMode = false,
  isMatamMode = false,
  onOpenControllerMazar,
  onOpenPersonalAccount,
  onUpdateUserProfile,
  onSubmitUserAnswer,
  onRetakeQuestion,
  onVotePoll,
  onSavePrayer,
  onDeletePrayer,
  onActivePrayerChange,
  books = [],
  onSaveBook,
  onDeleteBook,
  madahiItems = [],
  onSaveMadahi,
  onDeleteMadahi,
  onLogout,
}: UserPortalProps) {
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [contactInput, setContactInput] = useState(userProfile.contact);
  const [isEditingProfile, setIsEditingProfile] = useState(!userProfile.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<UserTabFilter>('all');

  // Page view: 'main' portal, dedicated 'quizzes' page, dedicated 'prayers' page, dedicated 'imamology' page, 'library' page, or 'nava' page
  const [portalPage, setPortalPage] = useState<'main' | 'quizzes' | 'prayers' | 'imamology' | 'library' | 'nava'>('main');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Draft answers state for questions the user hasn't submitted yet
  const [selectedChoices, setSelectedChoices] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  // Marked as read articles (persisted in local state)
  const [readArticles, setReadArticles] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('sqm_read_articles');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Expandable list of questions and exams under the 'مطالب مطالعه شده' card
  const [isQuizzesListOpen, setIsQuizzesListOpen] = useState<boolean>(false);

  const handleToggleReadArticle = (id: string) => {
    setReadArticles((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('sqm_read_articles', JSON.stringify(next));
      return next;
    });
  };

  // Find user's latest submission for their active account or name
  const currentUserSubmission = useMemo(() => {
    return (
      submissions.find(
        (s) =>
          (s.userId && s.userId === activeAccount.id) ||
          s.userName.trim().toLowerCase() === (activeAccount.name || userProfile.name).trim().toLowerCase()
      ) || null
    );
  }, [submissions, activeAccount.id, activeAccount.name, userProfile.name]);

  const userAnswers = useMemo(() => {
    return currentUserSubmission?.answers || {};
  }, [currentUserSubmission]);

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    onUpdateUserProfile({
      name: nameInput.trim(),
      contact: contactInput.trim(),
    });
    setIsEditingProfile(false);
  };

  // Submit multiple choice answer
  const handleSubmitChoice = (item: ContentItem) => {
    if (!userProfile.name.trim()) {
      setIsEditingProfile(true);
      return;
    }
    const selected = selectedChoices[item.id];
    if (selected === undefined) return;

    const isCorrect = selected === item.correctOptionIndex;
    const score = isCorrect ? item.points || 10 : 0;

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: item.type,
      selectedOptionIndex: selected,
      isCorrect,
      scoreAwarded: score,
      maxScore: item.points || 10,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
  };

  // Submit descriptive answer
  const handleSubmitDescriptive = (item: ContentItem) => {
    if (!userProfile.name.trim()) {
      setIsEditingProfile(true);
      return;
    }
    const text = textAnswers[item.id]?.trim();
    if (!text) return;

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: item.type,
      textAnswer: text,
      scoreAwarded: 0, // initially 0 until reviewed by admin
      maxScore: item.points || 15,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
  };

  // Submit poll vote
  const handleSubmitPoll = (item: ContentItem) => {
    if (!userProfile.name.trim()) {
      setIsEditingProfile(true);
      return;
    }
    const selected = selectedChoices[item.id];
    if (selected === undefined) return;

    onVotePoll?.(item.id, selected);

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: 'poll',
      selectedOptionIndex: selected,
      isCorrect: true,
      scoreAwarded: item.points || 5,
      maxScore: item.points || 5,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
  };

  // Filter published items
  const publishedItems = useMemo(() => {
    return items.filter((i) => i.isPublished);
  }, [items]);

  const filteredItems = useMemo(() => {
    return publishedItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'all') return true;
      if (activeTab === 'texts') return item.type === 'text';
      if (activeTab === 'quizzes') return item.type !== 'text';
      if (activeTab === 'completed') {
        if (item.type === 'text') return !!readArticles[item.id];
        return !!userAnswers[item.id];
      }
      return true;
    });
  }, [publishedItems, searchQuery, activeTab, readArticles, userAnswers]);

  // All quizzes, questions and polls sorted from newest to oldest
  const allQuizzesAndQuestions = useMemo(() => {
    return items
      .filter((i) => i.isPublished && i.type !== 'text')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  const handleNavigateToQuestion = (targetId: string) => {
    if (activeTab === 'texts') {
      setActiveTab('all');
    }
    setTimeout(() => {
      const el = document.getElementById(`user-item-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-400', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-400');
        }, 2500);
      }
    }, 120);
  };

  // Statistics for user progress
  const totalQuestions = publishedItems.filter((i) => i.type !== 'text').length;
  const answeredCount = Object.keys(userAnswers).length;
  const earnedScore = currentUserSubmission?.totalScore || 0;

  if (portalPage === 'quizzes') {
    return (
      <QuizzesAndExamsPage
        items={items}
        userAnswers={userAnswers}
        userProfile={userProfile}
        activeAccount={activeAccount}
        settings={settings}
        initialSelectedItemId={selectedExamId}
        onBackToMain={() => {
          setPortalPage('main');
          setSelectedExamId(null);
        }}
        onUpdateUserProfile={onUpdateUserProfile}
        onSubmitUserAnswer={onSubmitUserAnswer}
        onVotePoll={onVotePoll}
      />
    );
  }

  if (portalPage === 'prayers') {
    return (
      <PrayersPage
        prayers={prayers}
        isController={false}
        onBack={() => {
          onActivePrayerChange?.(false);
          setPortalPage('main');
        }}
        onActivePrayerChange={onActivePrayerChange}
      />
    );
  }

  if (portalPage === 'imamology') {
    return (
      <ImamologyPage
        infallibles={infallibles}
        onBack={() => setPortalPage('main')}
      />
    );
  }

  if (portalPage === 'library') {
    return (
      <LibraryPage
        books={books}
        activeAccount={activeAccount}
        onBack={() => setPortalPage('main')}
        onSaveBook={onSaveBook || (() => {})}
        onDeleteBook={onDeleteBook || (() => {})}
        isDarkMode={isDarkMode}
      />
    );
  }

  if (portalPage === 'nava') {
    return (
      <NavaPage
        items={madahiItems}
        activeAccount={activeAccount}
        onBack={() => setPortalPage('main')}
        isDarkMode={isDarkMode}
        allowManage={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER SLIDER (ABOVE USER PROFILE CARD) */}
      <div id="top-banner-slider-container">
        <BannerSlider
          slides={banners}
          isController={false}
          onNavigateToSection={(section) => {
            if (section === 'quizzes') setPortalPage('quizzes');
            else if (section === 'prayers') setPortalPage('prayers');
          }}
        />
      </div>

      {/* User Identification Header / Card */}
      <div
        id="user-profile-banner"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold shrink-0 shadow-xs overflow-hidden ${
                activeAccount.avatarColor || 'bg-emerald-600'
              }`}
            >
              {activeAccount.avatarUrl ? (
                <img
                  src={activeAccount.avatarUrl}
                  alt={activeAccount.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">حساب شخصی کاربر:</span>
                <span className="text-sm sm:text-base font-bold text-stone-900">{activeAccount.name}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  {activeAccount.badgeTitle || 'کاربر فعال'}
                </span>
              </div>
              {activeAccount.emailOrPhone && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {activeAccount.emailOrPhone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              id="view-my-personal-account-btn"
              onClick={onOpenPersonalAccount}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>کارنامه و نتایج آزمون من</span>
            </button>

            <button
              type="button"
              id="toggle-edit-profile-btn"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer"
              title="ویرایش مشخصات نمایشی"
            >
              {isEditingProfile ? 'بستن' : 'ویرایش'}
            </button>

            {onLogout && (
              <button
                type="button"
                id="user-portal-logout-btn"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-stone-200 hover:border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                title="خروج از حساب کاربری"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            )}
          </div>
        </div>

        {/* CONTROLLER'S FEEDBACK NOTICE (IF CONTROLLER HAS WRITTEN NOTES ON THIS USER'S EXAM) */}
        {currentUserSubmission?.feedback && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <div className="bg-stone-900 text-stone-100 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>یادداشت ثبت‌شده در کارنامه شما:</span>
                    <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full font-normal">
                      رسمی
                    </span>
                  </div>
                  <p className="text-xs text-stone-200 mt-1 leading-relaxed">
                    «{currentUserSubmission.feedback}»
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenPersonalAccount}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-colors cursor-pointer self-end sm:self-center"
              >
                <span>مشاهده ریز کارنامه</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Profile Edit Expandable Form */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div>
              <label
                htmlFor="user-name-input"
                className="block text-xs font-bold text-stone-700 mb-1"
              >
                نام و نام خانوادگی شما: <span className="text-rose-500">*</span>
              </label>
              <input
                id="user-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="مثال: سارا محمدی"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div>
              <label
                htmlFor="user-contact-input"
                className="block text-xs font-bold text-stone-700 mb-1"
              >
                شماره تماس یا ایمیل (اختیاری):
              </label>
              <input
                id="user-contact-input"
                type="text"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="جهت تماس یا ارسال بازخورد"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div className="flex items-end">
              <button
                id="save-profile-btn"
                type="submit"
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                تایید مشخصات
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Progress & Summary Cards (4 Cards: Nava, Leaderboard, Library, Prayers) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: نوا (تم قرمز/زرشکی سیر با آیکون در زمینه سفید و متن‌های کاملاً سفید و خوانا) */}
        <button
          type="button"
          id="user-nava-portal-btn"
          onClick={() => setPortalPage('nava')}
          title="ورود به بخش نوای مزار و مداحی‌های اهل‌بیت (ع)"
          className="bg-[#6e0a0a] hover:bg-[#590707] p-4 rounded-2xl border border-[#8f1212]/70 shadow-md hover:shadow-lg transition-all flex flex-col justify-between text-right cursor-pointer group active:scale-[0.98] text-white"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs sm:text-sm text-white font-black tracking-wide">نوا</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#991b1b] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4 text-[#991b1b]" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white my-1.5 drop-shadow-xs">
            {formatPersianNumber(madahiItems.length || 6)} قطعه مداحی
          </div>
          <div className="text-[11px] text-white/90 font-medium flex items-center justify-between pt-1.5 border-t border-white/20">
            <span>مداحی و نوای مزار</span>
            <ChevronLeft className="w-3.5 h-3.5 text-white group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 2: مجموع امتیاز کسب‌شده (تم طلایی/خردلی گرم و پررنگ با آیکون در زمینه سفید و متن سفید با کنتراست بالا) */}
        <button
          type="button"
          id="user-score-leaderboard-btn"
          onClick={() => setIsLeaderboardOpen(true)}
          title="لمس برای مشاهده رتبه‌بندی، نام، نام مستعار و امتیازات تمام شرکت‌کنندگان"
          className="bg-[#855200] hover:bg-[#724500] p-4 rounded-2xl border border-[#b87500]/60 shadow-md hover:shadow-lg transition-all flex flex-col justify-between text-right cursor-pointer group active:scale-[0.98] text-white"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs sm:text-sm text-white font-black tracking-wide">مجموع امتیازات شما</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#b45309] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Trophy className="w-4 h-4 text-[#b45309]" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white my-1.5 drop-shadow-xs">
            {formatPersianNumber(earnedScore)} امتیاز
          </div>
          <div className="text-[11px] text-white/90 font-medium flex items-center justify-between pt-1.5 border-t border-white/20">
            <span>لمس جهت مشاهده رده‌بندی</span>
            <ChevronLeft className="w-3.5 h-3.5 text-white group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 3: کتابخونه (تم بنفش عمیق با آیکون در زمینه سفید و متن‌های سفید و کاملاً متمایز) */}
        <button
          type="button"
          id="user-library-portal-btn"
          onClick={() => setPortalPage('library')}
          title="ورود به کتابخانه مزار شهدای گمنام گاوازنگ (مشاهده، دانلود و مطالعه کتب و فایل‌های PDF)"
          className="bg-[#4a0b5c] hover:bg-[#3c094a] p-4 rounded-2xl border border-[#681880]/70 shadow-md hover:shadow-lg transition-all flex flex-col justify-between text-right cursor-pointer group active:scale-[0.98] text-white"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs sm:text-sm text-white font-black tracking-wide">کتابخونه</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#6b21a8] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <BookMarked className="w-4 h-4 text-[#6b21a8]" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white my-1.5 drop-shadow-xs">
            {formatPersianNumber(books.length || 4)} عنوان کتاب
          </div>
          <div className="text-[11px] text-white/90 font-medium flex items-center justify-between pt-1.5 border-t border-white/20">
            <span>مطالعه کتب و فایل‌های PDF</span>
            <ChevronLeft className="w-3.5 h-3.5 text-white group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: ادعیه و زیارات معنوی مزار (تم سبز یشمی/تیره با آیکون در زمینه سفید و متن‌های سفید شفاف) */}
        <button
          type="button"
          id="user-prayers-portal-btn"
          onClick={() => setPortalPage('prayers')}
          title="ورود به بخش ادعیه و مناجات مزار همراه با صوت دلنشین و متن زیارات"
          className="bg-[#064e3b] hover:bg-[#043d2e] p-4 rounded-2xl border border-[#065f46]/70 shadow-md hover:shadow-lg transition-all flex flex-col justify-between text-right cursor-pointer group active:scale-[0.98] text-white"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs sm:text-sm text-white font-black tracking-wide">ادعیه و زیارات مزار</span>
            <div className="w-8 h-8 rounded-xl bg-white text-[#047857] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Headphones className="w-4 h-4 text-[#047857]" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white my-1.5 drop-shadow-xs">
            {formatPersianNumber(prayers.length || 3)} دعا و زیارت
          </div>
          <div className="text-[11px] text-white/90 font-medium flex items-center justify-between pt-1.5 border-t border-white/20">
            <span>پخش صوت و متن ادعیه</span>
            <ChevronLeft className="w-3.5 h-3.5 text-white group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* بخش کارت‌های شاخص سامانه: ۱. پرسش‌ها و آزمون‌ها (آبی / در حالت تاریک و ماتم: آبی نفتی-کاربنی) و ۲. امام‌شناسی (سبز یشمی برنامه‌های مزار) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ۱. کارت عریض و اختصاصی پرسش‌ها، آزمون‌ها و نظرسنجی‌ها */}
        <div
          id="wide-quizzes-and-exams-card"
          className={`w-full rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${
            isDarkMode || isMatamMode
              ? 'bg-gradient-to-r from-[#07152b] via-[#0b2246] to-[#081831] border-2 border-blue-600/70 shadow-[0_10px_30px_rgba(11,34,70,0.6)]'
              : 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 border border-blue-400/40'
          }`}
        >
          <div className="flex flex-col justify-between h-full gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border transition-colors ${
                  isDarkMode || isMatamMode
                    ? 'bg-[#0f2d5c] border-blue-400/40 text-blue-200'
                    : 'bg-white/15 backdrop-blur-xs border-white/25 text-white'
                }`}
              >
                <HelpCircle className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                    پرسش‌ها و آزمون‌ها
                  </h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 shadow-xs">
                    {formatPersianNumber(allQuizzesAndQuestions.length)} عنوان فعال
                  </span>
                </div>
                <p
                  className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                    isDarkMode || isMatamMode ? 'text-blue-200/90' : 'text-blue-100'
                  }`}
                >
                  شامل آزمون‌های چندسواله، سوالات تستی و تشریحی همراه با اعلام نتایج و نمره‌دهی
                </p>
              </div>
            </div>

            <button
              type="button"
              id="user-quizzes-and-exams-wide-btn"
              onClick={() => {
                setSelectedExamId(null);
                setPortalPage('quizzes');
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0 self-stretch sm:self-end"
            >
              <span>ورود به صفحه آزمون‌ها و پرسش‌ها</span>
              <ChevronLeft className="w-4 h-4 -translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* ۲. کارت اختصاصی امام‌شناسی با رنگ سبز یشمی برنامه‌های مزار (دقیقاً هم‌اندازه کارت پرسش‌ها و آزمون‌ها) */}
        <div
          id="wide-imamology-card"
          className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 rounded-3xl p-5 sm:p-6 text-white shadow-md border-2 border-emerald-500/50 relative overflow-hidden transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex flex-col justify-between h-full gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-800/80 backdrop-blur-xs border border-emerald-400/40 text-white flex items-center justify-center shrink-0 shadow-inner">
                <BookOpen className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                    امام‌شناسی
                  </h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 shadow-xs">
                    ۱۴ معصوم و حضرت زهرا (ع)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 leading-relaxed">
                  آشنایی تفکیکی با زندگانی، فضائل، احادیث نورانی، القاب و سیره جاودان چهارده معصوم (ع)
                </p>
              </div>
            </div>

            <button
              type="button"
              id="user-imamology-wide-btn"
              onClick={() => {
                setPortalPage('imamology');
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0 self-stretch sm:self-end"
            >
              <span>ورود به سامانه امام‌شناسی</span>
              <ChevronLeft className="w-4 h-4 -translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* کادر سبز یشمی برنامه‌های مزار (زیر آیکون پرسش‌ها و آزمون‌ها) */}
      <MazarProgramsCard
        programs={mazarPrograms}
        isController={isControllerRole(activeAccount.role)}
        onOpenControllerMazar={onOpenControllerMazar}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            id="user-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در پرسش‌ها، گزینه‌ها و مطالب..."
            className="w-full pl-4 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-stone-900"
          />
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            type="button"
            id="user-tab-all-btn"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            همه موارد ({formatPersianNumber(publishedItems.length)})
          </button>
          <button
            type="button"
            id="user-tab-quizzes-btn"
            onClick={() => setActiveTab('quizzes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'quizzes'
                ? 'bg-amber-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            پرسش‌ها و آزمون‌ها ({formatPersianNumber(totalQuestions)})
          </button>
          <button
            type="button"
            id="user-tab-texts-btn"
            onClick={() => setActiveTab('texts')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'texts'
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            مطالب و مقالات ({formatPersianNumber(publishedItems.filter((i) => i.type === 'text').length)})
          </button>
          <button
            type="button"
            id="user-tab-completed-btn"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-indigo-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            تکمیل‌شده‌ها
          </button>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-6">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-800">هیچ موردی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            لطفاً عبارت جستجو را تغییر دهید یا فیلتر دیگری را انتخاب نمایید.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => {
            const userAnswer = userAnswers[item.id];
            const isAnswered = !!userAnswer;
            const isRead = !!readArticles[item.id];

            return (
              <div
                key={`portal-item-${item.id}-${index}`}
                id={`user-item-card-${item.id}`}
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 shadow-2xs ${
                  isAnswered || isRead
                    ? 'border-emerald-200/80 bg-emerald-50/10'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Header of Item Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        item.type === 'multiple_choice'
                          ? 'bg-amber-100 text-amber-800'
                          : item.type === 'descriptive'
                          ? 'bg-indigo-100 text-indigo-800'
                          : item.type === 'poll'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.type === 'multiple_choice' && <HelpCircle className="w-3.5 h-3.5" />}
                      {item.type === 'descriptive' && <MessageSquare className="w-3.5 h-3.5" />}
                      {item.type === 'poll' && <Vote className="w-3.5 h-3.5" />}
                      {item.type === 'text' && <BookOpen className="w-3.5 h-3.5" />}
                      <span>
                        {item.type === 'multiple_choice'
                          ? 'سوال چندگزینه‌ای'
                          : item.type === 'descriptive'
                          ? 'سوال تشریحی'
                          : item.type === 'poll'
                          ? 'نظرسنجی عمومی'
                          : 'مطلب آموزشی / اطلاعیه'}
                      </span>
                    </span>

                    <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>

                    {item.estimatedReadMinutes ? (
                      <span className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatPersianNumber(item.estimatedReadMinutes)} دقیقه مطالعه
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.points ? (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        {formatPersianNumber(item.points)} امتیاز
                      </span>
                    ) : null}

                    {isAnswered && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        پاسخ داده شد
                      </span>
                    )}

                    {item.type === 'text' && isRead && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        مطالعه شده
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Body */}
                <div className="mt-3">
                  {item.type !== 'text' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExamId(item.id);
                        setPortalPage('quizzes');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-right w-full block hover:text-amber-700 transition-colors cursor-pointer group"
                      title="کلیک برای باز کردن صفحه اختصاصی آزمون و پاسخگویی به این سوال"
                    >
                      <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-700 leading-snug flex items-center justify-between gap-2">
                        <span>{item.title}</span>
                        <span className="text-xs text-amber-700 font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                          <span>صفحه اختصاصی آزمون</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </span>
                      </h3>
                    </button>
                  ) : (
                    <h3 className="text-base font-bold text-stone-900 leading-snug">
                      {item.title}
                    </h3>
                  )}

                  {item.type === 'text' ? (
                    <div className="mt-3 text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50 p-4 rounded-xl border border-stone-200 font-normal">
                      {item.content}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {item.content}
                    </p>
                  )}
                </div>

                {/* --- ITEM TYPE 1: TEXT / ARTICLE ACTIONS --- */}
                {item.type === 'text' && (
                  <div className="mt-4 flex items-center justify-between pt-2">
                    <button
                      type="button"
                      id={`toggle-read-btn-${item.id}`}
                      onClick={() => handleToggleReadArticle(item.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isRead
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{isRead ? 'مطالعه شده (کلیک برای لغو)' : 'علامت‌گذاری به عنوان خوانده شده'}</span>
                    </button>
                  </div>
                )}

                {/* --- ITEM TYPE 2: MULTIPLE CHOICE QUESTION --- */}
                {item.type === 'multiple_choice' && item.options && (
                  <div className="mt-4 space-y-3">
                    {/* Options list */}
                    <div className="space-y-2">
                      {item.options.map((optionText, optIdx) => {
                        const isSelected =
                          userAnswer?.selectedOptionIndex === optIdx ||
                          selectedChoices[item.id] === optIdx;

                        let optionStyle =
                          'bg-white border-stone-200 hover:bg-stone-50 text-stone-800';

                        if (isSelected) {
                          optionStyle =
                            'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-600 font-semibold';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            id={`option-btn-${item.id}-${optIdx}`}
                            disabled={isAnswered}
                            onClick={() =>
                              setSelectedChoices((prev) => ({ ...prev, [item.id]: optIdx }))
                            }
                            className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs sm:text-sm ${optionStyle} ${
                              isAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0">
                                {formatPersianNumber(optIdx + 1)}
                              </span>
                              <span>{optionText}</span>
                            </div>

                            {/* Status on option */}
                            {isAnswered && isSelected && (
                              <div className="shrink-0">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                                  انتخاب شما
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* If answered: Explanation and Score Display */}
                    {isAnswered && (
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              با تشکر از شرکت شما در این آزمون
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* If NOT answered: Submit Button */}
                    {!isAnswered && (
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          id={`submit-choice-btn-${item.id}`}
                          disabled={selectedChoices[item.id] === undefined}
                          onClick={() => handleSubmitChoice(item)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            selectedChoices[item.id] !== undefined
                              ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 cursor-pointer'
                              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>ثبت پاسخ من</span>
                        </button>

                        <span className="text-[11px] text-stone-400">
                          {selectedChoices[item.id] === undefined
                            ? 'ابتدا یک گزینه را انتخاب کنید'
                            : 'آماده ثبت نهایی'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* --- ITEM TYPE 3: DESCRIPTIVE QUESTION --- */}
                {item.type === 'descriptive' && (
                  <div className="mt-4 space-y-3">
                    {/* If not answered: Textarea input */}
                    {!isAnswered ? (
                      <div className="space-y-2">
                        <label
                          htmlFor={`descriptive-input-${item.id}`}
                          className="block text-xs font-bold text-stone-700"
                        >
                          پاسخ و دیدگاه تشریحی خود را اینجا بنویسید:
                        </label>
                        <textarea
                          id={`descriptive-input-${item.id}`}
                          rows={3}
                          value={textAnswers[item.id] || ''}
                          onChange={(e) =>
                            setTextAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          placeholder="متن پاسخ خود را به طور کامل بنویسید..."
                          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 transition-colors"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            id={`submit-descriptive-btn-${item.id}`}
                            disabled={!textAnswers[item.id]?.trim()}
                            onClick={() => handleSubmitDescriptive(item)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                              textAnswers[item.id]?.trim()
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>ارسال و ثبت نهایی پاسخ</span>
                          </button>

                          <span className="text-[11px] text-stone-400">
                            {formatPersianNumber(textAnswers[item.id]?.length || 0)} کاراکتر
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* If answered: show submitted text and feedback */
                      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            با تشکر از شرکت شما در این آزمون (پاسخ ثبت شد)
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-indigo-100/80 text-stone-800 leading-relaxed whitespace-pre-wrap">
                          {userAnswer.textAnswer}
                        </div>

                        {/* Admin Feedback Display if available */}
                        {currentUserSubmission?.feedback && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 space-y-1">
                            <div className="font-bold flex items-center gap-1 text-amber-800">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              بازخورد و نتیجه ارزیابی:
                            </div>
                            <p className="leading-relaxed">{currentUserSubmission.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* --- ITEM TYPE 4: POLL / OPINION SURVEY --- */}
                {item.type === 'poll' && (
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const votesMap = (item.pollVotes || {}) as Record<number, number>;
                      const totalVotes = Object.values(votesMap).reduce<number>(
                        (sum, count) => sum + Number(count || 0),
                        0
                      );

                      return (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            {(item.options || []).map((opt, optIndex) => {
                              const isSelected = isAnswered
                                ? userAnswer.selectedOptionIndex === optIndex
                                : selectedChoices[item.id] === optIndex;
                              const optVotes = Number(votesMap[optIndex] || 0);
                              const percent = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;

                              return (
                                <button
                                  key={optIndex}
                                  type="button"
                                  disabled={isAnswered}
                                  onClick={() =>
                                    setSelectedChoices((prev) => ({ ...prev, [item.id]: optIndex }))
                                  }
                                  className={`w-full p-3 rounded-xl border text-right transition-all relative overflow-hidden flex flex-col justify-center ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-bold shadow-xs'
                                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800'
                                  } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  {/* Progress bar background for results */}
                                  {isAnswered && (
                                    <div
                                      className="absolute top-0 right-0 bottom-0 bg-purple-100/70 -z-0 transition-all duration-700"
                                      style={{ width: `${percent}%` }}
                                    />
                                  )}

                                  <div className="flex items-center justify-between gap-3 relative z-10 w-full text-xs sm:text-sm">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? 'border-purple-600 bg-purple-600 text-white'
                                            : 'border-stone-300 bg-white'
                                        }`}
                                      >
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                      </div>
                                      <span>{opt}</span>
                                    </div>

                                    {/* Stats & Selected badge */}
                                    <div className="flex items-center gap-2">
                                      {isSelected && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 shrink-0">
                                          رای شما
                                        </span>
                                      )}
                                      {isAnswered && (
                                        <span className="font-mono text-xs font-bold text-purple-900 shrink-0">
                                          {formatPersianNumber(percent)}٪ ({formatPersianNumber(optVotes)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Action button if not answered */}
                          {!isAnswered ? (
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                id={`submit-poll-btn-${item.id}`}
                                disabled={selectedChoices[item.id] === undefined}
                                onClick={() => handleSubmitPoll(item)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                  selectedChoices[item.id] !== undefined
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                }`}
                              >
                                <Vote className="w-3.5 h-3.5" />
                                <span>ثبت نظر من در نظرسنجی</span>
                              </button>

                              <span className="text-[11px] text-stone-400">
                                {selectedChoices[item.id] === undefined
                                  ? 'لطفاً یکی از گزینه‌ها را علامت بزنید'
                                  : 'آماده ثبت نظر'}
                              </span>
                            </div>
                          ) : (
                            /* Success notice after voting */
                            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950 font-medium">
                              <span className="flex items-center gap-1.5 font-bold text-purple-800">
                                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                با تشکر، رای شما در نظرسنجی با موفقیت ثبت شد (+
                                {formatPersianNumber(userAnswer.scoreAwarded || item.points || 5)} امتیاز)
                              </span>
                              <span className="text-[11px] text-purple-700 font-bold">
                                مجموع آراء: {formatPersianNumber(totalVotes)} رای
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Modal (رده‌بندی شرکت‌کنندگان بر اساس امتیاز با نام، نام خانوادگی و نام مستعار) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        accounts={accounts}
        submissions={submissions}
        currentUserId={activeAccount.id}
      />
    </div>
  );
}
