import React, { useState, useRef } from 'react';
import { BannerSlide } from '../types';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';

interface BannerSlidesManagerProps {
  slides: BannerSlide[];
  onSaveSlide: (slide: BannerSlide) => void;
  onDeleteSlide: (id: string) => void;
  onClose?: () => void;
}

export const BannerSlidesManager: React.FC<BannerSlidesManagerProps> = ({
  slides,
  onSaveSlide,
  onDeleteSlide,
  onClose,
}) => {
  const [editingSlide, setEditingSlide] = useState<BannerSlide | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isPublished, setIsPublished] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // In-app deletion target
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenNew = () => {
    setEditingSlide(null);
    setImageUrl('');
    setTitle('');
    setSubtitle('');
    setLinkUrl('');
    setOrder(slides.length + 1);
    setIsPublished(true);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (slide: BannerSlide) => {
    setEditingSlide(slide);
    setImageUrl(slide.imageUrl);
    setTitle(slide.title || '');
    setSubtitle(slide.subtitle || '');
    setLinkUrl(slide.linkUrl || '');
    setOrder(slide.order);
    setIsPublished(slide.isPublished);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  // Handle local image file upload and convert to base64 Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('لطفاً یک فایل تصویری معتبر (JPG, PNG, WebP) انتخاب فرمایید.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setImageUrl(result);
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('خطا در خواندن فایل تصویر. لطفاً مجدداً امتحان کنید.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setErrorMsg('لطفاً تصویر بنر را بارگذاری نموده یا آدرس تصویر را وارد کنید.');
      return;
    }

    const slideToSave: BannerSlide = {
      id: editingSlide ? editingSlide.id : `slide-${Date.now()}`,
      imageUrl: imageUrl.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      linkUrl: linkUrl.trim(),
      order: Number(order) || 1,
      isPublished,
      createdAt: editingSlide ? editingSlide.createdAt : new Date().toISOString(),
    };

    onSaveSlide(slideToSave);
    setIsFormOpen(false);
    setEditingSlide(null);
  };

  const sortedSlides = [...slides].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                مدیریت بنرها و اسلایدر بالای صفحه
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                تصاویر بارگذاری شده در بالای صفحه کاربران با قابلیت کشیدن (سویپ) و لمس برای باز کردن لینک نمایش داده می‌شوند.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="add-banner-slide-btn"
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>بارگذاری بنر جدید</span>
          </button>
        </div>
      </div>

      {/* List of Slides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedSlides.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-10 border border-stone-200 text-center text-stone-500">
            <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold">هنوز هیچ بنری ثبت نشده است.</p>
            <p className="text-xs text-stone-400 mt-1">
              با کلیک بر روی دکمه «بارگذاری بنر جدید»، اولین اسلاید را به سامانه اضافه نمایید.
            </p>
          </div>
        ) : (
          sortedSlides.map((slide) => (
            <div
              key={slide.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              {/* Preview Thumbnail */}
              <div className="relative aspect-[16/7] bg-stone-900 overflow-hidden">
                <img
                  src={slide.imageUrl}
                  alt={slide.title || 'تصویر اسلاید'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      slide.isPublished
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {slide.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900/80 text-white">
                    ترتیب: {formatPersianNumber(slide.order)}
                  </span>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-4 space-y-2 flex-1">
                <h3 className="text-sm font-bold text-stone-900 line-clamp-1">
                  {slide.title || 'بدون عنوان'}
                </h3>
                {slide.subtitle && (
                  <p className="text-xs text-stone-500 line-clamp-2">{slide.subtitle}</p>
                )}
                {slide.linkUrl ? (
                  <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium line-clamp-1">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>لینک مقصد: {slide.linkUrl}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400">فاقد لینک مقصد (صرفاً تصویر)</div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    onSaveSlide({
                      ...slide,
                      isPublished: !slide.isPublished,
                    })
                  }
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
                >
                  {slide.isPublished ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                      <span>عدم انتشار</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>انتشار عمومی</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(slide)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="ویرایش اسلاید"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(slide.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف اسلاید"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload & Edit Modal Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden text-right">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  {editingSlide ? 'ویرایش اسلاید بنر' : 'افزودن و بارگذاری بنر جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Image Preview and File Upload */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  تصویر بنر: <span className="text-rose-500">*</span>
                </label>

                {imageUrl ? (
                  <div className="relative aspect-[16/7] rounded-xl overflow-hidden bg-stone-900 border border-stone-200 mb-2">
                    <img
                      src={imageUrl}
                      alt="پیش‌نمایش تصویر"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-rose-600 text-white shadow-md text-xs font-bold"
                    >
                      تغییر تصویر
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-stone-50 hover:bg-amber-50/40"
                  >
                    <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-800">
                      کلیک برای بارگذاری فایل عکس از حافظه دستگاه
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      فرمت‌های مجاز: JPG, PNG, WEBP (حداکثر ۵ مگابایت)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="mt-2">
                  <label className="block text-[11px] text-stone-500 mb-1">
                    یا وارد کردن آدرس مستقیم اینترنتی عکس (URL):
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.example.com/banner.jpg"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 dir-ltr text-left"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  عنوان بنر (اختیاری):
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: یادواره شهدای گمنام و شب خاطره"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  توضیحات کوتاه زیر عنوان (اختیاری):
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="مثال: پنجشنبه‌ها بعد از نماز مغرب و عشاء"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  لینک مقصد هنگام لمس عکس توسط کاربر (اختیاری):
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="مثال: https://t.me/... یا #prayers یا #quizzes"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 dir-ltr text-left"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  می‌توانید آدرس اینترنتی یا کدهای ویژه مانند #prayers (صفحه ادعیه) یا #quizzes (صفحه آزمون‌ها) را وارد نمایید.
                </p>
              </div>

              {/* Order and Status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ترتیب نمایش (اولویت):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="slide-is-published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label
                    htmlFor="slide-is-published"
                    className="text-xs font-bold text-stone-800 cursor-pointer"
                  >
                    منتشر شود و در اسلایدر نمایش یابد
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                >
                  ذخیره و ثبت بنر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-right space-y-4">
            <h3 className="text-sm font-bold text-stone-900">تایید حذف بنر</h3>
            <p className="text-xs text-stone-600">
              آیا از حذف این اسلاید بنر از سامانه اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSlide(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
