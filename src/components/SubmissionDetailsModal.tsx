import { useState } from 'react';
import { UserSubmission, ContentItem } from '../types';
import { X, CheckCircle2, XCircle, MessageSquare, Award, Clock, Save, Vote, Layers } from 'lucide-react';
import { formatPersianNumber, formatPersianDate } from '../utils/formatters';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: UserSubmission | null;
  items: ContentItem[];
  onUpdateFeedback: (submissionId: string, feedback: string, newTotalScore: number) => void;
}

export function SubmissionDetailsModal({
  isOpen,
  onClose,
  submission,
  items,
  onUpdateFeedback,
}: SubmissionDetailsModalProps) {
  if (!isOpen || !submission) return null;

  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [score, setScore] = useState(submission.totalScore);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onUpdateFeedback(submission.id, feedback, Number(score) || 0);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div
      id="submission-details-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="submission-details-dialog"
        className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                بررسی پاسخ‌های: {submission.userName}
              </h2>
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                زمان ثبت: {formatPersianDate(submission.submittedAt)}
                {submission.userEmailOrPhone && (
                  <span className="mr-2">({submission.userEmailOrPhone})</span>
                )}
              </p>
            </div>
          </div>
          <button
            id="close-submission-details-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Score Badge Banner */}
          <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <div className="text-xs font-semibold text-stone-500">نمره کل ثبت‌شده</div>
              <div className="text-lg font-extrabold text-stone-900 mt-0.5">
                {formatPersianNumber(score)} از {formatPersianNumber(submission.maxScore)} امتیاز
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="adjust-score-input" className="text-xs font-medium text-stone-600">
                تغییر نمره نهایی:
              </label>
              <input
                id="adjust-score-input"
                type="number"
                min="0"
                max={submission.maxScore}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-white border border-stone-300 rounded-lg text-sm text-center font-bold"
              />
            </div>
          </div>

          {/* List of Answers */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              پاسخ‌های ارائه شده به سوالات:
            </h3>

            {Object.entries(submission.answers).length === 0 ? (
              <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl">
                هیچ پاسخی ثبت نشده است.
              </p>
            ) : (
              Object.entries(submission.answers).map(([itemId, ans], index) => {
                const item = items.find((it) => it.id === itemId);
                const questionTitle = item?.title || `سوال شماره ${formatPersianNumber(index + 1)}`;
                const questionBody = item?.content;

                return (
                  <div
                    key={itemId}
                    className="p-4 bg-white border border-stone-200 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                          {ans.itemType === 'multiple_choice'
                            ? ans.subAnswers
                              ? 'آزمون جامع چندسواله'
                              : 'سوال تستی'
                            : ans.itemType === 'descriptive'
                            ? 'سوال تشریحی'
                            : ans.itemType === 'poll'
                            ? 'نظرسنجی'
                            : 'مطلب'}
                        </span>
                        <h4 className="text-sm font-bold text-stone-900 mt-1.5">{questionTitle}</h4>
                        {questionBody && (
                          <p className="text-xs text-stone-600 mt-1">{questionBody}</p>
                        )}
                      </div>

                      {ans.itemType === 'multiple_choice' && !ans.subAnswers && (
                        <div className="shrink-0">
                          {ans.isCorrect ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              صحیح (+{formatPersianNumber(ans.scoreAwarded || 0)})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              نادرست (۰)
                            </span>
                          )}
                        </div>
                      )}

                      {ans.itemType === 'poll' && (
                        <div className="shrink-0">
                          <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                            <Vote className="w-3.5 h-3.5" />
                            رای ثبت‌شده (+{formatPersianNumber(ans.scoreAwarded || 0)})
                          </span>
                        </div>
                      )}

                      {ans.subAnswers && (
                        <div className="shrink-0">
                          <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                            <Layers className="w-3.5 h-3.5" />
                            مجموع آزمون: {formatPersianNumber(ans.scoreAwarded || 0)} از {formatPersianNumber(ans.maxScore || 0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Multiple choice single user response view */}
                    {ans.itemType === 'multiple_choice' && !ans.subAnswers && item?.options && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="p-2 bg-stone-50 rounded-lg text-stone-800">
                          <span className="font-semibold text-stone-500">پاسخ انتخاب شده: </span>
                          <span className="font-bold">
                            {ans.selectedOptionIndex !== undefined
                              ? item.options[ans.selectedOptionIndex]
                              : 'بدون انتخاب'}
                          </span>
                        </div>
                        {item.correctOptionIndex !== undefined && (
                          <div className="text-[11px] text-emerald-800 px-2">
                            گزینه صحیح: {item.options[item.correctOptionIndex]}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Poll user response view */}
                    {ans.itemType === 'poll' && item?.options && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-900 border border-purple-100">
                          <span className="font-semibold text-purple-700">گزینه انتخابی کاربر در نظرسنجی: </span>
                          <span className="font-bold">
                            {ans.selectedOptionIndex !== undefined
                              ? item.options[ans.selectedOptionIndex]
                              : 'بدون انتخاب'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* SubQuestions user response view */}
                    {ans.subAnswers && item?.subQuestions && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-stone-100">
                        <div className="text-xs font-bold text-stone-700">ریز پاسخ‌های سوالات این آزمون:</div>
                        {item.subQuestions.map((subQ, sIdx) => {
                          const subAns = (ans.subAnswers as any)?.[subQ.id];
                          return (
                            <div key={subQ.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-stone-800">
                                  سوال {formatPersianNumber(sIdx + 1)}: {subQ.prompt}
                                </span>
                                {subQ.type === 'multiple_choice' && subAns && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    subAns.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {subAns.isCorrect ? 'صحیح' : 'نادرست'} ({formatPersianNumber(subAns.scoreAwarded || 0)} امتیاز)
                                  </span>
                                )}
                              </div>
                              {subQ.type === 'multiple_choice' && subQ.options && subAns && (
                                <div className="text-stone-600">
                                  انتخاب: {subAns.selectedOptionIndex !== undefined ? subQ.options[subAns.selectedOptionIndex] : '—'}
                                </div>
                              )}
                              {subQ.type === 'descriptive' && subAns && (
                                <div className="p-2 bg-white rounded border border-stone-200 text-stone-800 whitespace-pre-wrap">
                                  {subAns.textAnswer || 'بدون پاسخ'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Descriptive user response view */}
                    {ans.itemType === 'descriptive' && (
                      <div className="mt-2 space-y-2">
                        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-stone-900 leading-relaxed">
                          <div className="text-[11px] font-bold text-indigo-900 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            پاسخ تحلیلی ارسالی توسط کاربر:
                          </div>
                          <p className="whitespace-pre-wrap">{ans.textAnswer || 'بدون پاسخ متنی'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Controller Feedback Section */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <label
              htmlFor="controller-feedback-textarea"
              className="block text-xs font-bold text-stone-800"
            >
              یادداشت و بازخورد اختصاصی کنترل‌گر برای این کاربر:
            </label>
            <textarea
              id="controller-feedback-textarea"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="می‌توانید نکته یا بازخورد تشویقی و توضیحات خود را برای کاربر اینجا بنویسید..."
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-stone-900 transition-colors"
            />

            {savedSuccess && (
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                تغییرات با موفقیت ذخیره گردید.
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-stone-200 bg-stone-50">
          <button
            id="cancel-submission-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            بستن پنجره
          </button>
          <button
            id="save-submission-feedback-btn"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <Save className="w-4 h-4" />
            ذخیره بازخورد و نمره
          </button>
        </div>
      </div>
    </div>
  );
}
