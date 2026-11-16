# Design Doc — TWOK STUDIO : موقع كامل من الصفر + أنيميشن إبداعي + Admin

- **التاريخ:** 2026-11-16
- **النوع:** مشروع (موقع كامل + أنيميشن + admin)

## 1. Intent & Why

بناء موقع كامل ومن جديد لـ TWOK STUDIO من الصفر، مستند إلى محتوى `www.twokstudio.com`، ومع مرجع تصميمي من `www.talonpro.net`. الهدف: موقع تسويقي احترافي بقصة بصرية، بأنيميشن إبداعي، وأحدث، مع نظام تحكم كامل للمحتوى.

## 2. Scope

### Public site (من الصفر)
- Home
- Services (Photography, Videography, Drone, Photo Booth, Events, Podcast Recording)
- Portfolio / Projects
- About / Story
- Contact
- Booking

### Animations
- Hero intro, scroll reveals, parallax, marquee, image hover, حركة إبداعية.

### Admin (مخصص كامل)
- Dashboard تحليلي، Content، Media، Bookings، Messages، Settings.

## 3. Decisions النهائية (اتخذتها بناءً على إرادتك)

| القرار | القيمة |
|---|---|
| نطاق الحجوزات | **نظام PENDING كامل** (من منطق المشروع الحالي — بدون fake success) |
| مكتبة الحركة | **CSS-only + rAF hooks** (لا مكتبة جديدة) |
| طبقة البيانات | **Prisma الحالي كأساس** |
| Admin auth | **نظام auth الحالي** |
| الرسائل/الإشعارات | **المسار الحالي** |
| نطاق الترجمة | مؤجلة (EN أولًا ثم FR) |

## 4. Constraints

- Tailwind + primitives maison. Cormorant Garamond + Manrope. palette cream/ink/line/champagne.
- الزوايا المستقيمة (`rounded-full` ممنوع). Filets 1px.
- A11y AA : focus visible، reduced motion، cibles ≥40px، هدف واحد.
- lucide فقط، `aria-hidden` للديكور، لا أيقونات ماركة.
- لا بيانات مختلقة.

## 5. Approaches

1. **إعادة بناء داخل المشروع الحالي** ← **المقترح والنهائي** (backend/CMS/auth/actions جاهزة، نطاق الحجوزات محكور).

## 6. What's left to the builder

1. جمع محتوى twokstudio.com الكامل.
2. Design tokens + primitives.
3. بناء الصفحات.
4. بناء الأنيميشن.
5. بناء Admin.
6. قياس (typecheck/test/build).
