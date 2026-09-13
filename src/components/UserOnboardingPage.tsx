import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  LogIn,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import {
  toEnglishDigits,
  isValidIranianPhone,
  isValidEmail,
  formatPersianNumber,
} from '../utils/formatters';
import {
  getUserOnboardingDraft,
  saveUserOnboardingDraft,
} from '../utils/storage';
import { Account } from '../types';
import { apiClient } from '../services/api/apiClient';

interface UserOnboardingPageProps {
  existingAccounts?: Account[];
  onComplete: (data: {
    fullName: string;
    phoneNumber: string;
    email: string;
    age: string;
    password?: string;
    isExistingAccountLogin?: boolean;
    existingAccount?: Account;
  }) => void;
  onAdminLoginClick?: () => void;
}

export const UserOnboardingPage: React.FC<UserOnboardingPageProps> = ({
  existingAccounts = [],
  onComplete,
  onAdminLoginClick,
}) => {
  // Step navigation: 'initial_info' | 'choose_password' | 'duplicate_phone_login'
  const [step, setStep] = useState<'initial_info' | 'choose_password' | 'duplicate_phone_login'>('initial_info');

  // Load draft from localStorage if user previously typed and closed the app
  const [formData, setFormData] = useState(() => {
    const draft = getUserOnboardingDraft();
    return {
      fullName: draft.fullName || '',
      phoneNumber: draft.phoneNumber || '',
      email: draft.email || '',
      age: draft.age || '',
    };
  });

  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    age?: string;
  }>({});

  const [touched, setTouched] = useState<{
    fullName?: boolean;
    phoneNumber?: boolean;
    email?: boolean;
    age?: boolean;
  }>({});

  // Password fields for new user
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Existing user login fields
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [matchedAccount, setMatchedAccount] = useState<Account | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically save drafts whenever user changes values
  useEffect(() => {
    saveUserOnboardingDraft(formData);
  }, [formData]);

  // Validation function for initial form
  const validateField = (field: keyof typeof formData, value: string): string | undefined => {
    const trimmed = value.trim();

    if (field === 'fullName') {
      if (!trimmed) {
        return 'لطفاً نام و نام خانوادگی اصلی خود را وارد کنید.';
      }
      if (trimmed.length < 3) {
        return 'نام و نام خانوادگی باید حداقل ۳ حرف باشد.';
      }
      if (/^[\d\s\-_!@#$%^&*()]+$/.test(trimmed)) {
        return 'نام و نام خانوادگی نامعتبر است.';
      }
    }

    if (field === 'phoneNumber') {
      if (!trimmed) {
        return 'لطفاً شماره تماس خود را وارد کنید.';
      }
      const englishNum = toEnglishDigits(trimmed).replace(/\s+|-/g, '');
      if (!isValidIranianPhone(englishNum)) {
        return 'شماره تماس نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹).';
      }
    }

    if (field === 'email') {
      if (trimmed && !isValidEmail(trimmed)) {
        return 'فرمت ایمیل وارد شده نامعتبر است (مثال: name@example.com).';
      }
    }

    if (field === 'age') {
      if (!trimmed) {
        return 'لطفاً سن خود را وارد کنید.';
      }
      const ageNum = parseInt(toEnglishDigits(trimmed), 10);
      if (isNaN(ageNum) || ageNum < 6 || ageNum > 120) {
        return 'لطفاً یک سن معتبر (بین ۶ تا ۱۲۰ سال) وارد کنید.';
      }
    }

    return undefined;
  };

  const handleChange = (field: keyof typeof formData, rawVal: string) => {
    let cleaned = rawVal;

    if (field === 'age') {
      const converted = toEnglishDigits(rawVal);
      cleaned = converted.replace(/[^\d]/g, '');
      if (cleaned.length > 3) cleaned = cleaned.slice(0, 3);
    }

    if (field === 'phoneNumber') {
      const converted = toEnglishDigits(rawVal);
      cleaned = converted.replace(/[^\d+\s-]/g, '');
    }

    setFormData((prev) => ({ ...prev, [field]: cleaned }));

    if (touched[field]) {
      const err = validateField(field, cleaned);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: keyof typeof formData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Step 1 Submission: Check for duplicate phone or proceed to password selection
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      fullName: true,
      phoneNumber: true,
      email: true,
      age: true,
    });

    const newErrors: typeof errors = {
      fullName: validateField('fullName', formData.fullName),
      phoneNumber: validateField('phoneNumber', formData.phoneNumber),
      email: validateField('email', formData.email),
      age: validateField('age', formData.age),
    };

    setErrors(newErrors);

    const hasError = Object.values(newErrors).some((err) => Boolean(err));
    if (hasError) {
      if (newErrors.fullName) {
        document.getElementById('onboarding-fullname')?.focus();
      } else if (newErrors.phoneNumber) {
        document.getElementById('onboarding-phone')?.focus();
      } else if (newErrors.email) {
        document.getElementById('onboarding-email')?.focus();
      } else if (newErrors.age) {
        document.getElementById('onboarding-age')?.focus();
      }
      return;
    }

    const cleanPhone = toEnglishDigits(formData.phoneNumber.trim()).replace(/\s+|-/g, '');

    // Check if this phone number already exists among registered accounts
    const existing = existingAccounts.find((acc) => {
      const p = acc.phone ? toEnglishDigits(acc.phone).replace(/\s+|-/g, '') : '';
      const ep = acc.emailOrPhone ? toEnglishDigits(acc.emailOrPhone).replace(/\s+|-/g, '') : '';
      return p === cleanPhone || ep === cleanPhone;
    });

    if (existing) {
      // Phone is duplicate! Redirect to login page
      setMatchedAccount(existing);
      setLoginError('');
      setLoginPassword('');
      setStep('duplicate_phone_login');
      return;
    }

    // Also check backend for duplicate phone
    try {
      setIsSubmitting(true);
      const res = await apiClient.post<{ hasPassword?: boolean; accountId?: string }>('/auth/user-onboard', {
        fullName: formData.fullName.trim(),
        phoneNumber: cleanPhone,
        email: formData.email.trim(),
        age: toEnglishDigits(formData.age.trim()),
        password: '', // dry-run or will catch duplicate
      });

      // If backend accepted directly
      if (res.data) {
        // Successful direct onboarding
        onComplete({
          fullName: formData.fullName.trim(),
          phoneNumber: cleanPhone,
          email: formData.email.trim(),
          age: toEnglishDigits(formData.age.trim()),
        });
        return;
      }
    } catch (err: any) {
      // Check if backend flagged duplicate phone
      if (err.status === 409 || err.code === 'DUPLICATE_PHONE' || err.message?.includes('قبلاً')) {
        setLoginError('');
        setLoginPassword('');
        setStep('duplicate_phone_login');
        return;
      }
    } finally {
      setIsSubmitting(false);
    }

    // New User: Proceed to choose password screen!
    setPasswordError('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('choose_password');
  };

  // Step 2 Submission (New User: Choose Password)
  const handleChoosePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      setPasswordError('لطفاً رمز عبور خود را وارد فرمایید.');
      return;
    }
    if (cleanPass.length < 4) {
      setPasswordError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      setPasswordError('تکرار رمز عبور با رمز وارد شده مطابقت ندارد.');
      return;
    }

    setPasswordError('');
    setIsSubmitting(true);

    const cleanPhone = toEnglishDigits(formData.phoneNumber.trim()).replace(/\s+|-/g, '');
    const cleanAge = toEnglishDigits(formData.age.trim());

    onComplete({
      fullName: formData.fullName.trim(),
      phoneNumber: cleanPhone,
      email: formData.email.trim(),
      age: cleanAge,
      password: cleanPass,
    });
  };

  // Step 3 Submission (Existing User: Login with Phone & Password)
  const handleDuplicateLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = toEnglishDigits(formData.phoneNumber.trim()).replace(/\s+|-/g, '');
    const enteredPass = loginPassword.trim();

    if (!enteredPass) {
      setLoginError('لطفاً رمز عبور خود را وارد فرمایید.');
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    // Try API login first
    try {
      const response = await apiClient.post<{ account: any; token: string; refreshToken?: string }>('/auth/user-login', {
        phoneNumber: cleanPhone,
        password: enteredPass,
      });

      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        if (response.data.refreshToken) {
          apiClient.setRefreshToken(response.data.refreshToken);
        }
        setIsSubmitting(false);
        onComplete({
          fullName: response.data.account.name,
          phoneNumber: cleanPhone,
          email: response.data.account.email || '',
          age: response.data.account.age || '',
          password: enteredPass,
          isExistingAccountLogin: true,
          existingAccount: response.data.account,
        });
        return;
      }
    } catch (apiErr: any) {
      if (apiErr?.status === 401 || apiErr?.message?.includes('نادرست') || apiErr?.message?.includes('رمز')) {
        setIsSubmitting(false);
        setLoginError(apiErr.message || 'شماره تماس یا رمز عبور وارد شده نادرست است.');
        return;
      }
      console.warn('[Login] API error, checking offline policy:', apiErr);
    }

    // Offline check rule:
    // If account has no password set, offline login is allowed. If hasPassword is true, offline login is denied.
    if (matchedAccount) {
      if (!matchedAccount.hasPassword) {
        setIsSubmitting(false);
        onComplete({
          fullName: matchedAccount.name,
          phoneNumber: cleanPhone,
          email: matchedAccount.email || '',
          age: matchedAccount.age || '',
          password: '',
          isExistingAccountLogin: true,
          existingAccount: matchedAccount,
        });
        return;
      } else {
        setIsSubmitting(false);
        setLoginError('برای ورود به این حساب به اتصال اینترنت نیاز است.');
        return;
      }
    }

    setIsSubmitting(false);
    setLoginError('اخطار: شماره تماس یا رمز عبور وارد شده نادرست است.');
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-stone-950 text-stone-100 flex flex-col justify-between items-center px-4 py-6 sm:py-10 select-none relative overflow-x-hidden font-sans"
    >
      {/* Subtle spiritual background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header Container */}
      <header className="relative z-10 w-full max-w-md mx-auto text-center pt-2 sm:pt-4 mb-5 sm:mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-3 sm:mb-4 shadow-lg shadow-amber-500/10">
          {step === 'choose_password' ? (
            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
          ) : step === 'duplicate_phone_login' ? (
            <LogIn className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
          ) : (
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
          )}
        </div>
        <h1
          id="onboarding-page-title"
          className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2"
        >
          {step === 'choose_password'
            ? 'تعیین رمز عبور حساب کاربری'
            : step === 'duplicate_phone_login'
            ? 'ورود به حساب کاربری موجود'
            : 'تکمیل اطلاعات کاربر'}
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xs sm:max-w-sm mx-auto">
          {step === 'choose_password'
            ? 'لطفاً رمز عبور مورد نظر خود را جهت ورود به برنامه در دفعات بعدی وارد نمایید.'
            : step === 'duplicate_phone_login'
            ? 'این شماره قبلاً در سامانه ثبت شده است. جهت ورود به حساب کاربری خود، رمز عبور را وارد فرمایید.'
            : 'جهت ورود به برنامه، دسترسی به ادعیه، کتابخانه، برنامه‌های مزار و آزمون‌ها، لطفاً اطلاعات زیر را تکمیل فرمایید.'}
        </p>
      </header>

      {/* ======================================================== */}
      {/* 1. STEP 1: INITIAL INFORMATION FORM (نام، شماره، ایمیل، سن) */}
      {/* ======================================================== */}
      {step === 'initial_info' && (
        <main className="relative z-10 w-full max-w-md mx-auto animate-fadeIn">
          <form
            id="user-onboarding-form"
            onSubmit={handleInitialSubmit}
            noValidate
            className="bg-stone-900/90 border border-stone-800 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5"
          >
            {/* 1. نام و نام خانوادگی اصلی */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="onboarding-fullname"
                  className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>نام و نام خانوادگی اصلی</span>
                </label>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/25">
                  الزامی
                </span>
              </div>

              <div className="relative">
                <input
                  id="onboarding-fullname"
                  type="text"
                  name="fullName"
                  inputMode="text"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  placeholder="مثال: محمدجواد حسینی"
                  className={`w-full bg-stone-950/70 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3 sm:py-3.5 border transition-all outline-hidden ${
                    touched.fullName && errors.fullName
                      ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/20'
                      : 'border-stone-700/80 focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20'
                  }`}
                />
              </div>

              {touched.fullName && errors.fullName && (
                <p
                  id="onboarding-fullname-error"
                  className="text-rose-400 text-xs flex items-center gap-1.5 pt-0.5 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* 2. شماره تماس */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="onboarding-phone"
                  className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>شماره تماس</span>
                </label>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
                  الزامی
                </span>
              </div>

              <div className="relative">
                <input
                  id="onboarding-phone"
                  type="tel"
                  name="phoneNumber"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  onBlur={() => handleBlur('phoneNumber')}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className={`w-full bg-stone-950/70 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3 sm:py-3.5 border transition-all outline-hidden font-mono text-left ${
                    touched.phoneNumber && errors.phoneNumber
                      ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/20'
                      : 'border-stone-700/80 focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-400/20'
                  }`}
                />
              </div>

              {touched.phoneNumber && errors.phoneNumber && (
                <p
                  id="onboarding-phone-error"
                  className="text-rose-400 text-xs flex items-center gap-1.5 pt-0.5 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.phoneNumber}</span>
                </p>
              )}
            </div>

            {/* 3. ایمیل */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="onboarding-email"
                  className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5"
                >
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span>ایمیل</span>
                </label>
                <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-stone-800 text-stone-400 border border-stone-700">
                  اختیاری
                </span>
              </div>

              <div className="relative">
                <input
                  id="onboarding-email"
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="name@example.com"
                  className={`w-full bg-stone-950/70 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3 sm:py-3.5 border transition-all outline-hidden font-mono text-left ${
                    touched.email && errors.email
                      ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/20'
                      : 'border-stone-700/80 focus:border-sky-400/80 focus:ring-2 focus:ring-sky-400/20'
                  }`}
                />
              </div>

              {touched.email && errors.email && (
                <p
                  id="onboarding-email-error"
                  className="text-rose-400 text-xs flex items-center gap-1.5 pt-0.5 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* 4. سن */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="onboarding-age"
                  className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>سن</span>
                </label>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-400/15 text-purple-300 border border-purple-400/25">
                  الزامی
                </span>
              </div>

              <div className="relative">
                <input
                  id="onboarding-age"
                  type="text"
                  name="age"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={formData.age ? formatPersianNumber(formData.age) : ''}
                  onChange={(e) => handleChange('age', e.target.value)}
                  onBlur={() => handleBlur('age')}
                  placeholder="مثال: ۲۵"
                  className={`w-full bg-stone-950/70 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3 sm:py-3.5 border transition-all outline-hidden ${
                    touched.age && errors.age
                      ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/20'
                      : 'border-stone-700/80 focus:border-purple-400/80 focus:ring-2 focus:ring-purple-400/20'
                  }`}
                />
              </div>

              {touched.age && errors.age && (
                <p
                  id="onboarding-age-error"
                  className="text-rose-400 text-xs flex items-center gap-1.5 pt-0.5 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.age}</span>
                </p>
              )}
            </div>

            {/* Submit Button («ادامه») */}
            <div className="pt-2 sm:pt-3">
              <button
                id="onboarding-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-stone-950 font-black text-base sm:text-lg py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer select-none disabled:opacity-50"
              >
                <span>ادامه</span>
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Privacy & Safety Note */}
            <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-stone-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>اطلاعات شما با حفظ حریم خصوصی در سیستم ذخیره می‌گردد.</span>
            </div>
          </form>
        </main>
      )}

      {/* ======================================================== */}
      {/* 2. STEP 2: CHOOSE PASSWORD (انتخاب رمز عبور برای کاربر جدید) */}
      {/* ======================================================== */}
      {step === 'choose_password' && (
        <main className="relative z-10 w-full max-w-md mx-auto animate-fadeIn">
          <form
            id="choose-password-form"
            onSubmit={handleChoosePasswordSubmit}
            className="bg-stone-900/95 border border-purple-800/60 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5"
          >
            {/* Required user prompt instruction banner */}
            <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-center space-y-1.5">
              <div className="text-purple-300 font-black text-sm sm:text-base tracking-wide">
                &lt;لطفا برای حساب کاربری خود رمز عبور انتخاب کنید&gt;
              </div>
              <p className="text-[11px] text-purple-200/80 leading-relaxed">
                این رمز عبور جهت ورودهای بعدی شما به سیستم مورد استفاده قرار خواهد گرفت و در صورت نیاز در حساب کاربری قابل تغییر است.
              </p>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-stone-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span>رمز عبور جدید</span>
                </span>
                <span className="text-[10px] text-purple-300">حداقل ۴ کاراکتر</span>
              </label>

              <div className="relative">
                <input
                  id="onboarding-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="رمز عبور دلخواه خود را وارد نمایید"
                  className="w-full bg-stone-950/80 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3 sm:py-3.5 pr-4 pl-12 border border-purple-700/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-hidden font-mono text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-purple-300 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span>تکرار رمز عبور</span>
              </label>

              <div className="relative">
                <input
                  id="onboarding-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="رمز عبور را مجدداً تکرار فرمایید"
                  className="w-full bg-stone-950/80 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3 sm:py-3.5 pr-4 pl-12 border border-purple-700/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-hidden font-mono text-left"
                />
              </div>
            </div>

            {/* Submit & Back buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep('initial_info')}
                className="py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                بازگشت
              </button>

              <button
                id="onboarding-confirm-password-btn"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>تأیید و ورود به برنامه</span>
              </button>
            </div>
          </form>
        </main>
      )}

      {/* ======================================================== */}
      {/* 3. STEP 3: DUPLICATE PHONE LOGIN (ورود کاربر موجود با شماره و رمز) */}
      {/* ======================================================== */}
      {step === 'duplicate_phone_login' && (
        <main className="relative z-10 w-full max-w-md mx-auto animate-fadeIn">
          <form
            id="duplicate-login-form"
            onSubmit={handleDuplicateLoginSubmit}
            className="bg-stone-900/95 border border-amber-800/60 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5"
          >
            {/* Info notice */}
            <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 space-y-1">
              <div className="text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>شماره تماس قبلاً در سامانه ثبت شده است</span>
              </div>
              <div className="text-[11px] text-amber-200/80 leading-relaxed">
                حساب کاربری متعلق به شماره <strong className="text-amber-300 font-mono">{formData.phoneNumber}</strong> یافت شد. لطفاً جهت ورود رمز عبور خود را وارد فرمایید.
              </div>
            </div>

            {/* Login Error Alert */}
            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn shadow-lg">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-bold">{loginError}</span>
              </div>
            )}

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>رمز عبور حساب کاربری</span>
              </label>

              <div className="relative">
                <input
                  id="login-password-input"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="رمز عبور قبلی خود را وارد فرمایید"
                  className="w-full bg-stone-950/80 text-white placeholder-stone-500 text-sm sm:text-base rounded-2xl px-4 py-3.5 pr-4 pl-12 border border-amber-700/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-hidden font-mono text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-300 cursor-pointer p-1"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit & Switch Number Button */}
            <div className="pt-2 space-y-2.5">
              <button
                id="duplicate-login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-stone-950 font-black text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-5 h-5" />
                <span>ورود به حساب کاربری</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginError('');
                  setStep('initial_info');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs text-stone-400 hover:text-white transition-colors text-center cursor-pointer"
              >
                شماره اشتباه است؟ بازگشت و تغییر شماره تلفن
              </button>
            </div>
          </form>
        </main>
      )}

      {/* Footer with Discreet Admin Portal Shortcut */}
      <footer className="relative z-10 w-full max-w-md mx-auto text-center pt-4 sm:pt-6">
        {onAdminLoginClick && (
          <button
            type="button"
            id="onboarding-admin-entry-btn"
            onClick={onAdminLoginClick}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors py-2 px-3 rounded-xl hover:bg-stone-900/60 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>ورود مسئولین و مدیران سامانه</span>
          </button>
        )}
      </footer>
    </div>
  );
};
