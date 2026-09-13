import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  Clock,
  Mic,
  MapPin,
  Check,
  X,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { DayOfWeek, MazarProgram } from '../types';
import { formatPersianNumber } from '../utils/formatters';
import { DAYS_CONFIG } from './MazarProgramsCard';

interface MazarProgramsManagerProps {
  programs: MazarProgram[];
  onSaveProgram: (program: MazarProgram) => void;
  onDeleteProgram: (id: string) => void;
}

export const MazarProgramsManager: React.FC<MazarProgramsManagerProps> = ({
  programs,
  onSaveProgram,
  onDeleteProgram,
}) => {
  const [filterDay, setFilterDay] = useState<DayOfWeek | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<MazarProgram | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    day: 'thursday' as DayOfWeek,
    title: '',
    time: '',
    speakerOrMaddah: '',
    location: 'صحن مطهر مزار',
    description: '',
  });

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredPrograms =
    filterDay === 'all' ? programs : programs.filter((p) => p.day === filterDay);

  const handleOpenAddForm = (defaultDay?: DayOfWeek) => {
    setEditingProgram(null);
    setFormData({
      day: defaultDay || (filterDay === 'all' ? 'thursday' : filterDay),
      title: '',
      time: '',
      speakerOrMaddah: '',
      location: 'صحن مطهر مزار',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (program: MazarProgram) => {
    setEditingProgram(program);
    setFormData({
      day: program.day,
      title: program.title,
      time: program.time || '',
      speakerOrMaddah: program.speakerOrMaddah || '',
      location: program.location || '',
      description: program.description || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const programToSave: MazarProgram = {
      id: editingProgram ? editingProgram.id : `prog-${Date.now()}`,
      day: formData.day,
      title: formData.title.trim(),
      time: formData.time.trim() || undefined,
      speakerOrMaddah: formData.speakerOrMaddah.trim() || undefined,
      location: formData.location.trim() || undefined,
      description: formData.description.trim() || undefined,
      createdAt: editingProgram ? editingProgram.createdAt : new Date().toISOString(),
    };

    onSaveProgram(programToSave);
    setIsFormOpen(false);
    setEditingProgram(null);
  };

  const handleDelete = (id: string) => {
    onDeleteProgram(id);
    setDeleteConfirmId(null);
  };

  const getDayLabel = (dayKey: DayOfWeek) => {
    return DAYS_CONFIG.find((d) => d.key === dayKey)?.label || dayKey;
  };

  return (
    <div className="space-y-5">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              مدیریت و زمان‌بندی برنامه‌های مزار
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              افزودن، ویرایش و حذف مراسم‌ها و برنامه‌های هفتگی برای نمایش مستقیم به کاربران
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAddForm()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن برنامه جدید</span>
        </button>
      </div>

      {/* Days Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilterDay('all')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            filterDay === 'all'
              ? 'bg-stone-900 text-white shadow-2xs'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          همه روزهای هفته ({formatPersianNumber(programs.length)})
        </button>

        {DAYS_CONFIG.map((day) => {
          const count = programs.filter((p) => p.day === day.key).length;
          const isSelected = filterDay === day.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setFilterDay(day.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <span>{day.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {formatPersianNumber(count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Program Form Modal / Inline Editor */}
      {isFormOpen && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-emerald-500 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
            <div className="flex items-center gap-2 font-bold text-stone-900 text-sm sm:text-base">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>{editingProgram ? 'ویرایش برنامه مزار' : 'افزودن برنامه جدید برای مزار'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingProgram(null);
              }}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Day of Week */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  روز هفته <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-emerald-600"
                >
                  {DAYS_CONFIG.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  عنوان برنامه یا مراسم <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مراسم پرفیض دعای کمیل"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  زمان / ساعت برگزاری
                </label>
                <input
                  type="text"
                  placeholder="مثال: ساعت ۲۰:۳۰ یا بعد از نماز مغرب"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Speaker or Maddah */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  سخنران، مداح یا قاری
                </label>
                <input
                  type="text"
                  placeholder="مثال: سخنران: استاد حسینی | مداح: حاج رضا میرزایی"
                  value={formData.speakerOrMaddah}
                  onChange={(e) => setFormData({ ...formData, speakerOrMaddah: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Location */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  مکان برگزاری در مزار
                </label>
                <input
                  type="text"
                  placeholder="مثال: صحن اصلی، رواق امام رضا (ع)، دارالقرآن..."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  توضیحات تکمیلی و جزییات برنامه
                </label>
                <textarea
                  rows={3}
                  placeholder="اطلاعات تکمیلی درباره برنامه، نحوه شرکت، پذیرایی، ویژه آقایان/بانوان و..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingProgram(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingProgram ? 'ذخیره تغییرات' : 'ثبت برنامه'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Programs List */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-stone-300 text-center">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-stone-800">برنامه‌ای یافت نشد</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {filterDay === 'all'
              ? 'هیچ برنامه‌ای در سامانه ثبت نشده است. می‌توانید با زدن دکمه افزودن اولین برنامه را ثبت نمایید.'
              : `هیچ برنامه‌ای برای روز ${getDayLabel(filterDay)} ثبت نشده است.`}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddForm(filterDay === 'all' ? undefined : filterDay)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن برنامه برای {filterDay === 'all' ? 'مزار' : getDayLabel(filterDay)}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPrograms.map((prog) => {
            const dayLabel = getDayLabel(prog.day);
            const isDeleting = deleteConfirmId === prog.id;

            return (
              <div
                key={prog.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900">
                        {dayLabel}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                        {prog.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(prog)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش برنامه"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(prog.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف برنامه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                    {prog.time && (
                      <div className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md font-semibold text-stone-800">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        <span>{prog.time}</span>
                      </div>
                    )}
                    {prog.speakerOrMaddah && (
                      <div className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md text-stone-700">
                        <Mic className="w-3.5 h-3.5 text-stone-500" />
                        <span>{prog.speakerOrMaddah}</span>
                      </div>
                    )}
                    {prog.location && (
                      <div className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md text-stone-700">
                        <MapPin className="w-3.5 h-3.5 text-stone-500" />
                        <span>{prog.location}</span>
                      </div>
                    )}
                  </div>

                  {prog.description && (
                    <p className="mt-2.5 text-xs text-stone-600 leading-relaxed bg-stone-50/70 p-2.5 rounded-xl">
                      {prog.description}
                    </p>
                  )}
                </div>

                {/* Confirm Delete Banner */}
                {isDeleting && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>آیا از حذف این برنامه مزار اطمینان دارید؟</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(prog.id)}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                      >
                        بله، حذف
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-200 rounded-lg text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
