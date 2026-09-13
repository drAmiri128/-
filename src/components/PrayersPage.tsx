import React, { useState, useRef, useEffect } from 'react';
import { PrayerItem } from '../types';
import {
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  BookOpen,
  Music,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  Sparkles,
  Heart,
  FileText,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';

interface PrayersPageProps {
  prayers: PrayerItem[];
  isController?: boolean;
  onBack: () => void;
  onSavePrayer?: (prayer: PrayerItem) => void;
  onDeletePrayer?: (id: string) => void;
  onActivePrayerChange?: (hasActivePrayer: boolean) => void;
}

export const PrayersPage: React.FC<PrayersPageProps> = ({
  prayers,
  isController = false,
  onBack,
  onSavePrayer,
  onDeletePrayer,
  onActivePrayerChange,
}) => {
  const publishedPrayers = isController ? prayers : prayers.filter((p) => p.isPublished);
  // Start with null so user sees the prayer selection catalog, touching any opens its dedicated page
  const [selectedPrayerId, setSelectedPrayerId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'xlarge'>('large');

  // Audio player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Controller edit/create modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formArabicText, setFormArabicText] = useState('');
  const [formPersianTranslation, setFormPersianTranslation] = useState('');
  const [formAudioUrl, setFormAudioUrl] = useState('');
  const [formReciter, setFormReciter] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formCategory, setFormCategory] = useState('ادعیه و زیارات');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // In-app delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const currentPrayer = selectedPrayerId
    ? prayers.find((p) => p.id === selectedPrayerId) || null
    : null;

  // Reset and load new audio when current prayer changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (currentPrayer?.audioUrl) {
        audioRef.current.src = currentPrayer.audioUrl;
        audioRef.current.load();
      }
    }
  }, [currentPrayer?.id, currentPrayer?.audioUrl]);

  // Notify parent component whether an active prayer reader with floating player is open
  useEffect(() => {
    onActivePrayerChange?.(Boolean(currentPrayer));
    return () => {
      onActivePrayerChange?.(false);
    };
  }, [currentPrayer, onActivePrayerChange]);

  // Audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setAudioError(null);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      setAudioError('فایل صوتی این دعا در دسترس نیست یا فرمت آن پشتیبانی نمی‌شود.');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !currentPrayer?.audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch((err) => {
          console.error('Audio play error:', err);
          setIsPlaying(false);
          setAudioError('امکان پخش خودکار صوت وجود ندارد؛ لطفاً دوباره تلاش نمایید.');
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleBackToList = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setSelectedPrayerId(null);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  };

  const handleOpenNew = () => {
    setEditingPrayer(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormArabicText('');
    setFormPersianTranslation('');
    setFormAudioUrl('');
    setFormReciter('');
    setFormDuration('');
    setFormCategory('ادعیه و زیارات');
    setFormIsPublished(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prayer: PrayerItem) => {
    setEditingPrayer(prayer);
    setFormTitle(prayer.title);
    setFormSubtitle(prayer.subtitle || '');
    setFormArabicText(prayer.arabicText);
    setFormPersianTranslation(prayer.persianTranslation || '');
    setFormAudioUrl(prayer.audioUrl || '');
    setFormReciter(prayer.reciter || '');
    setFormDuration(prayer.duration || '');
    setFormCategory(prayer.category || 'ادعیه و زیارات');
    setFormIsPublished(prayer.isPublished);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setFormError('لطفاً یک فایل صوتی معتبر (MP3, WAV, M4A, OGG) انتخاب کنید.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFormError('حجم فایل صوتی نباید بیشتر از ۲۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setFormAudioUrl(result);
        setFormError(null);
      }
    };
    reader.onerror = () => {
      setFormError('خطا در خواندن فایل صوتی.');
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('لطفاً عنوان دعا را وارد کنید.');
      return;
    }
    if (!formArabicText.trim()) {
      setFormError('لطفاً متن اصلی یا عربی دعا را وارد نمایید.');
      return;
    }

    const prayerToSave: PrayerItem = {
      id: editingPrayer ? editingPrayer.id : `prayer-${Date.now()}`,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      arabicText: formArabicText.trim(),
      persianTranslation: formPersianTranslation.trim(),
      audioUrl: formAudioUrl.trim(),
      reciter: formReciter.trim(),
      duration: formDuration.trim(),
      category: formCategory.trim() || 'ادعیه و زیارات',
      isPublished: formIsPublished,
      order: editingPrayer ? editingPrayer.order : prayers.length + 1,
      createdAt: editingPrayer ? editingPrayer.createdAt : new Date().toISOString(),
    };

    onSavePrayer?.(prayerToSave);
    setIsFormOpen(false);
    setSelectedPrayerId(prayerToSave.id);
  };

  const formatAudioTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '۰۰:۰۰';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${formatPersianNumber(String(m).padStart(2, '0'))}:${formatPersianNumber(
      String(s).padStart(2, '0')
    )}`;
  };

  const filteredPrayers = publishedPrayers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reciter && p.reciter.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.arabicText && p.arabicText.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="prayers-page-container" className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden HTML5 Audio Element */}
      <audio ref={audioRef} preload="metadata" />

      {/* --- VIEW 1: DEDICATED PRAYER READER PAGE WITH FLOATING AUDIO PLAYER --- */}
      {currentPrayer ? (
        <div id="dedicated-prayer-view" className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Navigation Bar of Dedicated Prayer Page */}
          <div className="bg-gradient-to-l from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="back-to-prayers-list-btn"
                onClick={handleBackToList}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                title="بازگشت به فهرست تمام ادعیه"
              >
                <ArrowRight className="w-4 h-4" />
                <span>فهرست ادعیه</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                    {currentPrayer.category || 'ادعیه و زیارات'}
                  </span>
                  {currentPrayer.reciter && (
                    <span className="text-xs text-emerald-200 font-medium">
                      نوای ملکوتی: <strong className="text-white">{currentPrayer.reciter}</strong>
                    </span>
                  )}
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white mt-1">
                  {currentPrayer.title}
                </h1>
                {currentPrayer.subtitle && (
                  <p className="text-xs text-emerald-100/80 mt-0.5">{currentPrayer.subtitle}</p>
                )}
              </div>
            </div>

            {/* Header Actions: Font Size Selector & Controller Edit */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {isController && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentPrayer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 text-xs font-bold shadow-xs hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>ویرایش دعا</span>
                </button>
              )}

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl backdrop-blur-xs border border-white/10">
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('normal')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    fontSizeLevel === 'normal'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  کوچک
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('large')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    fontSizeLevel === 'large'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  متوسط
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('xlarge')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    fontSizeLevel === 'xlarge'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  بزرگ
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Prayer Content (Spacious with bottom padding for floating player) */}
          <div className="max-w-4xl mx-auto space-y-6 pb-36 sm:pb-44">
            {/* Arabic Text Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-9 border border-stone-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span>متن شریف عربی دعا:</span>
                </div>
                {currentPrayer.audioUrl && (
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" />
                    <span>پخش‌کننده صوتی شناور در پایین صفحه فعال است</span>
                  </span>
                )}
              </div>

              <div
                className={`font-serif text-stone-900 text-right leading-[2.5] font-medium select-text whitespace-pre-line ${
                  fontSizeLevel === 'normal'
                    ? 'text-base sm:text-lg'
                    : fontSizeLevel === 'large'
                    ? 'text-lg sm:text-xl'
                    : 'text-xl sm:text-2xl'
                }`}
              >
                {currentPrayer.arabicText}
              </div>
            </div>

            {/* Persian Translation Card */}
            {currentPrayer.persianTranslation && (
              <div className="bg-amber-50/50 rounded-3xl p-6 sm:p-9 border border-amber-200/80 shadow-xs space-y-3">
                <div className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2 border-b border-amber-200/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>ترجمه روان فارسی:</span>
                </div>
                <div
                  className={`text-stone-800 text-right leading-[2.2] select-text whitespace-pre-line font-normal ${
                    fontSizeLevel === 'normal'
                      ? 'text-xs sm:text-sm'
                      : fontSizeLevel === 'large'
                      ? 'text-sm sm:text-base'
                      : 'text-base sm:text-lg'
                  }`}
                >
                  {currentPrayer.persianTranslation}
                </div>
              </div>
            )}
          </div>

          {/* --- FLOATING AUDIO / MUSIC PLAYER --- */}
          {currentPrayer.audioUrl ? (
            <div
              id="floating-prayer-audio-player"
              className="fixed bottom-3 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-2xl mx-auto z-40 bg-stone-900/95 text-white backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-700/80 p-3.5 sm:p-4 space-y-2.5 animate-in slide-in-from-bottom-5 duration-300 select-none"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Play/Pause Button & Reciter Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    id="floating-play-pause-btn"
                    onClick={togglePlay}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
                    title={isPlaying ? 'توقف پخش صوت' : 'پخش صوت دعا'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-stone-950" />
                    ) : (
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-stone-950 mr-0.5" />
                    )}
                  </button>

                  {/* Skip buttons (10s back and 10s forward) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSkip(-10)}
                      className="p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                      title="۱۰ ثانیه به عقب"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkip(10)}
                      className="p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                      title="۱۰ ثانیه به جلو"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="min-w-0 pr-1">
                    <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-stone-500'
                        }`}
                      />
                      <span className="truncate">{currentPrayer.title}</span>
                    </div>
                    <div className="text-[11px] text-stone-300 truncate">
                      {currentPrayer.reciter ? `با نوای: ${currentPrayer.reciter}` : 'پخش صوت اختصاصی'}
                    </div>
                  </div>
                </div>

                {/* Mute & Time */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 text-stone-300 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
                    title={isMuted ? 'صدادار' : 'بی‌صدا'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 bg-stone-800/90 px-2.5 py-1 rounded-lg border border-stone-700">
                    {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                  </span>
                </div>
              </div>

              {/* Seek Progress Bar */}
              <div className="w-full flex items-center gap-2 px-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {audioError && (
                <div className="text-[11px] text-amber-300 bg-stone-800/95 px-3 py-1.5 rounded-xl border border-amber-400/40 text-right">
                  {audioError}
                </div>
              )}
            </div>
          ) : (
            <div className="fixed bottom-3 sm:bottom-5 left-4 right-4 max-w-sm mx-auto z-40 bg-stone-900/90 text-stone-300 backdrop-blur-md rounded-2xl p-2.5 text-center text-xs border border-stone-700/60 shadow-lg">
              فایل صوتی اختصاصی برای این دعا بارگذاری نشده است.
            </div>
          )}
        </div>
      ) : (
        /* --- VIEW 2: PRAYERS CATALOG (SELECTION ONLY FOR USER - NO EDIT/DELETE ICONS) --- */
        <div id="prayers-catalog-view" className="space-y-6">
          {/* Top Header */}
          <div className="bg-gradient-to-l from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="space-y-2 z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="back-to-main-from-prayers-btn"
                  onClick={onBack}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="بازگشت به صفحه اصلی"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div className="p-1.5 rounded-xl bg-amber-400 text-stone-950 font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">بخش ادعیه و زیارات معنوی</h1>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                مجموعه ادعیه، زیارات و مناجات‌های شریف همراه با متن عربی، ترجمه روان فارسی و پخش صوت دلنشین
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-3 z-10 shrink-0">
              {isController && (
                <button
                  type="button"
                  id="add-new-prayer-btn"
                  onClick={handleOpenNew}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن دعای جدید (متن و صوت)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <span>بازگشت به پرتال</span>
              </button>
            </div>
          </div>

          {/* Search & Stats Bar */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام دعا، فرازها یا نام قاری..."
                className="w-full pr-10 pl-3 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>
                تعداد ادعیه در دسترس: {formatPersianNumber(filteredPrayers.length)} مورد
              </span>
            </div>
          </div>

          {/* Grid of Prayers Cards (User touches any card to open dedicated prayer reader page) */}
          {filteredPrayers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-stone-400 text-sm">
              دعایی با این مشخصات یافت نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrayers.map((prayer) => {
                return (
                  <div
                    key={prayer.id}
                    onClick={() => setSelectedPrayerId(prayer.id)}
                    className="group relative bg-white hover:bg-emerald-50/40 p-5 rounded-2xl border border-stone-200 hover:border-emerald-500 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-right"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {prayer.category || 'ادعیه و زیارات'}
                        </span>
                        {prayer.audioUrl && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Music className="w-3 h-3 text-amber-600" />
                            <span>دارای صوت</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-emerald-950 transition-colors">
                          {prayer.title}
                        </h3>
                        {prayer.subtitle && (
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                            {prayer.subtitle}
                          </p>
                        )}
                      </div>

                      {prayer.reciter && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
                          <Headphones className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            با نوای: <strong className="text-stone-800">{prayer.reciter}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Touch Action Prompt (NO edit or delete icons for user!) */}
                    <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                        <span>قرائت دعا و پخش صوت</span>
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </div>

                      {/* Edit / Delete Icons strictly for Controller */}
                      {isController && (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(prayer)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="ویرایش دعا"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(prayer.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف دعا"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Controller Upload / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden text-right">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {editingPrayer ? 'ویرایش متن و صوت دعا' : 'افزودن دعای جدید (متن و فایل صوتی)'}
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

            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    عنوان دعا یا زیارت: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: زیارت وارث یا دعای کمیل"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    دسته‌بندی دعا:
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="مثال: زیارات، ادعیه مهدوی، مناجات"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Reciter & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    نام قاری یا مداح:
                  </label>
                  <input
                    type="text"
                    value={formReciter}
                    onChange={(e) => setFormReciter(e.target.value)}
                    placeholder="مثال: استاد مهدی سماواتی"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    توضیح کوتاه یا زمان قرائت:
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="مثال: مخصوص شب‌های جمعه"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Audio Upload File or URL */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <label className="block text-xs font-bold text-emerald-950">
                  بارگذاری فایل صوتی دعا (موسیقی و صوت):
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>انتخاب و آپلود فایل صوتی از دستگاه</span>
                  </button>

                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />

                  {formAudioUrl && (
                    <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                      فایل صوتی آماده شد
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-stone-600 mt-2 mb-1">
                    یا درج مستقیم آدرس اینترنتی فایل صوتی (URL):
                  </label>
                  <input
                    type="url"
                    value={formAudioUrl}
                    onChange={(e) => setFormAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio/doa.mp3"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl dir-ltr text-left"
                  />
                </div>
              </div>

              {/* Arabic Text */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  متن عربی دعا: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={formArabicText}
                  onChange={(e) => setFormArabicText(e.target.value)}
                  placeholder="متن شریف دعا به همراه اعراب و علائم نگارشی..."
                  className="w-full p-3 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600 font-serif leading-loose"
                />
              </div>

              {/* Persian Translation */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ترجمه روان فارسی دعا:
                </label>
                <textarea
                  rows={4}
                  value={formPersianTranslation}
                  onChange={(e) => setFormPersianTranslation(e.target.value)}
                  placeholder="ترجمه فارسی روان دعا جهت درک مفاهیم..."
                  className="w-full p-3 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-600 leading-relaxed"
                />
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prayer-is-published"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="prayer-is-published"
                  className="text-xs font-bold text-stone-800 cursor-pointer"
                >
                  این دعا بلافاصله منتشر شده و در اختیار کاربران قرار گیرد
                </label>
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
                >
                  ذخیره و ثبت دعا
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
            <h3 className="text-sm font-bold text-stone-900">تایید حذف دعا</h3>
            <p className="text-xs text-stone-600">
              آیا از حذف این دعا و فایل صوتی آن از سامانه اطمینان دارید؟
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
                  onDeletePrayer?.(deleteTargetId);
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
