import type { Metadata } from "next";
import { notFound } from "next/navigation";

const products = {
  WPCCP03_01: { name: "Amul Chocolate Whey Protein", pack: "34 g × 30 sachets", description: "Keep an honest signal on the 30-sachet Amul Chocolate Whey pack for your delivery pincode." },
  WPCCP05_02: { name: "Amul Chocolate Whey Protein", pack: "34 g × 60 sachets", description: "Keep an honest signal on the 60-sachet Amul Chocolate Whey pack for your delivery pincode." },
  WPCCP06_01: { name: "Amul Whey Gift Pack", pack: "34 g × 10 sachets", description: "Keep an honest signal on the 10-sachet Amul Whey Gift Pack for your delivery pincode." },
} as const;

type Props = { params: Promise<{ sku: string }> };
export function generateStaticParams() { return Object.keys(products).map((sku) => ({ sku })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const product = products[(await params).sku as keyof typeof products]; return product ? { title: `${product.name} ${product.pack} availability`, description: product.description, alternates: { canonical: `/products/${(await params).sku}` } } : {}; }
export default async function ProductPage({ params }: Props) { const { sku } = await params; const product = products[sku as keyof typeof products]; if (!product) notFound(); return <main className="information-page"><nav className="nav"><a className="brand" href="/"><span>amul</span>bot</a><a className="quiet-link" href="/">Stockboard</a></nav><section className="information-hero"><p className="eyebrow">AMUL PROTEIN AVAILABILITY</p><h1>{product.name}<br /><em>{product.pack}</em></h1><p>{product.description} We watch the store, then send a timestamped Telegram signal when availability is observed for your pincode.</p><a className="page-cta" href={`/?sku=${sku}#tracker`}>Keep this signal on →</a></section><section className="plain-section"><h2>How the signal works</h2><p>Choose your delivery pincode, connect Telegram, and get a direct link when Amulbot observes availability. Stock can move fast; a signal tells you what we saw and when, never what is guaranteed.</p></section></main>; }
