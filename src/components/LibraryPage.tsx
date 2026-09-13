import React, { useState } from 'react';
import {
  BookOpen,
  ArrowRight,
  Search,
  FileText,
  Download,
  X,
  User,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { BookItem, Account } from '../types';
import { formatPersianNumber } from '../utils/formatters';

interface LibraryPageProps {
  books: BookItem[];
  activeAccount: Account;
  onBack: () => void;
  onSaveBook?: (book: BookItem) => void;
  onDeleteBook?: (id: string) => void;
  isDarkMode?: boolean;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  books,
  onBack,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [readingBook, setReadingBook] = useState<BookItem | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);

  // Extract categories
  const categories = ['همه', ...Array.from(new Set(books.map((b) => b.category || 'عمومی')))];

  // Filter books (only published ones for user view)
  const publishedBooks = books.filter((b) => b.isPublished !== false);
  const filteredBooks = publishedBooks.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'همه' || (book.category || 'عمومی') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-20 animate-fadeIn" id="library-page-container">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-6 sm:p-8 shadow-xl border border-purple-700/50">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="library-back-button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer border border-white/15"
              title="بازگشت به صفحه اصلی"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/25 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white">
                  کتابخانه دیجیتال شهداء
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/30">
                  {formatPersianNumber(publishedBooks.length)} عنوان کتاب
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200/90 mt-1 leading-relaxed">
                مجموعه کتب دفاع مقدس، یادنامه‌ها، خاطرات و متون معرفتی مزار شهدای گمنام گاوازنگ
              </p>
            </div>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-300" />
            <input
              type="text"
              id="library-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجوی کتاب بر اساس نام، نویسنده یا موضوع..."
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-black/30 border border-purple-400/30 text-white placeholder:text-purple-300/60 text-xs sm:text-sm focus:outline-hidden focus:border-purple-300 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-purple-950 shadow-md'
                    : 'bg-white/10 text-purple-200 hover:bg-white/15'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-800">کتابی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-stone-500">عبارت دیگری را جستجو کنید یا دسته‌بندی دیگری انتخاب نمایید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              id={`book-card-${book.id}`}
              className="bg-white rounded-3xl border border-purple-100/80 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              {/* Card Cover & Header */}
              <div className="relative h-44 w-full bg-stone-900 overflow-hidden">
                <img
                  src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80'}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

                {/* Badge Category */}
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-200 border border-purple-500/40 backdrop-blur-xs">
                    {book.category || 'دفاع مقدس'}
                  </span>
                </div>

                {/* PDF indicator */}
                {book.pdfUrl && (
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600/90 text-white flex items-center gap-1 shadow-xs">
                      <FileText className="w-3 h-3" />
                      <span>PDF</span>
                    </span>
                  </div>
                )}

                {/* Book Title on bottom of cover */}
                <div className="absolute bottom-3 right-3 left-3">
                  <h3 className="text-base font-black text-white line-clamp-1 drop-shadow-xs">
                    {book.title}
                  </h3>
                  <div className="text-xs text-stone-300 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">{book.author}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                  {book.description}
                </p>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  {/* Read / Open Book Button */}
                  <button
                    type="button"
                    id={`open-book-btn-${book.id}`}
                    onClick={() => setReadingBook(book)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors cursor-pointer border border-purple-200 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>مطالعه کتاب</span>
                  </button>

                  {/* PDF Direct link if available */}
                  {book.pdfUrl && (
                    <a
                      href={book.pdfUrl}
                      download={book.pdfFileName || `${book.title}.pdf`}
                      title="دانلود مستقیم فایل PDF"
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reader Modal (Full text reader) */}
      {readingBook && (
        <div
          id="book-reader-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          style={{ direction: 'rtl' }}
        >
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
            {/* Reader Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-stone-900 line-clamp-1">
                    {readingBook.title}
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    نویسنده: {readingBook.author} | دسته‌بندی: {readingBook.category || 'عمومی'}
                  </p>
                </div>
              </div>

              {/* Reader Controls */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-white border border-stone-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.min(f + 2, 28))}
                    title="افزایش اندازه قلم"
                    className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono px-1 font-bold text-stone-700">
                    {fontSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.max(f - 2, 12))}
                    title="کاهش اندازه قلم"
                    className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>

                {readingBook.pdfUrl && (
                  <a
                    href={readingBook.pdfUrl}
                    download={readingBook.pdfFileName || `${readingBook.title}.pdf`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">دانلود فایل PDF</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setReadingBook(null)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-amber-50/20 leading-relaxed select-text">
              {readingBook.textContent ? (
                <div
                  className="max-w-3xl mx-auto whitespace-pre-line text-stone-800 font-serif"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 2 }}
                >
                  {readingBook.textContent}
                </div>
              ) : readingBook.pdfUrl ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800">
                    این اثر به صورت فایل PDF بارگذاری شده است
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md">
                    جهت مطالعه کتاب یا یادنامه می‌توانید فایل PDF آن را مستقیماً دریافت فرمایید یا در مرورگر مشاهده نمایید.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={readingBook.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 text-white font-bold text-xs sm:text-sm hover:bg-purple-700 transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>مشاهده در تب جدید</span>
                    </a>
                    <a
                      href={readingBook.pdfUrl}
                      download={readingBook.pdfFileName || `${readingBook.title}.pdf`}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 text-white font-bold text-xs sm:text-sm hover:bg-stone-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود فایل PDF</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-stone-500">
                  متن این کتاب هنوز وارد سامانه نشده است.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
