/**
 * Idempotent seed for TWOK STUDIO.
 * Safe to run repeatedly: uses deterministic IDs and never resets existing admin passwords.
 * All visual content is clearly non-representational placeholder media, to be replaced in the CMS.
 */
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_CATALOG, ROLE_PRESETS } from "../lib/permissions";

const prisma = new PrismaClient();

function seedId(key: string) {
  const hex = createHash("sha256").update(`twok:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

type ManifestEntry = { file: string; width: number; height: number; sizeBytes: number; url: string };

async function main() {
  console.log("→ Seeding TWOK STUDIO…");
  const manifest = JSON.parse(
    await readFile(path.resolve(process.cwd(), "public/seed/manifest.json"), "utf8"),
  ) as ManifestEntry[];
  const image = Object.fromEntries(manifest.map((entry) => [entry.file.replace(".jpg", ""), entry]));

  // -------------------------------------------------------------------------
  // Permissions & roles
  // -------------------------------------------------------------------------
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, group: permission.group },
      create: permission,
    });
  }
  for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: preset.name, description: preset.description },
      create: { key, name: preset.name, description: preset.description, isSystem: true },
    });
    const permissions = await prisma.permission.findMany({
      where: { key: { in: preset.permissions } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    });
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@twokstudio.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe-TWOK-2026";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: process.env.SEED_ADMIN_NAME ?? "TWOK Administrator" },
    create: {
      email: adminEmail,
      name: process.env.SEED_ADMIN_NAME ?? "TWOK Administrator",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      status: "ACTIVE",
    },
  });
  const superRole = await prisma.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superRole.id },
  });
  if (!existingAdmin) {
    console.log(`  ✓ Admin created: ${adminEmail} (password from SEED_ADMIN_PASSWORD)`);
  } else {
    console.log(`  ✓ Admin preserved: ${adminEmail} (password unchanged)`);
  }

  // -------------------------------------------------------------------------
  // Languages & settings
  // -------------------------------------------------------------------------
  await prisma.language.upsert({
    where: { code: "fr" },
    update: { name: "Français", nativeName: "Français", active: true, isDefault: true, sortOrder: 0 },
    create: { code: "fr", name: "Français", nativeName: "Français", active: true, isDefault: true, sortOrder: 0 },
  });
  await prisma.language.upsert({
    where: { code: "en" },
    update: { name: "English", nativeName: "English", active: true, isDefault: false, sortOrder: 1 },
    create: { code: "en", name: "English", nativeName: "English", active: true, isDefault: false, sortOrder: 1 },
  });

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      companyName: "TWOK STUDIO",
      legalName: "TWOK STUDIO",
      taglineFr: "Photographie · Vidéo · Drone — Marrakech",
      taglineEn: "Photography · Video · Drone — Marrakech",
      descriptionFr:
        "Studio créatif basé à Marrakech, spécialisé en photographie professionnelle, production vidéo et prises de vue aériennes.",
      descriptionEn:
        "Marrakech-based creative studio specialised in professional photography, video production and aerial cinematography.",
      timezone: "Africa/Casablanca",
      footerIntroFr:
        "Un studio marrakchi dédié à l'image : photographie, films et vues aériennes au service des marques, des lieux et des histoires.",
      footerIntroEn:
        "A Marrakech studio dedicated to image-making: photography, films and aerial views for brands, places and stories.",
      copyrightFr: "© {year} TWOK STUDIO. Tous droits réservés.",
      copyrightEn: "© {year} TWOK STUDIO. All rights reserved.",
      whatsappEnabled: false,
      whatsappNumber: null,
      whatsappMessageFr:
        "Bonjour TWOK STUDIO, je souhaite discuter d'un projet et vérifier vos disponibilités.",
      whatsappMessageEn:
        "Hello TWOK STUDIO, I would like to discuss a project and check your availability.",
      whatsappPhotoFr: "Bonjour TWOK STUDIO, je m'intéresse à une prestation photo. Pouvons-nous en discuter ?",
      whatsappPhotoEn: "Hello TWOK STUDIO, I am interested in a photography service. Could we discuss it?",
      whatsappVideoFr: "Bonjour TWOK STUDIO, je souhaite réaliser une vidéo. Pouvons-nous en discuter ?",
      whatsappVideoEn: "Hello TWOK STUDIO, I would like to produce a video. Could we discuss it?",
      whatsappDroneFr: "Bonjour TWOK STUDIO, je m'intéresse à une prestation drone. Pouvons-nous en discuter ?",
      whatsappDroneEn: "Hello TWOK STUDIO, I am interested in a drone service. Could we discuss it?",
      whatsappPosition: "RIGHT",
      whatsappPages: ["all"],
      customerRetentionDays: 730,
      bookingAutoConfirm: false,
    },
    create: {
      id: 1,
      companyName: "TWOK STUDIO",
      legalName: "TWOK STUDIO",
      taglineFr: "Photographie · Vidéo · Drone — Marrakech",
      taglineEn: "Photography · Video · Drone — Marrakech",
      descriptionFr:
        "Studio créatif basé à Marrakech, spécialisé en photographie professionnelle, production vidéo et prises de vue aériennes.",
      descriptionEn:
        "Marrakech-based creative studio specialised in professional photography, video production and aerial cinematography.",
      timezone: "Africa/Casablanca",
      footerIntroFr:
        "Un studio marrakchi dédié à l'image : photographie, films et vues aériennes au service des marques, des lieux et des histoires.",
      footerIntroEn:
        "A Marrakech studio dedicated to image-making: photography, films and aerial views for brands, places and stories.",
      copyrightFr: "© {year} TWOK STUDIO. Tous droits réservés.",
      copyrightEn: "© {year} TWOK STUDIO. All rights reserved.",
      whatsappEnabled: false,
      whatsappMessageFr:
        "Bonjour TWOK STUDIO, je souhaite discuter d'un projet et vérifier vos disponibilités.",
      whatsappMessageEn:
        "Hello TWOK STUDIO, I would like to discuss a project and check your availability.",
      whatsappPhotoFr: "Bonjour TWOK STUDIO, je m'intéresse à une prestation photo. Pouvons-nous en discuter ?",
      whatsappPhotoEn: "Hello TWOK STUDIO, I am interested in a photography service. Could we discuss it?",
      whatsappVideoFr: "Bonjour TWOK STUDIO, je souhaite réaliser une vidéo. Pouvons-nous en discuter ?",
      whatsappVideoEn: "Hello TWOK STUDIO, I would like to produce a video. Could we discuss it?",
      whatsappDroneFr: "Bonjour TWOK STUDIO, je m'intéresse à une prestation drone. Pouvons-nous en discuter ?",
      whatsappDroneEn: "Hello TWOK STUDIO, I am interested in a drone service. Could we discuss it?",
      whatsappPosition: "RIGHT",
      whatsappPages: ["all"],
      customerRetentionDays: 730,
      bookingAutoConfirm: false,
    },
  });

  await prisma.contactSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      email: null,
      addressFr: "Marrakech, Maroc",
      addressEn: "Marrakech, Morocco",
      hoursFr: "Du lundi au samedi, sur rendez-vous.",
      hoursEn: "Monday to Saturday, by appointment.",
      introFr:
        "Basé à Marrakech, nous accompagnons marques, hôtels, agences et particuliers dans la création d'images qui durent.",
      introEn:
        "Based in Marrakech, we help brands, hotels, agencies and individuals create images that last.",
    },
  });

  await prisma.mapSetting.upsert({
    where: { id: 1 },
    update: {
      addressFr: "Marrakech, Maroc",
      addressEn: "Marrakech, Morocco",
      enabled: true,
    },
    create: {
      id: 1,
      enabled: true,
      addressFr: "Marrakech, Maroc",
      addressEn: "Marrakech, Morocco",
      embedUrl: null,
      latitude: null,
      longitude: null,
      zoom: 14,
    },
  });

  await prisma.seoSetting.upsert({
    where: { id: 1 },
    update: {
      siteTitleFr: "TWOK STUDIO — Photographie, vidéo & drone à Marrakech",
      siteTitleEn: "TWOK STUDIO — Photography, video & drone in Marrakech",
      titleTemplate: "%s · TWOK STUDIO",
      descriptionFr:
        "Studio de photographie, vidéo et drone à Marrakech. Corporate, mariage, immobilier, hôtellerie, food, produit et contenus de marque.",
      descriptionEn:
        "Photography, video and drone studio in Marrakech. Corporate, weddings, real estate, hospitality, food, product and brand content.",
      keywordsFr:
        "photographe Marrakech, photographie Marrakech, vidéo Marrakech, drone Marrakech, photographie corporate Marrakech, photographie immobilier Marrakech",
      keywordsEn:
        "photographer Marrakech, photography Marrakech, video production Marrakech, drone photography Marrakech, corporate photography Marrakech",
    },
    create: {
      id: 1,
      siteTitleFr: "TWOK STUDIO — Photographie, vidéo & drone à Marrakech",
      siteTitleEn: "TWOK STUDIO — Photography, video & drone in Marrakech",
      titleTemplate: "%s · TWOK STUDIO",
      descriptionFr:
        "Studio de photographie, vidéo et drone à Marrakech. Corporate, mariage, immobilier, hôtellerie, food, produit et contenus de marque.",
      descriptionEn:
        "Photography, video and drone studio in Marrakech. Corporate, weddings, real estate, hospitality, food, product and brand content.",
      keywordsFr:
        "photographe Marrakech, photographie Marrakech, vidéo Marrakech, drone Marrakech, photographie corporate Marrakech, photographie immobilier Marrakech",
      keywordsEn:
        "photographer Marrakech, photography Marrakech, video production Marrakech, drone photography Marrakech, corporate photography Marrakech",
    },
  });

  await prisma.homepageSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      titleFr: "Le studio image de Marrakech",
      titleEn: "Marrakech's image studio",
      descriptionFr:
        "Photographie, films et vues aériennes. Une écriture visuelle précise, sensible et contemporaine.",
      descriptionEn:
        "Photography, films and aerial views. A precise, sensitive and contemporary visual language.",
    },
  });

  await prisma.bookingAvailability.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      timezone: "Africa/Casablanca",
      workingDays: [1, 2, 3, 4, 5, 6],
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes: 60,
      bufferMinutes: 30,
      maxPerSlot: 1,
      leadTimeHours: 24,
      autoConfirm: false,
    },
  });

  // -------------------------------------------------------------------------
  // Social links (only official links supplied in the brief)
  // -------------------------------------------------------------------------
  const socials = [
    { key: "instagram", platform: "Instagram", url: "https://www.instagram.com/twok_studioo/", username: "@twok_studioo", icon: "instagram", sortOrder: 0, showHeader: true },
    { key: "linkedin", platform: "LinkedIn", url: "https://www.linkedin.com/in/khalid-el-khaoua-11831a301/", username: "Khalid El Khaoua", icon: "linkedin", sortOrder: 1, showHeader: true },
    { key: "website", platform: "Website", url: "https://www.twokstudio.com/", username: "twokstudio.com", icon: "globe", sortOrder: 2, showHeader: false },
  ];
  for (const social of socials) {
    await prisma.socialLink.upsert({
      where: { id: seedId(`social:${social.key}`) },
      update: {
        platform: social.platform,
        url: social.url,
        username: social.username,
        icon: social.icon,
        sortOrder: social.sortOrder,
        active: true,
        showHeader: social.showHeader,
        showFooter: true,
      },
      create: {
        id: seedId(`social:${social.key}`),
        platform: social.platform,
        url: social.url,
        username: social.username,
        icon: social.icon,
        sortOrder: social.sortOrder,
        active: true,
        showHeader: social.showHeader,
        showFooter: true,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Media (abstract placeholders)
  // -------------------------------------------------------------------------
  const mediaIds: Record<string, string> = {};
  for (const [key, entry] of Object.entries(image)) {
    const id = seedId(`media:${key}`);
    mediaIds[key] = id;
    await prisma.media.upsert({
      where: { id },
      update: {
        url: entry.url,
        storageKey: `seed/${entry.file}`,
        thumbnailUrl: entry.url,
        width: entry.width,
        height: entry.height,
        sizeBytes: entry.sizeBytes,
      },
      create: {
        id,
        kind: "IMAGE",
        storageKey: `seed/${entry.file}`,
        url: entry.url,
        thumbnailUrl: entry.url,
        mimeType: "image/jpeg",
        originalName: entry.file,
        sizeBytes: entry.sizeBytes,
        width: entry.width,
        height: entry.height,
        folder: "seed",
        altFr: "Visuel éditorial abstrait TWOK STUDIO — à remplacer par une photographie réelle.",
        altEn: "Abstract TWOK STUDIO editorial placeholder — replace with real photography.",
      },
    });
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  type CategorySeed = {
    key: string;
    service: "PHOTO" | "VIDEO" | "DRONE";
    parent?: string;
    sortOrder: number;
    cover: string;
    fr: { name: string; slug: string; description: string };
    en: { name: string; slug: string; description: string };
  };

  const categories: CategorySeed[] = [
    { key: "corporate", service: "PHOTO", sortOrder: 1, cover: "seed-corporate",
      fr: { name: "Corporate", slug: "corporate", description: "Portraits d'équipes, campagnes de marque et événements d'entreprise." },
      en: { name: "Corporate", slug: "corporate", description: "Team portraits, brand campaigns and corporate events." } },
    { key: "mariage", service: "PHOTO", sortOrder: 2, cover: "seed-wedding",
      fr: { name: "Mariage", slug: "mariage", description: "Récits de mariage intimes ou grandioses, photographiés avec discrétion." },
      en: { name: "Wedding", slug: "wedding", description: "Intimate and grand wedding stories, photographed discreetly." } },
    { key: "medical", service: "PHOTO", sortOrder: 3, cover: "seed-medical",
      fr: { name: "Médical", slug: "medical", description: "Une image soignée pour les cliniques, praticiens et établissements de santé." },
      en: { name: "Medical", slug: "medical", description: "Refined imagery for clinics, practitioners and healthcare facilities." } },
    { key: "evenement", service: "PHOTO", sortOrder: 4, cover: "seed-event",
      fr: { name: "Événements", slug: "evenements", description: "Couverture photo d'événements professionnels et privés." },
      en: { name: "Events", slug: "events", description: "Photographic coverage of professional and private events." } },
    { key: "immobilier", service: "PHOTO", sortOrder: 5, cover: "seed-realestate",
      fr: { name: "Immobilier", slug: "immobilier", description: "Architecture, intérieurs et biens d'exception révélés par la lumière." },
      en: { name: "Real Estate", slug: "real-estate", description: "Architecture, interiors and exceptional properties revealed by light." } },
    { key: "portrait", service: "PHOTO", sortOrder: 6, cover: "seed-portrait",
      fr: { name: "Portrait", slug: "portrait", description: "Des portraits justes, entre direction et naturel." },
      en: { name: "Portrait", slug: "portrait", description: "Considered portraits, balancing direction and ease." } },
    { key: "hotellerie", service: "PHOTO", sortOrder: 7, cover: "seed-hospitality",
      fr: { name: "Hôtellerie", slug: "hotellerie", description: "Hôtels, riads et restaurants : raconter l'expérience autant que le lieu." },
      en: { name: "Hospitality", slug: "hospitality", description: "Hotels, riads and restaurants: telling the experience as much as the place." } },
    { key: "food", service: "PHOTO", sortOrder: 8, cover: "seed-food",
      fr: { name: "Food", slug: "food", description: "Cuisine, gestes et matières mises en scène pour donner envie." },
      en: { name: "Food", slug: "food", description: "Cuisine, gestures and textures styled to create desire." } },
    { key: "produits", service: "PHOTO", sortOrder: 9, cover: "seed-product",
      fr: { name: "Produits", slug: "produits", description: "Photographie produit, packshots et natures mortes contemporaines." },
      en: { name: "Products", slug: "products", description: "Product photography, packshots and contemporary still life." } },
    { key: "mode", service: "PHOTO", sortOrder: 10, cover: "seed-fashion",
      fr: { name: "Mode", slug: "mode", description: "Editoriaux mode, looks et campagnes aux lignes affirmées." },
      en: { name: "Fashion", slug: "fashion", description: "Fashion editorials, looks and campaigns with a strong point of view." } },
    { key: "commercial", service: "PHOTO", sortOrder: 11, cover: "seed-commercial",
      fr: { name: "Commercial", slug: "commercial", description: "Images publicitaires conçues pour les marques et leurs campagnes." },
      en: { name: "Commercial", slug: "commercial", description: "Advertising imagery designed for brands and their campaigns." } },
    { key: "corporate-portraits", service: "PHOTO", parent: "corporate", sortOrder: 1, cover: "seed-portrait",
      fr: { name: "Portraits d'entreprise", slug: "portraits-entreprise", description: "Dirigeants, équipes et collaborateurs." },
      en: { name: "Company Portraits", slug: "company-portraits", description: "Executives, teams and collaborators." } },
    { key: "corporate-events", service: "PHOTO", parent: "corporate", sortOrder: 2, cover: "seed-event",
      fr: { name: "Événements d'entreprise", slug: "evenements-entreprise", description: "Lancements, séminaires et vie de l'entreprise." },
      en: { name: "Company Events", slug: "company-events", description: "Launches, seminars and company life." } },
    { key: "corporate-campaigns", service: "PHOTO", parent: "corporate", sortOrder: 3, cover: "seed-commercial",
      fr: { name: "Campagnes corporate", slug: "campagnes-corporate", description: "Des images de marque cohérentes et durables." },
      en: { name: "Corporate Campaigns", slug: "corporate-campaigns", description: "Coherent, enduring brand imagery." } },
    { key: "re-villas", service: "PHOTO", parent: "immobilier", sortOrder: 1, cover: "seed-realestate",
      fr: { name: "Villas", slug: "villas", description: "Villas privées, extérieurs et art de vivre." },
      en: { name: "Villas", slug: "villas", description: "Private villas, outdoor living and lifestyle." } },
    { key: "re-apartments", service: "PHOTO", parent: "immobilier", sortOrder: 2, cover: "seed-intro",
      fr: { name: "Appartements", slug: "appartements", description: "Appartements et résidences, volumes et détails." },
      en: { name: "Apartments", slug: "apartments", description: "Apartments and residences, volumes and details." } },
    { key: "re-hotels", service: "PHOTO", parent: "immobilier", sortOrder: 3, cover: "seed-hospitality",
      fr: { name: "Hôtels", slug: "hotels", description: "Espaces hôteliers et hospitalité." },
      en: { name: "Hotels", slug: "hotels", description: "Hotel spaces and hospitality." } },
    { key: "wedding-luxury", service: "PHOTO", parent: "mariage", sortOrder: 1, cover: "seed-wedding",
      fr: { name: "Mariages d'exception", slug: "mariages-exception", description: "Célébrations intimes et productions d'envergure." },
      en: { name: "Luxury Weddings", slug: "luxury-weddings", description: "Intimate celebrations and large-scale productions." } },
    { key: "wedding-traditional", service: "PHOTO", parent: "mariage", sortOrder: 2, cover: "seed-event",
      fr: { name: "Mariages traditionnels", slug: "mariages-traditionnels", description: "Rituels, familles et transmission." },
      en: { name: "Traditional Weddings", slug: "traditional-weddings", description: "Rituals, families and heritage." } },

    { key: "video-commercial", service: "VIDEO", sortOrder: 1, cover: "seed-film",
      fr: { name: "Films publicitaires", slug: "films-publicitaires", description: "Des films de marque au scénario précis et à la finition cinématographique." },
      en: { name: "Commercial Films", slug: "commercial-films", description: "Brand films with precise storytelling and cinematic finish." } },
    { key: "video-corporate", service: "VIDEO", sortOrder: 2, cover: "seed-corporate",
      fr: { name: "Vidéos corporate", slug: "videos-corporate", description: "Films d'entreprise, manifestes et films de présentation." },
      en: { name: "Corporate Videos", slug: "corporate-videos", description: "Company films, manifestos and presentation videos." } },
    { key: "video-wedding", service: "VIDEO", sortOrder: 3, cover: "seed-wedding",
      fr: { name: "Films de mariage", slug: "films-mariage", description: "Le récit d'une journée, sans la dénaturer." },
      en: { name: "Wedding Films", slug: "wedding-films", description: "The story of a day, without distorting it." } },
    { key: "video-events", service: "VIDEO", sortOrder: 4, cover: "seed-event",
      fr: { name: "Vidéos événementielles", slug: "videos-evenementielles", description: "Aftermovies et captations d'événements." },
      en: { name: "Event Videos", slug: "event-videos", description: "Aftermovies and event coverage." } },
    { key: "video-social", service: "VIDEO", sortOrder: 5, cover: "seed-commercial",
      fr: { name: "Réseaux sociaux", slug: "reseaux-sociaux", description: "Formats courts, reels et verticales pensés pour chaque plateforme." },
      en: { name: "Social Media", slug: "social-media", description: "Short-form, reels and vertical content designed for each platform." } },
    { key: "video-interviews", service: "VIDEO", sortOrder: 6, cover: "seed-portrait",
      fr: { name: "Interviews", slug: "interviews", description: "Portraits filmés et entretiens." },
      en: { name: "Interviews", slug: "interviews", description: "Filmed portraits and conversations." } },
    { key: "video-docs", service: "VIDEO", sortOrder: 7, cover: "seed-bts",
      fr: { name: "Documentaires", slug: "documentaires", description: "Formats documentaires et films de fond." },
      en: { name: "Documentaries", slug: "documentaries", description: "Documentary formats and longer-form films." } },
    { key: "video-promo", service: "VIDEO", sortOrder: 8, cover: "seed-studio",
      fr: { name: "Films promotionnels", slug: "films-promotionnels", description: "Présentations de produit et destinations." },
      en: { name: "Promotional Videos", slug: "promotional-videos", description: "Product and destination showcases." } },
    { key: "video-bts", service: "VIDEO", sortOrder: 9, cover: "seed-bts",
      fr: { name: "Coulisses", slug: "coulisses-video", description: "Making-of et productions behind the scenes." },
      en: { name: "Behind The Scenes", slug: "behind-the-scenes", description: "Making-of and behind-the-scenes productions." } },

    { key: "drone-realestate", service: "DRONE", sortOrder: 1, cover: "seed-drone",
      fr: { name: "Immobilier", slug: "immobilier-drone", description: "Notre regard aérien sur les biens et leurs environnements." },
      en: { name: "Real Estate", slug: "real-estate-drone", description: "Our aerial view of properties and their surroundings." } },
    { key: "drone-hotels", service: "DRONE", sortOrder: 2, cover: "seed-hospitality",
      fr: { name: "Hôtels & resorts", slug: "hotels-resorts", description: "Domaines, piscines et paysages vus du ciel." },
      en: { name: "Hotels & Resorts", slug: "hotels-resorts", description: "Estates, pools and landscapes from above." } },
    { key: "drone-events", service: "DRONE", sortOrder: 3, cover: "seed-event",
      fr: { name: "Événements", slug: "evenements-drone", description: "Une perspective aérienne pour les événements d'envergure." },
      en: { name: "Events", slug: "events-drone", description: "An aerial perspective for large-scale events." } },
    { key: "drone-architecture", service: "DRONE", sortOrder: 4, cover: "seed-commercial",
      fr: { name: "Architecture", slug: "architecture", description: "Volumes, lignes et insertion des bâtiments dans le paysage." },
      en: { name: "Architecture", slug: "architecture", description: "Volumes, lines and how buildings sit in the landscape." } },
    { key: "drone-landscapes", service: "DRONE", sortOrder: 5, cover: "seed-drone",
      fr: { name: "Paysages", slug: "paysages", description: "Marrakech et ses territoires, au lever et au coucher du soleil." },
      en: { name: "Landscapes", slug: "landscapes", description: "Marrakech and its surroundings, at sunrise and sunset." } },
    { key: "drone-aerialfilms", service: "DRONE", sortOrder: 6, cover: "seed-film",
      fr: { name: "Films aériens", slug: "films-aeriens", description: "Mouvements de caméra et séquences aériennes pour vos films." },
      en: { name: "Commercial Aerial Films", slug: "aerial-films", description: "Camera movements and aerial sequences for your films." } },
    { key: "drone-construction", service: "DRONE", sortOrder: 7, cover: "seed-studio",
      fr: { name: "Construction", slug: "construction", description: "Suivi de chantier et documentation d'avancement." },
      en: { name: "Construction", slug: "construction", description: "Construction monitoring and progress documentation." } },
  ];

  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const id = seedId(`category:${category.key}`);
    categoryIds[category.key] = id;
    const parentId = category.parent ? categoryIds[category.parent] : null;
    const coverId = mediaIds[category.cover];
    await prisma.category.upsert({
      where: { id },
      update: {
        service: category.service,
        parentId,
        sortOrder: category.sortOrder,
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-15T09:00:00.000Z"),
        coverMediaId: coverId,
        galleryLayout: "GRID",
      },
      create: {
        id,
        service: category.service,
        parentId,
        sortOrder: category.sortOrder,
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-15T09:00:00.000Z"),
        coverMediaId: coverId,
        galleryLayout: "GRID",
      },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: id, locale: "FR" } },
      update: { name: category.fr.name, slug: category.fr.slug, description: category.fr.description },
      create: { categoryId: id, locale: "FR", name: category.fr.name, slug: category.fr.slug, description: category.fr.description },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: id, locale: "EN" } },
      update: { name: category.en.name, slug: category.en.slug, description: category.en.description },
      create: { categoryId: id, locale: "EN", name: category.en.name, slug: category.en.slug, description: category.en.description },
    });
  }

  // -------------------------------------------------------------------------
  // Projects (editorial studies, no client names invented)
  // -------------------------------------------------------------------------
  type ProjectSeed = {
    key: string;
    featured: boolean;
    categories: string[];
    cover: string;
    media: string[];
    date: string;
    location: string;
    type: "PHOTO" | "VIDEO" | "DRONE";
    fr: { title: string; slug: string; summary: string; description: string };
    en: { title: string; slug: string; summary: string; description: string };
  };

  const projects: ProjectSeed[] = [
    {
      key: "lumiere-atelier", featured: true, categories: ["corporate", "corporate-campaigns"], cover: "seed-corporate",
      media: ["seed-corporate", "seed-portrait", "seed-commercial", "seed-studio"],
      date: "2026-10-12", location: "Marrakech", type: "PHOTO",
      fr: { title: "Lumière d'atelier", slug: "lumiere-atelier", summary: "Une étude de lumière et de matière pour une image corporate contemporaine.", description:
        "## Une écriture sobre\n\nCette étude explore la lumière naturelle dans un espace de travail : lignes franches, matières douces et présence mesurée. Un vocabulaire visuel pensé pour les marques qui souhaitent une image corporate intemporelle.\n\n- Direction artistique : TWOK STUDIO\n- Lumière naturelle et réflecteurs\n- Lieu : Marrakech\n\n> Contenu de démonstration : ces visuels abstraits seront remplacés par les photographies finales dans le CMS." },
      en: { title: "Atelier Light", slug: "atelier-light", summary: "A study of light and material for a contemporary corporate image.", description:
        "## A restrained visual language\n\nThis study explores natural light in a working space: crisp lines, soft materials and a measured presence. A visual vocabulary designed for brands looking for a timeless corporate image.\n\n- Art direction: TWOK STUDIO\n- Natural light and reflectors\n- Location: Marrakech\n\n> Demo content: these abstract visuals will be replaced with final photography in the CMS." },
    },
    {
      key: "matieres", featured: true, categories: ["food", "produits"], cover: "seed-food",      media: ["seed-food", "seed-product", "seed-studio"],
      date: "2026-09-24", location: "Marrakech", type: "PHOTO",
      fr: { title: "Matières & gestes", slug: "matieres-et-gestes", summary: "Food et produit : une même attention portée à la texture, au geste et à la lumière.", description:
        "## Le détail comme récit\n\nUne série qui relie cuisine et objet par la texture. Les images privilégient les gestes, les ombres douces et les matières brutes.\n\nCette approche convient aux restaurants, maisons d'hôtes et marques de produits qui veulent montrer l'essentiel sans surcharge." },
      en: { title: "Materials & Gestures", slug: "materials-and-gestures", summary: "Food and product: the same attention to texture, gesture and light.", description:
        "## Detail as narrative\n\nA series linking cuisine and object through texture. The images favour gestures, soft shadows and raw materials.\n\nThis approach suits restaurants, guest houses and product brands that want to show the essential without visual noise." },
    },
    {
      key: "horizon", featured: true, categories: ["re-villas", "drone-realestate", "drone-architecture"], cover: "seed-drone",
      media: ["seed-drone", "seed-realestate", "seed-intro"],
      date: "2026-06-18", location: "Marrakech", type: "DRONE",
      fr: { title: "Horizon privé", slug: "horizon-prive", summary: "Un regard aérien sur l'architecture et son paysage.", description:
        "## Le lieu dans son ensemble\n\nLa vue aérienne replace le bâti dans son environnement : lignes de la villa, végétation, lumière de fin de journée. Un complément naturel à la photographie d'architecture au sol.\n\nImages de démonstration à remplacer dans la médiathèque." },
      en: { title: "Private Horizon", slug: "private-horizon", summary: "An aerial view of architecture and its landscape.", description:
        "## The place as a whole\n\nThe aerial view places the building back in its environment: villa lines, vegetation, late-afternoon light. A natural complement to ground-level architectural photography.\n\nDemo imagery to replace in the media library." },
    },
    {
      key: "hospitalite", featured: true, categories: ["hotellerie"], cover: "seed-hospitality",
      media: ["seed-hospitality", "seed-realestate", "seed-food"],
      date: "2026-03-07", location: "Marrakech", type: "PHOTO",
      fr: { title: "Hospitalité", slug: "hospitalite", summary: "Une étude d'atmosphère pour les lieux qui accueillent.", description:
        "## Raconter une atmosphère\n\nUn intérieur ne se résume pas à ses volumes. Cette série s'attache aux transitions, aux matières et à la lumière qui traverse les espaces. Une approche sensible de la photographie hôtelière.\n\nSérie de démonstration." },
      en: { title: "Hospitality", slug: "hospitality", summary: "An atmosphere study for places that welcome.", description:
        "## Telling an atmosphere\n\nAn interior is more than its volumes. This series focuses on transitions, materials and light moving through spaces. A sensitive approach to hospitality photography.\n\nDemo series." },
    },
    {
      key: "voix", featured: false, categories: ["video-interviews", "video-corporate"], cover: "seed-portrait",
      media: ["seed-portrait", "seed-film", "seed-studio"],
      date: "2026-02-11", location: "Marrakech", type: "VIDEO",
      fr: { title: "Voix", slug: "voix", summary: "Un format interview pour donner du temps à la parole.", description:
        "## Le portrait filmé\n\nCadres calmes, lumière dirigée et écoute : un format pensé pour les portraits d'entreprise et les entretiens de fond.\n\nLes vidéos finales seront ajoutées via la médiathèque ; cette fiche utilise des visuels de démonstration." },
      en: { title: "Voices", slug: "voices", summary: "An interview format that gives conversation room to breathe.", description:
        "## The filmed portrait\n\nCalm framing, directed light and attentive listening: a format designed for company portraits and in-depth interviews.\n\nFinal videos will be added through the media library; this entry uses demo visuals." },
    },
    {
      key: "lignes", featured: false, categories: ["drone-landscapes", "drone-hotels"], cover: "seed-realestate",
      media: ["seed-hero", "seed-drone", "seed-bts"],
      date: "2026-01-29", location: "Marrakech", type: "DRONE",
      fr: { title: "Lignes", slug: "lignes", summary: "Une lecture graphique du territoire, entre ombre et matière.", description:
        "## Le paysage comme composition\n\nUne recherche sur les lignes du sol, les traces et les contrastes. La série explore le potentiel graphique des vues aériennes.\n\nContenu de démonstration." },
      en: { title: "Lines", slug: "lines", summary: "A graphic reading of the land, between shadow and material.", description:
        "## Landscape as composition\n\nA study of ground lines, traces and contrasts. The series explores the graphic potential of aerial views.\n\nDemo content." },
    },
  ];

  const projectIds: Record<string, string> = {};
  for (const project of projects) {
    const id = seedId(`project:${project.key}`);
    projectIds[project.key] = id;
    await prisma.project.upsert({
      where: { id },
      update: {
        status: "PUBLISHED",
        featured: project.featured,
        coverMediaId: mediaIds[project.cover],
        galleryLayout: "GRID",
        projectType: project.type,
        location: project.location,
        projectDate: new Date(`${project.date}T00:00:00.000Z`),
        publishedAt: new Date(`${project.date}T10:00:00.000Z`),
        sortOrder: projects.indexOf(project),
      },
      create: {
        id,
        status: "PUBLISHED",
        featured: project.featured,
        coverMediaId: mediaIds[project.cover],
        galleryLayout: "GRID",
        projectType: project.type,
        location: project.location,
        projectDate: new Date(`${project.date}T00:00:00.000Z`),
        publishedAt: new Date(`${project.date}T10:00:00.000Z`),
        sortOrder: projects.indexOf(project),
      },
    });
    await prisma.projectTranslation.upsert({
      where: { projectId_locale: { projectId: id, locale: "FR" } },
      update: { title: project.fr.title, slug: project.fr.slug, summary: project.fr.summary, description: project.fr.description },
      create: { projectId: id, locale: "FR", title: project.fr.title, slug: project.fr.slug, summary: project.fr.summary, description: project.fr.description },
    });
    await prisma.projectTranslation.upsert({
      where: { projectId_locale: { projectId: id, locale: "EN" } },
      update: { title: project.en.title, slug: project.en.slug, summary: project.en.summary, description: project.en.description },
      create: { projectId: id, locale: "EN", title: project.en.title, slug: project.en.slug, summary: project.en.summary, description: project.en.description },
    });
    await prisma.projectCategory.deleteMany({ where: { projectId: id } });
    await prisma.projectCategory.createMany({
      data: project.categories.map((key) => ({ projectId: id, categoryId: categoryIds[key] })),
      skipDuplicates: true,
    });
    await prisma.projectMedia.deleteMany({ where: { projectId: id } });
    await prisma.projectMedia.createMany({
      data: project.media.map((key, index) => ({ projectId: id, mediaId: mediaIds[key], sortOrder: index })),
      skipDuplicates: true,
    });
  }

  // Related projects (same-world pairings)
  await prisma.projectRelation.deleteMany({});
  await prisma.projectRelation.createMany({
    data: [
      { projectId: projectIds["horizon"], relatedProjectId: projectIds["lignes"] },
      { projectId: projectIds["lignes"], relatedProjectId: projectIds["horizon"] },
      { projectId: projectIds["lumiere-atelier"], relatedProjectId: projectIds["voix"] },
      { projectId: projectIds["matieres"], relatedProjectId: projectIds["hospitalite"] },
    ],
    skipDuplicates: true,
  });

  // -------------------------------------------------------------------------
  // Client project placeholder fix: seed list referenced "seed-core"; ensure no
  // broken relation remains if a future edit removes the image.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Blog
  // -------------------------------------------------------------------------
  const articleCategories = [
    { key: "photo", fr: { name: "Photographie", slug: "photographie" }, en: { name: "Photography", slug: "photography" } },
    { key: "production", fr: { name: "Production", slug: "production" }, en: { name: "Production", slug: "production" } },
    { key: "conseils", fr: { name: "Conseils", slug: "conseils" }, en: { name: "Advice", slug: "advice" } },
  ];
  const articleCategoryIds: Record<string, string> = {};
  for (const category of articleCategories) {
    const id = seedId(`article-category:${category.key}`);
    articleCategoryIds[category.key] = id;
    await prisma.articleCategory.upsert({
      where: { id },
      update: { nameFr: category.fr.name, nameEn: category.en.name, slugFr: category.fr.slug, slugEn: category.en.slug },
      create: { id, nameFr: category.fr.name, nameEn: category.en.name, slugFr: category.fr.slug, slugEn: category.en.slug },
    });
  }

  const tags = [
    { key: "marrakech", slug: "marrakech", fr: "Marrakech", en: "Marrakech" },
    { key: "preparation", slug: "preparation", fr: "Préparation", en: "Preparation" },
    { key: "lumiere", slug: "lumiere", fr: "Lumière", en: "Light" },
    { key: "drone", slug: "drone", fr: "Drone", en: "Drone" },
  ];
  const tagIds: Record<string, string> = {};
  for (const tag of tags) {
    const id = seedId(`tag:${tag.key}`);
    tagIds[tag.key] = id;
    await prisma.articleTag.upsert({
      where: { id },
      update: { nameFr: tag.fr, nameEn: tag.en, slug: tag.slug },
      create: { id, nameFr: tag.fr, nameEn: tag.en, slug: tag.slug },
    });
  }

  const articles = [
    {
      key: "preparer-shooting-corporate",
      category: "conseils",
      cover: "seed-blog-1",
      featured: true,
      date: "2026-10-20",
      tags: ["preparation", "lumiere", "marrakech"],
      fr: {
        title: "Préparer un shooting corporate à Marrakech : le guide essentiel",
        slug: "preparer-shooting-corporate-marrakech",
        excerpt: "Brief, lieux, lumière et coordination : les points clés pour une journée de production fluide et cohérente.",
        content: `## Pourquoi la préparation change tout\n\nUn shooting corporate réussi commence bien avant l'arrivée de l'équipe. Le brief, les lieux et la lumière font partie de la même histoire de marque.\n\n### 1. Définir l'intention avant la liste d'images\n\nAvant de lister les plans, posez la question : que doit ressentir le public ? Confiance, proximité, exigence ? Cette intention guidera les cadres, les couleurs et le rythme du montage.\n\n### 2. Choisir des lieux cohérents\n\nÀ Marrakech, la lumière change vite. Privilégiez des espaces dont la lumière naturelle correspond à votre message, et prévoyez une marge de déplacement réaliste entre deux lieux.\n\n### 3. Préparer les équipes\n\nUn plan de journée clair, des horaires réalistes et une personne référente côté client permettent de garder de l'énergie pour l'essentiel : les visages et les gestes.\n\n> Notre approche : peu de décors, beaucoup de justesse.\n\n### En résumé\n\n- Un brief écrit et validé\n- Deux ou trois lieux maximum par demi-journée\n- Une palette de tenues cohérente\n- Un plan de lumière adapté à la saison`,
      },
      en: {
        title: "Preparing a corporate shoot in Marrakech: the essential guide",
        slug: "preparing-corporate-shoot-marrakech",
        excerpt: "Brief, locations, light and coordination: the keys to a smooth, coherent production day.",
        content: `## Why preparation changes everything\n\nA successful corporate shoot begins long before the crew arrives. The brief, locations and light are part of the same brand story.\n\n### 1. Define the intention before the shot list\n\nBefore listing frames, ask: what should the audience feel? Trust, proximity, precision? That intention will guide framing, colour and editing rhythm.\n\n### 2. Choose coherent locations\n\nIn Marrakech, light changes quickly. Favour spaces whose natural light matches your message, and allow realistic travel time between locations.\n\n### 3. Prepare the teams\n\nA clear call sheet, realistic timings and one client-side contact help preserve energy for what matters: faces and gestures.\n\n> Our approach: fewer sets, more truth.\n\n### In short\n\n- A written, approved brief\n- Two or three locations maximum per half-day\n- A coherent wardrobe palette\n- A lighting plan adapted to the season`,
      },
    },
    {
      key: "drone-immobilier",
      category: "photo",
      cover: "seed-blog-2",
      featured: true,
      date: "2026-09-02",
      tags: ["drone", "marrakech"],
      fr: {
        title: "Drone et immobilier : quand la vue aérienne raconte vraiment le lieu",
        slug: "drone-immobilier-vue-aerienne",
        excerpt: "La vue aérienne n'est pas un effet. Bien utilisée, elle relie l'architecture à son paysage et clarifie l'expérience d'un bien.",
        content: `## L'aérien comme contexte\n\nUne photographie au sol montre un bâtiment. Une image aérienne montre un lieu. Pour l'immobilier, cette différence est décisive : orientation, accès, végétation, voisinage et horizon deviennent lisibles.\n\n### Trois usages pertinents\n\n1. **Situer le bien** dans son environnement immédiat.\n2. **Montrer les extérieurs** lorsque la surface au sol est difficile à saisir.\n3. **Créer une transition** entre les images d'architecture et les vues de paysage.\n\n### Ce que nous évitons\n\nLes mouvements gratuits, les hauteurs spectaculaires sans nécessité et les images qui trahissent l'échelle réelle. La sobriété reste le meilleur service rendu au lieu.\n\n### Réglementation et sécurité\n\nChaque vol est préparé en fonction du site, de la météo et des autorisations applicables. La sécurité et le respect des règles locales priment toujours sur l'image.`,
      },
      en: {
        title: "Drone and real estate: when an aerial view truly tells the place",
        slug: "drone-real-estate-aerial-view",
        excerpt: "Aerial isn't an effect. Used well, it connects architecture to landscape and clarifies the experience of a property.",
        content: `## Aerial as context\n\nA ground photograph shows a building. An aerial image shows a place. For real estate, that difference is decisive: orientation, access, vegetation, neighbours and horizon become legible.\n\n### Three relevant uses\n\n1. **Situate the property** in its immediate environment.\n2. **Show outdoors** when the ground area is hard to grasp.\n3. **Create a transition** between architectural images and landscape views.\n\n### What we avoid\n\nGratuitous movement, dramatic heights without purpose, and images that misrepresent real scale. Restraint is the best service to the place.\n\n### Regulation and safety\n\nEvery flight is prepared according to the site, weather and applicable permissions. Safety and local rules always come before the image.`,
      },
    },
    {
      key: "matieres-food",
      category: "photo",
      cover: "seed-blog-3",
      featured: false,
      date: "2026-07-15",
      tags: ["lumiere", "marrakech"],
      fr: {
        title: "Photographier la food : la texture avant la recette",
        slug: "photographier-food-texture",
        excerpt: "Ce qui rend une image culinaire mémorable n'est pas toujours le plat : c'est la manière dont la lumière révèle sa matière.",
        content: `## La matière comme sujet\n\nEn photographie culinaire, la lumière rasante révèle les aspérités, les gouttes et les reliefs. Elle transforme une assiette en paysage.\n\n### Une lumière simple\n\nUne fenêtre, un réflecteur et un fond choisi suffisent souvent. La complexité technique n'est utile que si elle sert la lecture de la matière.\n\n### Le geste\n\nUne main qui verse, un couteau qui coupe, une vapeur qui monte : le geste donne une durée à l'image et raconte la préparation.\n\n### Notre préférence\n\nDes compositions éditoriales, peu d'accessoires, et une palette qui laisse respirer le sujet.`,
      },
      en: {
        title: "Food photography: texture before recipe",
        slug: "food-photography-texture",
        excerpt: "What makes a memorable culinary image isn't always the dish: it's how light reveals its material.",
        content: `## Material as subject\n\nIn food photography, raking light reveals ridges, droplets and relief. It turns a plate into a landscape.\n\n### Simple light\n\nA window, a reflector and a chosen background are often enough. Technical complexity is only useful when it serves the reading of texture.\n\n### The gesture\n\nA hand pouring, a knife cutting, steam rising: gesture gives an image duration and tells the story of preparation.\n\n### Our preference\n\nEditorial compositions, few props, and a palette that lets the subject breathe.`,
      },
    },
  ];

  for (const article of articles) {
    const id = seedId(`article:${article.key}`);
    await prisma.article.upsert({
      where: { id },
      update: {
        status: "PUBLISHED",
        featured: article.featured,
        coverMediaId: mediaIds[article.cover],
        categoryId: articleCategoryIds[article.category],
        authorId: admin.id,
        publishedAt: new Date(`${article.date}T08:00:00.000Z`),
      },
      create: {
        id,
        status: "PUBLISHED",
        featured: article.featured,
        coverMediaId: mediaIds[article.cover],
        categoryId: articleCategoryIds[article.category],
        authorId: admin.id,
        publishedAt: new Date(`${article.date}T08:00:00.000Z`),
      },
    });
    await prisma.articleTranslation.upsert({
      where: { articleId_locale: { articleId: id, locale: "FR" } },
      update: { title: article.fr.title, slug: article.fr.slug, excerpt: article.fr.excerpt, content: article.fr.content },
      create: { articleId: id, locale: "FR", title: article.fr.title, slug: article.fr.slug, excerpt: article.fr.excerpt, content: article.fr.content },
    });
    await prisma.articleTranslation.upsert({
      where: { articleId_locale: { articleId: id, locale: "EN" } },
      update: { title: article.en.title, slug: article.en.slug, excerpt: article.en.excerpt, content: article.en.content },
      create: { articleId: id, locale: "EN", title: article.en.title, slug: article.en.slug, excerpt: article.en.excerpt, content: article.en.content },
    });
    await prisma.articleTagRelation.deleteMany({ where: { articleId: id } });
    await prisma.articleTagRelation.createMany({
      data: article.tags.map((tag) => ({ articleId: id, tagId: tagIds[tag] })),
      skipDuplicates: true,
    });
  }

  // -------------------------------------------------------------------------
  // Pages
  // -------------------------------------------------------------------------
  type PageSeed = {
    key: string;
    status: "PUBLISHED";
    template: "DEFAULT" | "FULL_WIDTH" | "LANDING";
    fr: { title: string; slug: string; excerpt: string };
    en: { title: string; slug: string; excerpt: string };
    blocks: { type: Prisma.PageBlockCreateWithoutPageInput["type"]; settings: Record<string, unknown> }[];
  };

  const pages: PageSeed[] = [
    {
      key: "studio", status: "PUBLISHED", template: "DEFAULT",
      fr: { title: "Le studio", slug: "studio", excerpt: "Un studio marrakchi dédié à l'image, entre précision et sensibilité." },
      en: { title: "The studio", slug: "studio", excerpt: "A Marrakech studio dedicated to image-making, between precision and sensitivity." },
      blocks: [
        { type: "HEADING", settings: { eyebrowFr: "TWOK STUDIO", eyebrowEn: "TWOK STUDIO", titleFr: "Une écriture visuelle au service des histoires.", titleEn: "A visual language in service of stories.", order: 1 } },
        { type: "RICH_TEXT", settings: { bodyFr: "Basé à Marrakech, TWOK STUDIO réunit photographie, production vidéo et prises de vue aériennes. Nous travaillons avec des marques, des hôtels, des agences et des particuliers qui souhaitent une image juste, durable et singulière.\n\nNotre approche privilégie la lumière naturelle, les compositions respirantes et une direction discrète. Chaque projet commence par une conversation et se construit autour d'une intention claire.", bodyEn: "Based in Marrakech, TWOK STUDIO brings together photography, video production and aerial cinematography. We work with brands, hotels, agencies and individuals seeking imagery that is truthful, enduring and distinctive.\n\nOur approach favours natural light, breathing compositions and discreet direction. Every project begins with a conversation and is built around a clear intention." } },
        { type: "FULL_WIDTH_IMAGE", settings: { mediaId: mediaIds["seed-studio"], captionFr: "Étude de lumière — visuel de démonstration.", captionEn: "Light study — demo visual." } },
        { type: "TWO_COLUMNS", settings: { titleFr: "Trois regards, une même exigence", titleEn: "Three perspectives, one standard", leftBodyFr: "**Photographie.** Corporate, portrait, hôtellerie, immobilier, food et produit. Une attention constante à la lumière et au détail.", leftBodyEn: "**Photography.** Corporate, portrait, hospitality, real estate, food and product. Constant attention to light and detail.", rightBodyFr: "**Vidéo & drone.** Films de marque, interviews, formats sociaux et vues aériennes. Une production pensée pour le montage final.", rightBodyEn: "**Video & drone.** Brand films, interviews, social formats and aerial views. Production designed for the final edit." } },
        { type: "CTA", settings: { titleFr: "Un projet à raconter ?", titleEn: "A story to tell?", bodyFr: "Parlons de votre prochaine création.", bodyEn: "Let's talk about your next creation.", primaryLabelFr: "Réserver une prestation", primaryLabelEn: "Book a service", primaryUrl: "/booking", secondaryLabelFr: "Nous contacter", secondaryLabelEn: "Contact us", secondaryUrl: "/contact" } },
      ],
    },
    {
      key: "privacy", status: "PUBLISHED", template: "DEFAULT",
      fr: { title: "Politique de confidentialité", slug: "confidentialite", excerpt: "Comment TWOK STUDIO collecte et protège vos données." },
      en: { title: "Privacy policy", slug: "privacy", excerpt: "How TWOK STUDIO collects and protects your data." },
      blocks: [
        { type: "RICH_TEXT", settings: { bodyFr: `## Responsable du traitement\n\nTWOK STUDIO, Marrakech, Maroc.\n\n## Données collectées\n\nLorsque vous utilisez le formulaire de contact ou de réservation, nous collectons votre nom, votre adresse e-mail, votre téléphone, les informations relatives au projet et votre consentement. Ces données servent uniquement à répondre à votre demande et à organiser la prestation.\n\n## Base légale et conservation\n\nLes données sont traitées sur la base de votre consentement et de l'intérêt légitime du studio à gérer ses demandes. La durée de conservation est configurable dans l'administration et fixée par défaut à 24 mois après le dernier contact.\n\n## Vos droits\n\nVous pouvez demander l'accès, la rectification ou l'effacement de vos données en contactant le studio via les coordonnées publiées sur la page Contact.\n\n## Cookies et mesure d'audience\n\nAucun outil de mesure d'audience n'est activé par défaut. Si un identifiant Google Analytics est configuré, il n'est chargé qu'après votre consentement explicite.\n\n## Sécurité\n\nLes accès à l'administration sont protégés par authentification, permissions et journalisation. Les données de réservation ne sont jamais publiques.\n\n> Ce document est un modèle opérationnel à faire relire par un conseil juridique avant publication définitive.`, bodyEn: `## Data controller\n\nTWOK STUDIO, Marrakech, Morocco.\n\n## Data collected\n\nWhen you use the contact or booking form, we collect your name, email address, phone number, project information and consent. This data is used only to answer your request and organise the service.\n\n## Legal basis and retention\n\nData is processed based on your consent and the studio's legitimate interest in managing enquiries. Retention is configurable in the administration and defaults to 24 months after the last contact.\n\n## Your rights\n\nYou may request access, correction or deletion of your data by contacting the studio using the details published on the Contact page.\n\n## Cookies and analytics\n\nNo analytics tool is enabled by default. If a Google Analytics ID is configured, it is loaded only after your explicit consent.\n\n## Security\n\nAdministration access is protected by authentication, permissions and audit logging. Booking data is never public.\n\n> This document is an operational template to be reviewed by legal counsel before final publication.` } },
      ],
    },
    {
      key: "terms", status: "PUBLISHED", template: "DEFAULT",
      fr: { title: "Conditions générales", slug: "conditions-generales", excerpt: "Cadre des prestations et des réservations TWOK STUDIO." },
      en: { title: "Terms & conditions", slug: "terms-and-conditions", excerpt: "Framework for TWOK STUDIO services and bookings." },
      blocks: [
        { type: "RICH_TEXT", settings: { bodyFr: `## Prestations\n\nLes prestations de photographie, vidéo et drone font l'objet d'un devis ou d'une confirmation écrite précisant le périmètre, la date, le lieu et les conditions financières.\n\n## Réservations\n\nUne demande en ligne est une demande de réservation, et non une confirmation. La réservation devient ferme après confirmation par TWOK STUDIO et, le cas échéant, versement de l'acompte convenu.\n\n## Annulation et report\n\nLes conditions d'annulation et de report sont précisées dans le devis ou le contrat de chaque projet.\n\n## Droits d'image\n\nLes modalités d'utilisation des images et films sont définies contractuellement. Aucune utilisation commerciale n'est cédée sans accord écrit.\n\n## Responsabilité\n\nLes vols drone sont soumis aux conditions météorologiques, aux autorisations et aux règles locales applicables. En cas d'impossibilité, une solution alternative est proposée.\n\n> Modèle opérationnel à adapter avec un conseil juridique avant publication définitive.`, bodyEn: `## Services\n\nPhotography, video and drone services are governed by a quote or written confirmation specifying scope, date, location and financial terms.\n\n## Bookings\n\nAn online request is a booking request, not a confirmation. A booking becomes firm after confirmation by TWOK STUDIO and, where applicable, payment of the agreed deposit.\n\n## Cancellation and rescheduling\n\nCancellation and rescheduling terms are specified in each project's quote or contract.\n\n## Image rights\n\nTerms for using images and films are defined contractually. No commercial usage rights are granted without written agreement.\n\n## Liability\n\nDrone flights depend on weather, permissions and applicable local rules. If a flight is impossible, an alternative solution is offered.\n\n> Operational template to be adapted with legal counsel before final publication.` } },
      ],
    },
  ];

  const pageIds: Record<string, string> = {};
  for (const page of pages) {
    const id = seedId(`page:${page.key}`);
    pageIds[page.key] = id;
    await prisma.page.upsert({
      where: { id },
      update: { status: page.status, template: page.template, publishedAt: new Date("2026-01-20T09:00:00.000Z") },
      create: { id, status: page.status, template: page.template, publishedAt: new Date("2026-01-20T09:00:00.000Z") },
    });
    await prisma.pageTranslation.upsert({
      where: { pageId_locale: { pageId: id, locale: "FR" } },
      update: { title: page.fr.title, slug: page.fr.slug, excerpt: page.fr.excerpt },
      create: { pageId: id, locale: "FR", title: page.fr.title, slug: page.fr.slug, excerpt: page.fr.excerpt },
    });
    await prisma.pageTranslation.upsert({
      where: { pageId_locale: { pageId: id, locale: "EN" } },
      update: { title: page.en.title, slug: page.en.slug, excerpt: page.en.excerpt },
      create: { pageId: id, locale: "EN", title: page.en.title, slug: page.en.slug, excerpt: page.en.excerpt },
    });
    await prisma.pageBlock.deleteMany({ where: { pageId: id } });
    for (const [index, block] of page.blocks.entries()) {
      await prisma.pageBlock.create({
        data: {
          id: seedId(`block:${page.key}:${index}`),
          pageId: id,
          type: block.type,
          sortOrder: index,
          enabled: true,
          settings: block.settings as Prisma.InputJsonValue,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const headerMenuId = seedId("menu:header");
  const footerMenuId = seedId("menu:footer");
  await prisma.menu.upsert({ where: { id: headerMenuId }, update: { name: "Navigation principale" }, create: { id: headerMenuId, key: "header", name: "Navigation principale" } });
  await prisma.menu.upsert({ where: { id: footerMenuId }, update: { name: "Navigation pied de page" }, create: { id: footerMenuId, key: "footer", name: "Navigation pied de page" } });

  const headerItems = [
    { key: "home", target: "HOME", labelFr: "Accueil", labelEn: "Home" },
    { key: "photo", target: "PHOTO", labelFr: "Photo", labelEn: "Photo" },
    { key: "video", target: "VIDEO", labelFr: "Vidéo", labelEn: "Video" },
    { key: "drone", target: "DRONE", labelFr: "Drone", labelEn: "Drone" },
    { key: "blog", target: "BLOG", labelFr: "Blog", labelEn: "Journal" },
    { key: "contact", target: "CONTACT", labelFr: "Contact", labelEn: "Contact" },
  ] as const;
  for (const [index, item] of headerItems.entries()) {
    const id = seedId(`menu-item:header:${item.key}`);
    await prisma.menuItem.upsert({
      where: { id },
      update: { labelFr: item.labelFr, labelEn: item.labelEn, target: item.target, sortOrder: index + 1, enabled: true, showChildren: ["PHOTO", "VIDEO", "DRONE"].includes(item.target) },
      create: { id, menuId: headerMenuId, target: item.target, labelFr: item.labelFr, labelEn: item.labelEn, sortOrder: index + 1, enabled: true, showChildren: ["PHOTO", "VIDEO", "DRONE"].includes(item.target) },
    });
  }

  const footerItems = [
    { key: "home", target: "HOME", labelFr: "Accueil", labelEn: "Home", sort: 1 },
    { key: "photo", target: "PHOTO", labelFr: "Photographie", labelEn: "Photography", sort: 2 },
    { key: "video", target: "VIDEO", labelFr: "Vidéo", labelEn: "Video", sort: 3 },
    { key: "drone", target: "DRONE", labelFr: "Drone", labelEn: "Drone", sort: 4 },
    { key: "blog", target: "BLOG", labelFr: "Journal", labelEn: "Journal", sort: 5 },
    { key: "contact", target: "CONTACT", labelFr: "Contact", labelEn: "Contact", sort: 6 },
  ] as const;
  for (const item of footerItems) {
    const id = seedId(`menu-item:footer:${item.key}`);
    await prisma.menuItem.upsert({
      where: { id },
      update: { labelFr: item.labelFr, labelEn: item.labelEn, target: item.target, sortOrder: item.sort, enabled: true },
      create: { id, menuId: footerMenuId, target: item.target, labelFr: item.labelFr, labelEn: item.labelEn, sortOrder: item.sort, enabled: true },
    });
  }

  const legalMenuId = seedId("menu:legal");
  await prisma.menu.upsert({ where: { id: legalMenuId }, update: { name: "Informations légales" }, create: { id: legalMenuId, key: "legal", name: "Informations légales" } });
  const legalItems = [
    { key: "privacy", pageId: pageIds.privacy, labelFr: "Politique de confidentialité", labelEn: "Privacy policy", sort: 1 },
    { key: "terms", pageId: pageIds.terms, labelFr: "Conditions générales", labelEn: "Terms & conditions", sort: 2 },
  ];
  for (const item of legalItems) {
    const id = seedId(`menu-item:legal:${item.key}`);
    await prisma.menuItem.upsert({
      where: { id },
      update: { labelFr: item.labelFr, labelEn: item.labelEn, target: "CUSTOM", pageId: item.pageId, sortOrder: item.sort, enabled: true },
      create: { id, menuId: legalMenuId, target: "CUSTOM", pageId: item.pageId, labelFr: item.labelFr, labelEn: item.labelEn, sortOrder: item.sort, enabled: true },
    });
  }

  // -------------------------------------------------------------------------
  // Homepage sections
  // -------------------------------------------------------------------------
  const sections: { type: Prisma.HomepageSectionCreateInput["type"]; settings: Record<string, unknown> }[] = [
    {
      type: "HERO",
      settings: {
        headingFr: "L'art de révéler\nl'instant.",
        headingEn: "The art of revealing\nthe moment.",
        subtitleFr: "Photographie, cinéma et vues aériennes — Marrakech",
        subtitleEn: "Photography, film and aerial views — Marrakech",
        ctaLabelFr: "Explorer nos univers",
        ctaLabelEn: "Explore our worlds",
        ctaUrl: "/photo",
        secondaryLabelFr: "Voir nos projets",
        secondaryLabelEn: "View our projects",
        secondaryUrl: "/photo",
        posterMediaId: mediaIds["seed-hero"],
        videoMediaId: null,
        overlay: 38,
        showScroll: true,
      },
    },
    {
      type: "INTRO",
      settings: {
        titleFr: "Un studio, trois regards.",
        titleEn: "One studio, three perspectives.",
        bodyFr: "Nous créons des images qui racontent un lieu, une marque, un geste. À Marrakech, la lumière impose son rythme : notre travail consiste à l'écouter et à la diriger avec précision.",
        bodyEn: "We create images that tell the story of a place, a brand, a gesture. In Marrakech, light sets the rhythm: our work is to listen to it and shape it with precision.",
        imageMediaId: mediaIds["seed-intro"],
        ctaLabelFr: "Découvrir le studio",
        ctaLabelEn: "Discover the studio",
        ctaUrl: "/studio",
        signatureFr: "Direction artistique — TWOK STUDIO",
        signatureEn: "Art direction — TWOK STUDIO",
      },
    },
    {
      type: "FEATURED_PHOTOS",
      settings: {
        titleFr: "Sélection photographique",
        titleEn: "Photographic selection",
        introFr: "Une écriture sobre, attentive à la lumière et aux matières.",
        introEn: "A restrained visual language, attentive to light and material.",
        projectIds: [projectIds["lumiere-atelier"], projectIds["matieres"], projectIds["hospitalite"]],
        layout: "editorial",
      },
    },
    {
      type: "FEATURED_VIDEO",
      settings: {
        titleFr: "Films & mouvements",
        titleEn: "Films & motion",
        introFr: "Des récits filmés pensés pour le montage et l'émotion.",
        introEn: "Filmed stories designed for rhythm and emotion.",
        projectIds: [projectIds["voix"]],
        videoMediaIds: [],
      },
    },
    {
      type: "SERVICES",
      settings: {
        titleFr: "Nos univers",
        titleEn: "Our worlds",
        introFr: "Trois pratiques complémentaires, une même exigence.",
        introEn: "Three complementary practices, one standard.",
      },
    },
    {
      type: "FEATURED_PROJECTS",
      settings: {
        titleFr: "Projets sélectionnés",
        titleEn: "Selected projects",
        projectIds: [projectIds["horizon"], projectIds["lumiere-atelier"], projectIds["matieres"], projectIds["hospitalite"], projectIds["voix"]],
      },
    },
    {
      type: "BEHIND_THE_SCENES",
      settings: {
        titleFr: "Dans les coulisses",
        titleEn: "Behind the scenes",
        introFr: "Préparation, lumière, terrain : le travail derrière l'image.",
        introEn: "Preparation, light, fieldwork: the work behind the image.",
        mediaIds: [mediaIds["seed-bts"], mediaIds["seed-studio"], mediaIds["seed-film"]],
        videoIds: [],
      },
    },
    {
      type: "CLIENTS",
      settings: {
        titleFr: "Clients & collaborations",
        titleEn: "Clients & collaborations",
        introFr: "Une sélection de marques et partenaires.",
        introEn: "A selection of brands and partners.",
        monochrome: false,
      },
    },
    {
      type: "BLOG_HIGHLIGHTS",
      settings: {
        titleFr: "Le journal",
        titleEn: "The journal",
        introFr: "Notes de terrain, conseils et regards sur l'image.",
        introEn: "Field notes, advice and perspectives on image-making.",
        articleIds: [seedId("article:preparer-shooting-corporate"), seedId("article:drone-immobilier"), seedId("article:matieres-food")],
      },
    },
    {
      type: "CTA",
      settings: {
        titleFr: "Un projet en tête ?\nCréons quelque chose d'exceptionnel.",
        titleEn: "Have a project in mind?\nLet's create something exceptional.",
        bodyFr: "Parlez-nous de votre idée. Nous vous répondrons avec une proposition claire et adaptée.",
        bodyEn: "Tell us about your idea. We will come back with a clear, tailored proposal.",
        primaryLabelFr: "Réserver une prestation",
        primaryLabelEn: "Book a service",
        primaryUrl: "/booking",
        secondaryLabelFr: "Nous écrire",
        secondaryLabelEn: "Write to us",
        secondaryUrl: "/contact",
        showWhatsApp: true,
      },
    },
  ];

  for (const [index, section] of sections.entries()) {
    const id = seedId(`home-section:${section.type}`);
    await prisma.homepageSection.upsert({
      where: { id },
      update: { sortOrder: index + 1, settings: section.settings as Prisma.InputJsonValue, enabled: true },
      create: { id, type: section.type, sortOrder: index + 1, settings: section.settings as Prisma.InputJsonValue, enabled: true },
    });
  }

  // -------------------------------------------------------------------------
  // Booking services
  // -------------------------------------------------------------------------
  const bookingServices = [
    { key: "photography", fr: "Photographie", en: "Photography", dur: 240, sort: 1, descFr: "Portrait, corporate, événement, produit ou éditorial.", descEn: "Portrait, corporate, event, product or editorial." },
    { key: "videography", fr: "Vidéographie", en: "Videography", dur: 360, sort: 2, descFr: "Film de marque, interview, aftermovie ou contenu social.", descEn: "Brand film, interview, aftermovie or social content." },
    { key: "drone", fr: "Drone", en: "Drone", dur: 180, sort: 3, descFr: "Photographie et vidéo aériennes.", descEn: "Aerial photography and video." },
    { key: "corporate", fr: "Corporate", en: "Corporate", dur: 300, sort: 4, descFr: "Image d'entreprise, portraits d'équipe et campagnes.", descEn: "Company image, team portraits and campaigns." },
    { key: "wedding", fr: "Mariage", en: "Wedding", dur: 480, sort: 5, descFr: "Couverture photo et/ou film d'un mariage.", descEn: "Photo and/or film coverage of a wedding." },
    { key: "events", fr: "Événements", en: "Events", dur: 300, sort: 6, descFr: "Couverture d'événements professionnels ou privés.", descEn: "Coverage of professional or private events." },
    { key: "real-estate", fr: "Immobilier", en: "Real Estate", dur: 180, sort: 7, descFr: "Photographie et drone pour biens et architectures.", descEn: "Photography and drone for properties and architecture." },
    { key: "products", fr: "Produits", en: "Products", dur: 240, sort: 8, descFr: "Packshots et photographie produit.", descEn: "Packshots and product photography." },
    { key: "other", fr: "Autre", en: "Other", dur: 60, sort: 9, descFr: "Un projet spécifique ? Décrivez-le nous.", descEn: "A specific project? Tell us about it." },
  ];
  for (const service of bookingServices) {
    await prisma.bookingService.upsert({
      where: { slug: service.key },
      update: {
        nameFr: service.fr, nameEn: service.en, descriptionFr: service.descFr, descriptionEn: service.descEn,
        durationMinutes: service.dur, active: true, sortOrder: service.sort,
      },
      create: {
        slug: service.key, nameFr: service.fr, nameEn: service.en, descriptionFr: service.descFr, descriptionEn: service.descEn,
        durationMinutes: service.dur, active: true, sortOrder: service.sort,
      },
    });
  }

  // Media collection
  const collectionId = seedId("collection:portfolio");
  await prisma.mediaCollection.upsert({
    where: { id: collectionId },
    update: { name: "Visuels de démonstration", description: "Collection de placeholders abstraits à remplacer." },
    create: { id: collectionId, name: "Visuels de démonstration", slug: "visuels-demonstration", description: "Collection de placeholders abstraits à remplacer.", coverMediaId: mediaIds["seed-hero"] },
  });
  await prisma.mediaCollectionItem.deleteMany({ where: { collectionId } });
  await prisma.mediaCollectionItem.createMany({
    data: manifest.map((entry, index) => ({
      collectionId,
      mediaId: mediaIds[entry.file.replace(".jpg", "")],
      sortOrder: index,
    })),
    skipDuplicates: true,
  });

  console.log("✓ Seed complete.");
  if (!existingAdmin) {
    console.log(`  Login: ${adminEmail}`);
    console.log("  Password: value of SEED_ADMIN_PASSWORD (change it after first login).");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
