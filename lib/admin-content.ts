import "server-only";
import type { Media } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AdminMediaView } from "@/lib/media-view";

export function toMediaView(
  media: Pick<Media, "id" | "kind" | "url" | "thumbnailUrl" | "mimeType" | "originalName" | "altFr" | "altEn" | "width" | "height"> | null | undefined,
): AdminMediaView | null {
  if (!media) return null;
  return {
    id: media.id,
    kind: media.kind,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    mimeType: media.mimeType,
    originalName: media.originalName,
    altFr: media.altFr,
    altEn: media.altEn,
    width: media.width,
    height: media.height,
  };
}

export async function projectFormOptions(excludeId?: string) {
  const [categories, clients, projects] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      include: { translations: { where: { locale: "FR" } } },
      orderBy: [{ service: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.client.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      include: { translations: { where: { locale: "FR" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    categories: categories
      .filter((category) => category.translations[0]?.name)
      .map((category) => ({ id: category.id, name: category.translations[0].name, service: category.service })),
    clients: clients.map((client) => ({ id: client.id, name: client.name })),
    relatedProjects: projects
      .filter((project) => project.translations[0]?.title)
      .map((project) => ({ id: project.id, title: project.translations[0].title })),
  };
}

export async function pageParentOptions(excludeId?: string) {
  const pages = await prisma.page.findMany({
    where: { deletedAt: null },
    include: { translations: { where: { locale: "FR" } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const excluded = new Set<string>();
  if (excludeId) {
    excluded.add(excludeId);
    let changed = true;
    while (changed) {
      changed = false;
      for (const page of pages) {
        if (page.parentId && excluded.has(page.parentId) && !excluded.has(page.id)) {
          excluded.add(page.id);
          changed = true;
        }
      }
    }
  }

  const available = pages.filter((page) => !excluded.has(page.id));
  const ids = new Set(available.map((page) => page.id));
  const children = new Map<string | null, typeof available>();
  for (const page of available) {
    const key = page.parentId && ids.has(page.parentId) ? page.parentId : null;
    const list = children.get(key) ?? [];
    list.push(page);
    children.set(key, list);
  }

  const options: { id: string; label: string; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const page of children.get(parentId) ?? []) {
      if (visited.has(page.id)) continue;
      visited.add(page.id);
      options.push({ id: page.id, label: page.translations[0]?.title ?? page.id, depth });
      walk(page.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const page of available) {
    if (!visited.has(page.id)) options.push({ id: page.id, label: page.translations[0]?.title ?? page.id, depth: 0 });
  }
  return options;
}

export async function categoryParentOptions(excludeId?: string) {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { translations: { where: { locale: "FR" } } },
    orderBy: [{ service: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const excluded = new Set<string>();
  if (excludeId) {
    excluded.add(excludeId);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parentId && excluded.has(category.parentId) && !excluded.has(category.id)) {
          excluded.add(category.id);
          changed = true;
        }
      }
    }
  }

  const available = categories.filter((category) => !excluded.has(category.id));
  const ids = new Set(available.map((category) => category.id));
  const children = new Map<string | null, typeof available>();
  for (const category of available) {
    const key = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    const list = children.get(key) ?? [];
    list.push(category);
    children.set(key, list);
  }

  const options: { id: string; label: string; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const category of children.get(parentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      const name = category.translations[0]?.name ?? category.id;
      options.push({ id: category.id, label: `${name} (${category.service})`, depth });
      walk(category.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const category of available) {
    if (!visited.has(category.id)) {
      options.push({
        id: category.id,
        label: `${category.translations[0]?.name ?? category.id} (${category.service})`,
        depth: 0,
      });
    }
  }
  return options;
}
