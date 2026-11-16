import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";

export const getSiteSettings = cache(async () => {
  return prisma.siteSetting.findUnique({ where: { id: 1 } });
});

export const getContactSettings = cache(async () => {
  return prisma.contactSetting.findUnique({ where: { id: 1 } });
});

export const getMapSettings = cache(async () => {
  return prisma.mapSetting.findUnique({ where: { id: 1 } });
});

export const getSeoSettings = cache(async () => {
  return prisma.seoSetting.findUnique({ where: { id: 1 }, include: { defaultOgMedia: true } });
});

export const getHomepageSettings = cache(async () => {
  return prisma.homepageSetting.findUnique({ where: { id: 1 }, include: { ogImage: true } });
});

export const getLanguages = cache(async () => {
  return prisma.language.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
});

export const getAvailability = cache(async () => {
  return prisma.bookingAvailability.findUnique({ where: { id: 1 } });
});

export const getPhones = cache(async () => {
  return prisma.contactPhone.findMany({
    where: { active: true },
    orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
  });
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
});

export const getBookingServices = cache(async () => {
  return prisma.bookingService.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }],
  });
});
