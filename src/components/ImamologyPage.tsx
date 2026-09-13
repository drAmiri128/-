import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Calendar,
  MapPin,
  Heart,
  Quote,
  ScrollText,
  User,
  ShieldCheck,
  CheckCircle2,
  X,
  Clock,
  Compass,
} from 'lucide-react';
import { InfalliblePerson } from '../types';

interface ImamologyPageProps {
  infallibles: InfalliblePerson[];
  onBack: () => void;
}

export function ImamologyPage({
  infallibles,
  onBack,
}: ImamologyPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<InfalliblePerson | null>(null);
  const [activeTab, setActiveTab] = useState<'bio' | 'virtues' | 'hadith' | 'ziyarah'>('bio');

  // Filter infallibles by search
  const filteredInfallibles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return infallibles;
    return infallibles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.epithet.toLowerCase().includes(q) ||
        p.kunya.toLowerCase().includes(q) ||
        p.birthPlace.toLowerCase().includes(q) ||
        p.martyrdomPlace.toLowerCase().includes(q) ||
        p.biography.toLowerCase().includes(q)
    );
  }, [infallibles, searchQuery]);

  const currentIndex = selectedPerson
    ? infallibles.findIndex((p) => p.id === selectedPerson.id)
    : -1;

  const handleNextPerson = () => {
    if (currentIndex >= 0 && currentIndex < infallibles.length - 1) {
      setSelectedPerson(infallibles[currentIndex + 1]);
      setActiveTab('bio');
    }
  };

  const handlePrevPerson = () => {
    if (currentIndex > 0) {
      setSelectedPerson(infallibles[currentIndex - 1]);
      setActiveTab('bio');
    }
  };

  return (
    <div id="imamology-page-container" className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner - Jade Green Theme matching Mazar Programs */}
      <div
        id="imamology-header-banner"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 sm:p-8 border border-emerald-500/40 shadow-xl"
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <button
              type="button"
              id="imamology-back-btn"
              onClick={onBack}
              title="بازگشت به صفحه اصلی مزار"
              className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95"
            >
              <ArrowRight className="w-6 h-6" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-stone-950 shadow-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                  <span>انوار هدایت و معرفت</span>
                </span>
                <span className="text-xs font-bold text-emerald-200 bg-emerald-800/60 px-3 py-0.5 rounded-full border border-emerald-600/40">
                  ۱۴ معصوم نورانی (ع) و حضرت زهرا (س)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-2 text-white">
                دانشنامه جامع امام‌شناسی و سیره معصومین (ع)
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                آشنایی با زندگانی، شناسنامه معنوی، القاب، مکارم اخلاقی، احادیث نورانی و آموزه‌های جاودان چهارده معصوم پاک (ع)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-800/80 border border-emerald-600/50 backdrop-blur-xs flex items-center gap-2 text-xs font-bold text-emerald-100">
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>محتوای مستند و معتبر</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative z-10">
          <div className="relative max-w-xl">
            <Search className="w-5 h-5 text-emerald-300 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="imamology-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام، القاب، کنیه، ولادت یا مزار معصومین..."
              className="w-full pl-4 pr-11 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-emerald-500/40 focus:border-amber-300 rounded-2xl text-white placeholder-emerald-200/60 text-sm focus:outline-hidden backdrop-blur-md transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of the 14 Infallibles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>فهرست چهارده اختر آسمان ولایت و امامت</span>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            نمایش {filteredInfallibles.length} مورد از ۱۴ معصوم
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInfallibles.map((person) => {
            const isZahra = person.id === '3';
            const isProphet = person.id === '1';

            return (
              <div
                key={person.id}
                id={`imamology-card-${person.id}`}
                onClick={() => {
                  setSelectedPerson(person);
                  setActiveTab('bio');
                }}
                className="group relative bg-white rounded-3xl p-5 border border-stone-200/90 hover:border-emerald-500/70 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.99]"
              >
                {/* Background Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 group-hover:h-2 transition-all duration-300" />

                <div>
                  {/* Top Meta: Order number and Special Badge */}
                  <div className="flex items-center justify-between mb-3 pt-1">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                      {person.order}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isProphet
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isZahra
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {person.epithet.split('،')[0]}
                    </span>
                  </div>

                  {/* Holy Name */}
                  <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                    <span>{person.name}</span>
                  </h3>

                  {/* Title / Description */}
                  <p className="text-xs text-stone-600 font-medium mt-1 leading-relaxed line-clamp-2">
                    {person.title}
                  </p>

                  {/* Key Info Pills */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] text-stone-600 border-t border-stone-100 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-stone-700">ولادت:</span>
                      <span className="truncate">{person.birthDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="font-semibold text-stone-700">مزار مطهر:</span>
                      <span className="truncate">{person.martyrdomPlace.split('به')[0]}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>مطالعه سیره و زندگانی</span>
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all">
                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Modal / View of Selected Infallible */}
      {selectedPerson && (
        <div
          id="imamology-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-900 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Jade Theme */}
            <div className="relative bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 sm:p-6 border-b border-emerald-700/50 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-950 font-black text-lg flex items-center justify-center shadow-md shrink-0">
                    {selectedPerson.order}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                        {selectedPerson.name}
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600">
                        {selectedPerson.kunya}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-200 mt-1 font-medium">
                      {selectedPerson.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="imamology-close-modal-btn"
                  onClick={() => setSelectedPerson(null)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Fast Tab Bar */}
              <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('bio')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'bio'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-white/10 hover:bg-white/15 text-emerald-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>زندگانی و سیره</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('virtues')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'virtues'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-white/10 hover:bg-white/15 text-emerald-100'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>فضائل و مکارم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('hadith')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'hadith'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-white/10 hover:bg-white/15 text-emerald-100'
                  }`}
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>حدیث و کلام نور</span>
                </button>

                {selectedPerson.specialZiyarahSnippet && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('ziyarah')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'ziyarah'
                        ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                        : 'bg-white/10 hover:bg-white/15 text-emerald-100'
                    }`}
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    <span>فراز زیارت</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Content depending on Active Tab */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm leading-relaxed">
              {/* Identity Quick Card */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 block font-medium">پدر گرامی:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedPerson.fatherName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block font-medium">مادر والامقام:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedPerson.motherName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block font-medium">ولادت با برکت:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedPerson.birthDate}</span>
                </div>
                <div>
                  <span className="text-stone-500 block font-medium">محل ولادت:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedPerson.birthPlace}</span>
                </div>
                <div>
                  <span className="text-stone-500 block font-medium">شهادت / ارتحال:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedPerson.martyrdomDate}</span>
                </div>
                <div>
                  <span className="text-stone-500 block font-medium">محل شهادت و مزار:</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedPerson.martyrdomPlace}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-500 block font-medium">دوران رسالت / امامت:</span>
                  <span className="font-bold text-emerald-800 mt-0.5 block">
                    {selectedPerson.imamatPeriod || 'دوران ولایت الهی'}
                  </span>
                </div>
              </div>

              {/* Tab 1: Biography */}
              {activeTab === 'bio' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-base border-b border-stone-200 pb-2">
                    <BookOpen className="w-5 h-5 text-emerald-700" />
                    <span>خلاصه کامل زندگانی و سیر تاریخی</span>
                  </div>
                  <p className="text-stone-800 leading-loose text-justify whitespace-pre-line text-sm sm:text-base">
                    {selectedPerson.biography}
                  </p>
                </div>
              )}

              {/* Tab 2: Virtues */}
              {activeTab === 'virtues' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-base border-b border-stone-200 pb-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    <span>فضائل، مکارم اخلاقی و جلوه‌های معنوی</span>
                  </div>
                  <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200">
                    <p className="text-stone-800 leading-loose text-justify text-sm sm:text-base">
                      {selectedPerson.virtues}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Hadith */}
              {activeTab === 'hadith' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-base border-b border-stone-200 pb-2">
                    <Quote className="w-5 h-5 text-amber-600" />
                    <span>حدیث برگزیده و کلام نورانی</span>
                  </div>

                  <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200 space-y-3">
                    <div className="text-center font-bold text-stone-900 text-base sm:text-lg text-emerald-950 font-serif leading-relaxed px-4">
                      « {selectedPerson.hadith.arabic} »
                    </div>

                    <div className="text-center text-xs sm:text-sm text-stone-700 font-semibold pt-3 border-t border-amber-200/80">
                      ترجمه: {selectedPerson.hadith.persian}
                    </div>

                    {selectedPerson.hadith.source && (
                      <div className="text-left text-[11px] text-amber-800 font-medium">
                        منبع: {selectedPerson.hadith.source}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Ziyarah Snippet */}
              {activeTab === 'ziyarah' && selectedPerson.specialZiyarahSnippet && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-base border-b border-stone-200 pb-2">
                    <ScrollText className="w-5 h-5 text-teal-700" />
                    <span>فراز زیارت و سلام مخصوص</span>
                  </div>

                  <div className="bg-teal-50/70 rounded-2xl p-5 border border-teal-200 text-center">
                    <p className="font-serif text-base sm:text-lg text-teal-950 leading-loose font-bold">
                      {selectedPerson.specialZiyarahSnippet}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Next/Previous Infallible */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePrevPerson}
                disabled={currentIndex <= 0}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>معصوم قبلی</span>
              </button>

              <button
                type="button"
                onClick={handleNextPerson}
                disabled={currentIndex >= infallibles.length - 1}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>معصوم بعدی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
