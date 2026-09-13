import { useState, type FormEvent } from 'react';
import {
  BookOpen,
  Search,
  Edit3,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Calendar,
  MapPin,
  Heart,
  Quote,
  Save,
  ScrollText,
} from 'lucide-react';
import { InfalliblePerson } from '../types';

interface ImamologyManagerProps {
  infallibles: InfalliblePerson[];
  onSaveInfallible: (person: InfalliblePerson) => void;
  onResetImamology: () => void;
}

export function ImamologyManager({
  infallibles,
  onSaveInfallible,
  onResetImamology,
}: ImamologyManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPerson, setEditingPerson] = useState<InfalliblePerson | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const filtered = infallibles.filter(
    (p) =>
      p.name.includes(searchQuery) ||
      p.title.includes(searchQuery) ||
      p.epithet.includes(searchQuery)
  );

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    onSaveInfallible(editingPerson);
    setSaveSuccessMsg(`اطلاعات «${editingPerson.name}» با موفقیت ذخیره شد.`);
    setEditingPerson(null);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  return (
    <div id="imamology-manager-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white border border-emerald-600/40 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-400 text-stone-950">
                بخش اختصاصی کنترلر
              </span>
              <span className="text-xs text-emerald-200">۱۴ معصوم و حضرت زهرا (س)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-300" />
              <span>مدیریت محتوای دانشنامه امام‌شناسی</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              کنترل‌گر گرامی، در این بخش می‌توانید متون زندگانی، فضائل، احادیث، مشخصات ولادت، شهادت و القاب هر یک از چهارده معصوم را ویرایش و شخصی‌سازی فرمایید.
            </p>
          </div>

          <button
            type="button"
            id="reset-imamology-btn"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shrink-0 self-start sm:self-center"
          >
            <RotateCcw className="w-4 h-4 text-amber-300" />
            <span>بازنشانی به متون اولیه</span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-5 max-w-md relative">
          <Search className="w-4 h-4 text-emerald-300 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام و القاب معصومین..."
            className="w-full pl-4 pr-10 py-2.5 bg-white/10 border border-emerald-500/40 rounded-2xl text-xs sm:text-sm text-white placeholder-emerald-200/60 focus:outline-hidden focus:bg-white/20"
          />
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Infallibles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((person) => (
          <div
            key={person.id}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                  {person.order}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {person.kunya}
                </span>
              </div>

              <h3 className="text-base font-black text-stone-900">{person.name}</h3>
              <p className="text-xs text-stone-500 mt-0.5">{person.title}</p>

              <div className="mt-3 text-xs text-stone-600 space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-stone-700">ولادت:</span>
                  <span className="truncate">{person.birthDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="font-semibold text-stone-700">مزار:</span>
                  <span className="truncate">{person.martyrdomPlace}</span>
                </div>
              </div>

              <p className="text-xs text-stone-700 mt-2.5 line-clamp-2 leading-relaxed">
                {person.biography}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 font-medium">شناسه: {person.id}</span>
              <button
                type="button"
                onClick={() => setEditingPerson({ ...person })}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایش اطلاعات</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPerson && (
        <div
          id="edit-infallible-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setEditingPerson(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white p-5 border-b border-emerald-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-base sm:text-lg text-white">
                  ویرایش اطلاعات: {editingPerson.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Form Fields */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    نام مبارک معصوم:
                  </label>
                  <input
                    type="text"
                    value={editingPerson.name}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    عنوان / القاب شاخص:
                  </label>
                  <input
                    type="text"
                    value={editingPerson.title}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, title: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    القاب اصلی (با کاما جدا کنید):
                  </label>
                  <input
                    type="text"
                    value={editingPerson.epithet}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, epithet: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">کنیه مبارک:</label>
                  <input
                    type="text"
                    value={editingPerson.kunya}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, kunya: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نام پدر:</label>
                  <input
                    type="text"
                    value={editingPerson.fatherName}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, fatherName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نام مادر:</label>
                  <input
                    type="text"
                    value={editingPerson.motherName}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, motherName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">تاریخ ولادت:</label>
                  <input
                    type="text"
                    value={editingPerson.birthDate}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, birthDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">محل ولادت:</label>
                  <input
                    type="text"
                    value={editingPerson.birthPlace}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, birthPlace: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    تاریخ شهادت / رحلت:
                  </label>
                  <input
                    type="text"
                    value={editingPerson.martyrdomDate}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, martyrdomDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    محل شهادت و مزار مطهر:
                  </label>
                  <input
                    type="text"
                    value={editingPerson.martyrdomPlace}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, martyrdomPlace: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    دوران رسالت / امامت:
                  </label>
                  <input
                    type="text"
                    value={editingPerson.imamatPeriod || ''}
                    onChange={(e) =>
                      setEditingPerson({ ...editingPerson, imamatPeriod: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Biography */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  شرح کامل زندگانی و سیر تاریخی:
                </label>
                <textarea
                  rows={4}
                  value={editingPerson.biography}
                  onChange={(e) =>
                    setEditingPerson({ ...editingPerson, biography: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden leading-relaxed text-xs sm:text-sm"
                />
              </div>

              {/* Virtues */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  فضائل، مکارم اخلاقی و جلوه‌های معنوی:
                </label>
                <textarea
                  rows={3}
                  value={editingPerson.virtues}
                  onChange={(e) =>
                    setEditingPerson({ ...editingPerson, virtues: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-hidden leading-relaxed text-xs sm:text-sm"
                />
              </div>

              {/* Hadith Section */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                  <Quote className="w-4 h-4 text-amber-600" />
                  <span>حدیث برگزیده</span>
                </span>

                <div>
                  <label className="block text-xs text-stone-600 mb-1">متن عربی حدیث:</label>
                  <input
                    type="text"
                    value={editingPerson.hadith.arabic}
                    onChange={(e) =>
                      setEditingPerson({
                        ...editingPerson,
                        hadith: { ...editingPerson.hadith, arabic: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 font-serif"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-600 mb-1">ترجمه فارسی حدیث:</label>
                  <input
                    type="text"
                    value={editingPerson.hadith.persian}
                    onChange={(e) =>
                      setEditingPerson({
                        ...editingPerson,
                        hadith: { ...editingPerson.hadith, persian: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-600 mb-1">منبع روایی:</label>
                  <input
                    type="text"
                    value={editingPerson.hadith.source || ''}
                    onChange={(e) =>
                      setEditingPerson({
                        ...editingPerson,
                        hadith: { ...editingPerson.hadith, source: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              {/* Special Ziyarah Snippet */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  فراز زیارت و سلام مخصوص:
                </label>
                <textarea
                  rows={2}
                  value={editingPerson.specialZiyarahSnippet || ''}
                  onChange={(e) =>
                    setEditingPerson({
                      ...editingPerson,
                      specialZiyarahSnippet: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 font-serif leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 text-stone-900 space-y-4 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-stone-900">
              آیا از بازنشانی متون امام‌شناسی اطمینان دارید؟
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              با این اقدام تمامی ویرایش‌های انجام‌شده حذف گردیده و اطلاعات معصومین به متون مستند اولیه برمی‌گردد.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetImamology();
                  setShowResetConfirm(false);
                  setSaveSuccessMsg('اطلاعات امام‌شناسی به حالت اولیه بازنشانی شد.');
                  setTimeout(() => setSaveSuccessMsg(null), 4000);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                بله، بازنشانی شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
