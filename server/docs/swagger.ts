import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

export const swaggerRouter = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'سامانه مزار شهدای گمنام و دانشنامه امام‌شناسی - API Documentation',
    version: '1.0.0',
    description: 'مستندات کامل REST APIهای سامانه تعاملی مزار شهدای گمنام، آزمون‌ها، ادعیه و دانشنامه ۱۴ معصوم (ع)',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Server v1',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'توکن دسترسی JWT صادرشده در پاسخ لاگین را در هدر Authorization قرار دهید: Bearer <token>',
      },
    },
  },
  paths: {
    '/auth/controller-login': {
      post: {
        summary: 'ورود کنترل‌گر با پین‌کد (PIN)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pinCode'],
                properties: {
                  pinCode: { type: 'string', example: 'Mohammad128' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'ورود موفق و بازگشت توکن JWT کنترل‌گر' },
          401: { description: 'پین‌کد نادرست است' },
        },
      },
    },
    '/auth/user-onboard': {
      post: {
        summary: 'ثبت‌نام و ورود کاربر عمومی',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName'],
                properties: {
                  fullName: { type: 'string', example: 'علی حسینی' },
                  phoneNumber: { type: 'string', example: '09123456789' },
                  email: { type: 'string', example: 'ali@example.com' },
                  age: { type: 'string', example: '25' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'ثبت‌نام موفق و صدور توکن کاربری' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'دریافت مشخصات پروفایل حساب جاری',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'اطلاعات کاربر یا کنترل‌گر جاری' },
        },
      },
    },
    '/users/profile': {
      get: {
        summary: 'دریافت مشخصات پروفایل کاربر لاگین‌شده',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'مشخصات کامل کاربر' },
          401: { description: 'نیاز به توکن معتبر' },
        },
      },
    },
    '/admin/content': {
      get: {
        summary: 'دریافت لیست تمام محتواها شامل پیش‌نویس‌ها (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'لیست محتواها' },
          403: { description: 'دسترسی غیرمجاز' },
        },
      },
      post: {
        summary: 'ایجاد محتوا یا آزمون جدید (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'محتوا ایجاد شد' },
        },
      },
    },
    '/admin/content/{id}': {
      put: {
        summary: 'ویرایش محتوا (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'به‌روزرسانی موفق' },
        },
      },
      delete: {
        summary: 'حذف محتوا (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'حذف موفق' },
        },
      },
    },
    '/admin/submissions': {
      get: {
        summary: 'مشاهده تمام آزمون‌ها و ارسال‌های کاربران (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'لیست ارسال‌ها' },
        },
      },
    },
    '/admin/submissions/{id}/evaluate': {
      put: {
        summary: 'تصحیح و ثبت نمره/یادداشت کنترل‌گر بر آزمون کاربر',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'ثبت ارزیابی' },
        },
      },
    },
    '/admin/settings': {
      put: {
        summary: 'به‌روزرسانی تنظیمات و تغییر رمز عبور کنترل‌گر',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'تنظیمات ذخیره شد' },
        },
      },
    },
    '/admin/settings/matam-mode': {
      patch: {
        summary: 'تغییر وضعیت سریع حالت ماتم و ایام عزاداری (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'وضعیت تغییر یافت' },
        },
      },
    },
    '/admin/mazar-programs': {
      put: {
        summary: 'به‌روزرسانی گروهی برنامه‌های مزار (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'برنامه‌ها ذخیره شدند' },
        },
      },
    },
    '/admin/banners': {
      put: {
        summary: 'به‌روزرسانی اسلایدر بنرها (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'بنرها ذخیره شدند' },
        },
      },
    },
    '/admin/prayers': {
      put: {
        summary: 'به‌روزرسانی ادعیه و زیارات (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'ادعیه ذخیره شدند' },
        },
      },
    },
    '/admin/imamology': {
      put: {
        summary: 'ویرایش دانشنامه معصومین (ویژه کنترل‌گر)',
        tags: ['Admin Controller'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'اطلاعات ذخیره شد' },
        },
      },
    },
    '/content': {
      get: {
        summary: 'دریافت لیست محتواها و آزمون‌های منتشرشده',
        tags: ['Content & Exams'],
        responses: {
          200: { description: 'لیست محتواها' },
        },
      },
      post: {
        summary: 'ایجاد آزمون یا محتوای جدید (ویژه کنترل‌گر)',
        tags: ['Content & Exams'],
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'محتوا ذخیره شد' },
          403: { description: 'نیاز به نقش کنترل‌گر' },
        },
      },
    },
    '/content/admin/all': {
      get: {
        summary: 'دریافت کلیه محتواها به همراه پیش‌نویس‌ها (ویژه کنترل‌گر)',
        tags: ['Content & Exams'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'لیست کامل محتواها' },
        },
      },
    },
    '/content/{id}/poll-vote': {
      post: {
        summary: 'ثبت رای در نظرسنجی',
        tags: ['Content & Exams'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['optionIndex'],
                properties: { optionIndex: { type: 'integer' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'رای با موفقیت ثبت شد' },
        },
      },
    },
    '/submissions': {
      post: {
        summary: 'ارسال پاسخ‌های آزمون توسط کاربر',
        tags: ['Submissions & Scoring'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userName', 'answers'],
                properties: {
                  userName: { type: 'string' },
                  userEmailOrPhone: { type: 'string' },
                  answers: { type: 'object' },
                  totalScore: { type: 'number' },
                  maxScore: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'پاسخ‌ها ذخیره شد' },
        },
      },
    },
    '/submissions/my': {
      get: {
        summary: 'دریافت کارنامه و آزمون‌های شرکت‌کرده کاربر جاری',
        tags: ['Submissions & Scoring'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'لیست آزمون‌های کاربر' },
        },
      },
    },
    '/submissions/admin/all': {
      get: {
        summary: 'دریافت پاسخ‌ها و ارسال‌های کلیه کاربران (ویژه کنترل‌گر)',
        tags: ['Submissions & Scoring'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'لیست ارسال‌های تمام کاربران' },
        },
      },
    },
    '/submissions/{id}/evaluate': {
      put: {
        summary: 'ثبت نمره تشریحی و نظر ارزیابی کنترل‌گر',
        tags: ['Submissions & Scoring'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'ارزیابی ذخیره شد' },
        },
      },
    },
    '/submissions/leaderboard': {
      get: {
        summary: 'رتبه‌بندی کاربران بر اساس مجموع امتیازات',
        tags: ['Submissions & Scoring'],
        responses: {
          200: { description: 'لیست رده‌بندی امتیازات' },
        },
      },
    },
    '/settings': {
      get: {
        summary: 'دریافت تنظیمات جاری سامانه و وضعیت حالت ماتم',
        tags: ['Settings & Control'],
        responses: {
          200: { description: 'تنظیمات عمومی' },
        },
      },
    },
    '/settings/admin/matam-mode': {
      patch: {
        summary: 'تغییر سریع وضعیت حالت ماتم (ویژه کنترل‌گر)',
        tags: ['Settings & Control'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isMatamMode'],
                properties: { isMatamMode: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'وضعیت ماتم تغییر یافت' },
        },
      },
    },
    '/mazar-programs': {
      get: {
        summary: 'دریافت لیست برنامه‌های هفتگی مزار مطهر',
        tags: ['Mazar Programs'],
        responses: {
          200: { description: 'برنامه‌ها' },
        },
      },
    },
    '/banners': {
      get: {
        summary: 'دریافت بنرهای اسلایدر صفحه اصلی',
        tags: ['Banners'],
        responses: {
          200: { description: 'بنرها' },
        },
      },
    },
    '/prayers': {
      get: {
        summary: 'دریافت لیست ادعیه و زیارات',
        tags: ['Prayers'],
        responses: {
          200: { description: 'ادعیه' },
        },
      },
    },
    '/imamology': {
      get: {
        summary: 'دریافت اطلاعات و دانشنامه ۱۴ معصوم (ع)',
        tags: ['Imamology (14 Infallibles)'],
        responses: {
          200: { description: 'دانشنامه ۱۴ معصوم' },
        },
      },
    },
  },
};

swaggerRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

swaggerRouter.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));
