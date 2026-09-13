import React, { useState, useMemo } from 'react';
import { Account, UserSubmission, ContentItem, isUserRole } from '../types';
import {
  Trophy,
  Award,
  Medal,
  Star,
  User,
  X,
  Search,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  submissions: UserSubmission[];
  items?: ContentItem[];
  currentUserId?: string;
}

interface ParticipantLeaderboardItem {
  id: string;
  fullName: string;      // نام و نام خانوادگی
  nickname: string;      // نام مستعار
  totalScore: number;    // امتیاز
  solvedCount: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  accounts,
  submissions,
  currentUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate scores for all users and sort them strictly by score descending
  const leaderboardData = useMemo(() => {
    const userMap = new Map<string, ParticipantLeaderboardItem>();

    // 1. Initialize users from registered accounts
    accounts
      .filter((acc) => isUserRole(acc.role))
      .forEach((acc) => {
        userMap.set(acc.id, {
          id: acc.id,
          fullName: acc.name,
          nickname: acc.nickname || 'بی‌نام',
          totalScore: 0,
          solvedCount: 0,
        });
      });

    // 2. Aggregate scores from user submissions
    submissions.forEach((sub) => {
      const key = sub.userId || sub.userName;
      let entry = userMap.get(key);

      if (!entry) {
        // Match by name
        for (const e of userMap.values()) {
          if (e.fullName === sub.userName) {
            entry = e;
            break;
          }
        }
      }

      if (!entry) {
        entry = {
          id: sub.userId || `sub-${sub.id}`,
          fullName: sub.userName || 'شرکت‌کننده',
          nickname: 'همراه مزار',
          totalScore: 0,
          solvedCount: 0,
        };
        userMap.set(entry.id, entry);
      }

      entry.totalScore = Math.max(entry.totalScore, sub.totalScore);
      entry.solvedCount += Object.keys(sub.answers || {}).length;
    });

    // Sort participants by totalScore descending
    return Array.from(userMap.values()).sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.solvedCount - a.solvedCount;
    });
  }, [accounts, submissions]);

  if (!isOpen) return null;

  const filteredList = leaderboardData.filter(
    (entry) =>
      entry.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="leaderboard-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in"
    >
      <div
        id="leaderboard-dialog"
        className="bg-white rounded-3xl max-w-2xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] text-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center font-black shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-950">
                جدول رتبه‌بندی و امتیازات شرکت‌کنندگان
              </h2>
              <p className="text-xs text-amber-950/90 mt-0.5 font-medium">
                مرتب‌سازی بر اساس مجموع امتیازات کسب‌شده در آزمون‌ها و فعالیت‌ها
              </p>
            </div>
          </div>

          <button
            id="close-leaderboard-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-stone-950/70 hover:text-stone-950 rounded-xl hover:bg-black/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-stone-100 bg-stone-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام یا نام مستعار شرکت‌کننده..."
              className="w-full pr-10 pl-3 py-2.5 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-500 shadow-2xs font-medium"
            />
          </div>
        </div>

        {/* Table Column Headers */}
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-stone-100/90 text-stone-700 text-xs font-bold border-b border-stone-200">
          <div className="col-span-2 sm:col-span-1 text-center">رتبه</div>
          <div className="col-span-6 sm:col-span-6">نام و نام خانوادگی</div>
          <div className="col-span-4 sm:col-span-3">نام مستعار</div>
          <div className="hidden sm:block sm:col-span-2 text-left">امتیاز</div>
        </div>

        {/* Leaderboard Table Rows */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs sm:text-sm">
              شرکت‌کننده‌ای با این مشخصات یافت نشد.
            </div>
          ) : (
            filteredList.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.id === currentUserId;

              return (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-1 ring-amber-400'
                      : rank <= 3
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  {/* Rank Column */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                    {rank === 1 ? (
                      <span className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow-md ring-2 ring-amber-300 font-black text-sm">
                        🥇
                      </span>
                    ) : rank === 2 ? (
                      <span className="w-8 h-8 rounded-full bg-stone-300 text-stone-900 flex items-center justify-center shadow-md ring-2 ring-stone-200 font-black text-sm">
                        🥈
                      </span>
                    ) : rank === 3 ? (
                      <span className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center shadow-md ring-2 ring-amber-600 font-black text-sm">
                        🥉
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs">
                        {formatPersianNumber(rank)}
                      </span>
                    )}
                  </div>

                  {/* Full Name Column */}
                  <div className="col-span-6 sm:col-span-6 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-stone-900 truncate">
                      {entry.fullName}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 shrink-0">
                        شما
                      </span>
                    )}
                  </div>

                  {/* Nickname Column (نام مستعار) */}
                  <div className="col-span-4 sm:col-span-3">
                    <span className="inline-block text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 truncate max-w-full">
                      {entry.nickname || '—'}
                    </span>
                    {/* Mobile Score sub-display */}
                    <div className="sm:hidden text-[11px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{formatPersianNumber(entry.totalScore)} امتیاز</span>
                    </div>
                  </div>

                  {/* Score Column (امتیاز) */}
                  <div className="hidden sm:flex col-span-2 items-center justify-end gap-1 text-left">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="text-sm sm:text-base font-black text-stone-900 font-mono">
                      {formatPersianNumber(entry.totalScore)}
                    </span>
                    <span className="text-[11px] text-stone-500">امتیاز</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>رتبه‌بندی به صورت خودکار با ثبت پاسخ‌ها بروزرسانی می‌شود.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            بستن جدول
          </button>
        </div>
      </div>
    </div>
  );
};
