# 📚 مستندات جامع معماری و APIهای Backend (مرحله دوم — STAGE 2)
## سامانه تعاملی مزار شهدای گمنام و دانشنامه امام‌شناسی

---

### ۱. معماری و تکنولوژی‌های استفاده‌شده (Technologies)

این لایه به‌صورت کاملاً ماژولار و تفکیک‌شده (Separation of Concerns) طراحی شده است:

* **Runtime:** Node.js (v22+) با TypeScript
* **HTTP Framework:** Express.js (v4.21)
* **Database Driver & Pooling:** 
  * پشتیبانی کامل از **PostgreSQL (Supabase Pooler)** با پکیج رسمی `pg` (Pool)
  * پشتیبانی از **LibSQL / SQLite** محلی با `@libsql/client` جهت انعطاف‌پذیری و کارکرد آفلاین
* **احراز هویت و امنیت (Security & Cryptography):**
  * `bcryptjs` جهت رمزنگاری یک‌طرفه (One-way Hashing) پسورد کنترل‌گر با نمک‌گذاری امن (Salt rounds = 10)
  * `jsonwebtoken (JWT)` جهت تولید و اعتبارسنجی توکن‌های احراز هویت کنترل‌گر و کاربران
  * Brute-Force Rate Limiting روی مسیر لاگین کنترل‌گر (حداکثر ۵ تلاش ناموفق)
* **مستندسازی استاندارد:**
  * OpenAPI 3.0.3 و Swagger UI روی آدرس `/api/docs`

---

### ۲. ساختار دایرکتوری Backend

```
server/
├── db/
│   ├── database.ts        # مدیریت ارتباط هوشمند با PostgreSQL (Supabase) و LibSQL/SQLite
│   ├── migrations.ts      # کدهای ساخت جداول و ایندکس‌ها (Schema DDL)
│   └── seed.ts            # اطلاعات اولیه، محتواها، ادعیه و حساب اولیه کنترل‌گر
├── middleware/
│   └── auth.ts            # احراز هویت JWT و تفکیک دسترسی Role-Based (RBAC)
├── routes/
│   ├── auth.ts            # ورود کنترل‌گر و ثبت‌نام کاربران
│   ├── users.ts           # دریافت پروفایل کاربر
│   ├── admin.ts           # تمام مسیرهای مدیریتی محافظت‌شده ویژه کنترل‌گر (/api/v1/admin/*)
│   ├── content.ts         # آزمون‌ها، متون آموزشی و نظرسنجی‌ها
│   ├── submissions.ts     # دریافت پاسخنامه‌ها و ثبت کارنامه
│   ├── settings.ts        # تنظیمات سیستم و وضعیت حالت ماتم
│   ├── mazar.ts           # برنامه‌های هفتگی مزار مطهر
│   ├── banners.ts         # اسلایدر بنرهای صفحه اصلی
│   ├── prayers.ts         # ادعیه و زیارات
│   └── imamology.ts       # دانشنامه جامع ۱۴ معصوم (ع)
├── docs/
│   └── swagger.ts         # مشخصات OpenAPI 3.0 و Swagger UI
├── tests/
│   └── test_api.ts        # اسکریپت تست خودکار یکپارچه (Integration Tests)
└── README.md              # این مستند
```

---

### ۳. تنظیم متغیرهای محیطی (.env)

فایل نمونه `.env.example` در ریشه پروژه قرار دارد:

```env
PORT=3000
NODE_ENV=development

# کلید سری برای امضای توکن‌های JWT
JWT_SECRET="your_jwt_secret_key_here"

# آدرس اتصال پایگاه داده PostgreSQL (Supabase)
DATABASE_URL="postgresql://username:password@host:5432/dbname"

# در صورت استفاده از دیتابیس ابری Turso/LibSQL
DATABASE_AUTH_TOKEN=""
```

---

### ۴. ساخت پایگاه داده، Migration و Seed

پایگاه داده به‌صورت کاملاً خودکار هنگام اجرای سرور مهاجرت‌ها و Seedها را اعمال می‌کند:

1. **اجرای Migrationها (`runMigrations`):**
   * ساخت جداول `accounts`, `settings`, `content_items`, `submissions`, `mazar_programs`, `banner_slides`, `prayers`, `infallibles`
   * ایجاد ایندکس‌های بهینه‌ساز عملکرد
2. **اجرای Seed اولیه (`seedInitialData`):**
   * ساخت حساب کاربری کنترل‌گر اولیه با نام `کنترل‌گر سامانه مزار` و نقش `controller`
   * رمز عبور کنترل‌گر (`Mohammad128`) به‌صورت **Hash شده با Bcrypt** ذخیره می‌شود و رمز خام هرگز ذخیره یا منتشر نمی‌گردد.
   * درج متون، آزمون‌ها و ادعیه نمونه

---

### ۵. لیست کامل REST APIها

#### الف) احراز هویت (Authentication & Users)
| Method | Endpoint | دسترسی | توضیحات |
|---|---|---|---|
| `POST` | `/api/v1/auth/controller-login` | عمومی (Rate-limited) | ورود با رمز کنترل‌گر و دریافت توکن JWT |
| `POST` | `/api/v1/auth/user-onboard` | عمومی | ثبت‌نام زائر/کاربر و صدور توکن |
| `GET` | `/api/v1/users/profile` | کاربر / کنترل‌گر | دریافت مشخصات پروفایل با توکن Bearer |
| `GET` | `/api/v1/auth/me` | کاربر / کنترل‌گر | دریافت اطلاعات حساب جاری |

#### ب) محتوا و آزمون‌ها (Content & Exams)
| Method | Endpoint | دسترسی | توضیحات |
|---|---|---|---|
| `GET` | `/api/v1/content` | عمومی | دریافت محتواها و آزمون‌های منتشرشده |
| `POST` | `/api/v1/content/:id/vote` | عمومی | ثبت رای در نظرسنجی |
| `GET` | `/api/v1/admin/content` | ویژه کنترل‌گر | دریافت تمامی محتواها شامل پیش‌نویس‌ها |
| `POST` | `/api/v1/admin/content` | ویژه کنترل‌گر | افزودن محتوا یا آزمون جدید |
| `PUT` | `/api/v1/admin/content/:id` | ویژه کنترل‌گر | ویرایش کامل محتوا |
| `DELETE` | `/api/v1/admin/content/:id` | ویژه کنترل‌گر | حذف محتوا |

#### ج) آزمون‌ها و پاسخنامه‌ها (Submissions)
| Method | Endpoint | دسترسی | توضیحات |
|---|---|---|---|
| `POST` | `/api/v1/submissions` | کاربر (با یا بدون توکن) | ارسال پاسخنامه و ثبت نمره سیستمی |
| `GET` | `/api/v1/submissions/my` | کاربر | دریافت کارنامه و آزمون‌های شرکت‌کرده کاربر |
| `GET` | `/api/v1/admin/submissions` | ویژه کنترل‌گر | مشاهده پاسخ‌های تمام کاربران سامانه |
| `PUT` | `/api/v1/admin/submissions/:id/evaluate` | ویژه کنترل‌گر | ثبت نظر ارزیابی و تصحیح نمره تشریحی |
| `GET` | `/api/v1/submissions/leaderboard` | عمومی | جدول رده‌بندی امتیازات زائران |

#### د) تنظیمات سیستم (Settings)
| Method | Endpoint | دسترسی | توضیحات |
|---|---|---|---|
| `GET` | `/api/v1/settings` | عمومی | دریافت تنظیمات عمومی سامانه |
| `PUT` | `/api/v1/admin/settings` | ویژه کنترل‌گر | ویرایش تنظیمات و تغییر رمز کنترل‌گر |
| `PATCH` | `/api/v1/admin/settings/matam-mode` | ویژه کنترل‌گر | سوییچ سریع حالت ماتم و ایام سوگواری |

#### هـ) برنامه‌های مزار، بنرها، ادعیه و امام‌شناسی
| Method | Endpoint | دسترسی | توضیحات |
|---|---|---|---|
| `GET` | `/api/v1/mazar-programs` | عمومی | برنامه‌های هفتگی مزار مطهر |
| `PUT` | `/api/v1/admin/mazar-programs` | ویژه کنترل‌گر | ذخیره و ویرایش برنامه‌ها |
| `GET` | `/api/v1/banners` | عمومی | اسلایدر بنرهای صفحه اصلی |
| `PUT` | `/api/v1/admin/banners` | ویژه کنترل‌گر | به‌روزرسانی بنرها |
| `GET` | `/api/v1/prayers` | عمومی | ادعیه و زیارات منتشرشده |
| `PUT` | `/api/v1/admin/prayers` | ویژه کنترل‌گر | ویرایش و افزودن ادعیه |
| `GET` | `/api/v1/imamology` | عمومی | دانشنامه جامع ۱۴ معصوم (ع) |
| `PUT` | `/api/v1/admin/imamology` | ویژه کنترل‌گر | به‌روزرسانی مشخصات هر یک از معصومین |

---

### ۶. روش احراز هویت و مجوزها (Auth & Authorization)

* **کنترل دسترسی مبتنی بر نقش (Role-Based Access Control):**
  * بررسی نقش فقط و فقط در لایه سرور (`requireController`) انجام می‌شود.
  * اگر کاربر با نقش `user` درخواست دسترسی به هر یک از مسیرهای `/api/v1/admin/*` را ارسال نماید، بلافاصله خطای **403 Forbidden** با پیام استاندارد برگردانده می‌شود.
  * در صورت نبود توکن معتبر در هدر درخواست، خطای **401 Unauthorized** بازگردانده می‌شود.

---

### ۷. نحوه اجرای تست‌های خودکار

جهت اجرای آزمون‌های یکپارچه:

```bash
npx tsx server/tests/test_api.ts
```

این اسکریپت موارد زیر را راستی‌آزمایی می‌کند:
1. ورود با رمز صحیح کنترل‌گر و عدم وجود Hash در پاسخ
2. رد ورود کنترل‌گر با رمز عبور اشتباه
3. ثبت‌نام کاربر و دریافت پروفایل
4. مجاز بودن کنترل‌گر در Admin API
5. خطای ۴۰۳ برای کاربر عادی در Admin API
6. خطای ۴۰۱ برای درخواست بدون احراز هویت
7. ایجاد محتوا در دیتابیس
8. ایجاد پاسخنامه آزمون در دیتابیس
9. ارزیابی پاسخنامه توسط کنترل‌گر
10. تغییر تنظیمات و حالت ماتم در دیتابیس
11. ثبت رای در نظرسنجی
