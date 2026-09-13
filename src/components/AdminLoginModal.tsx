import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';
import { authRepository } from '../repositories/authRepository';
import { wsClient } from '../services/websocket/wsClient';
import { apiClient } from '../services/api/apiClient';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
}: AdminLoginModalProps) {
  const [enteredPin, setEnteredPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setErrorMsg('');
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (pinToTest?: string) => {
    const pin = pinToTest !== undefined ? pinToTest : enteredPin;
    if (!pin.trim()) {
      setIsShaking(true);
      setErrorMsg('لطفاً رمز عبور را وارد نمایید.');
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    try {
      const isRemoteValid = await authRepository.verifyControllerPin(pin);
      if (isRemoteValid) {
        const token = apiClient.getToken();
        if (token) {
          wsClient.authenticate(token);
        }
        setErrorMsg('');
        onSuccess();
        return;
      }
    } catch {
      // Ignore network errors and continue to local check
    }

    if (pin.trim() === correctPin.trim()) {
      setErrorMsg('');
      onSuccess();
    } else {
      setIsShaking(true);
      setErrorMsg('رمز عبور وارد شده نادرست است. لطفاً مجدداً بررسی فرمایید.');
      setAttempts((prev) => prev + 1);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (enteredPin.length < 12) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div
      id="admin-login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4"
    >
      <div
        id="admin-login-dialog"
        className={`bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 transition-all ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                ورود به بخش اختصاصی کنترل‌گر
              </h2>
              <p className="text-xs text-stone-500">
                این بخش نیازمند تایید هویت و رمز عبور است
              </p>
            </div>
          </div>
          <button
            id="close-login-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor="admin-pin-input"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              رمز عبور کنترل‌گر:
            </label>
            <div className="relative">
              <input
                id="admin-pin-input"
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="رمز عبور محرمانه را وارد فرمایید..."
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-300 rounded-xl text-center text-base sm:text-lg font-mono font-bold tracking-wider focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                title={showPin ? 'مخفی کردن رمز' : 'نمایش رمز'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div
              id="admin-login-error-msg"
              className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Security notice */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-2.5 text-xs text-stone-600">
            <Shield className="w-4 h-4 shrink-0 text-amber-600" />
            <p className="leading-relaxed">
              دسترسی به بخش کنترل‌گر ویژه مدیران و ارزیابان است. ورود بدون رمز معتبر امکان‌پذیر نیست.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              id="cancel-admin-login-btn"
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              انصراف و بازگشت به بخش کاربر
            </button>
            <button
              id="confirm-admin-login-btn"
              type="submit"
              className="flex-1 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              تایید و ورود به پنل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
