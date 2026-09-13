import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  ArrowRight,
  Search,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  Trash2,
  Edit,
  UploadCloud,
  Image as ImageIcon,
  Music,
  Check,
  Disc,
} from 'lucide-react';
import { MadahiItem, Account, isControllerRole } from '../types';
import { formatPersianNumber } from '../utils/formatters';

interface NavaPageProps {
  items: MadahiItem[];
  activeAccount: Account;
  onBack: () => void;
  onSaveMadahi?: (item: MadahiItem) => void;
  onDeleteMadahi?: (id: string) => void;
  isDarkMode?: boolean;
  allowManage?: boolean;
}

const DEFAULT_CATEGORIES = [
  'همه',
  'محرم و عاشورا',
  'فاطمیه',
  'شهدا و دفاع مقدس',
  'مناجات و ادعیه',
  'اربعین و پیاده‌روی',
  'اعیاد و موالید',
];

export const NavaPage: React.FC<NavaPageProps> = ({
  items,
  activeAccount,
  onBack,
  onSaveMadahi,
  onDeleteMadahi,
  isDarkMode = false,
  allowManage = false,
}) => {
  const isController = Boolean(allowManage && isControllerRole(activeAccount?.role));

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaddah, setSelectedMaddah] = useState<string>('همه');

  // Floating Player State
  const [currentTrack, setCurrentTrack] = useState<MadahiItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modal / Form state for Upload / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MadahiItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formMaddah, setFormMaddah] = useState('');
  const [formCategory, setFormCategory] = useState('محرم و عاشورا');
  const [formAudioUrl, setFormAudioUrl] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formOrder, setFormOrder] = useState<number>(0);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<MadahiItem | null>(null);

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Derive categories & maddahs
  const allCategories = [
    'همه',
    ...Array.from(new Set([...DEFAULT_CATEGORIES.slice(1), ...items.map((i) => i.category || 'عمومی')])),
  ];
  const allMaddahs = ['همه', ...Array.from(new Set(items.map((i) => i.maddah).filter(Boolean)))];

  // Filtered tracks
  const publishedItems = isController ? items : items.filter((i) => i.isPublished !== false);
  const filteredTracks = publishedItems.filter((track) => {
    const matchesCategory = selectedCategory === 'همه' || track.category === selectedCategory;
    const matchesMaddah = selectedMaddah === 'همه' || track.maddah === selectedMaddah;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      track.title.toLowerCase().includes(q) ||
      track.maddah.toLowerCase().includes(q) ||
      (track.description && track.description.toLowerCase().includes(q)) ||
      (track.category && track.category.toLowerCase().includes(q));

    return matchesCategory && matchesMaddah && matchesSearch;
  });

  // Audio player effect
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('Playback error:', err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const handlePlayTrack = (track: MadahiItem) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
      setIsPlayerOpen(true);
    }
  };

  const handleNextTrack = () => {
    if (!currentTrack || filteredTracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % filteredTracks.length;
    setCurrentTrack(filteredTracks[nextIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const handlePrevTrack = () => {
    if (!currentTrack || filteredTracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
    setCurrentTrack(filteredTracks[prevIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '۰۰:۰۰';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${formatPersianNumber(m.toString().padStart(2, '0'))}:${formatPersianNumber(s.toString().padStart(2, '0'))}`;
  };

  // Open create form
  const handleOpenCreate = () => {
    setEditingTrack(null);
    setFormTitle('');
    setFormMaddah('');
    setFormCategory('محرم و عاشورا');
    setFormAudioUrl('');
    setFormCoverUrl('https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80');
    setFormDuration('۰۵:۰۰');
    setFormDescription('');
    setFormIsPublished(true);
    setFormOrder(items.length + 1);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open edit form
  const handleOpenEdit = (track: MadahiItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrack(track);
    setFormTitle(track.title);
    setFormMaddah(track.maddah);
    setFormCategory(track.category || 'محرم و عاشورا');
    setFormAudioUrl(track.audioUrl);
    setFormCoverUrl(track.coverUrl || '');
    setFormDuration(track.duration || '');
    setFormDescription(track.description || '');
    setFormIsPublished(track.isPublished !== false);
    setFormOrder(track.order || 0);
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle audio file selection (local upload)
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: up to 25MB
    if (file.size > 25 * 1024 * 1024) {
      setFormError('حجم فایل صوتی نباید بیشتر از ۲۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormAudioUrl(result);

      // Measure audio duration
      const audioTemp = new Audio(result);
      audioTemp.onloadedmetadata = () => {
        if (audioTemp.duration) {
          const m = Math.floor(audioTemp.duration / 60);
          const s = Math.floor(audioTemp.duration % 60);
          setFormDuration(`${formatPersianNumber(m.toString().padStart(2, '0'))}:${formatPersianNumber(s.toString().padStart(2, '0'))}`);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Handle cover file selection
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('حجم تصویر کاور نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormCoverUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Save Track
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('لطفاً عنوان مداحی را وارد کنید.');
      return;
    }
    if (!formMaddah.trim()) {
      setFormError('لطفاً نام مداح یا ذاکر را وارد کنید.');
      return;
    }
    if (!formAudioUrl.trim()) {
      setFormError('لطفاً فایل صوتی را بارگذاری نموده یا لینک صوت را وارد کنید.');
      return;
    }

    const newTrack: MadahiItem = {
      id: editingTrack ? editingTrack.id : `madahi-${Date.now()}`,
      title: formTitle.trim(),
      maddah: formMaddah.trim(),
      category: formCategory.trim() || 'عمومی',
      audioUrl: formAudioUrl.trim(),
      coverUrl: formCoverUrl.trim() || 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80',
      duration: formDuration.trim() || '۰۴:۰۰',
      description: formDescription.trim(),
      isPublished: formIsPublished,
      order: formOrder,
      createdAt: editingTrack?.createdAt || new Date().toISOString(),
    };

    if (onSaveMadahi) {
      onSaveMadahi(newTrack);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 pb-32 animate-fadeIn text-right" id="nava-page-container" dir="rtl">
      {/* Hidden Audio Tag */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioTimeUpdate}
          onEnded={handleNextTrack}
          onError={() => {
            console.warn('Failed to load audio stream');
            setIsPlaying(false);
          }}
        />
      )}

      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white p-6 sm:p-8 shadow-2xl border-2 border-red-500/40">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="nava-back-button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer border border-white/15"
              title="بازگشت به صفحه اصلی"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-red-500/30 border border-red-400/40 flex items-center justify-center text-red-200 shadow-inner">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white">
                  نوای مزار و مداحی‌های اهل‌بیت (ع)
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/30 text-red-100 border border-red-400/40">
                  {formatPersianNumber(publishedItems.length)} قطعه نوای دلنشین
                </span>
              </div>
              <p className="text-xs sm:text-sm text-red-200/90 mt-1 leading-relaxed">
                مجموعه مداحی‌های مناسبتی، نواهای حماسی شهدا، مرثیه‌سرایی و مناجات‌های مزار شهدای گمنام گاوازنگ
              </p>
            </div>
          </div>

          {/* Upload Button for Controller */}
          {isController && (
            <button
              type="button"
              id="open-upload-madahi-btn"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-red-950 font-black text-xs sm:text-sm hover:bg-red-50 active:scale-95 transition-all shadow-xl cursor-pointer border border-red-200"
            >
              <Plus className="w-4 h-4 text-red-600" />
              <span>بارگذاری مداحی جدید با کاور</span>
            </button>
          )}
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-red-300" />
            <input
              type="text"
              id="nava-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجوی مداحی بر اساس عنوان، نام مداح یا مناسبت..."
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-black/40 border border-red-400/40 text-white placeholder:text-red-300/60 text-xs sm:text-sm focus:outline-hidden focus:border-red-300 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-red-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Maddah selector if available */}
          {allMaddahs.length > 2 && (
            <select
              value={selectedMaddah}
              onChange={(e) => setSelectedMaddah(e.target.value)}
              className="px-4 py-2.5 rounded-2xl bg-black/40 border border-red-400/40 text-white text-xs sm:text-sm focus:outline-hidden focus:border-red-300 cursor-pointer"
            >
              <option value="همه" className="bg-stone-900 text-white">همه مداحان</option>
              {allMaddahs
                .filter((m) => m !== 'همه')
                .map((maddah) => (
                  <option key={maddah} value={maddah} className="bg-stone-900 text-white">
                    {maddah}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Categories Chips */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-red-500 text-white shadow-md border border-red-300'
                  : 'bg-white/10 text-red-200 hover:bg-white/20 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tracks Grid */}
      {filteredTracks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/40 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
            <Disc className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            هیچ قطعه مداحی در این بخش یافت نشد
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            می‌توانید فیلتر دسته‌بندی را تغییر دهید یا به عنوان کنترل‌گر مداحی جدید اضافه نمایید.
          </p>
          {isController && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>بارگذاری اولین قطعه در این دسته</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTracks.map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            const isThisSelected = currentTrack?.id === track.id;

            return (
              <div
                key={track.id}
                id={`madahi-card-${track.id}`}
                onClick={() => handlePlayTrack(track)}
                className={`group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer border ${
                  isThisSelected
                    ? 'border-red-500 shadow-xl ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20'
                    : isDarkMode
                    ? 'bg-stone-900/80 border-stone-800 hover:border-red-500/50 hover:shadow-lg'
                    : 'bg-white border-stone-200 hover:border-red-300 hover:shadow-xl'
                }`}
              >
                {/* Cover Image & Play Button Overlay */}
                <div className="relative aspect-video w-full overflow-hidden bg-stone-900">
                  <img
                    src={track.coverUrl || 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80'}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play / Pause floating badge on cover */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all transform duration-300 ${
                        isThisPlaying
                          ? 'bg-red-600 text-white scale-110 ring-4 ring-red-400/50'
                          : 'bg-black/60 text-white backdrop-blur-xs group-hover:bg-red-600 group-hover:scale-110'
                      }`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current mr-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm">
                      {track.category || 'مداحی'}
                    </span>
                    {track.isPublished === false && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white">
                        پیش‌نویس
                      </span>
                    )}
                  </div>

                  {/* Bottom Duration Badge */}
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/70 backdrop-blur-xs text-white">
                    {track.duration || '۰۴:۰۰'}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 line-clamp-1 group-hover:text-red-600 transition-colors">
                      {track.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-stone-600 dark:text-stone-400">
                      <Music className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="font-bold truncate">{track.maddah}</span>
                    </div>

                    {track.description && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                        {track.description}
                      </p>
                    )}
                  </div>

                  {/* Controller Action Bar */}
                  {isController && (
                    <div
                      className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(track, e)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-700 dark:text-stone-300 hover:text-red-600 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>ویرایش</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(track);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="حذف مداحی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Audio Player (پخش کننده شناور در داخل نوا) */}
      {currentTrack && isPlayerOpen && (
        <div
          id="nava-floating-player"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-50 animate-bounce-in"
        >
          <div className="bg-stone-900/95 backdrop-blur-xl text-white rounded-3xl p-3 sm:p-4 shadow-2xl border-2 border-red-500/50 flex flex-col gap-2">
            {/* Upper track details and close button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-stone-800 border border-white/20">
                  <img
                    src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80'}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse' : ''}`}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                      <Radio className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="overflow-hidden text-right">
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="text-[11px] text-red-300 font-bold truncate mt-0.5">
                    {currentTrack.maddah} {currentTrack.category ? `• ${currentTrack.category}` : ''}
                  </p>
                </div>
              </div>

              {/* Playback action buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handlePrevTrack}
                  title="قطعه قبلی"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-colors cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'توقف' : 'پخش'}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current mr-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleNextTrack}
                  title="قطعه بعدی"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-colors cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Volume / Mute button */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-colors cursor-pointer hidden sm:flex"
                  title={isMuted ? 'صدادار' : 'بی‌صدا'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Close Player */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setIsPlayerOpen(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title="بستن پخش‌کننده"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrubber progress bar */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] text-stone-400 font-mono w-10 text-left">
                {formatSeconds(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <span className="text-[10px] text-stone-400 font-mono w-10 text-right">
                {duration ? formatSeconds(duration) : currentTrack.duration || '۰۰:۰۰'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Edit Modal for Controller */}
      {isController && isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 my-8 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    {editingTrack ? 'ویرایش مداحی و نوا' : 'بارگذاری نوای جدید مزار'}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    کنترل‌گر گرامی، اطلاعات و فایل مداحی را وارد نمایید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Title & Maddah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    عنوان مداحی / قطعه *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثلاً: سلام ای آرامش مزار بی‌نشان"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    نام مداح / ذاکر اهل‌بیت *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMaddah}
                    onChange={(e) => setFormMaddah(e.target.value)}
                    placeholder="مثلاً: حاج مهدی رسولی"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    دسته‌بندی و مناسبت (تفکیک)
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="محرم و عاشورا">محرم و عاشورا</option>
                    <option value="فاطمیه">فاطمیه</option>
                    <option value="شهدا و دفاع مقدس">شهدا و دفاع مقدس</option>
                    <option value="مناجات و ادعیه">مناجات و ادعیه</option>
                    <option value="اربعین و پیاده‌روی">اربعین و پیاده‌روی</option>
                    <option value="اعیاد و موالید">اعیاد و موالید</option>
                    <option value="عمومی">عمومی و سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    مدت زمان تقریبی (دقیقه:ثانیه)
                  </label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="مثلاً: ۰۴:۲۵"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Audio Upload File & Link */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  فایل صوتی مداحی *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center gap-2 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>انتخاب فایل صوتی از دستگاه</span>
                  </button>
                  <span className="text-[11px] text-stone-500">یا وارد کردن لینک مستقیم:</span>
                </div>
                <input
                  type="url"
                  value={formAudioUrl.startsWith('data:') ? 'فایل صوتی محلی بارگذاری شد' : formAudioUrl}
                  disabled={formAudioUrl.startsWith('data:')}
                  onChange={(e) => setFormAudioUrl(e.target.value)}
                  placeholder="https://.../audio.mp3"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden ltr text-left"
                />
              </div>

              {/* Cover Image Upload File & Link */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  کاور مداحی (تصویر پوستر)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 shrink-0">
                    {formCoverUrl ? (
                      <img
                        src={formCoverUrl}
                        alt="پیش‌نمایش کاور"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>انتخاب عکس کاور</span>
                    </button>
                    <input
                      type="url"
                      value={formCoverUrl.startsWith('data:') ? 'عکس محلی بارگذاری شد' : formCoverUrl}
                      disabled={formCoverUrl.startsWith('data:')}
                      onChange={(e) => setFormCoverUrl(e.target.value)}
                      placeholder="یا لینک تصویر (URL)..."
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden ltr text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Description / Lyrics */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  شرح یا فرازی از شعر نوحه (اختیاری)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="مثال: قطعه‌ای ماندگار در سوگ شهادت حضرت زهرا (س)..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:border-red-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">وضعیت انتشار</span>
                  <p className="text-[11px] text-stone-500">برای کاربران مزار نمایش داده شود</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsPublished(!formIsPublished)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    formIsPublished ? 'bg-red-600 justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTrack ? 'ذخیره تغییرات' : 'ثبت و انتشار مداحی'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isController && itemToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 dark:border-stone-800 text-right space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-black text-stone-900 dark:text-stone-100">تایید حذف مداحی</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
                آیا از حذف نوای «{itemToDelete.title}» مطمئن هستید؟ این قطعه از لیست پخش مزار حذف خواهد شد.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteMadahi(itemToDelete.id);
                  if (currentTrack?.id === itemToDelete.id) {
                    setIsPlaying(false);
                    setCurrentTrack(null);
                  }
                  setItemToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
              >
                بله، حذف شود
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
