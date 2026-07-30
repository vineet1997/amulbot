import type { Metadata } from "next";
import { notFound } from "next/navigation";

const site = "https://amulbot.vercel.app";
const products = {
  WPCCP03_01: { name: "Amul Chocolate Whey Protein", pack: "34 g × 30 sachets", description: "Track the 30-sachet Amul Chocolate Whey pack at your delivery pincode.", detail: "A 30-sachet chocolate whey pack for shoppers who want a smaller refill cycle." },
  WPCCP05_02: { name: "Amul Chocolate Whey Protein", pack: "34 g × 60 sachets", description: "Track the 60-sachet Amul Chocolate Whey pack at your delivery pincode.", detail: "A 60-sachet chocolate whey pack for shoppers who prefer a longer refill cycle." },
  WPCCP06_01: { name: "Amul Chocolate Whey Protein Gift Pack", pack: "34 g × 10 sachets", description: "Track the 10-sachet Amul Chocolate Whey Gift Pack at your delivery pincode.", detail: "A smaller chocolate whey gift pack for trying the format or bridging a short gap." },
  WPW32_30: { name: "Amul Whey Protein", pack: "32 g × 30 sachets", description: "Track the 30-sachet unflavoured Amul Whey pack at your delivery pincode.", detail: "An unflavoured whey option in a 30-sachet pack." },
  WPW32_60: { name: "Amul Whey Protein", pack: "32 g × 60 sachets", description: "Track the 60-sachet unflavoured Amul Whey pack at your delivery pincode.", detail: "An unflavoured whey option in a 60-sachet pack for a longer refill cycle." },
  HPL200_30: { name: "Amul High Protein Plain Lassi", pack: "200 mL × 30", description: "Track Amul High Protein Plain Lassi at your delivery pincode.", detail: "A ready-to-drink plain lassi format in a 30-pack." },
  HPR200_30: { name: "Amul High Protein Rose Lassi", pack: "200 mL × 30", description: "Track Amul High Protein Rose Lassi at your delivery pincode.", detail: "A ready-to-drink rose lassi format in a 30-pack." },
  HPB200_30: { name: "Amul High Protein Buttermilk", pack: "200 mL × 30", description: "Track Amul High Protein Buttermilk at your delivery pincode.", detail: "A ready-to-drink buttermilk format in a 30-pack." },
  HPM250_32: { name: "Amul High Protein Milk", pack: "250 mL × 32", description: "Track Amul High Protein Milk at your delivery pincode.", detail: "A high-protein milk format in a 32-pack." },
} as const;

type Props = { params: Promise<{ sku: string }> };
export function generateStaticParams() { return Object.keys(products).map((sku) => ({ sku })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sku } = await params;
  const product = products[sku as keyof typeof products];
  if (!product) return {};
  const title = `${product.name} ${product.pack} availability`;
  return {
    title,
    description: `${product.description} Get timestamped Telegram signals from Amulbot when availability is observed.`,
    alternates: { canonical: `/products/${sku}` },
    openGraph: { title, description: product.description, url: `/products/${sku}`, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { sku } = await params;
  const product = products[sku as keyof typeof products];
  if (!product) notFound();
  const url = `${site}/products/${sku}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: `${product.name} ${product.pack} availability`, description: product.description, url, isPartOf: { "@type": "WebSite", name: "Amulbot", url: site } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Amulbot", item: site }, { "@type": "ListItem", position: 2, name: "Products", item: `${site}/products/${sku}` }, { "@type": "ListItem", position: 3, name: `${product.name} ${product.pack}`, item: url }] },
    ],
  };
  return <main className="information-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><nav className="nav"><a className="brand" href="/"><span>amul</span>bot</a><a className="quiet-link" href="/">Stockboard</a></nav><section className="information-hero"><p className="eyebrow">AMUL PROTEIN AVAILABILITY</p><h1>{product.name}<br /><em>{product.pack}</em></h1><p>{product.description} We watch the store, then send a timestamped Telegram signal when availability is observed for your pincode.</p><a className="page-cta" href={`/?sku=${sku}#tracker`}>Keep this signal on →</a></section><section className="plain-section"><h2>What Amulbot tracks</h2><p>{product.detail} Amulbot checks the Amul Shop product page for your selected pincode and records the result as available, unavailable, or unknown. An unknown result is never shown as sold out.</p><h2>How the signal works</h2><p>Choose your delivery pincode, connect Telegram, and get a direct link when Amulbot observes availability. Stock can move fast; a signal tells you what we saw and when, never what is guaranteed.</p><h2>Questions shoppers ask</h2><p><b>Is this product in stock everywhere?</b> No. Amul availability can differ by delivery pincode, which is why Amulbot tracks the pincode you select.</p><p><b>Does Amulbot place an order?</b> No. It only sends an availability signal and a direct link to Amul Shop.</p></section></main>;
}
