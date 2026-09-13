import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Globe,
  Shield,
  Trash2,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Laptop,
} from 'lucide-react';
import { authRepository } from '../repositories/authRepository';
import { formatPersianDate } from '../utils/formatters';

interface SessionItem {
  id: string;
  deviceLabel?: string;
  ipAddress?: string;
  createdAt: string;
  lastUsedAt?: string;
  isCurrent?: boolean;
}

interface ConnectedDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCurrentSessionRevoked?: () => void;
}

export const ConnectedDevicesModal: React.FC<ConnectedDevicesModalProps> = ({
  isOpen,
  onClose,
  onCurrentSessionRevoked,
}) => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await authRepository.getSessions();
      setSessions(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در دریافت فهرست دستگاه‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRevoke = async (session: SessionItem) => {
    setRevokingId(session.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await authRepository.revokeSession(session.id);
      if (session.isCurrent) {
        setSuccessMsg('نشست فعلی پایان یافت. در حال خروج از حساب...');
        setTimeout(() => {
          onClose();
          onCurrentSessionRevoked?.();
        }, 1200);
      } else {
        setSuccessMsg('دستگاه مورد نظر با موفقیت خارج شد.');
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در قطع اتصال دستگاه');
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('mobile') || l.includes('phone') || l.includes('android') || l.includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-emerald-600" />;
    }
    if (l.includes('mac') || l.includes('laptop')) {
      return <Laptop className="w-5 h-5 text-indigo-600" />;
    }
    return <Monitor className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        id="connected-devices-dialog"
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-stone-200 text-right space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">دستگاه‌های متصل و نشست‌های فعال</h3>
              <p className="text-xs text-stone-500">مدیریت دستگاه‌هایی که به این حساب وارد شده‌اند</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sessions list */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {loading ? (
            <div className="py-12 text-center text-stone-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">در حال بارگذاری نشست‌های فعال...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center text-stone-500 text-xs">
              هیچ نشست فعالی در سرور یافت نشد.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  session.isCurrent
                    ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-2xs shrink-0">
                    {getDeviceIcon(session.deviceLabel)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {session.deviceLabel || 'مرورگر وب'}
                      </span>
                      {session.isCurrent && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          این دستگاه (فعلی)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {session.ipAddress && (
                        <span className="flex items-center gap-1 font-mono">
                          <Globe className="w-3 h-3 text-stone-400" />
                          <span>{session.ipAddress}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>ورود: {formatPersianDate(session.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    disabled={revokingId === session.id}
                    onClick={() => handleRevoke(session)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 hover:border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {revokingId === session.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{session.isCurrent ? 'خروج از این دستگاه' : 'قطع اتصال'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={fetchSessions}
            disabled={loading}
            className="text-xs text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی لیست</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
