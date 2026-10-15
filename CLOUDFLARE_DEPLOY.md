# انتشار Pardis Present روی Cloudflare Workers

این نسخه برای استقرار به‌صورت **Cloudflare Workers Static Assets** آماده شده است. رابط React/Vite به فایل‌های استاتیک تبدیل می‌شود و Cloudflare آن‌ها را همراه Worker deployment منتشر می‌کند. برای اجرای نسخه فعلی به سرور Node.js، VPS یا Nginx نیاز نیست.

## پیش‌نیازها

- Node.js نسخه 20 یا جدیدتر
- حساب Cloudflare
- اتصال اینترنت هنگام نصب وابستگی‌ها و انتشار

## انتشار اولیه

در ترمینال، وارد همین پوشه شوید؛ پوشه‌ای که `package.json` و `wrangler.jsonc` در آن قرار دارند.

```bash
npm ci
npm test
npm run build
npx --yes wrangler@4 login
npm run cf:deploy
```

در اولین اجرا، Wrangler مرورگر را برای ورود به حساب Cloudflare باز می‌کند. پس از انتشار موفق، آدرس عمومی `*.workers.dev` در خروجی ترمینال نمایش داده می‌شود.

دستور `npm run cf:deploy` ابتدا TypeScript و Vite build را اجرا می‌کند و فقط در صورت موفقیت، خروجی `dist/` را منتشر می‌کند.

## تست محلی در محیط شبیه Cloudflare

```bash
npm ci
npm run cf:dev
```

این دستور build می‌گیرد و سپس سایت را با Wrangler اجرا می‌کند. آدرس محلی در ترمینال نمایش داده می‌شود.

برای بررسی پیش از انتشار:

```bash
npm run cf:deploy:dry
```

## اتصال دامنه اختصاصی

پس از اولین انتشار:

1. وارد داشبورد Cloudflare شوید.
2. بخش **Workers & Pages** و سپس Worker با نام `pardis-present` را باز کنید.
3. در **Settings / Domains & Routes**، گزینه افزودن **Custom Domain** را انتخاب کنید.
4. دامنه یا زیردامنه‌ای را که می‌خواهید استفاده کنید وارد و مراحل DNS/TLS را کامل کنید.

دامنه باید در حساب Cloudflare قابل مدیریت باشد؛ داشبورد وضعیت DNS و گواهی TLS را نشان می‌دهد.

## نکات مهم درباره عملکرد فعلی

- این پیکربندی، React SPA را منتشر می‌کند و برای مسیرهای سمت مرورگر fallback به `index.html` دارد.
- داده‌های ارائه در نسخه فعلی در `localStorage` مرورگر ذخیره می‌شوند؛ به‌طور خودکار بین دستگاه‌ها همگام نمی‌شوند و دیتابیس/حساب کاربری ابری ایجاد نمی‌شود.
- فایل `cloudflare-worker.js` موجود در ریشه، یک relay مستقل برای HTTP است و بخشی از frontend نیست. این فایل عمداً به‌عنوان entry point تنظیم نشده و در انتشار این نسخه اجرا نمی‌شود. آن را به‌عنوان Worker عمومی جداگانه deploy نکنید مگر اینکه محدودیت‌های دسترسی و امنیتی آن را بررسی و ایمن کرده باشید.
- اگر وابستگی‌ها در محیط شما قبلاً نصب شده‌اند، برای انتشار مجدد معمولاً فقط `npm run cf:deploy` کافی است.

## اگر انتشار خطا داد

ابتدا این دستورات را جداگانه اجرا کنید و خروجی کامل خطا را نگه دارید:

```bash
npm run typecheck
npm test
npm run build
npx --yes wrangler@4 whoami
```
