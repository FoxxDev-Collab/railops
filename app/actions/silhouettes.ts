"use server";

import { db } from "@/lib/db";
import { SilhouetteCategory } from "@prisma/client";

export async function getSilhouettes(category?: SilhouetteCategory) {
  return db.silhouette.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}
