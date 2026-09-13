import React, { useState } from 'react';
import {
  CalendarDays,
  Calendar,
  Sun,
  Clock,
  BookOpen,
  Users,
  Sparkles,
  Heart,
  MapPin,
  Mic,
  FileText,
  ChevronRight,
  Info,
  CalendarCheck,
  X,
} from 'lucide-react';
import { DayOfWeek, MazarProgram } from '../types';
import { formatPersianNumber } from '../utils/formatters';

interface MazarProgramsCardProps {
  programs: MazarProgram[];
  onOpenControllerMazar?: () => void;
  isController?: boolean;
}

interface DayConfig {
  key: DayOfWeek;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  badgeBg: string;
}

export const DAYS_CONFIG: DayConfig[] = [
  {
    key: 'saturday',
    label: 'شنبه',
    icon: Calendar,
    color: 'text-sky-600',
    activeBg: 'bg-sky-50 border-sky-400 text-sky-950 shadow-xs',
    badgeBg: 'bg-sky-100 text-sky-800',
  },
  {
    key: 'sunday',
    label: 'یکشنبه',
    icon: Sun,
    color: 'text-amber-600',
    activeBg: 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'monday',
    label: 'دوشنبه',
    icon: Clock,
    color: 'text-blue-600',
    activeBg: 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  {
    key: 'tuesday',
    label: 'سه‌شنبه',
    icon: BookOpen,
    color: 'text-emerald-600',
    activeBg: 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'wednesday',
    label: 'چهارشنبه',
    icon: Users,
    color: 'text-teal-600',
    activeBg: 'bg-teal-50 border-teal-400 text-teal-950 shadow-xs',
    badgeBg: 'bg-teal-100 text-teal-800',
  },
  {
    key: 'thursday',
    label: 'پنج‌شنبه',
    icon: Sparkles,
    color: 'text-purple-600',
    activeBg: 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'friday',
    label: 'جمعه',
    icon: Heart,
    color: 'text-rose-600',
    activeBg: 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
];

// Helper to determine today's Persian day of week
function getTodayDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  switch (dayIndex) {
    case 6:
      return 'saturday';
    case 0:
      return 'sunday';
    case 1:
      return 'monday';
    case 2:
      return 'tuesday';
    case 3:
      return 'wednesday';
    case 4:
      return 'thursday';
    case 5:
      return 'friday';
    default:
      return 'thursday';
  }
}

export const MazarProgramsCard: React.FC<MazarProgramsCardProps> = ({
  programs = [],
  onOpenControllerMazar,
  isController = false,
}) => {
  // Start with null so that programs are NOT shown until user touches/selects a day
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);

  // Filter programs for the chosen day if selected
  const dayPrograms = selectedDay ? programs.filter((p) => p.day === selectedDay) : [];
  const currentDayConfig = selectedDay
    ? DAYS_CONFIG.find((d) => d.key === selectedDay) || DAYS_CONFIG[0]
    : null;

  return (
    <div
      id="mazar-programs-jade-card"
      className="bg-gradient-to-br from-[#064e3b] via-[#043d2f] to-[#022c22] border-2 border-emerald-600/80 rounded-2xl shadow-md text-emerald-50 overflow-hidden transition-all"
    >
      {/* Card Header in Jade Green Theme */}
      <div className="p-4 sm:p-5 border-b border-emerald-700/60 flex flex-wrap items-center justify-between gap-3 bg-emerald-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-800/80 text-emerald-200 border border-emerald-600/50 flex items-center justify-center font-bold shadow-xs">
            <CalendarDays className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                برنامه‌های مزار
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600/50">
                جدول هفتگی
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
              مراسمات و رویدادهای هفتگی مزار
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-900/90 text-emerald-200 border border-emerald-600/50 flex items-center gap-1.5 shadow-2xs">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>{formatPersianNumber(programs.length)} برنامه فعال</span>
          </span>
        </div>
      </div>

      {/* Seven Days Icons and Buttons */}
      <div className="p-4 sm:p-5">
        <div className="text-xs font-semibold text-emerald-200 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>برای مشاهده برنامه‌های هر روز هفته، آیکون آن روز را لمس فرمایید:</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {DAYS_CONFIG.map((day) => {
            const Icon = day.icon;
            const isSelected = selectedDay === day.key;
            const dayCount = programs.filter((p) => p.day === day.key).length;

            return (
              <button
                key={day.key}
                type="button"
                id={`mazar-day-btn-${day.key}`}
                onClick={() => setSelectedDay((prev) => (prev === day.key ? null : day.key))}
                title={isSelected ? `بستن برنامه‌های روز ${day.label}` : `مشاهده برنامه‌های روز ${day.label}`}
                className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-1 rounded-xl sm:rounded-2xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-amber-400 text-stone-950 border-amber-300 ring-2 ring-amber-400/50 font-black shadow-md scale-105'
                    : 'bg-emerald-900/60 hover:bg-emerald-800/80 border-emerald-700/60 text-emerald-100 hover:text-white'
                }`}
              >
                {/* Badge count if has programs */}
                {dayCount > 0 && (
                  <span
                    className={`absolute -top-1.5 -left-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs ${
                      isSelected ? 'bg-stone-950 text-amber-400' : 'bg-emerald-700 text-white'
                    }`}
                  >
                    {formatPersianNumber(dayCount)}
                  </span>
                )}

                {/* Day Icon */}
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center mb-1.5 transition-transform ${
                    isSelected ? 'text-stone-950' : 'text-emerald-300'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                {/* Day Label */}
                <span className="text-[11px] sm:text-xs font-bold leading-tight">
                  {day.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details Section - Only shown when user has touched/selected a day */}
        {selectedDay && currentDayConfig && (
          <div
            id={`mazar-day-details-${selectedDay}`}
            className="mt-4 p-4 sm:p-5 rounded-2xl bg-white text-stone-900 shadow-sm border border-emerald-700/20 transition-all animate-fadeIn"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <currentDayConfig.icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm md:text-base font-black text-stone-900">
                    برنامه‌های روز {currentDayConfig.label}
                  </h4>
                  <span className="text-[11px] text-stone-500">
                    جدول مراسمات و برنامه‌های اعلام شده
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {dayPrograms.length > 0
                    ? `${formatPersianNumber(dayPrograms.length)} برنامه فعال`
                    : 'بدون برنامه'}
                </span>
                <button
                  type="button"
                  id="close-mazar-day-details-btn"
                  onClick={() => setSelectedDay(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="بستن بخش برنامه‌ها"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of programs for selected day */}
            {dayPrograms.length === 0 ? (
              <div className="py-7 text-center">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-700">
                  در حال حاضر برنامه‌ای برای روز {currentDayConfig.label} ثبت نشده است.
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  برنامه‌ها و مراسم‌های جدید پس از ثبت در این بخش نمایش داده خواهند شد.
                </p>
              </div>
            ) : (
              <div className="mt-3.5 space-y-3">
                {dayPrograms.map((prog, idx) => (
                  <div
                    key={prog.id}
                    className="bg-stone-50/80 p-3.5 sm:p-4 rounded-xl border border-stone-200 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {formatPersianNumber(idx + 1)}
                        </span>
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                            {prog.title}
                          </h5>

                          {/* Meta info tags */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-[11px] sm:text-xs text-stone-600">
                            {prog.time && (
                              <div className="flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>{prog.time}</span>
                              </div>
                            )}

                            {prog.speakerOrMaddah && (
                              <div className="flex items-center gap-1 text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-medium">
                                <Mic className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{prog.speakerOrMaddah}</span>
                              </div>
                            )}

                            {prog.location && (
                              <div className="flex items-center gap-1 text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{prog.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Program description if available */}
                    {prog.description && (
                      <div className="mt-2.5 pt-2.5 border-t border-stone-200 text-xs text-stone-700 leading-relaxed">
                        {prog.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
