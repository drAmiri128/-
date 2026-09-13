import { useState, useRef, useEffect } from 'react';
import { ViewMode, Account, isControllerRole } from '../types';
import {
  SlidersHorizontal,
  UserCheck,
  ShieldCheck,
  Lock,
  X,
  Award,
  Users,
  Unlock,
  Sparkles,
  ChevronRight,
  User,
  Shield,
  ArrowRightLeft,
  Moon,
  Sun,
  LogOut,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';

interface BottomLeftSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isAdminUnlocked?: boolean;
  onLockAdmin: () => void;
  activeAccount: Account;
  onOpenPersonalAccount: () => void;
  totalSubmissionsCount: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isMatamMode?: boolean;
  onLogout?: () => void;
  onOpenConnectedDevices?: () => void;
}

export function BottomLeftSwitcher({
  currentView,
  onViewChange,
  isAdminUnlocked,
  onLockAdmin,
  activeAccount,
  onOpenPersonalAccount,
  isDarkMode = false,
  onToggleDarkMode,
  isMatamMode = false,
  onLogout,
  onOpenConnectedDevices,
}: BottomLeftSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isController = isControllerRole(activeAccount.role);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMode = (mode: ViewMode) => {
    onViewChange(mode);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="fixed bottom-6 left-6 z-40 flex flex-col items-start select-none">
      {/* Popover / Switcher Menu */}
      {isOpen && (
        <div
          id="bottom-left-switcher-popup"
          className="mb-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 p-4 transition-all animate-fadeIn text-stone-900"
          style={{ direction: 'rtl' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">انتخاب بخش و حساب شخصی</h3>
                <p className="text-[11px] text-stone-500">تغییر وضعیت نمایش یا بررسی کارنامه</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: Choose Role / View Mode */}
          <div className="my-3 space-y-2">
            <div className="text-[11px] font-semibold text-stone-500 px-1">انتخاب بخش سامانه:</div>
            <div className="grid grid-cols-2 gap-2">
              {/* User Mode Button */}
              <button
                type="button"
                id="switcher-select-user-mode"
                onClick={() => handleSelectMode('user')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  currentView === 'user'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentView === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </div>
                  {currentView === 'user' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                      فعال
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">بخش کاربر</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">مطالعه متون و آزمون</div>
                </div>
              </button>

              {/* Controller Mode Button */}
              <button
                type="button"
                id="switcher-select-admin-mode"
                onClick={() => handleSelectMode('admin')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-stone-900 text-white border-stone-800 ring-2 ring-stone-900/20 shadow-xs'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentView === 'admin'
                        ? 'bg-amber-400 text-stone-900'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isController ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  {currentView === 'admin' ? (
                    <span className="text-[10px] font-bold text-amber-300 bg-stone-800 px-1.5 py-0.5 rounded-md">
                      فعال
                    </span>
                  ) : !isController ? (
                    <span className="text-[10px] font-semibold text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded-md">
                      رمزدار
                    </span>
                  ) : null}
                </div>
                <div>
                  <div
                    className={`text-xs font-bold ${
                      currentView === 'admin' ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    بخش کنترل‌گر
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      currentView === 'admin' ? 'text-stone-300' : 'text-stone-500'
                    }`}
                  >
                    طراحی و ثبت یادداشت
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Active Personal Account Card */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 px-1">
              <span>حساب شخصی در حال استفاده:</span>
              <span className="text-stone-400">
                {isController ? 'نقش کنترل‌گر' : 'نقش کاربر عادی'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs ${
                    activeAccount.avatarColor || 'bg-indigo-600'
                  }`}
                >
                  {isController ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 truncate">
                    {activeAccount.name}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate flex items-center gap-1.5">
                    <span>{activeAccount.badgeTitle || (isController ? 'کنترل‌گر' : 'کاربر')}</span>
                    {activeAccount.nationalOrStudentId && (
                      <span className="text-[10px] bg-stone-200/80 px-1 py-0.2 rounded text-stone-600">
                        {activeAccount.nationalOrStudentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
            </div>

            {/* Quick Actions for Account */}
            <div className="pt-1 space-y-1.5">
              {/* Results & Personal Account button */}
              <button
                type="button"
                id="switcher-open-results-btn"
                onClick={() => {
                  onOpenPersonalAccount();
                  setIsOpen(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>مشاهده حساب شخصی و نتایج آزمون من</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-700 rotate-180" />
              </button>

              {/* Connected Devices / Sessions button */}
              {onOpenConnectedDevices && (
                <button
                  type="button"
                  id="switcher-open-devices-btn"
                  onClick={() => {
                    onOpenConnectedDevices();
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>دستگاه‌های متصل و نشست‌های فعال</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-500 rotate-180" />
                </button>
              )}
            </div>
          </div>

          {/* Section 3: Dark Mode Toggle Button */}
          <div className="pt-2 border-t border-stone-100">
            <button
              type="button"
              id="switcher-toggle-dark-mode-btn"
              onClick={onToggleDarkMode}
              className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                isDarkMode
                  ? 'bg-stone-900 text-white border-stone-700 shadow-xs'
                  : 'bg-stone-50 border-stone-200 text-stone-900 hover:bg-stone-100 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isDarkMode
                      ? 'bg-stone-800 text-amber-300'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold">حالت تاریک</div>
                  <div className={`text-[10px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                    سیاه شدن بخش‌های سفید با حفظ رنگ‌ها
                  </div>
                </div>
              </div>

              {/* Toggle visual switch */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isDarkMode
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {isDarkMode ? 'روشن' : 'خاموش'}
                </span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
                    isDarkMode ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      isDarkMode ? '-translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </button>
            {isMatamMode && (
              <div className="mt-1.5 px-1 text-[10px] text-red-500 font-semibold flex items-center gap-1 leading-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block animate-ping shrink-0" />
                <span>حالت ماتم سراسری فعال است (رنگ‌ها به قرمز غلیظ و بخش‌های سفید به مشکی تغییر یافته‌اند)</span>
              </div>
            )}
          </div>

          {/* Return to user section button when in admin view */}
          {currentView === 'admin' && (
            <div className="mt-3 pt-2 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                id="switcher-return-to-user-btn"
                onClick={() => {
                  onLockAdmin();
                  setIsOpen(false);
                }}
                className="text-[11px] text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-stone-500" />
                <span>بازگشت به بخش کاربر</span>
              </button>
            </div>
          )}

          {/* Safe Logout Option inside Switcher Menu */}
          {onLogout && (
            <button
              type="button"
              id="switcher-menu-logout-btn"
              onClick={() => {
                setShowLogoutConfirmModal(true);
              }}
              className="w-full mt-3 py-2 px-3 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-stone-200 hover:border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج از حساب کاربری</span>
            </button>
          )}
        </div>
      )}

      {/* Safe Logout Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div
          id="logout-account-confirm-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowLogoutConfirmModal(false)}
        >
          <div
            id="logout-account-confirm-dialog"
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-right space-y-4"
            style={{ direction: 'rtl' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-black text-stone-900">
                خروج از حساب کاربری
              </h4>
              <p className="text-xs text-stone-700 leading-relaxed font-bold">
                آیا مایل به خروج از حساب کاربری خود هستید؟
              </p>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                اطلاعات کارنامه، پاسخ‌ها و سوابق آزمون شما با امنیت در سرور سامانه محفوظ باقی می‌ماند و در هر زمان با شماره تماس خود می‌توانید مجدداً وارد شوید.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                id="confirm-logout-account-btn"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  setIsOpen(false);
                  onLogout?.();
                }}
                className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>بله، خروج از حساب</span>
              </button>
              <button
                type="button"
                id="cancel-logout-account-btn"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons at Bottom-Left */}
      <div className="flex items-center gap-2">
        <div className="relative group">
          <button
            id="bottom-left-floating-trigger"
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            title="انتخاب بخش کاربر / کنترل‌گر و حساب شخصی"
            className="flex items-center gap-2.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white px-3.5 py-3 rounded-2xl shadow-xl hover:shadow-2xl border border-stone-700 transition-all duration-200 cursor-pointer"
          >
            {/* Main Icon */}
            <div className="relative">
              <div className="w-7 h-7 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center">
                {currentView === 'admin' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <SlidersHorizontal className="w-4 h-4" />
                )}
              </div>
              {/* Status dot */}
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-stone-900 ${
                  currentView === 'admin' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </div>

            {/* Label text */}
            <div className="text-right flex flex-col">
              <span className="text-[11px] text-stone-400 font-normal leading-tight">
                {currentView === 'user' ? 'بخش کاربر' : 'بخش کنترل‌گر'}
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {activeAccount.name}
              </span>
            </div>

            {/* Badge Icon */}
            <div className="w-5 h-5 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center mr-1">
              <Award className="w-3 h-3 text-amber-400" />
            </div>
          </button>

          {/* Small tooltip when hover */}
          {!isOpen && (
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:flex items-center gap-1.5 bg-stone-950 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50">
              <span>کلیک کنید: جابجایی بین بخش‌ها و کارنامه من</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
