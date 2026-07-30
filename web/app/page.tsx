"use client";

import { FormEvent, useEffect, useState } from "react";

const STOCKBOARD_URL = "https://tiycurqyfqdcsfrycypm.supabase.co/functions/v1/amulbot-stockboard";
const products = [
  { sku: "WPCCP03_01", name: "Chocolate Whey Protein", pack: "34 g x 30 sachets", price: "Rs 2,500", tag: "Most tracked" },
  { sku: "WPCCP05_02", name: "Chocolate Whey Protein", pack: "34 g x 60 sachets", price: "Rs 4,500", tag: "Best value" },
  { sku: "WPCCP06_01", name: "Chocolate Whey Gift Pack", pack: "34 g x 10 sachets", price: "Rs 920", tag: "Starter pack" },
  { sku: "WPW32_30", name: "Unflavoured Whey Protein", pack: "32 g x 30 sachets", price: "Rs 2,400", tag: "Unflavoured" },
  { sku: "WPW32_60", name: "Unflavoured Whey Protein", pack: "32 g x 60 sachets", price: "Rs 4,200", tag: "Best value" },
  { sku: "HPL200_30", name: "High Protein Plain Lassi", pack: "200 mL x 30", price: "Rs 900", tag: "15 g protein" },
  { sku: "HPR200_30", name: "High Protein Rose Lassi", pack: "200 mL x 30", price: "Rs 900", tag: "15 g protein" },
  { sku: "HPB200_30", name: "High Protein Buttermilk", pack: "200 mL x 30", price: "Rs 900", tag: "Bestseller" },
  { sku: "HPM250_32", name: "High Protein Milk", pack: "250 mL x 32", price: "Rs 3,520", tag: "20 g protein" },
];

type StockItem = { sku: string; status: "available" | "unavailable" | "unknown"; checked_at: string | null; last_seen_in_stock: string | null; history: Array<{ status: "available" | "unavailable" | "unknown"; checked_at: string }> };
type Stockboard = { items: StockItem[]; worker: { received_at: string; unknown_total: number } | null; recent_catches: Array<{ product_name: string; created_at: string }> };

function relativeTime(value: string | null) {
  if (!value) return "Waiting for the first check";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  return minutes < 1 ? "Checked just now" : `Checked ${minutes} min ago`;
}

export default function Home() {
  const [selectedSku, setSelectedSku] = useState(products[0].sku);
  const [pincode, setPincode] = useState("122002");
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockboard, setStockboard] = useState<Stockboard | null>(null);
  const [stockboardError, setStockboardError] = useState<string | null>(null);
  const selected = products.find((product) => product.sku === selectedSku)!;

  useEffect(() => {
    const requestedSku = new URLSearchParams(window.location.search).get("sku");
    if (requestedSku && products.some((product) => product.sku === requestedSku)) setSelectedSku(requestedSku);
  }, []);

  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setStockboardError(null);
        const response = await fetch(`${STOCKBOARD_URL}?pincode=${pincode}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Stockboard is unavailable.");
        setStockboard(payload);
      } catch (caught) {
        if (!controller.signal.aborted) setStockboardError(caught instanceof Error ? caught.message : "Stockboard is unavailable.");
      }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [pincode]);

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pincode)) return;
    setLoading(true); setError(null); setTelegramUrl(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_AMULBOT_CREATE_ALERT_URL;
      if (!apiUrl) throw new Error("Alert setup is being connected. Please try again shortly.");
      const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: selectedSku, pincode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not create your alert.");
      setTelegramUrl(payload.telegram_url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create your alert."); }
    finally { setLoading(false); }
  }

  return <main>
    <nav className="nav"><a className="brand" href="#top"><span>amul</span>bot</a><div className="nav-links"><a className="quiet-link" href="/radar">Radar</a><a className="quiet-link" href="/reliability">Reliability</a><a className="quiet-link" href="#how-it-works">How it works</a></div></nav>
    <section className="hero" id="top"><div className="eyebrow">INDEPENDENT AMUL PROTEIN AVAILABILITY</div><h1>Your pincode.<br /><em>Your protein signal.</em></h1><p className="hero-copy">We watch the store so you do not have to. Amulbot sends a timestamped Telegram signal when we observe availability for your delivery pincode.</p><div className="hero-stats"><span><b>Observed</b> signals</span><span><b>Direct</b> buy links</span><span><b>No</b> auto-orders</span></div></section>
    <section className="stockboard" aria-labelledby="stockboard-title"><div className="stockboard-top"><div><p className="step">LIVE STOCKBOARD</p><h2 id="stockboard-title">Your protein signal.</h2><p>Observed availability for <strong>{pincode}</strong> — not a stock guarantee.</p></div><label className="board-pincode"><span>Pincode</span><input aria-label="Stockboard pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} /></label></div>
      <div className="health"><span className={`health-dot ${stockboard?.worker && !stockboardError ? "healthy" : ""}`} />{stockboard?.worker && !stockboardError ? `Signal is healthy · ${relativeTime(stockboard.worker.received_at)}` : "Checking the signal"}</div>
      <div className="stock-grid">{products.map((product) => { const item = stockboard?.items.find((entry) => entry.sku === product.sku); const status = item?.status ?? "unknown"; const noHistory = !item?.checked_at; return <article className="stock-card" key={product.sku}><div className="stock-card-head"><span className={`status ${status}`}>{noHistory ? "No signal yet" : status === "available" ? "Signal confirmed" : status === "unavailable" ? "Not in latest check" : "Retrying"}</span><span className="check-time">{stockboardError ? "Waiting for data" : relativeTime(item?.checked_at ?? null)}</span></div><h3>{product.name}</h3><p>{product.pack}</p>{noHistory ? <><p className="no-signal">No sightings here yet. Start the signal for this pincode.</p><button className="text-action" type="button" onClick={() => { setSelectedSku(product.sku); document.getElementById("tracker")?.scrollIntoView({ behavior: "smooth" }); }}>Watch this pincode on Telegram →</button></> : <><div className="heartbeat" aria-label="Recent availability history">{Array.from({ length: 7 }, (_, index) => { const observation = item?.history[index]; return <i className={observation?.status ?? "empty"} key={index} title={observation ? `${observation.status} · ${new Date(observation.checked_at).toLocaleString()}` : "No observation yet"} />; })}</div><small>{status === "unknown" ? "We could not confirm this check. Retrying — not an out-of-stock call." : item?.last_seen_in_stock ? `Last seen in stock ${relativeTime(item.last_seen_in_stock).toLowerCase()}` : "No recent in-stock sightings"}</small></>}</article>; })}</div>
    </section>
    <section className="catch-club" aria-labelledby="catch-club-title"><div><p className="step">THE CATCH CLUB</p><h2 id="catch-club-title">Small wins,<br />shared.</h2><p>When a signal lands, shoppers can tell us whether they caught it. We share the win, never their identity or exact pincode.</p></div><div className="catch-feed">{stockboard?.recent_catches?.length ? stockboard.recent_catches.map((catchEvent, index) => <div className="catch" key={`${catchEvent.created_at}-${index}`}><span>✓</span><p><b>Someone caught {catchEvent.product_name}</b><small>{relativeTime(catchEvent.created_at)}</small></p></div>) : <div className="catch empty-catch"><span>◌</span><p><b>Your refresh button can rest today.</b><small>Confirmed catches will appear here.</small></p></div>}</div></section>
    <section className="tracker" id="tracker" aria-labelledby="tracker-title"><div className="tracker-heading"><p className="step">START A SIGNAL</p><h2 id="tracker-title">Less refreshing.<br />More protein.</h2></div><form onSubmit={createAlert}><label className="field-label" htmlFor="product">Choose a product</label><div className="products" id="product">{products.map((product) => <button type="button" key={product.sku} onClick={() => { setSelectedSku(product.sku); setTelegramUrl(null); }} className={`product ${selectedSku === product.sku ? "selected" : ""}`}><span className="product-tag">{product.tag}</span><strong>{product.name}</strong><span>{product.pack}</span><b>{product.price}</b></button>)}</div><div className="form-row"><label className="pincode"><span className="field-label">Delivery pincode</span><input required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 122002" /></label><button className="primary" type="submit" disabled={loading}>{loading ? "Starting signal..." : <>Start the signal <span>-&gt;</span></>}</button></div><p className="form-hint">We start checking this pincode in the next monitoring cycle. Telegram keeps your signal on.</p>{error && <p className="form-error">{error}</p>}{telegramUrl && <div className="success"><b>One quick step.</b> Open Telegram and press Start to keep the signal on for <strong>{selected.name}</strong> in <strong>{pincode}</strong>.<a href={telegramUrl} target="_blank" rel="noreferrer">Connect Telegram -&gt;</a></div>}</form></section>
    <section className="how" id="how-it-works"><div><p className="step">HOW THE SIGNAL WORKS</p><h2>Fast, useful,<br />honest.</h2></div><ol><li><span>01</span><div><b>Choose your pincode</b><p>Availability is observed for the delivery location that matters to you.</p></div></li><li><span>02</span><div><b>Connect Telegram</b><p>We never ask for Amul passwords, payment details, or permission to order.</p></div></li><li><span>03</span><div><b>Catch the signal</b><p>When availability is observed, you get a direct product link and a timestamp.</p></div></li></ol></section>
    <footer><a className="brand" href="#top"><span>amul</span>bot</a><p>Independent availability signals for Amul protein.</p><p>Not affiliated with Amul.</p></footer>
  </main>;
}
