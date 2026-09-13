import { useState, useMemo, useRef, type ChangeEvent } from 'react';
import { Account, ContentItem, UserSubmission, isControllerRole } from '../types';
import {
  X,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  User,
  Shield,
  Clock,
  Printer,
  Edit3,
  Save,
  Sparkles,
  Info,
  Check,
  Camera,
  Upload,
} from 'lucide-react';
import { formatPersianNumber, formatPersianDate } from '../utils/formatters';

interface PersonalAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  items: ContentItem[];
  submission: UserSubmission | null;
  onSavePersonalNotes: (accountId: string, notes: string) => void;
  onUpdateAccountPhoto?: (photoUrl: string) => void;
  isControllerViewing?: boolean;
  onControllerSaveFeedback?: (
    submissionId: string,
    feedback: string,
    newTotalScore: number
  ) => void;
}

export function PersonalAccountModal({
  isOpen,
  onClose,
  account,
  items,
  submission,
  onSavePersonalNotes,
  onUpdateAccountPhoto,
  isControllerViewing = false,
  onControllerSaveFeedback,
}: PersonalAccountModalProps) {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'notes' | 'details'>('results');
  const [personalNotesText, setPersonalNotesText] = useState(account.personalNotes || '');
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  // Controller edit states if controller is modifying notes on user's exam
  const [controllerFeedbackInput, setControllerFeedbackInput] = useState(
    submission?.feedback || ''
  );
  const [scoreEditInput, setScoreEditInput] = useState<number>(submission?.totalScore || 0);
  const [controllerSavedNotice, setControllerSavedNotice] = useState(false);

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result && onUpdateAccountPhoto) {
        onUpdateAccountPhoto(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculate detailed stats
  const answeredItemsList = useMemo(() => {
    if (!submission || !submission.answers) return [];
    return Object.values(submission.answers).map((ans) => {
      const item = items.find((i) => i.id === ans.itemId);
      return {
        answer: ans,
        item,
      };
    });
  }, [submission, items]);

  const correctAnswersCount = answeredItemsList.filter(
    (a) => a.answer.isCorrect === true
  ).length;
  const totalAnsweredCount = answeredItemsList.length;
  const scorePercent =
    submission && submission.maxScore > 0
      ? Math.round((submission.totalScore / submission.maxScore) * 100)
      : 0;

  const handleSaveNotes = () => {
    onSavePersonalNotes(account.id, personalNotesText);
    setNotesSavedNotice(true);
    setTimeout(() => setNotesSavedNotice(false), 2500);
  };

  const handleSaveControllerFeedback = () => {
    if (!submission || !onControllerSaveFeedback) return;
    onControllerSaveFeedback(
      submission.id,
      controllerFeedbackInput,
      Number(scoreEditInput) || 0
    );
    setControllerSavedNotice(true);
    setTimeout(() => setControllerSavedNotice(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="personal-account-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      style={{ direction: 'rtl' }}
    >
      <div
        id="personal-account-dialog"
        className="bg-white rounded-3xl max-w-3xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3.5">
            {/* User Avatar / Photo */}
            <div className="relative group">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm overflow-hidden border-2 border-white ${
                  account.avatarColor || 'bg-indigo-600'
                }`}
              >
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.name}
                    className="w-full h-full object-cover"
                  />
                ) : isControllerRole(account.role) ? (
                  <Shield className="w-7 h-7" />
                ) : (
                  <User className="w-7 h-7" />
                )}
              </div>

              {/* Quick photo upload button on hover/touch */}
              {onUpdateAccountPhoto && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="تغییر یا بارگذاری تصویر پروفایل"
                  className="absolute -bottom-1 -left-1 w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center shadow-md hover:bg-stone-800 transition-transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  حساب شخصی: {account.name}
                </h2>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isControllerRole(account.role)
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {account.badgeTitle || (isControllerRole(account.role) ? 'کنترل‌گر' : 'کاربر')}
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap items-center gap-2">
                {account.emailOrPhone && <span>{account.emailOrPhone}</span>}
                {onUpdateAccountPhoto && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>تغییر عکس پروفایل</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="چاپ کارنامه"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ کارنامه</span>
            </button>
            <button
              id="close-personal-account-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-100/70 px-4 sm:px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>کارنامه و نتایج آزمون</span>
            {totalAnsweredCount > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                {formatPersianNumber(totalAnsweredCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Edit3 className="w-4 h-4 text-stone-600" />
            <span>دفترچه یادداشت‌های من</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Info className="w-4 h-4 text-stone-600" />
            <span>مشخصات حساب</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: RESULTS & REPORT CARD */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {/* Score Highlights or Thank You Banner */}
              {!isControllerViewing ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center sm:text-right flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-emerald-950">
                        با تشکر از شرکت شما در آزمون
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        پاسخ‌های شما با موفقیت در سامانه ثبت و در پرونده کاربری ذخیره گردید.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shrink-0 self-center text-center">
                    <div className="text-[11px] text-stone-500 font-medium">تعداد آزمون‌های ثبت‌شده</div>
                    <div className="text-lg font-black text-stone-900 mt-0.5">
                      {formatPersianNumber(totalAnsweredCount)} آزمون
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                    <div className="text-xs text-amber-800 font-medium">نمره کسب‌شده</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-amber-900 mt-1">
                      {submission
                        ? `${formatPersianNumber(submission.totalScore)} / ${formatPersianNumber(
                            submission.maxScore
                          )}`
                        : '۰ / ۰'}
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5">امتیاز کل آزمون‌ها</div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <div className="text-xs text-emerald-800 font-medium">درصد موفقیت</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-900 mt-1">
                      %{formatPersianNumber(scorePercent)}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">نسبت به نمره کل</div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
                    <div className="text-xs text-stone-600 font-medium">پاسخ‌های صحیح</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                      {formatPersianNumber(correctAnswersCount)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">سوال با پاسخ دقیق</div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
                    <div className="text-xs text-stone-600 font-medium">کل سوالات پاسخ‌داده</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                      {formatPersianNumber(totalAnsweredCount)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">ثبت‌شده در این حساب</div>
                  </div>
                </div>
              )}

              {/* CONTROLLER'S OFFICIAL NOTES & EVALUATION */}
              <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 shadow-sm border border-stone-800 relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-300">
                        یادداشت و ارزیابی کنترل‌گر برای این کاربر
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        {submission?.controllerNoteAuthor
                          ? `نویسنده: ${submission.controllerNoteAuthor}`
                          : 'کنترل‌گر سیستم'}
                        {submission?.controllerNoteDate && (
                          <span className="mr-2">
                            • تاریخ: {formatPersianDate(submission.controllerNoteDate)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-stone-800 text-amber-400 px-2 py-0.5 rounded-full font-semibold border border-stone-700">
                    رسمی و ثبت‌شده
                  </span>
                </div>

                {submission?.feedback ? (
                  <div className="bg-stone-800/80 rounded-xl p-3.5 text-xs sm:text-sm text-stone-200 leading-relaxed border border-stone-700">
                    «{submission.feedback}»
                  </div>
                ) : (
                  <div className="bg-stone-800/50 rounded-xl p-3 text-xs text-stone-400 border border-stone-700/60">
                    هنوز یادداشت یا بازخورد متنی برای این حساب ثبت نشده است. پس از ثبت در این کادر نمایش داده می‌شود.
                  </div>
                )}

                {/* If Controller is viewing or editing */}
                {isControllerViewing && onControllerSaveFeedback && (
                  <div className="mt-4 pt-3 border-t border-stone-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300">
                        فرم ثبت / ویرایش یادداشت کنترل‌گر:
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span>تنظیم نمره نهایی:</span>
                        <input
                          type="number"
                          value={scoreEditInput}
                          onChange={(e) => setScoreEditInput(Number(e.target.value))}
                          className="w-16 bg-stone-800 text-white border border-stone-600 rounded px-2 py-0.5 text-center"
                        />
                      </div>
                    </div>
                    <textarea
                      value={controllerFeedbackInput}
                      onChange={(e) => setControllerFeedbackInput(e.target.value)}
                      placeholder="یادداشت، تحلیل و راهنمایی اختصاصی کنترل‌گر را برای این کاربر یادداشت فرمایید..."
                      rows={3}
                      className="w-full bg-stone-800 text-white border border-stone-600 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleSaveControllerFeedback}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>ثبت یادداشت کنترل‌گر در حساب کاربر</span>
                      </button>
                      {controllerSavedNotice && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          یادداشت در حساب کاربر ثبت شد!
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* LIST OF DETAILED EXAM ANSWERS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-stone-600" />
                    <span>{isControllerViewing ? 'ریز سوالات و نمرات اخذ شده' : 'آزمون‌ها و سوالات ثبت‌شده'}</span>
                  </h3>
                  <span className="text-xs text-stone-500">
                    {formatPersianNumber(answeredItemsList.length)} سوال پاسخ‌داده‌شده
                  </span>
                </div>

                {answeredItemsList.length === 0 ? (
                  <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                    <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-600">
                      هنوز پاسخی در این حساب شخصی ثبت نشده است.
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      وارد «بخش کاربر» شوید و در آزمون‌ها شرکت کنید تا نمرات شما در اینجا ثبت گردد.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {answeredItemsList.map(({ answer, item }, idx) => (
                      <div
                        key={`personal-ans-${answer.itemId}-${idx}`}
                        className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-2.5"
                      >
                        {/* Question Title & Points */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-lg bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {formatPersianNumber(idx + 1)}
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                                {item ? item.title : `پرسش شناسه ${answer.itemId}`}
                              </h4>
                              <span className="text-[10px] text-stone-500">
                                {answer.itemType === 'multiple_choice'
                                  ? 'آزمون چهارگزینه‌ای'
                                  : 'پاسخ تحلیلی / تشریحی'}
                                {' • '}
                                ثبت در: {formatPersianDate(answer.answeredAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isControllerViewing ? (
                              <>
                                {answer.itemType === 'multiple_choice' ? (
                                  answer.isCorrect ? (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      صحیح
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                                      <XCircle className="w-3.5 h-3.5" />
                                      نادرست
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[11px] font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded-lg">
                                    تشریحی
                                  </span>
                                )}
                                <span className="text-xs font-bold text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded-lg">
                                  {formatPersianNumber(answer.scoreAwarded || 0)} از{' '}
                                  {formatPersianNumber(answer.maxScore || 0)}
                                </span>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                با تشکر از شرکت شما
                              </span>
                            )}
                          </div>
                        </div>

                        {/* User's response display */}
                        <div className="bg-white rounded-xl p-3 border border-stone-200 text-xs space-y-1.5">
                          {answer.itemType === 'multiple_choice' ? (
                            <div>
                              <span className="font-semibold text-stone-600">گزینه انتخابی شما: </span>
                              <span className="font-bold text-stone-900">
                                {item?.options && answer.selectedOptionIndex !== undefined
                                  ? item.options[answer.selectedOptionIndex]
                                  : `گزینه شماره ${formatPersianNumber(
                                      (answer.selectedOptionIndex ?? 0) + 1
                                    )}`}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-stone-600">متن ارسالی شما: </span>
                              <p className="text-stone-800 whitespace-pre-wrap mt-0.5 leading-relaxed font-sans">
                                {answer.textAnswer}
                              </p>
                            </div>
                          )}

                          {/* Controller comment on this item if any */}
                          {answer.controllerComment && (
                            <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-amber-900 bg-amber-50/60 p-2 rounded-lg flex items-start gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-bold">یادداشت ارزیاب: </strong>
                                <span>{answer.controllerComment}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL STUDY NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  <span>دفترچه یادداشت‌های شخصی کاربر</span>
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  می‌توانید خلاصه نکات، راهکارهای بهبود نمره و یادداشت‌های مهم آزمون را در این بخش
                  بنویسید. این یادداشت‌ها به طور دائم در حساب شما ذخیره می‌شوند.
                </p>
              </div>

              <textarea
                value={personalNotesText}
                onChange={(e) => setPersonalNotesText(e.target.value)}
                placeholder="یادداشت‌های شخصی خود در مورد آزمون‌ها، اهداف و نکات مهم را اینجا بنویسید..."
                rows={8}
                className="w-full p-4 rounded-2xl border border-stone-300 text-xs sm:text-sm text-stone-900 leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره یادداشت در حساب شخصی</span>
                </button>

                {notesSavedNotice && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                    <Check className="w-4 h-4" />
                    یادداشت با موفقیت ذخیره شد
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4 text-xs text-stone-700">
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-stone-200">
                  <span className="text-stone-500">نام و نام خانوادگی:</span>
                  <span className="font-bold text-stone-900">{account.name}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-stone-200">
                  <span className="text-stone-500">نقش در سامانه:</span>
                  <span className="font-bold text-stone-900">
                    {isControllerRole(account.role) ? 'کنترل‌گر و ارزیاب' : 'کاربر و شرکت‌کننده'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-stone-200">
                  <span className="text-stone-500">شماره تماس:</span>
                  <span className="text-stone-900 font-mono" dir="ltr">
                    {account.phone || account.emailOrPhone || 'ثبت نشده'}
                  </span>
                </div>

                {account.email && (
                  <div className="flex items-center justify-between py-2 border-b border-stone-200">
                    <span className="text-stone-500">ایمیل:</span>
                    <span className="text-stone-900 font-mono" dir="ltr">{account.email}</span>
                  </div>
                )}

                {account.age && (
                  <div className="flex items-center justify-between py-2 border-b border-stone-200">
                    <span className="text-stone-500">سن:</span>
                    <span className="text-stone-900 font-bold">
                      {formatPersianNumber(account.age)} سال
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2">
                  <span className="text-stone-500">تاریخ ساخت حساب:</span>
                  <span className="text-stone-900">
                    {formatPersianDate(account.createdAt || new Date().toISOString())}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-stone-100 rounded-2xl text-[11px] text-stone-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-stone-400 shrink-0" />
                <span>
                  تمامی داده‌ها، پاسخ‌ها و نتایج آزمون مستقیماً در این حساب کاربری ذخیره و
                  همگام‌سازی می‌گردد.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-[11px] text-stone-500">
            حساب فعال: <strong className="text-stone-800">{account.name}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
}
