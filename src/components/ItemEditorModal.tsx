import { useState, useEffect, type FormEvent } from 'react';
import { ContentItem, ItemType, ExamSubQuestion } from '../types';
import {
  FileText,
  HelpCircle,
  MessageSquare,
  BarChart2,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';

interface ItemEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ContentItem) => void;
  initialItem?: ContentItem | null;
}

const CATEGORY_SUGGESTIONS = [
  'آموزشی و مهارتی',
  'راهنما و اطلاعیه',
  'تحلیلی و نظرسنجی',
  'توسعه فردی',
  'مدیریت و بهره‌وری',
  'علمی و تخصصی',
  'فرهنگی و معارف',
];

export function ItemEditorModal({
  isOpen,
  onClose,
  onSave,
  initialItem,
}: ItemEditorModalProps) {
  const [type, setType] = useState<ItemType>('multiple_choice');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('آموزشی و مهارتی');
  const [options, setOptions] = useState<string[]>([
    'گزینه اول',
    'گزینه دوم',
    'گزینه سوم',
    'گزینه چهارم',
  ]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [points, setPoints] = useState(10);
  const [explanation, setExplanation] = useState('');
  const [estimatedReadMinutes, setEstimatedReadMinutes] = useState(3);
  const [isPublished, setIsPublished] = useState(true);

  // Multi-question subQuestions support for exams
  const [subQuestions, setSubQuestions] = useState<ExamSubQuestion[]>([]);
  const [hasMultipleQuestions, setHasMultipleQuestions] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialItem) {
      setType(initialItem.type);
      setTitle(initialItem.title);
      setContent(initialItem.content);
      setCategory(initialItem.category || 'آموزشی و مهارتی');
      setOptions(initialItem.options || ['گزینه اول', 'گزینه دوم', 'گزینه سوم', 'گزینه چهارم']);
      setCorrectOptionIndex(initialItem.correctOptionIndex ?? 0);
      setPoints(initialItem.points ?? 10);
      setExplanation(initialItem.explanation || '');
      setEstimatedReadMinutes(initialItem.estimatedReadMinutes ?? 3);
      setIsPublished(initialItem.isPublished);

      if (initialItem.subQuestions && initialItem.subQuestions.length > 0) {
        setSubQuestions(initialItem.subQuestions);
        setHasMultipleQuestions(true);
      } else {
        setSubQuestions([]);
        setHasMultipleQuestions(false);
      }
    } else {
      setType('multiple_choice');
      setTitle('');
      setContent('');
      setCategory('آموزشی و مهارتی');
      setOptions(['گزینه اول', 'گزینه دوم', 'گزینه سوم', 'گزینه چهارم']);
      setCorrectOptionIndex(0);
      setPoints(10);
      setExplanation('');
      setEstimatedReadMinutes(3);
      setIsPublished(true);
      setSubQuestions([]);
      setHasMultipleQuestions(false);
    }
    setErrors({});
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  // Option handlers for single multiple_choice & poll
  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, `گزینه ${formatPersianNumber(options.length + 1)}`]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOpts = options.filter((_, i) => i !== index);
    setOptions(newOpts);
    if (correctOptionIndex >= newOpts.length) {
      setCorrectOptionIndex(newOpts.length - 1);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  // SubQuestions handlers for Multi-question exams
  const handleAddSubQuestion = (qType: 'multiple_choice' | 'descriptive' = 'multiple_choice') => {
    setHasMultipleQuestions(true);
    const newSubQ: ExamSubQuestion = {
      id: `sq-${Date.now()}-${subQuestions.length + 1}`,
      prompt: '',
      type: qType,
      options:
        qType === 'multiple_choice'
          ? ['گزینه اول', 'گزینه دوم', 'گزینه سوم', 'گزینه چهارم']
          : undefined,
      correctOptionIndex: qType === 'multiple_choice' ? 0 : undefined,
      points: 10,
      explanation: '',
    };
    setSubQuestions([...subQuestions, newSubQ]);
  };

  const handleRemoveSubQuestion = (index: number) => {
    const updated = subQuestions.filter((_, i) => i !== index);
    setSubQuestions(updated);
    if (updated.length === 0) {
      setHasMultipleQuestions(false);
    }
  };

  const handleUpdateSubQuestion = (index: number, partial: Partial<ExamSubQuestion>) => {
    const updated = [...subQuestions];
    updated[index] = { ...updated[index], ...partial };
    setSubQuestions(updated);
  };

  const handleAddSubQuestionOption = (subQIndex: number) => {
    const current = subQuestions[subQIndex];
    const curOpts = current.options || [];
    if (curOpts.length >= 6) return;
    handleUpdateSubQuestion(subQIndex, {
      options: [...curOpts, `گزینه ${formatPersianNumber(curOpts.length + 1)}`],
    });
  };

  const handleRemoveSubQuestionOption = (subQIndex: number, optIndex: number) => {
    const current = subQuestions[subQIndex];
    const curOpts = current.options || [];
    if (curOpts.length <= 2) return;
    const newOpts = curOpts.filter((_, i) => i !== optIndex);
    let newCorrect = current.correctOptionIndex ?? 0;
    if (newCorrect >= newOpts.length) newCorrect = newOpts.length - 1;
    handleUpdateSubQuestion(subQIndex, {
      options: newOpts,
      correctOptionIndex: newCorrect,
    });
  };

  const handleSubQuestionOptionChange = (
    subQIndex: number,
    optIndex: number,
    val: string
  ) => {
    const current = subQuestions[subQIndex];
    const curOpts = [...(current.options || [])];
    curOpts[optIndex] = val;
    handleUpdateSubQuestion(subQIndex, { options: curOpts });
  };

  const validate = (): boolean => {
    const newErr: Record<string, string> = {};
    if (!title.trim()) newErr.title = 'لطفاً عنوان را مشخص کنید.';
    if (!content.trim()) newErr.content = 'لطفاً متن اصلی، صورت سوال یا توضیحات را وارد کنید.';

    if (type === 'multiple_choice' && !hasMultipleQuestions) {
      if (options.some((opt) => !opt.trim())) {
        newErr.options = 'تمام گزینه‌ها باید دارای متن باشند.';
      }
      if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
        newErr.correctOption = 'لطفاً گزینه صحیح را مشخص نمایید.';
      }
    }

    if (type === 'multiple_choice' && hasMultipleQuestions) {
      if (subQuestions.length === 0) {
        newErr.subQuestions = 'حداقل یک سوال به این آزمون اضافه کنید.';
      } else {
        const hasEmptyPrompt = subQuestions.some((q) => !q.prompt.trim());
        if (hasEmptyPrompt) {
          newErr.subQuestions = 'صورت تمام سوالات طرح‌شده در آزمون باید تکمیل شود.';
        }
      }
    }

    if (type === 'poll') {
      if (options.some((opt) => !opt.trim())) {
        newErr.options = 'تمام گزینه‌های نظرسنجی باید دارای متن باشند.';
      }
    }

    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Calculate total points for multi-question exam if applicable
    let totalExamPoints = Number(points) || 10;
    if (type === 'multiple_choice' && hasMultipleQuestions && subQuestions.length > 0) {
      totalExamPoints = subQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
    }

    const itemToSave: ContentItem = {
      id: initialItem ? initialItem.id : `item-${Date.now()}`,
      type,
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || 'عمومی',
      isPublished,
      order: initialItem ? initialItem.order : Date.now(),
      createdAt: initialItem ? initialItem.createdAt : new Date().toISOString(),
      ...(type === 'multiple_choice' && {
        options: hasMultipleQuestions ? undefined : options.map((o) => o.trim()),
        correctOptionIndex: hasMultipleQuestions ? undefined : correctOptionIndex,
        points: totalExamPoints,
        explanation: explanation.trim(),
        subQuestions: hasMultipleQuestions ? subQuestions : undefined,
      }),
      ...(type === 'descriptive' && {
        points: Number(points) || 15,
        explanation: explanation.trim(),
      }),
      ...(type === 'poll' && {
        options: options.map((o) => o.trim()),
        points: Number(points) || 5,
        explanation: explanation.trim(),
        pollVotes: initialItem?.pollVotes || {},
      }),
      ...(type === 'text' && {
        estimatedReadMinutes: Number(estimatedReadMinutes) || 2,
      }),
    };

    onSave(itemToSave);
  };

  return (
    <div
      id="item-editor-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="item-editor-dialog"
        className="bg-white rounded-3xl max-w-3xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] text-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 bg-stone-50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {initialItem ? 'ویرایش محتوا، آزمون یا نظرسنجی' : 'طرح آزمون، سوال یا نظرسنجی جدید'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              امکان طرح آزمون‌های چند سوالی (تستی و تشریحی) و نظرسنجی با آمار لحظه‌ای
            </p>
          </div>
          <button
            id="close-item-editor-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Type Selector (4 Types) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              نوع آیتم را انتخاب کنید:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                id="type-multiple-choice-btn"
                onClick={() => setType('multiple_choice')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  type === 'multiple_choice'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-1 ring-amber-600'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold">آزمون تستی / چندسوالی</span>
                </div>
                <p className="text-[10px] text-stone-500">
                  آزمون با یک یا چند سوال تستی و تشریحی
                </p>
              </button>

              <button
                type="button"
                id="type-descriptive-btn"
                onClick={() => setType('descriptive')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  type === 'descriptive'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold">سوال تشریحی</span>
                </div>
                <p className="text-[10px] text-stone-500">پاسخ متنی و تفصیلی مخاطب</p>
              </button>

              <button
                type="button"
                id="type-poll-btn"
                onClick={() => setType('poll')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  type === 'poll'
                    ? 'border-cyan-600 bg-cyan-50/70 text-cyan-950 ring-1 ring-cyan-600'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart2 className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-bold">طرح نظرسنجی</span>
                </div>
                <p className="text-[10px] text-stone-500">رای‌گیری با نمایش درصد آرا</p>
              </button>

              <button
                type="button"
                id="type-text-btn"
                onClick={() => setType('text')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  type === 'text'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">متن و اطلاعیه</span>
                </div>
                <p className="text-[10px] text-stone-500">محتوای متنی جهت مطالعه</p>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label
              htmlFor="item-title-input"
              className="block text-xs font-bold text-stone-700 mb-1"
            >
              عنوان کلی آزمون، پرسش یا نظرسنجی: <span className="text-rose-500">*</span>
            </label>
            <input
              id="item-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: آزمون جامع معارف، نظرسنجی کیفیت جلسات..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 transition-colors"
            />
            {errors.title && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Category Input & Quick Suggestions */}
          <div>
            <label
              htmlFor="item-category-input"
              className="block text-xs font-bold text-stone-700 mb-1"
            >
              دسته‌بندی یا موضوع:
            </label>
            <input
              id="item-category-input"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: آموزشی، معارف، نظرسنجی..."
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 transition-colors"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CATEGORY_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setCategory(sug)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    category === sug
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content / Description */}
          <div>
            <label
              htmlFor="item-content-input"
              className="block text-xs font-bold text-stone-700 mb-1"
            >
              {type === 'text'
                ? 'متن کامل مطلب / مقاله / اطلاعیه:'
                : type === 'poll'
                ? 'موضوع و توضیحات نظرسنجی:'
                : 'صورت سوال (یا مقدمه آزمون):'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="item-content-input"
              rows={type === 'text' ? 5 : 2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'text'
                  ? 'متن کامل را اینجا وارد کنید...'
                  : type === 'poll'
                  ? 'توضیحات نظرسنجی را برای ترغیب مخاطبان به ثبت رای بنویسید...'
                  : 'صورت سوال اصلی یا توضیحات راهنمای شرکت در این آزمون را بنویسید...'
              }
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 transition-colors leading-relaxed"
            />
            {errors.content && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.content}
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* MULTI-QUESTION EXAM BUILDER (تستی یا تشریحی در یک آزمون) */}
          {/* ========================================================= */}
          {type === 'multiple_choice' && (
            <div className="space-y-4">
              {/* Option to create a single question or multi-question exam */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Layers className="w-4 h-4 text-amber-700" />
                    <span>طراحی چند سوال در این آزمون (مشابه افزودن گزینه جدید)</span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    می‌توانید در قالب یک آزمون، چند سوال تستی یا تشریحی طرح نمایید تا شرکت‌کننده تمام سوالات را به صورت پیوسته پاسخ دهد.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="add-subquestion-choice-btn"
                    onClick={() => handleAddSubQuestion('multiple_choice')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ افزودن سوال تستی</span>
                  </button>

                  <button
                    type="button"
                    id="add-subquestion-desc-btn"
                    onClick={() => handleAddSubQuestion('descriptive')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ افزودن سوال تشریحی</span>
                  </button>
                </div>
              </div>

              {errors.subQuestions && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.subQuestions}
                </p>
              )}

              {/* Multi-Questions List */}
              {hasMultipleQuestions && subQuestions.length > 0 ? (
                <div className="space-y-4 pt-1">
                  <div className="text-xs font-bold text-stone-700 flex items-center justify-between">
                    <span>پرسش‌های طرح‌شده برای این آزمون ({formatPersianNumber(subQuestions.length)} سوال):</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSubQuestions([]);
                        setHasMultipleQuestions(false);
                      }}
                      className="text-[11px] text-rose-600 hover:underline"
                    >
                      بازگشت به حالت تک‌سوالی ساده
                    </button>
                  </div>

                  {subQuestions.map((subQ, qIdx) => (
                    <div
                      key={subQ.id}
                      className="p-4 rounded-2xl border border-stone-300 bg-stone-50/90 space-y-3 relative shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                            {formatPersianNumber(qIdx + 1)}
                          </span>
                          <span className="text-xs font-bold text-stone-800">
                            سوال شماره {formatPersianNumber(qIdx + 1)}:
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              subQ.type === 'multiple_choice'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-indigo-100 text-indigo-900'
                            }`}
                          >
                            {subQ.type === 'multiple_choice' ? 'تستی' : 'تشریحی'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Type toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSubQuestion(qIdx, {
                                type:
                                  subQ.type === 'multiple_choice'
                                    ? 'descriptive'
                                    : 'multiple_choice',
                                options:
                                  subQ.type === 'descriptive'
                                    ? ['گزینه اول', 'گزینه دوم', 'گزینه سوم', 'گزینه چهارم']
                                    : undefined,
                                correctOptionIndex:
                                  subQ.type === 'descriptive' ? 0 : undefined,
                              })
                            }
                            className="text-[11px] text-stone-600 hover:text-stone-900 bg-stone-200 px-2 py-0.5 rounded-lg"
                          >
                            تغییر به {subQ.type === 'multiple_choice' ? 'تشریحی' : 'تستی'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSubQuestion(qIdx)}
                            className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                            title="حذف این سوال"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question prompt */}
                      <div>
                        <input
                          type="text"
                          value={subQ.prompt}
                          onChange={(e) =>
                            handleUpdateSubQuestion(qIdx, { prompt: e.target.value })
                          }
                          placeholder={`صورت سوال ${formatPersianNumber(qIdx + 1)} را وارد کنید...`}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-stone-900"
                        />
                      </div>

                      {/* If Sub-Question is Multiple Choice */}
                      {subQ.type === 'multiple_choice' && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-stone-700">
                              گزینه‌ها (گزینه صحیح را کلیک کنید):
                            </span>
                            {(subQ.options || []).length < 6 && (
                              <button
                                type="button"
                                onClick={() => handleAddSubQuestionOption(qIdx)}
                                className="text-amber-700 hover:text-amber-800 font-bold"
                              >
                                + افزودن گزینه
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {(subQ.options || []).map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs ${
                                  subQ.correctOptionIndex === optIdx
                                    ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300'
                                    : 'bg-white border-stone-200'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSubQuestion(qIdx, {
                                      correctOptionIndex: optIdx,
                                    })
                                  }
                                  className="p-1"
                                  title="پاسخ صحیح"
                                >
                                  {subQ.correctOptionIndex === optIdx ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-stone-400" />
                                  )}
                                </button>

                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) =>
                                    handleSubQuestionOptionChange(
                                      qIdx,
                                      optIdx,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`گزینه ${formatPersianNumber(optIdx + 1)}`}
                                  className="flex-1 bg-transparent text-xs focus:outline-hidden"
                                />

                                {(subQ.options || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveSubQuestionOption(qIdx, optIdx)
                                    }
                                    className="p-1 text-stone-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-question points & explanation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-0.5">
                            امتیاز این سوال:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={subQ.points ?? 10}
                            onChange={(e) =>
                              handleUpdateSubQuestion(qIdx, {
                                points: Number(e.target.value) || 10,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-0.5">
                            نکته یا دلیل درستی (اختیاری):
                          </label>
                          <input
                            type="text"
                            value={subQ.explanation || ''}
                            onChange={(e) =>
                              handleUpdateSubQuestion(qIdx, {
                                explanation: e.target.value,
                              })
                            }
                            placeholder="توضیح آموزشی پاسخ..."
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single Question Options Builder (Default) */
                <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800">
                      گزینه‌ها (گزینه صحیح را با علامت دایره انتخاب کنید):
                    </label>
                    {options.length < 6 && (
                      <button
                        type="button"
                        id="add-option-btn"
                        onClick={handleAddOption}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن گزینه جدید
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                          correctOptionIndex === idx
                            ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <button
                          type="button"
                          id={`set-correct-option-${idx}-btn`}
                          onClick={() => setCorrectOptionIndex(idx)}
                          title="تعیین به عنوان پاسخ صحیح"
                          className="p-1 text-stone-400 hover:text-emerald-600"
                        >
                          {correctOptionIndex === idx ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-stone-300" />
                          )}
                        </button>

                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`متن گزینه ${formatPersianNumber(idx + 1)}...`}
                          className="flex-1 bg-transparent text-xs sm:text-sm font-medium focus:outline-hidden"
                        />

                        {correctOptionIndex === idx && (
                          <span className="text-[10px] bg-emerald-600 text-white font-medium px-2 py-0.5 rounded-full shrink-0">
                            پاسخ صحیح
                          </span>
                        )}

                        {options.length > 2 && (
                          <button
                            type="button"
                            id={`delete-option-${idx}-btn`}
                            onClick={() => handleRemoveOption(idx)}
                            className="p-1 text-stone-400 hover:text-rose-600"
                            title="حذف این گزینه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label
                        htmlFor="item-points-input"
                        className="block text-xs font-bold text-stone-700 mb-1"
                      >
                        امتیاز پاسخ صحیح:
                      </label>
                      <input
                        id="item-points-input"
                        type="number"
                        min="1"
                        max="100"
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="item-explanation-input"
                        className="block text-xs font-bold text-stone-700 mb-1"
                      >
                        توضیح یا نکته آموزشی پاسخ (اختیاری):
                      </label>
                      <input
                        id="item-explanation-input"
                        type="text"
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="دلیل درستی گزینه برای مخاطب..."
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* POLL BUILDER (طرح نظرسنجی با گزینه‌ها) */}
          {/* ========================================================= */}
          {type === 'poll' && (
            <div className="space-y-3 p-4 bg-cyan-50/50 rounded-2xl border border-cyan-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-950">
                  گزینه‌های نظرسنجی (شرکت‌کنندگان یکی را انتخاب و ثبت رای می‌کنند):
                </label>
                {options.length < 8 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center gap-1 text-xs font-bold text-cyan-800 hover:text-cyan-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن گزینه جدید به نظرسنجی
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-white"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold flex items-center justify-center">
                      {formatPersianNumber(idx + 1)}
                    </span>

                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`عنوان گزینه ${formatPersianNumber(idx + 1)}...`}
                      className="flex-1 bg-transparent text-xs sm:text-sm font-medium focus:outline-hidden"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1 text-stone-400 hover:text-rose-600"
                        title="حذف گزینه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    امتیاز تشویقی شرکت در نظرسنجی:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    توضیحات تکمیلی یا هدف نظرسنجی:
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="مثال: نتایج در جلسه آتی بررسی خواهد شد..."
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descriptive Specifics */}
          {type === 'descriptive' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div>
                <label
                  htmlFor="desc-points-input"
                  className="block text-xs font-bold text-stone-700 mb-1"
                >
                  حداکثر امتیاز این سوال:
                </label>
                <input
                  id="desc-points-input"
                  type="number"
                  min="1"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="desc-guide-input"
                  className="block text-xs font-bold text-stone-700 mb-1"
                >
                  راهنمای پاسخ یا معیار داوری (اختیاری):
                </label>
                <input
                  id="desc-guide-input"
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="نکاتی که مخاطب باید در نظر بگیرد..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          {/* Text Reading Time */}
          {type === 'text' && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <label
                htmlFor="text-read-time-input"
                className="block text-xs font-bold text-stone-700 mb-1"
              >
                تخمین زمان مطالعه (به دقیقه):
              </label>
              <input
                id="text-read-time-input"
                type="number"
                min="1"
                max="60"
                value={estimatedReadMinutes}
                onChange={(e) => setEstimatedReadMinutes(Number(e.target.value))}
                className="w-36 px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm"
              />
            </div>
          )}

          {/* Published Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
            <div>
              <div className="text-xs font-bold text-stone-800">وضعیت انتشار در سامانه</div>
              <div className="text-[11px] text-stone-500">
                در صورت غیرفعال بودن، فقط در پنل کنترل‌گر قابل مشاهده خواهد بود
              </div>
            </div>
            <button
              type="button"
              id="toggle-is-published-btn"
              onClick={() => setIsPublished(!isPublished)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isPublished
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
            >
              {isPublished ? 'منتشر شده (فعال)' : 'پیش‌نویس (غیرفعال)'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              id="cancel-editor-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              id="save-item-btn"
              type="submit"
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold transition-colors shadow-xs cursor-pointer"
            >
              {initialItem ? 'ذخیره تغییرات' : 'ثبت و انتشار در سامانه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
