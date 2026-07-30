"use client";

import { useEffect, useState } from "react";

const RADAR_URL = "https://tiycurqyfqdcsfrycypm.supabase.co/functions/v1/amulbot-radar";
type Radar = { sku: string; ready: boolean; observation_days: number; restock_events: number; windows: Array<{ label: string; sightings: number }> };

export default function RadarPage() {
  const [pincode, setPincode] = useState("122002"); const [items, setItems] = useState<Radar[]>([]);
  useEffect(() => { if (!/^[1-9]\d{5}$/.test(pincode)) return; fetch(`${RADAR_URL}?pincode=${pincode}`).then((response) => response.json()).then((payload) => setItems(payload.items ?? [])).catch(() => setItems([])); }, [pincode]);
  return <main className="information-page"><nav className="nav"><a className="brand" href="/"><span>amul</span>bot</a><a className="quiet-link" href="/">Stockboard</a></nav><section className="information-hero"><p className="eyebrow">RESTOCK RADAR · EXPERIMENTAL</p><h1>Patterns, not<br /><em>promises.</em></h1><p>We will not invent a restock time. Radar shows a watch window only after at least four observed restocks across 28 days. Until then, we keep collecting the signal.</p><label className="radar-input"><span>Pincode</span><input inputMode="numeric" maxLength={6} value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} /></label></section><section className="radar-list">{items.length ? items.map((item) => <article key={item.sku}><p className="step">{item.sku}</p><h2>{item.ready ? "Watch windows" : "Learning this signal"}</h2><p>{item.ready ? item.windows.map((window) => `${window.label} (${window.sightings} observed restocks)`).join(" · ") : `${item.restock_events} observed restock events across ${item.observation_days} days. We need more history before calling this a pattern.`}</p></article>) : <article><h2>Waiting for a valid pincode.</h2></article>}</section></main>;
}
