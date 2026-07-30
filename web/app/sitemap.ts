import type { MetadataRoute } from "next";

const site = "https://amulbot.vercel.app";
const products = ["WPCCP03_01", "WPCCP05_02", "WPCCP06_01", "WPW32_30", "WPW32_60", "HPL200_30", "HPR200_30", "HPB200_30", "HPM250_32"];

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();
  return [
    { url: site, lastModified: updated, changeFrequency: "hourly", priority: 1 },
    { url: `${site}/reliability`, lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    { url: `${site}/radar`, lastModified: updated, changeFrequency: "daily", priority: 0.7 },
    ...products.map((sku) => ({ url: `${site}/products/${sku}`, lastModified: updated, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
