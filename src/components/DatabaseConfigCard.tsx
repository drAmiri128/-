import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Server,
  Key,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

interface DatabaseConfigProps {
  onSuccess?: () => void;
}

export const DatabaseConfigCard: React.FC<DatabaseConfigProps> = ({ onSuccess }) => {
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<{
    databaseUrl: string;
    rawUrl?: string;
    databaseType: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCurrent, setFetchingCurrent] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load current database info on mount
  useEffect(() => {
    fetchCurrentConfig();
  }, []);

  const fetchCurrentConfig = async () => {
    setFetchingCurrent(true);
    try {
      const res = await fetch('/api/v1/settings/database-config');
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentInfo(data.data);
        if (data.data.rawUrl && !databaseUrl) {
          setDatabaseUrl(data.data.rawUrl);
        } else if (!databaseUrl && data.data.databaseUrl) {
          setDatabaseUrl(data.data.databaseUrl);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch DB config:', err);
    } finally {
      setFetchingCurrent(false);
    }
  };

  const handleSaveAndTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!databaseUrl.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'لطفاً مقدار آدرس پایگاه داده (DATABASE_URL) را در کادر وارد نمایید.',
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/v1/settings/database-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseUrl: databaseUrl.trim(),
          authToken: authToken.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'خطا در برقراری ارتباط با پایگاه داده');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || 'اتصال پایگاه داده با موفقیت تست و ذخیره شد.',
      });

      // Refresh current info
      await fetchCurrentConfig();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'خطا در ذخیره و تست پایگاه داده',
      });
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (type: 'sqlite' | 'postgres' | 'turso') => {
    if (type === 'sqlite') {
      setDatabaseUrl('file:data/sqm_database.db');
      setAuthToken('');
    } else if (type === 'postgres') {
      setDatabaseUrl('postgresql://username:password@localhost:5432/sqm_database');
      setAuthToken('');
    } else if (type === 'turso') {
      setDatabaseUrl('libsql://your-database.turso.io');
      setAuthToken('');
    }
    setStatusMessage({
      type: 'info',
      text: 'الگوی آدرس در کادر جایگذاری شد. اطلاعات کاربری و هاست خود را در آن ویرایش و ذخیره کنید.',
    });
  };

  return (
    <div
      id="database-config-card"
      className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-5 text-right"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>تنظیم و تغییر آدرس پایگاه داده (DATABASE_URL)</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                Backend DB Engine
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              آدرس پایگاه داده ابری یا محلی موردنظر خود را در کادر زیر وارد و تست کنید.
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2">
          {fetchingCurrent ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              در حال بررسی وضعیت...
            </span>
          ) : currentInfo ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                نوع فعال: {currentInfo.databaseType === 'postgres' ? 'PostgreSQL' : 'SQLite / LibSQL'}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Current Active Info Box */}
      {currentInfo && (
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/70 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-medium">آدرس دیتابیس متصل فعلی:</span>
            <button
              type="button"
              onClick={fetchCurrentConfig}
              className="text-stone-500 hover:text-stone-800 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>بروزرسانی وضعیت</span>
            </button>
          </div>
          <div className="font-mono text-stone-700 bg-white px-3 py-1.5 rounded-lg border border-stone-200 text-left dir-ltr break-all select-all">
            {currentInfo.databaseUrl || 'file:data/sqm_database.db'}
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>قالب‌های آماده جهت جایگذاری سریع:</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreset('sqlite')}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            SQLite محلی (پیش‌فرض سیستم)
          </button>
          <button
            type="button"
            onClick={() => setPreset('postgres')}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            قالب PostgreSQL (Supabase / Neon / RDS)
          </button>
          <button
            type="button"
            onClick={() => setPreset('turso')}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            قالب Turso / LibSQL
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSaveAndTest} className="space-y-4">
        {/* DATABASE_URL Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="database-url-input"
            className="text-xs font-bold text-stone-800 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-stone-500" />
              <span>کادر ورود آدرس پایگاه داده (DATABASE_URL):</span>
              <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] text-stone-500 font-normal">
              پشتیبانی از postgresql:// و libsql:// و file:
            </span>
          </label>
          <div className="relative">
            <input
              id="database-url-input"
              type="text"
              value={databaseUrl}
              onChange={(e) => setDatabaseUrl(e.target.value)}
              placeholder="مثال: postgresql://postgres:password@ep-sample.eu-central-1.pooler.supabase.com:5432/postgres"
              dir="ltr"
              className="w-full font-mono text-sm px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400 placeholder:text-xs text-left"
              required
            />
          </div>
        </div>

        {/* DATABASE_AUTH_TOKEN Input (Optional) */}
        <div className="space-y-1.5">
          <label
            htmlFor="database-token-input"
            className="text-xs font-bold text-stone-800 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Key className="w-4 h-4 text-stone-500" />
              <span>توکن دسترسی / رمز امنیتی (DATABASE_AUTH_TOKEN) - اختیاری:</span>
            </span>
            <span className="text-[11px] text-stone-500 font-normal">
              فقط در صورت استفاده از دیتابیس‌های نیازمند توکن (مثل Turso)
            </span>
          </label>
          <div className="relative">
            <input
              id="database-token-input"
              type={showToken ? 'text' : 'password'}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="در صورت نیاز توکن را در اینجا قرار دهید..."
              dir="ltr"
              className="w-full font-mono text-sm px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-left placeholder:text-stone-400 placeholder:text-xs pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              title={showToken ? 'مخفی‌سازی' : 'نمایش'}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Feedback alert message */}
        {statusMessage && (
          <div
            id="database-status-alert"
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed font-medium">{statusMessage.text}</div>
          </div>
        )}

        {/* Submit & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-stone-500">
            با ذخیره، سرور بلافاصله وضعیت اتصال را بررسی کرده و در صورت سلامت اعمال می‌کند.
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <button
              type="submit"
              id="save-database-url-btn"
              disabled={loading || !databaseUrl.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال بررسی و اتصال...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تست و ذخیره DATABASE_URL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
