export type ItemType = 'text' | 'multiple_choice' | 'descriptive' | 'poll';

export interface ExamSubQuestion {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'descriptive';
  options?: string[]; // For multiple_choice
  correctOptionIndex?: number; // 0-indexed
  points?: number;
  explanation?: string;
}

export interface ContentItem {
  id: string;
  type: ItemType;
  title: string;
  content: string; // The main text body or question prompt
  category: string;
  options?: string[]; // For multiple_choice and poll
  correctOptionIndex?: number; // 0-indexed
  points?: number; // Points for answering correctly
  explanation?: string; // Optional explanation or context
  estimatedReadMinutes?: number; // For reading texts
  subQuestions?: ExamSubQuestion[]; // Multiple questions in a single exam
  pollVotes?: Record<number, number>; // optionIndex -> votes count
  createdAt: string;
  isPublished: boolean;
  order: number;
}

export interface UserAnswer {
  itemId: string;
  itemType: ItemType;
  selectedOptionIndex?: number;
  textAnswer?: string;
  // Sub-question answers when item has multiple questions:
  subAnswers?: Record<
    string,
    {
      type: 'multiple_choice' | 'descriptive';
      selectedOptionIndex?: number;
      textAnswer?: string;
      isCorrect?: boolean;
      scoreAwarded?: number;
      maxScore?: number;
      correctOptionIndex?: number;
      explanation?: string;
    }
  >;
  isCorrect?: boolean;
  scoreAwarded?: number;
  maxScore?: number;
  correctOptionIndex?: number;
  explanation?: string;
  answeredAt: string;
  controllerComment?: string;
}

export interface UserSubmission {
  id: string;
  userId?: string;
  userName: string;
  userEmailOrPhone?: string;
  submittedAt: string;
  answers: Record<string, UserAnswer>; // itemId -> answer
  totalScore: number;
  maxScore: number;
  feedback?: string; // Controller evaluation & feedback
  controllerNoteAuthor?: string;
  controllerNoteDate?: string;
}

export interface AdminSettings {
  pinCode: string;
  systemTitle: string;
  allowRetake: boolean;
  showCorrectAnswerImmediately: boolean;
  requireNameBeforeParticipation: boolean;
  isMatamMode?: boolean;
}

export type ViewMode = 'user' | 'admin';
export type UserTabFilter = 'all' | 'texts' | 'quizzes' | 'completed';
export type AdminTab =
  | 'content'
  | 'users'
  | 'mazar'
  | 'banners'
  | 'prayers'
  | 'imamology'
  | 'library'
  | 'nava'
  | 'submissions'
  | 'create'
  | 'settings';

export interface InfalliblePerson {
  id: string; // '1' to '14'
  order: number; // 1 to 14
  name: string; // e.g. "حضرت محمد مصطفی (ص)"
  title: string; // e.g. "پیامبر اعظم، خاتم‌الانبیاء"
  epithet: string; // لقب اصلی
  kunya: string; // کنیه
  fatherName: string; // نام پدر
  motherName: string; // نام مادر
  birthDate: string; // تاریخ ولادت
  birthPlace: string; // محل ولادت
  martyrdomDate: string; // تاریخ شهادت / رحلت
  martyrdomPlace: string; // محل شهادت و مزار مطهر
  imamatPeriod?: string; // دوران رسالت یا امامت
  biography: string; // خلاصه جامع زندگانی و سیره
  virtues: string; // فضائل و مکارم اخلاقی
  hadith: {
    arabic: string;
    persian: string;
    source?: string;
  };
  specialZiyarahSnippet?: string; // سلام یا فراز زیارت
}

export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export interface MazarProgram {
  id: string;
  day: DayOfWeek;
  title: string;
  time?: string;
  description?: string;
  speakerOrMaddah?: string;
  location?: string;
  createdAt: string;
}

export interface BannerSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
}

export interface PrayerItem {
  id: string;
  title: string;
  subtitle?: string;
  arabicText: string;
  persianTranslation?: string;
  audioUrl?: string;
  reciter?: string;
  duration?: string;
  category?: string;
  createdAt: string;
  isPublished: boolean;
  order: number;
}

export type AccountRole = 'user' | 'controller';

export const ROLES = {
  USER: 'user' as AccountRole,
  CONTROLLER: 'controller' as AccountRole,
} as const;

export function isControllerRole(role?: string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === 'controller';
}

export function isUserRole(role?: string | null): boolean {
  return !isControllerRole(role);
}

export interface Account {
  id: string;
  name: string;
  nickname?: string; // نام مستعار
  role: AccountRole;
  emailOrPhone: string;
  phone?: string;
  email?: string;
  age?: number | string;
  avatarUrl?: string; // Profile photo chosen/uploaded by user
  nationalOrStudentId?: string;
  badgeTitle?: string; // e.g. 'کنترل‌گر ارشد' or 'دانشجو'
  avatarColor?: string;
  createdAt: string;
  personalNotes?: string; // Notes written in personal account
  pinCode?: string; // For controller accounts
  password?: string; // User account password
  plainPassword?: string; // Password visible to controller management
  hasPassword?: boolean;
}

export interface UserProfileData {
  fullName: string;
  phoneNumber: string;
  email: string;
  age: string;
  password?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  pdfUrl?: string; // Link or Base64 data URL
  pdfFileName?: string;
  textContent?: string; // Full text content of the book
  category?: string;
  pagesCount?: number;
  publishedYear?: string;
  isPublished?: boolean;
  createdAt: string;
}

export interface MadahiItem {
  id: string;
  title: string;
  maddah: string;
  category: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: string;
  description?: string;
  isPublished?: boolean;
  order?: number;
  createdAt: string;
}




