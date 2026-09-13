export function formatPersianNumber(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persianDigits[Number(d)]);
}

export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function isValidIranianPhone(phone: string): boolean {
  const normalized = toEnglishDigits(phone.trim()).replace(/\s+|-/g, '');
  // Matches 09xxxxxxxxx or +989xxxxxxxxx or 9xxxxxxxxx
  return /^(?:(?:\+?98)|0)?9\d{9}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function formatPersianDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTimeAgo(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${formatPersianNumber(days)} روز پیش`;
    if (hours > 0) return `${formatPersianNumber(hours)} ساعت پیش`;
    if (minutes > 0) return `${formatPersianNumber(minutes)} دقیقه پیش`;
    return 'هم‌اکنون';
  } catch {
    return 'به‌تازگی';
  }
}
