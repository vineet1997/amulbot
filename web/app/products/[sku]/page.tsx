import type { Metadata } from "next";
import { notFound } from "next/navigation";

const products = {
  WPCCP03_01: { name: "Amul Chocolate Whey Protein", pack: "34 g × 30 sachets", description: "Track the 30-sachet Amul Chocolate Whey pack at your delivery pincode." },
  WPCCP05_02: { name: "Amul Chocolate Whey Protein", pack: "34 g × 60 sachets", description: "Track the 60-sachet Amul Chocolate Whey pack at your delivery pincode." },
  WPCCP06_01: { name: "Amul Whey Gift Pack", pack: "34 g × 10 sachets", description: "Track the 10-sachet Amul Whey Gift Pack at your delivery pincode." },
} as const;

type Props = { params: Promise<{ sku: string }> };
export function generateStaticParams() { return Object.keys(products).map((sku) => ({ sku })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const product = products[(await params).sku as keyof typeof products]; return product ? { title: `${product.name} ${product.pack} availability`, description: product.description, alternates: { canonical: `/products/${(await params).sku}` } } : {}; }
export default async function ProductPage({ params }: Props) { const { sku } = await params; const product = products[sku as keyof typeof products]; if (!product) notFound(); return <main className="information-page"><nav className="nav"><a className="brand" href="/"><span>amul</span>bot</a><a className="quiet-link" href="/">Stockboard</a></nav><section className="information-hero"><p className="eyebrow">AMUL PROTEIN AVAILABILITY</p><h1>{product.name}<br /><em>{product.pack}</em></h1><p>{product.description} Amulbot shows recent observed availability and sends a Telegram signal when the product appears available.</p><a className="page-cta" href={`/?sku=${sku}#tracker`}>Start this product signal →</a></section><section className="plain-section"><h2>How tracking works</h2><p>Choose your delivery pincode, connect Telegram, and get a timestamped direct link when Amulbot observes availability. Stock moves fast, so a signal is never a guarantee.</p></section></main>; }
