# TWOK STUDIO — Complete New Website + Creative Animations + Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بناء موقع كامل ومن جديد لـ TWOK STUDIO (Public + أنيميشن + Admin) مستند إلى محتوى `www.twokstudio.com`.

**Architecture:** إعادة بناء داخل مشروع Next.js App Router الحالي؛ الطبقة العامة من الصفر، backend/CMS/auth قائم.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, Prisma 6, PostgreSQL, Zod, lucide-react, Cormorant Garamond + Manrope.

**Spec:** `/Users/mac/Desktop/open code/docs/superpowers/specs/2026-11-16-twok-studio-complete-site-design.md`

## Global Constraints

- لا بيانات مختلقة؛ الحالات المفقودة = «غير مضبوطة».
- الحجوزات `PENDING` حتى تأكيد admin؛ لا fake success.
- `rounded-full` ممنوع. Filets 1px. A11y AA (focus, reduced motion, ≥40px, h1 واحد). lucide + `aria-hidden`. لا مكتبة حركة جديدة.
- No `any` / `@ts-ignore`.

## Review Focus

1. البيانات المفقودة → «غير مضبوطة» لا قيمًا مختلقة.
2. حالات الفشل (SMTP/WhatsApp/S3) → `SKIPPED`/`FAILED`, لا «نجاح».
3. الحجوزات → `PENDING` قبل التأكيد.

---

## Tasks

### Task 1: Design tokens & global primitives
**Files:** `app/globals.css`
- [ ] Step 1: Run `npm run typecheck` & existing tests → baseline green.
- [ ] Step 2: Implement tokens/primitives (cream/ink/line/champagne, container-editorial, btn, admin primitives).
- [ ] Step 3: Verify `npm run typecheck` green.

### Task 2: Public layout (fonts, shell, not-found, SEO head)
**Files:** `app/[locale]/layout.tsx`, `app/[locale]/not-found.tsx`, `lib/seo.ts`
- [ ] Step 1: Implement locale layout + fonts + metadata.
- [ ] Step 2: Verify typecheck.

### Task 3: Site chrome (Header, Footer, nav publique)
**Files:** `components/site/Header.tsx`, `components/site/Footer.tsx`, `components/site/HeaderNav.tsx`
- [ ] Step 1: Implement header/footer/nav avec a11y + focus.
- [ ] Step 2: Verify typecheck.

### Task 4: Home + Hero animé
**Files:** `app/[locale]/page.tsx`, `components/public/Hero.tsx`, `components/public/Reveal.tsx`
- [ ] Step 1: Implement sections Home (hero, services teaser, featured, story teaser, CTA).
- [ ] Step 2: Hero intro animation (CSS/rAF).
- [ ] Step 3: Verify typecheck + build.

### Task 5: Pages publiques (Services, Portfolio, About, Contact, Booking, Blog)
**Files:** `app/[locale]/services/[slug]/page.tsx`, `app/[locale]/portfolio/page.tsx`, `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx`, `app/[locale]/booking/page.tsx`, `app/[locale]/blog/page.tsx`
- [ ] Step 1: Implémente chaque page depuis le contenu twokstudio.com (états vides si données absentes).
- [ ] Step 2: Vérifie typecheck.

### Task 6: Système d’animation (Reveal, Marquee, Parallax, useInView)
**Files:** `components/public/Animation*.tsx`
- [ ] Step 1: Implémente primitives d'animation CSS/rAF.
- [ ] Step 2: Vérifie typecheck.

### Task 7: Admin (frame, dashboard, modules métier)
**Files:** `components/admin/AdminFrame.tsx`, `app/admin/(dashboard)/*/page.tsx`, `components/admin/*`
- [ ] Step 1: Frame admin + sidebar groupes + focus trap.
- [ ] Step 2: Dashboard (priorités, alertes, métriques).
- [ ] Step 3: Modules (services, projets, pages, testimonials, media, bookings, messages, settings).
- [ ] Step 4: Vérifie typecheck.

### Task 8: Vérifications finales
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Audit statique a11y/design.

---

Plan complete and saved to `docs/superpowers/plans/2026-11-16-twok-studio-complete-site-plan.md`. Please review the plan. Does it capture what you want?

- **Subagent-driven** — recommended here (many independent tasks, fresh reviewer per task).
- **Native** — fastest.

Does the plan capture what you want, and which approach should we use?
