import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Account, AccountRole, UserSubmission, isUserRole, isControllerRole } from '../types';
import {
  X,
  UserCheck,
  ShieldCheck,
  Plus,
  User,
  Shield,
  Award,
  Check,
  Trash2,
  Lock,
  Camera,
  Upload,
  Image as ImageIcon,
  Search,
  KeyRound,
  Phone,
  Mail,
} from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';
import { deduplicateAccounts } from '../utils/storage';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccountId: string;
  onSelectAccount: (account: Account) => void;
  onCreateAccount: (newAccount: Account) => void;
  onDeleteAccount?: (id: string) => void;
  submissions: UserSubmission[];
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-stone-800',
];

export function AccountManagerModal({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onCreateAccount,
  onDeleteAccount,
  submissions,
}: AccountManagerModalProps) {
  if (!isOpen) return null;

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Form states for creating a new account
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AccountRole>('user');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBadgeTitle, setNewBadgeTitle] = useState('');
  const [newAvatarColor, setNewAvatarColor] = useState(AVATAR_COLORS[0]);
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>('');
  const [formError, setFormError] = useState('');

  const userAccounts = deduplicateAccounts(accounts.filter((a) => isUserRole(a.role)));
  const controllerAccounts = deduplicateAccounts(accounts.filter((a) => isControllerRole(a.role)));

  const filteredUserAccounts = userAccounts.filter((acc) => {
    const q = accountSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      acc.name.toLowerCase().includes(q) ||
      (acc.phone && acc.phone.toLowerCase().includes(q)) ||
      (acc.email && acc.email.toLowerCase().includes(q)) ||
      (acc.emailOrPhone && acc.emailOrPhone.toLowerCase().includes(q)) ||
      (acc.badgeTitle && acc.badgeTitle.toLowerCase().includes(q))
    );
  });

  const filteredControllerAccounts = controllerAccounts.filter((acc) => {
    const q = accountSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      acc.name.toLowerCase().includes(q) ||
      (acc.phone && acc.phone.toLowerCase().includes(q)) ||
      (acc.email && acc.email.toLowerCase().includes(q)) ||
      (acc.emailOrPhone && acc.emailOrPhone.toLowerCase().includes(q)) ||
      (acc.badgeTitle && acc.badgeTitle.toLowerCase().includes(q))
    );
  });

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setNewAvatarUrl(result);
        setFormError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('لطفاً نام و نام خانوادگی را وارد فرمایید.');
      return;
    }

    // گرفتن شماره تماس الزامی است
    if (!newPhone.trim()) {
      setFormError('وارد کردن شماره تماس (تلفن همراه) الزامی است.');
      return;
    }

    // گرفتن ایمیل الزامی است
    if (!newEmail.trim()) {
      setFormError('وارد کردن پست الکترونیک (ایمیل) الزامی است.');
      return;
    }

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      setFormError('فرمت پست الکترونیک (ایمیل) صحیح نیست. مثال: name@example.com');
      return;
    }

    const cleanPhone = newPhone.trim();
    const cleanEmail = newEmail.trim();

    const created: Account = {
      id: `${newRole === 'controller' ? 'ctrl' : 'usr'}-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      phone: cleanPhone,
      email: cleanEmail,
      emailOrPhone: `${cleanPhone} | ${cleanEmail}`,
      password: newPassword.trim() || undefined,
      hasPassword: Boolean(newPassword.trim()),
      avatarUrl: newAvatarUrl || undefined,
      badgeTitle:
        newBadgeTitle.trim() || (newRole === 'controller' ? 'کنترل‌گر آزمون' : 'کاربر جدید'),
      avatarColor: newAvatarColor,
      createdAt: new Date().toISOString(),
      personalNotes: '',
    };

    onCreateAccount(created);
    // Reset form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewPassword('');
    setNewBadgeTitle('');
    setNewAvatarUrl('');
    setFormError('');
    setActiveTab('list');
  };

  const getUserScore = (userName: string) => {
    const sub = submissions.find(
      (s) => s.userName.trim().toLowerCase() === userName.trim().toLowerCase()
    );
    if (!sub) return null;
    return `${formatPersianNumber(sub.totalScore)} / ${formatPersianNumber(sub.maxScore)}`;
  };

  return (
    <div
      id="account-manager-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      style={{ direction: 'rtl' }}
    >
      <div
        id="account-manager-dialog"
        className="bg-white rounded-3xl max-w-2xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                مدیریت حساب‌های شخصی (کاربر و کنترل‌گر)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                جابجایی بین حساب‌ها یا تعریف حساب شخصی جدید
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-4 sm:px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'border-stone-900 text-stone-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-4 h-4 text-stone-600" />
            <span>لیست حساب‌های ثبت‌شده ({formatPersianNumber(accounts.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-stone-900 text-stone-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>ایجاد حساب شخصی جدید</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'list' ? (
            <div className="space-y-5">
              {/* Search Bar for Controller */}
              <div className="relative">
                <input
                  id="search-accounts-input"
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  placeholder="جستجو در تمام حساب‌ها (نام، شماره تماس، ایمیل، رمز عبور، سمت...)"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
                />
                <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {accountSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAccountSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* User Accounts Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600 px-1">
                  <span>حساب‌های شخصی کاربران (شرکت‌کنندگان آزمون):</span>
                  <span>{formatPersianNumber(filteredUserAccounts.length)} از {formatPersianNumber(userAccounts.length)} حساب</span>
                </div>

                {filteredUserAccounts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-500">
                    هیچ حساب کاربری با این مشخصات یافت نشد.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredUserAccounts.map((acc, idx) => {
                      const isActive = acc.id === activeAccountId;
                      const score = getUserScore(acc.name);

                      return (
                        <div
                          key={`user-acc-${acc.id}-${idx}`}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ${
                                acc.avatarColor || 'bg-indigo-600'
                              }`}
                            >
                              {acc.avatarUrl ? (
                                <img
                                  src={acc.avatarUrl}
                                  alt={acc.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                                  {acc.name}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                                    حساب فعال شما
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 truncate flex flex-wrap items-center gap-2 mt-0.5">
                                <span>{acc.badgeTitle || 'کاربر عادی'}</span>
                                {acc.phone && <span className="font-mono">• {acc.phone}</span>}
                                {acc.email && <span className="font-mono">• {acc.email}</span>}
                                {acc.age && <span>• {formatPersianNumber(acc.age)} سال</span>}
                              </div>

                              {/* Password Security Status Badge */}
                              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-lg text-xs">
                                <Lock className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                                <span className="text-[11px] font-semibold">وضعیت رمز عبور:</span>
                                <span className="font-bold text-stone-900">
                                  {acc.hasPassword ? 'دارای رمز عبور اختصاصی' : 'بدون رمز (پیش‌فرض)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {score && (
                              <div className="text-left hidden sm:block">
                                <div className="text-[10px] text-stone-500">نمره ثبت‌شده</div>
                                <div className="text-xs font-extrabold text-stone-900">{score}</div>
                              </div>
                            )}

                            {onDeleteAccount && accounts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setAccountToDelete(acc)}
                                title="حذف حساب کاربری"
                                className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onSelectAccount(acc);
                                onClose();
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white hover:bg-stone-200 text-stone-800 border border-stone-200'
                              }`}
                            >
                              {isActive ? 'انتخاب شده' : 'ورود به این حساب'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Controller Accounts Section */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600 px-1">
                  <span>حساب‌های اختصاصی کنترل‌گر (مدیران و ارزیاب‌ها):</span>
                  <span>{formatPersianNumber(filteredControllerAccounts.length)} از {formatPersianNumber(controllerAccounts.length)} حساب</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {filteredControllerAccounts.map((acc, idx) => {
                    const isActive = acc.id === activeAccountId;

                    return (
                      <div
                        key={`ctrl-acc-${acc.id}-${idx}`}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ${
                              acc.avatarColor || 'bg-amber-600'
                            }`}
                          >
                            {acc.avatarUrl ? (
                              <img
                                src={acc.avatarUrl}
                                alt={acc.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Shield className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                                {acc.name}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                                  حساب فعال شما
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate flex items-center gap-2 mt-0.5">
                              <span>{acc.badgeTitle || 'کنترل‌گر'}</span>
                              {acc.emailOrPhone && <span>• {acc.emailOrPhone}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {onDeleteAccount && accounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setAccountToDelete(acc)}
                              title="حذف حساب کنترل‌گر"
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onSelectAccount(acc);
                              onClose();
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-white hover:bg-stone-200 text-stone-800 border border-stone-200'
                            }`}
                          >
                            {isActive ? 'انتخاب شده' : 'ورود به عنوان کنترل‌گر'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* CREATE ACCOUNT TAB */
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {formError}
                </div>
              )}

              {/* Role selector */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  نوع حساب کاربری را انتخاب کنید:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole('user')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      newRole === 'user'
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-stone-900">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>حساب کاربر عادی</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      شرکت در آزمون، ثبت پاسخ و دریافت کارنامه
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('controller')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      newRole === 'controller'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-stone-900">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>حساب کنترل‌گر / مدیر</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      طراحی سوالات و ثبت یادداشت ارزیابی برای کاربران
                    </p>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  نام و نام خانوادگی: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: دکتر مهدی صادقی یا فاطمه رضایی"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-stone-800 focus:outline-hidden"
                />
              </div>

              {/* Mandatory Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    شماره تلفن همراه: <span className="text-rose-500 font-black">* (الزامی)</span>
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="مثال: 09123456789"
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-stone-800 focus:outline-hidden text-left font-mono"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">جهت ثبت نتایج و تماس ضروری</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    پست الکترونیک (ایمیل): <span className="text-rose-500 font-black">* (الزامی)</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-stone-800 focus:outline-hidden text-left font-mono"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">جهت دریافت کارنامه و اطلاعیه‌ها</span>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  رمز عبور اختصاصی کاربر:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="رمز عبور دلخواه (مثلاً: 123456 یا شماره ملی یا رمز اختصاصی)"
                    className="w-full p-2.5 pl-9 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-stone-800 focus:outline-hidden text-left font-mono"
                    dir="ltr"
                  />
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  در صورت خالی ماندن، رمز پیش‌فرض آزمون در نظر گرفته می‌شود و کاربر می‌تواند با آن وارد شود.
                </span>
              </div>

              {/* Profile Photo Upload */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <label className="block font-bold text-stone-700 mb-2">
                  عکس پروفایل کاربر:
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-stone-300 bg-stone-100 flex items-center justify-center shrink-0 shadow-2xs">
                    {newAvatarUrl ? (
                      <img
                        src={newAvatarUrl}
                        alt="پیش‌نمایش تصویر پروفایل"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-stone-400" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <input
                      ref={photoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs border border-stone-300 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-stone-700" />
                        <span>{newAvatarUrl ? 'تغییر عکس انتخابی' : 'بارگذاری عکس پروفایل'}</span>
                      </button>

                      {newAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setNewAvatarUrl('')}
                          className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          حذف عکس
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500">
                      می‌توانید عکس دلخواه خود را از حافظه دستگاه یا گالری انتخاب فرمایید.
                    </p>
                  </div>
                </div>
              </div>

              {/* Badge or Title */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  عنوان یا سمت سازمانی:
                </label>
                <input
                  type="text"
                  value={newBadgeTitle}
                  onChange={(e) => setNewBadgeTitle(e.target.value)}
                  placeholder={
                    newRole === 'controller'
                      ? 'مثال: سرپرست کنترل و ارزیابی'
                      : 'مثال: شرکت‌کننده'
                  }
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-stone-800 focus:outline-hidden"
                />
              </div>

              {/* Avatar Color Picker (Fallback if no photo uploaded) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  رنگ نماد حساب کاربری (در صورت عدم انتخاب عکس):
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewAvatarColor(c)}
                      className={`w-7 h-7 rounded-xl ${c} flex items-center justify-center text-white transition-all cursor-pointer ${
                        newAvatarColor === c ? 'ring-2 ring-stone-900 ring-offset-2 scale-110' : ''
                      }`}
                    >
                      {newAvatarColor === c && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت‌نام و فعال‌سازی این حساب</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-right space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-black text-stone-900">تایید حذف حساب کاربری</h4>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                آیا از حذف حساب «{accountToDelete.name}» اطمینان دارید؟
                <br />
                اطلاعات این حساب به طور کامل حذف خواهد شد.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                id="confirm-delete-account-btn"
                onClick={() => {
                  if (onDeleteAccount && accountToDelete) {
                    onDeleteAccount(accountToDelete.id);
                  }
                  setAccountToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
              >
                بله، حذف شود
              </button>
              <button
                type="button"
                id="cancel-delete-account-btn"
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
