import React, { useState, useMemo } from 'react';
import {
  ContentItem,
  UserAnswer,
  AdminSettings,
  Account,
  ExamSubQuestion,
} from '../types';
import {
  ArrowRight,
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Send,
  Search,
  MessageSquare,
  AlertCircle,
  GraduationCap,
  ListFilter,
  Check,
  BarChart2,
  Layers,
  Vote,
} from 'lucide-react';
import { formatPersianNumber, formatPersianDate, formatTimeAgo } from '../utils/formatters';
import { remoteDataSource } from '../data/remote/remoteDataSource';

interface QuizzesAndExamsPageProps {
  items: ContentItem[];
  userAnswers: Record<string, UserAnswer>;
  userProfile: { name: string; contact: string };
  activeAccount: Account;
  settings: AdminSettings;
  initialSelectedItemId?: string | null;
  onBackToMain: () => void;
  onUpdateUserProfile: (profile: { name: string; contact: string }) => void;
  onSubmitUserAnswer: (userName: string, contact: string, answer: UserAnswer) => void;
  onVotePoll?: (itemId: string, optionIndex: number) => void;
}

export const QuizzesAndExamsPage: React.FC<QuizzesAndExamsPageProps> = ({
  items,
  userAnswers,
  userProfile,
  activeAccount,
  settings,
  initialSelectedItemId = null,
  onBackToMain,
  onUpdateUserProfile,
  onSubmitUserAnswer,
  onVotePoll,
}) => {
  // Page mode: 'list' (shows quizzes & questions separated) or 'exam' (answering a specific exam/poll)
  const [activeMode, setActiveMode] = useState<'list' | 'exam'>(() =>
    initialSelectedItemId ? 'exam' : 'list'
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialSelectedItemId);

  // Tab filter: 'all' | 'multiple_choice' | 'descriptive' | 'poll'
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'multiple_choice' | 'descriptive' | 'poll'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Answering states
  const [selectedChoices, setSelectedChoices] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  // Sub-question answering state: itemId -> { subQId -> optionIndex or textAnswer }
  const [subChoices, setSubChoices] = useState<Record<string, Record<string, number>>>({});
  const [subTexts, setSubTexts] = useState<Record<string, Record<string, string>>>({});

  // Poll vote state: itemId -> optionIndex
  const [pollSelectedChoice, setPollSelectedChoice] = useState<Record<string, number>>({});

  const [submittedAlert, setSubmittedAlert] = useState<string | null>(null);

  // Filter published interactive items
  const allExamItems = useMemo(() => {
    return items
      .filter((i) => i.isPublished && (i.type === 'multiple_choice' || i.type === 'descriptive' || i.type === 'poll'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  // Multiple Choice Quizzes
  const multipleChoiceExams = useMemo(() => {
    return allExamItems.filter((i) => i.type === 'multiple_choice');
  }, [allExamItems]);

  // Descriptive Questions
  const descriptiveQuestions = useMemo(() => {
    return allExamItems.filter((i) => i.type === 'descriptive');
  }, [allExamItems]);

  // Poll items
  const pollItems = useMemo(() => {
    return allExamItems.filter((i) => i.type === 'poll');
  }, [allExamItems]);

  // Current filtered items in list view
  const filteredList = useMemo(() => {
    return allExamItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (categoryFilter === 'multiple_choice') return item.type === 'multiple_choice';
      if (categoryFilter === 'descriptive') return item.type === 'descriptive';
      if (categoryFilter === 'poll') return item.type === 'poll';
      return true;
    });
  }, [allExamItems, searchQuery, categoryFilter]);

  // Current selected item for the exam view
  const currentExamItem = useMemo(() => {
    if (!selectedItemId) return null;
    return allExamItems.find((i) => i.id === selectedItemId) || null;
  }, [allExamItems, selectedItemId]);

  // Calculate statistics
  const totalQuestions = allExamItems.length;
  const answeredCount = allExamItems.filter((i) => !!userAnswers[i.id]).length;
  const earnedScore = allExamItems.reduce((sum, item) => {
    const ans = userAnswers[item.id];
    return sum + (ans?.scoreAwarded || 0);
  }, 0);

  // Navigate to an exam
  const handleOpenExam = (itemId: string) => {
    setSelectedItemId(itemId);
    setActiveMode('exam');
    setSubmittedAlert(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back from exam to list
  const handleBackToList = () => {
    setActiveMode('list');
    setSelectedItemId(null);
    setSubmittedAlert(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit single multiple-choice answer
  const handleSubmitChoice = async (item: ContentItem) => {
    const selected = selectedChoices[item.id];
    if (selected === undefined) return;

    let isCorrect = false;
    let score = 0;
    let correctOptionIndex: number | undefined = undefined;
    let explanation: string | undefined = undefined;

    try {
      const gradeRes = await remoteDataSource.gradeContentItem(item.id, {
        selectedOptionIndex: selected,
      });
      if (gradeRes.success && gradeRes.data) {
        isCorrect = gradeRes.data.isCorrect;
        score = gradeRes.data.scoreAwarded;
        correctOptionIndex = gradeRes.data.correctOptionIndex;
        explanation = gradeRes.data.explanation;
      }
    } catch {
      // Fallback
      isCorrect = item.correctOptionIndex !== undefined && selected === item.correctOptionIndex;
      score = isCorrect ? item.points || 10 : 0;
      correctOptionIndex = item.correctOptionIndex;
      explanation = item.explanation;
    }

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: item.type,
      selectedOptionIndex: selected,
      isCorrect,
      scoreAwarded: score,
      maxScore: item.points || 10,
      correctOptionIndex,
      explanation,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
    setSubmittedAlert('با تشکر از شرکت شما در این آزمون. پاسخ شما با موفقیت ثبت شد.');
    setTimeout(() => setSubmittedAlert(null), 3000);
  };

  // Submit Multi-question Exam answer
  const handleSubmitMultiQuestionExam = async (item: ContentItem) => {
    if (!item.subQuestions || item.subQuestions.length === 0) return;

    const itemSubChoices = subChoices[item.id] || {};
    const itemSubTexts = subTexts[item.id] || {};

    let totalAwarded = 0;
    let maxTotal = 0;
    let subAnswersMap: Record<string, any> = {};

    const subAnswersPayload: Record<string, any> = {};
    item.subQuestions.forEach((subQ) => {
      if (subQ.type === 'multiple_choice') {
        subAnswersPayload[subQ.id] = {
          selectedOptionIndex: itemSubChoices[subQ.id],
        };
      } else {
        subAnswersPayload[subQ.id] = {
          textAnswer: itemSubTexts[subQ.id] || '',
        };
      }
    });

    try {
      const gradeRes = await remoteDataSource.gradeContentItem(item.id, {
        subAnswers: subAnswersPayload,
      });
      if (gradeRes.success && gradeRes.data) {
        totalAwarded = gradeRes.data.scoreAwarded;
        maxTotal = gradeRes.data.maxScore;
        subAnswersMap = gradeRes.data.subAnswers || {};
      }
    } catch {
      item.subQuestions.forEach((subQ) => {
        const qMaxScore = subQ.points || 10;
        maxTotal += qMaxScore;

        if (subQ.type === 'multiple_choice') {
          const picked = itemSubChoices[subQ.id];
          const isCorrect = picked !== undefined && subQ.correctOptionIndex !== undefined && picked === subQ.correctOptionIndex;
          const awarded = isCorrect ? qMaxScore : 0;
          totalAwarded += awarded;

          subAnswersMap[subQ.id] = {
            type: 'multiple_choice',
            selectedOptionIndex: picked,
            isCorrect,
            scoreAwarded: awarded,
            maxScore: qMaxScore,
            correctOptionIndex: subQ.correctOptionIndex,
            explanation: subQ.explanation,
          };
        } else {
          const text = itemSubTexts[subQ.id] || '';
          subAnswersMap[subQ.id] = {
            type: 'descriptive',
            textAnswer: text,
            scoreAwarded: 0,
            maxScore: qMaxScore,
            explanation: subQ.explanation,
          };
        }
      });
    }

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: item.type,
      subAnswers: subAnswersMap,
      isCorrect: totalAwarded > 0,
      scoreAwarded: totalAwarded,
      maxScore: maxTotal,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
    setSubmittedAlert('با تشکر از شرکت شما در این آزمون. پاسخ‌های شما با موفقیت ثبت شد.');
    setTimeout(() => setSubmittedAlert(null), 3500);
  };

  // Submit descriptive answer
  const handleSubmitDescriptive = (item: ContentItem) => {
    const text = textAnswers[item.id]?.trim();
    if (!text) return;

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: item.type,
      textAnswer: text,
      scoreAwarded: 0,
      maxScore: item.points || 15,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
    setSubmittedAlert('پاسخ تشریحی شما با موفقیت برای کنترل‌گر ارسال شد!');
    setTimeout(() => setSubmittedAlert(null), 3500);
  };

  // Submit Poll Vote
  const handleSubmitPollVote = (item: ContentItem) => {
    const pickedOption = pollSelectedChoice[item.id];
    if (pickedOption === undefined) return;

    onVotePoll?.(item.id, pickedOption);

    const answer: UserAnswer = {
      itemId: item.id,
      itemType: 'poll',
      selectedOptionIndex: pickedOption,
      isCorrect: true,
      scoreAwarded: item.points || 5,
      maxScore: item.points || 5,
      answeredAt: new Date().toISOString(),
    };

    onSubmitUserAnswer(userProfile.name, userProfile.contact, answer);
    setSubmittedAlert(`رای شما در نظرسنجی با موفقیت ثبت گردید (+${formatPersianNumber(item.points || 5)} امتیاز)`);
    setTimeout(() => setSubmittedAlert(null), 3500);
  };

  // Navigation between questions
  const currentIndex = currentExamItem ? allExamItems.findIndex((i) => i.id === currentExamItem.id) : -1;
  const prevExam = currentIndex > 0 ? allExamItems[currentIndex - 1] : null;
  const nextExam = currentIndex >= 0 && currentIndex < allExamItems.length - 1 ? allExamItems[currentIndex + 1] : null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* ============================================================ */}
      {/* MODE 1: LIST OF EXAMS, QUESTIONS AND POLLS ('list') */}
      {/* ============================================================ */}
      {activeMode === 'list' && (
        <div className="space-y-6">
          {/* Top Header with Back to Portal button */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToMain}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                  title="بازگشت به صفحه اصلی"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>صفحه اصلی</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                      سامانه سنجش و ارزیابی
                    </span>
                    <span className="text-xs text-stone-400">آزمون‌های چندسوالی، پرسش‌ها و نظرسنجی</span>
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-stone-900 mt-1">
                    پرسش‌ها، آزمون‌ها و نظرسنجی‌ها
                  </h2>
                </div>
              </div>

              {/* Progress Counters */}
              <div className="flex items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    پاسخ داده شده: {formatPersianNumber(answeredCount)} از {formatPersianNumber(totalQuestions)}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>امتیاز شما: {formatPersianNumber(earnedScore)}</span>
                </div>
              </div>
            </div>

            {/* Instruction Notice */}
            <p className="text-xs text-stone-500 mt-3 pt-3 border-t border-stone-100 leading-relaxed">
              در این صفحه آزمون‌های تستی (تک‌سوالی و چندسوالی)، پرسش‌های تشریحی و نظرسنجی‌های فعال قرار دارند. با کلیک بر روی هر آیتم، وارد صفحه اختصاصی آن شده و پاسخ‌های خود را ثبت فرمایید.
            </p>
          </div>

          {/* Category Tabs & Search Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Category Tabs: همه vs آزمون‌ها vs پرسش‌ها vs نظرسنجی‌ها */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>همه موارد</span>
                <span className="text-[11px] px-1.5 py-0.2 bg-stone-700/20 rounded-md">
                  {formatPersianNumber(allExamItems.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('multiple_choice')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'multiple_choice'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>آزمون‌ها و تست‌ها</span>
                <span className="text-[11px] px-1.5 py-0.2 bg-amber-800/30 rounded-md">
                  {formatPersianNumber(multipleChoiceExams.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('descriptive')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'descriptive'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>پرسش‌های تشریحی</span>
                <span className="text-[11px] px-1.5 py-0.2 bg-indigo-800/30 rounded-md">
                  {formatPersianNumber(descriptiveQuestions.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('poll')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'poll'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>نظرسنجی‌ها</span>
                <span className="text-[11px] px-1.5 py-0.2 bg-cyan-800/30 rounded-md">
                  {formatPersianNumber(pollItems.length)}
                </span>
              </button>
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در پرسش‌ها و آزمون‌ها..."
                className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Grid of Items */}
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-stone-400">
              <HelpCircle className="w-12 h-12 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-600">موردی یافت نشد.</p>
              <p className="text-xs text-stone-400 mt-1">
                عبارت جستجو یا فیلتر دسته‌بندی را تغییر دهید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map((item) => {
                const answer = userAnswers[item.id];
                const isAnswered = !!answer;
                const hasMultipleQ = !!(item.subQuestions && item.subQuestions.length > 0);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl border p-5 transition-all flex flex-col justify-between group hover:shadow-md ${
                      isAnswered
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : 'border-stone-200 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              item.type === 'multiple_choice'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : item.type === 'descriptive'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                            }`}
                          >
                            {item.type === 'multiple_choice'
                              ? hasMultipleQ
                                ? `آزمون جامع (${formatPersianNumber(item.subQuestions!.length)} سوال)`
                                : 'آزمون تستی'
                              : item.type === 'descriptive'
                              ? 'پرسش تشریحی'
                              : 'نظرسنجی'}
                          </span>

                          <span className="text-[11px] text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded-lg">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Award className="w-3.5 h-3.5" />
                          <span>{formatPersianNumber(item.points || 10)} امتیاز</span>
                        </div>
                      </div>

                      {/* Title */}
                      <button
                        type="button"
                        onClick={() => handleOpenExam(item.id)}
                        className="text-right w-full block group-hover:text-amber-700 transition-colors cursor-pointer"
                      >
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-relaxed group-hover:text-amber-700">
                          {item.title}
                        </h3>
                      </button>

                      {/* Content Preview */}
                      <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Footer: User Answer Status & CTA */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      {isAnswered ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>با تشکر از شرکت شما در آزمون</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>هنوز شرکت نکرده‌اید</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenExam(item.id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-stone-900 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span>{isAnswered ? 'مشاهده و بازبینی' : item.type === 'poll' ? 'ثبت رای' : 'شروع آزمون'}</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 2: DEDICATED EXAM ROOM FOR ANSWERING QUESTIONS ('exam') */}
      {/* ============================================================ */}
      {activeMode === 'exam' && currentExamItem && (
        <div className="space-y-5">
          {/* Breadcrumb & Navigation Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-bold cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>فهرست پرسش‌ها و آزمون‌ها</span>
              </button>
              <span className="text-stone-300">/</span>
              <span className="text-amber-800 font-bold truncate max-w-xs">
                {currentExamItem.title}
              </span>
            </div>

            {/* Quick Next/Prev Navigation */}
            <div className="flex items-center gap-1.5 self-end sm:self-center text-xs">
              {prevExam && (
                <button
                  type="button"
                  onClick={() => handleOpenExam(prevExam.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>آیتم قبلی</span>
                </button>
              )}
              {nextExam && (
                <button
                  type="button"
                  onClick={() => handleOpenExam(nextExam.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  <span>آیتم بعدی</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleBackToList}
                className="px-3 py-1 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                بازگشت
              </button>
            </div>
          </div>

          {/* Success Alert Banner */}
          {submittedAlert && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submittedAlert}</span>
            </div>
          )}

          {/* The Main Question Card */}
          <div className="bg-white rounded-3xl border-2 border-amber-400/80 p-5 sm:p-7 shadow-sm">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    currentExamItem.type === 'multiple_choice'
                      ? 'bg-amber-100 text-amber-900'
                      : currentExamItem.type === 'descriptive'
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-cyan-100 text-cyan-900'
                  }`}
                >
                  {currentExamItem.type === 'multiple_choice'
                    ? currentExamItem.subQuestions && currentExamItem.subQuestions.length > 0
                      ? `آزمون جامع (${formatPersianNumber(currentExamItem.subQuestions.length)} سوال)`
                      : 'آزمون چهارگزینه‌ای'
                    : currentExamItem.type === 'descriptive'
                    ? 'پرسش تشریحی'
                    : 'نظرسنجی'}
                </span>
                <span className="text-xs text-stone-600 font-semibold bg-stone-100 px-2.5 py-1 rounded-lg">
                  {currentExamItem.category}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                <Award className="w-4 h-4 text-amber-600" />
                <span>بارم: {formatPersianNumber(currentExamItem.points || 10)} امتیاز</span>
              </div>
            </div>

            {/* Exam Title */}
            <h1 className="text-base sm:text-lg md:text-xl font-black text-stone-900 mt-4 leading-snug">
              {currentExamItem.title}
            </h1>

            {/* Question Text / Prompt */}
            <div className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
              {currentExamItem.content}
            </div>

            {/* ======================================================== */}
            {/* MULTI-QUESTION EXAM RENDERING (چند سوال در یک آزمون) */}
            {/* ======================================================== */}
            {currentExamItem.type === 'multiple_choice' &&
              currentExamItem.subQuestions &&
              currentExamItem.subQuestions.length > 0 && (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold">
                    <Layers className="w-4 h-4 text-amber-700" />
                    <span>
                      این آزمون شامل {formatPersianNumber(currentExamItem.subQuestions.length)} سوال تستی و تشریحی است. به تمام سوالات زیر پاسخ داده و دکمه ثبت نهایی را لمس فرمایید.
                    </span>
                  </div>

                  {/* Sub-Questions list */}
                  <div className="space-y-6">
                    {currentExamItem.subQuestions.map((subQ, idx) => {
                      const savedSubAnswer =
                        userAnswers[currentExamItem.id]?.subAnswers?.[subQ.id];

                      return (
                        <div
                          key={subQ.id}
                          className="p-5 rounded-2xl border border-stone-300 bg-stone-50/70 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                                {formatPersianNumber(idx + 1)}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-stone-900">
                                {subQ.prompt}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              {formatPersianNumber(subQ.points || 10)} نمره
                            </span>
                          </div>

                          {/* Multiple Choice Sub-Question */}
                          {subQ.type === 'multiple_choice' && subQ.options && (
                            <div className="space-y-2 pt-2">
                              {subQ.options.map((opt, optIdx) => {
                                const isSelected =
                                  subChoices[currentExamItem.id]?.[subQ.id] === optIdx;
                                const isSavedChoice =
                                  savedSubAnswer?.selectedOptionIndex === optIdx;

                                let optStyle =
                                  'bg-white border-stone-200 hover:bg-stone-100 text-stone-800';

                                if (isSavedChoice || isSelected) {
                                  optStyle =
                                    'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 font-bold';
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => {
                                      if (savedSubAnswer) return;
                                      setSubChoices((prev) => ({
                                        ...prev,
                                        [currentExamItem.id]: {
                                          ...(prev[currentExamItem.id] || {}),
                                          [subQ.id]: optIdx,
                                        },
                                      }));
                                    }}
                                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${optStyle}`}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-stone-100 border border-stone-300 text-stone-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                                      {optIdx === 0 && 'الف'}
                                      {optIdx === 1 && 'ب'}
                                      {optIdx === 2 && 'ج'}
                                      {optIdx === 3 && 'د'}
                                      {optIdx > 3 && formatPersianNumber(optIdx + 1)}
                                    </span>
                                    <span className="text-xs sm:text-sm font-medium">
                                      {opt}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Descriptive Sub-Question */}
                          {subQ.type === 'descriptive' && (
                            <div className="pt-2">
                              <textarea
                                rows={3}
                                value={
                                  subTexts[currentExamItem.id]?.[subQ.id] !== undefined
                                    ? subTexts[currentExamItem.id][subQ.id]
                                    : savedSubAnswer?.textAnswer || ''
                                }
                                onChange={(e) =>
                                  setSubTexts((prev) => ({
                                    ...prev,
                                    [currentExamItem.id]: {
                                      ...(prev[currentExamItem.id] || {}),
                                      [subQ.id]: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="پاسخ تشریحی خود را برای این سوال بنویسید..."
                                className="w-full p-3 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:border-stone-900"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Button for Multi-Question Exam */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      {userAnswers[currentExamItem.id] ? (
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>با تشکر از شرکت شما در این آزمون</span>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-500">
                          پس از پاسخگویی به تمام سوالات، دکمه ثبت نهایی آزمون را بفشارید.
                        </span>
                      )}
                    </div>

                    {!userAnswers[currentExamItem.id] && (
                      <button
                        type="button"
                        onClick={() => handleSubmitMultiQuestionExam(currentExamItem)}
                        className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        ثبت و ارسال نهایی آزمون جامع
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* ======================================================== */}
            {/* SINGLE MULTIPLE CHOICE QUESTIONS SECTION */}
            {/* ======================================================== */}
            {currentExamItem.type === 'multiple_choice' &&
              (!currentExamItem.subQuestions || currentExamItem.subQuestions.length === 0) && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>یکی از گزینه‌های زیر را به عنوان پاسخ صحیح انتخاب فرمایید:</span>
                  </h4>

                  <div className="space-y-2.5">
                    {currentExamItem.options?.map((option, optIdx) => {
                      const isSelected = selectedChoices[currentExamItem.id] === optIdx;
                      const savedAnswer = userAnswers[currentExamItem.id];
                      const isSavedChoice = savedAnswer?.selectedOptionIndex === optIdx;

                      let optStyle = 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800';
                      if (isSavedChoice || isSelected) {
                        optStyle = 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => {
                            if (savedAnswer) return;
                            setSelectedChoices((prev) => ({
                              ...prev,
                              [currentExamItem.id]: optIdx,
                            }));
                          }}
                          className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${optStyle}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-white border border-stone-300 text-stone-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                            {optIdx === 0 && 'الف'}
                            {optIdx === 1 && 'ب'}
                            {optIdx === 2 && 'ج'}
                            {optIdx === 3 && 'د'}
                            {optIdx > 3 && formatPersianNumber(optIdx + 1)}
                          </span>
                          <div className="flex-1 text-xs sm:text-sm font-semibold leading-relaxed">
                            {option}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback and action buttons */}
                  {userAnswers[currentExamItem.id] ? (
                    <div className="mt-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>با تشکر از شرکت شما در این آزمون</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                      <span className="text-xs text-stone-500">
                        گزینه مورد نظر خود را انتخاب و بر روی دکمه ثبت پاسخ کلیک نمایید.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSubmitChoice(currentExamItem)}
                        disabled={selectedChoices[currentExamItem.id] === undefined}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>ثبت و ارسال پاسخ آزمون</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* ======================================================== */}
            {/* POLL / SURVEY SECTION */}
            {/* ======================================================== */}
            {currentExamItem.type === 'poll' && (
              <div className="mt-6 space-y-5">
                <h4 className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-cyan-700" />
                  <span>گزینه انتخابی خود را مشخص کرده و رای دهید:</span>
                </h4>

                {/* Options List */}
                <div className="space-y-3">
                  {currentExamItem.options?.map((option, optIdx) => {
                    const savedAnswer = userAnswers[currentExamItem.id];
                    const isVoted = !!savedAnswer;
                    const isMyChoice = savedAnswer?.selectedOptionIndex === optIdx;
                    const isSelected = pollSelectedChoice[currentExamItem.id] === optIdx;

                    // Calculate stats
                    const votesMap = (currentExamItem.pollVotes || {}) as Record<number, number>;
                    const totalVotes: number = Object.values(votesMap).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
                    const optionVotes = votesMap[optIdx] || 0;
                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                    return (
                      <div
                        key={optIdx}
                        onClick={() => {
                          if (!isVoted) {
                            setPollSelectedChoice((prev) => ({
                              ...prev,
                              [currentExamItem.id]: optIdx,
                            }));
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                          isVoted
                            ? isMyChoice
                              ? 'bg-cyan-50/80 border-cyan-500 ring-2 ring-cyan-500/20'
                              : 'bg-stone-50 border-stone-200'
                            : isSelected
                            ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-500/20 cursor-pointer'
                            : 'bg-white border-stone-200 hover:bg-stone-50 cursor-pointer'
                        }`}
                      >
                        {/* Progress Bar background if already voted */}
                        {isVoted && (
                          <div
                            className={`absolute inset-y-0 right-0 transition-all duration-700 opacity-20 ${
                              isMyChoice ? 'bg-cyan-600' : 'bg-stone-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isMyChoice
                                  ? 'bg-cyan-700 text-white'
                                  : 'bg-stone-100 text-stone-700 border border-stone-300'
                              }`}
                            >
                              {formatPersianNumber(optIdx + 1)}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-stone-900">
                              {option}
                            </span>
                            {isMyChoice && (
                              <span className="text-[10px] bg-cyan-700 text-white font-bold px-2 py-0.5 rounded-full">
                                رای شما
                              </span>
                            )}
                          </div>

                          {isVoted && (
                            <div className="flex items-center gap-2 text-xs font-bold font-mono">
                              <span className="text-cyan-900">{formatPersianNumber(percentage)}٪</span>
                              <span className="text-stone-400 text-[10px]">
                                ({formatPersianNumber(optionVotes)} رای)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Poll Actions and Summary */}
                <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {userAnswers[currentExamItem.id] ? (
                      <div className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-cyan-700" />
                        <span>
                          رای شما در این نظرسنجی ثبت شده است (+{formatPersianNumber(currentExamItem.points || 5)} امتیاز فعالیت)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-600">
                        یکی از گزینه‌ها را برگزینید و برای ثبت رای خود کلیک نمایید.
                      </span>
                    )}
                  </div>

                  {!userAnswers[currentExamItem.id] && (
                    <button
                      type="button"
                      onClick={() => handleSubmitPollVote(currentExamItem)}
                      disabled={pollSelectedChoice[currentExamItem.id] === undefined}
                      className="px-6 py-2.5 bg-cyan-700 hover:bg-cyan-800 disabled:bg-stone-300 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      ثبت رای در نظرسنجی
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* DESCRIPTIVE QUESTIONS SECTION */}
            {/* ======================================================== */}
            {currentExamItem.type === 'descriptive' && (
              <div className="mt-6 space-y-4">
                <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>پاسخ تشریحی و دیدگاه خود را در کادر زیر تایپ فرمایید:</span>
                </h4>

                <textarea
                  rows={5}
                  value={
                    textAnswers[currentExamItem.id] !== undefined
                      ? textAnswers[currentExamItem.id]
                      : userAnswers[currentExamItem.id]?.textAnswer || ''
                  }
                  onChange={(e) =>
                    setTextAnswers({
                      ...textAnswers,
                      [currentExamItem.id]: e.target.value,
                    })
                  }
                  placeholder="پاسخ، استدلال و تحلیل کامل خود را اینجا بنویسید..."
                  className="w-full p-4 bg-stone-50 border border-stone-300 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 leading-relaxed font-medium"
                />

                {userAnswers[currentExamItem.id] ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>با تشکر از شرکت شما در این آزمون (پاسخ ثبت گردید)</span>
                      </span>
                    </div>

                    {userAnswers[currentExamItem.id].controllerComment && (
                      <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 text-xs text-stone-800 leading-relaxed">
                        <span className="font-bold text-emerald-950 block mb-1">بازخورد و نتیجه ارزیابی:</span>
                        {userAnswers[currentExamItem.id].controllerComment}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-stone-500">
                      پاسخ شما به طور اختصاصی ارزیابی خواهد شد.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSubmitDescriptive(currentExamItem)}
                      disabled={!textAnswers[currentExamItem.id]?.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>ارسال پاسخ تشریحی به کنترل‌گر</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
