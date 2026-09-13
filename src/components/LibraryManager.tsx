import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Upload,
  Download,
  Search,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Layers,
  AlertCircle,
  FileUp,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { BookItem } from '../types';
import { formatPersianNumber } from '../utils/formatters';

interface LibraryManagerProps {
  books: BookItem[];
  onSaveBook: (book: BookItem) => void;
  onDeleteBook: (id: string) => void;
}

const DEFAULT_CATEGORIES = [
  'دفاع مقدس و سیره شهدا',
  'خاطرات و یادنامه‌ها',
  'مزار شهدای گمنام گاوازنگ',
  'اخلاق و معارف اسلامی',
  'ادعیه و زیارات',
  'عمومی',
];

export const LibraryManager: React.FC<LibraryManagerProps> = ({
  books,
  onSaveBook,
  onDeleteBook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [previewBook, setPreviewBook] = useState<BookItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [textContent, setTextContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState('');

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Categories list
  const existingCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...books.map((b) => b.category || 'عمومی')])
  );

  // Filtered books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || (b.category || 'عمومی') === filterCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreateModal = () => {
    setEditingBook(null);
    setTitle('');
    setAuthor('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setDescription('');
    setTextContent('');
    setCoverUrl('');
    setPdfUrl('');
    setPdfFileName('');
    setIsPublished(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: BookItem) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setCategory(book.category || DEFAULT_CATEGORIES[0]);
    setDescription(book.description || '');
    setTextContent(book.textContent || '');
    setCoverUrl(book.coverUrl || '');
    setPdfUrl(book.pdfUrl || '');
    setPdfFileName(book.pdfFileName || '');
    setIsPublished(book.isPublished !== false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setFormError('لطفاً یک فایل معتبر با پسوند PDF انتخاب نمایید.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setFormError('حجم فایل PDF نباید بیشتر از ۳۰ مگابایت باشد.');
      return;
    }

    setFormError('');
    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPdfUrl(reader.result as string);
    };
    reader.onerror = () => {
      setFormError('خطا در خواندن فایل PDF');
    };
    reader.readAsDataURL(file);
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('لطفاً یک فایل تصویری معتبر انتخاب نمایید.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = () => {
      setCoverUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('عنوان کتاب الزامی است.');
      return;
    }

    const savedBook: BookItem = {
      id: editingBook ? editingBook.id : `book-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || 'گردآورنده مزار',
      category: category.trim() || 'عمومی',
      description: description.trim() || '',
      textContent: textContent.trim(),
      coverUrl:
        coverUrl.trim() ||
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
      pdfUrl: pdfUrl.trim() || undefined,
      pdfFileName: pdfFileName.trim() || undefined,
      isPublished,
      createdAt: editingBook ? editingBook.createdAt : new Date().toISOString(),
    };

    onSaveBook(savedBook);
    setIsModalOpen(false);
  };

  // Metrics
  const totalBooks = books.length;
  const publishedBooks = books.filter((b) => b.isPublished !== false).length;
  const pdfBooks = books.filter((b) => Boolean(b.pdfUrl)).length;

  return (
    <div className="space-y-6" id="controller-library-manager">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>کل عناوین کتابخانه</span>
            <BookOpen className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {formatPersianNumber(totalBooks)} <span className="text-xs font-normal text-stone-500">عنوان</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">کتب و یادنامه‌های ثبت‌شده در پایگاه داده</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>کتب دارای فایل PDF</span>
            <FileText className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatPersianNumber(pdfBooks)} <span className="text-xs font-normal text-stone-500">فایل دیجیتال</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">قابل دانلود مستقیم برای زائران</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>وضعیت انتشار</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatPersianNumber(publishedBooks)} <span className="text-xs font-normal text-stone-500">منتشر شده</span>
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1">
            {totalBooks > 0 ? formatPersianNumber(Math.round((publishedBooks / totalBooks) * 100)) : 100}٪ در معرض نمایش عمومی
          </p>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی کتاب (عنوان، نویسنده یا موضوع)..."
            className="w-full pr-10 pl-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-stone-900 focus:bg-white transition-colors"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              filterCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            همه
          </button>
          {existingCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                filterCategory === c
                  ? 'bg-purple-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Add Book Button */}
        <button
          type="button"
          id="controller-add-book-btn"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن کتاب یا فایل PDF جدید</span>
        </button>
      </div>

      {/* Books Table / Cards List */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <h4 className="text-sm font-bold text-stone-800">کتابی یافت نشد</h4>
          <p className="text-xs text-stone-500">می‌توانید با کلیک بر روی دکمه بالا کتاب جدیدی ثبت فرمایید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              id={`controller-book-card-${book.id}`}
              className="bg-white rounded-2xl border border-stone-200 hover:border-purple-300 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 flex items-start gap-3.5">
                <img
                  src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80'}
                  alt={book.title}
                  className="w-16 h-22 object-cover rounded-xl border border-stone-200 shadow-2xs shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                      {book.category || 'عمومی'}
                    </span>
                    {book.pdfUrl && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        <span>PDF</span>
                      </span>
                    )}
                    {book.isPublished === false && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        پیش‌نویس
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-stone-900 line-clamp-1">{book.title}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">نویسنده: {book.author}</p>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-1.5 leading-relaxed">
                    {book.description || 'بدون توضیحات'}
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewBook(book)}
                    title="پیش‌نمایش کتاب"
                    className="p-1.5 rounded-lg bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Published */}
                  <button
                    type="button"
                    onClick={() => onSaveBook({ ...book, isPublished: book.isPublished === false })}
                    title={book.isPublished === false ? 'انتشار برای زائران' : 'تبدیل به پیش‌نویس'}
                    className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      book.isPublished === false
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {book.isPublished === false ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Download PDF if exists */}
                  {book.pdfUrl && (
                    <a
                      href={book.pdfUrl}
                      download={book.pdfFileName || `${book.title}.pdf`}
                      title="دانلود فایل PDF"
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-stone-200 text-xs transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Edit Button */}
                  <button
                    type="button"
                    id={`controller-edit-book-btn-${book.id}`}
                    onClick={() => handleOpenEditModal(book)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-200 text-stone-800 border border-stone-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3 text-purple-600" />
                    <span>ویرایش</span>
                  </button>

                  {/* Delete Button */}
                  {deleteConfirmId === book.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteBook(book.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                      >
                        حذف قطعی
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded-lg bg-stone-200 text-stone-700 text-xs cursor-pointer"
                      >
                        لغو
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id={`controller-delete-book-btn-${book.id}`}
                      onClick={() => setDeleteConfirmId(book.id)}
                      title="حذف کتاب"
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {isModalOpen && (
        <div
          id="book-edit-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          style={{ direction: 'rtl' }}
        >
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {editingBook ? 'ویرایش مشخصات کتاب' : 'افزودن کتاب یا اثر جدید به کتابخانه'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    اتصال مستقیم به پایگاه داده آنلاین سامانه مزار
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-200 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    عنوان اثر / کتاب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: سلام بر ابراهیم"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    نویسنده / گردآورنده
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="مثال: گروه فرهنگی شهید هادی"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  دسته‌بندی موضوعی
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="انتخاب یا وارد کردن دسته‌بندی جدید"
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-purple-600"
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) setCategory(e.target.value);
                    }}
                    className="px-2.5 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-700"
                  >
                    <option value="">دسته‌های آماده...</option>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  توضیحات و خلاصه اثر
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="خلاصه‌ای از داستان، زندگینامه یا موضوع کتاب..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-purple-600"
                />
              </div>

              {/* PDF File Upload or URL */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>فایل دیجیتال PDF کتاب</span>
                  </span>
                  {pdfFileName && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      فایل انتخاب شد: {pdfFileName}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="آدرس اینترنتی فایل PDF یا انتخاب فایل از سیستم..."
                    className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-purple-600 font-mono"
                  />
                  <input
                    type="file"
                    ref={pdfInputRef}
                    accept="application/pdf"
                    onChange={handlePdfFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>انتخاب فایل PDF</span>
                  </button>
                </div>
              </div>

              {/* Cover Image Upload or URL */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>تصویر جلد کتاب</span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="آدرس اینترنتی تصویر جلد یا انتخاب از دستگاه..."
                    className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-purple-600 font-mono"
                  />
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*"
                    onChange={handleCoverImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>انتخاب عکس</span>
                  </button>
                </div>
              </div>

              {/* Text content / reading chapters */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  متن کامل کتاب (جهت مطالعه آنلاین بدون نیاز به PDF)
                </label>
                <textarea
                  rows={4}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="متن فصل‌ها، خاطرات یا متن کامل اثر..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:border-purple-600 font-serif leading-relaxed"
                />
              </div>

              {/* Published Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="book-is-published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="book-is-published" className="text-xs font-bold text-stone-700 cursor-pointer">
                  انتشار عمومی در کتابخانه دیجیتال زائران
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  id="submit-book-btn"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingBook ? 'ذخیره تغییرات' : 'ثبت در کتابخانه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewBook && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          style={{ direction: 'rtl' }}
        >
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-900">{previewBook.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-600 whitespace-pre-line leading-relaxed font-serif">
              {previewBook.textContent || previewBook.description || 'متنی برای این کتاب ثبت نشده است.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
