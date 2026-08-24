# SHEKO SPORTS

نسخة جاهزة للنشر على **GitHub Pages**.

## النشر على GitHub Pages

1. ارفع محتويات المشروع إلى مستودع GitHub.
2. افتح **Settings → Pages** في المستودع.
3. في **Build and deployment** اختر **GitHub Actions**.
4. اعمل push إلى `main` أو `master`، والـworkflow الموجود في `.github/workflows/deploy-pages.yml` سيبني الموقع وينشره تلقائيًا.

هذه النسخة تعمل كـ **Static SPA** على GitHub Pages، لذلك لا تعتمد على Next.js API Routes أو PostgreSQL أثناء النشر هناك.

## البيانات الحية

GitHub Pages لا يشغّل Node.js أو PostgreSQL. لذلك وضع التطبيق له وضع Static آمن بدل أن يفشل الـbuild أو تظهر أخطاء `/api`.

لو عندك Backend خارجي لاحقًا، اضبط `NEXT_PUBLIC_API_BASE_URL` وقت الـbuild، وسيستخدمه العميل للطلبات بدل الـfallback المحلي.

## تشغيل محلي

```bash
npm install
npm run dev
```

ولاختبار نسخة GitHub Pages محليًا:

```bash
npm run build:github
```

سيتم إنشاء مجلد `out/` الجاهز للنشر.
