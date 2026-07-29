"use client";

import { FormEvent, useState } from "react";

const products = [
  { sku: "WPCCP03_01", name: "Chocolate Whey Protein", pack: "34 g x 30 sachets", price: "Rs 2,500", tag: "Most tracked" },
  { sku: "WPCCP05_02", name: "Chocolate Whey Protein", pack: "34 g x 60 sachets", price: "Rs 4,500", tag: "Best value" },
  { sku: "WPCCP06_01", name: "Amul Whey Gift Pack", pack: "34 g x 10 sachets", price: "Rs 920", tag: "Starter pack" },
];

export default function Home() {
  const [selectedSku, setSelectedSku] = useState(products[0].sku);
  const [pincode, setPincode] = useState("");
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = products.find((product) => product.sku === selectedSku)!;

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
    <nav className="nav"><a className="brand" href="#top"><span>in</span>stock</a><a className="quiet-link" href="#how-it-works">How it works</a></nav>
    <section className="hero" id="top"><div className="eyebrow">AMUL AVAILABILITY ALERTS</div><h1>Stop refreshing.<br /><em>Start getting alerts.</em></h1><p className="hero-copy">Track hard-to-find Amul protein products for your pincode. We message you on Telegram the moment they can be ordered.</p><div className="hero-stats"><span><b>15 min</b> check interval</span><span><b>1 tap</b> to connect Telegram</span><span><b>0 spam</b> ever</span></div></section>
    <section className="tracker" aria-labelledby="tracker-title"><div className="tracker-heading"><p className="step">01 - CREATE AN ALERT</p><h2 id="tracker-title">What are you waiting for?</h2></div><form onSubmit={createAlert}><label className="field-label" htmlFor="product">Choose a product</label><div className="products" id="product">{products.map((product) => <button type="button" key={product.sku} onClick={() => { setSelectedSku(product.sku); setTelegramUrl(null); }} className={`product ${selectedSku === product.sku ? "selected" : ""}`}><span className="product-tag">{product.tag}</span><strong>{product.name}</strong><span>{product.pack}</span><b>{product.price}</b></button>)}</div><div className="form-row"><label className="pincode"><span className="field-label">Delivery pincode</span><input required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 122002" /></label><button className="primary" type="submit" disabled={loading}>{loading ? "Creating alert..." : <>Track this product <span>-&gt;</span></>}</button></div>{error && <p className="form-error">{error}</p>}{telegramUrl && <div className="success"><b>Almost done.</b> Open our Telegram bot and press Start to confirm alerts for <strong>{selected.name}</strong> in <strong>{pincode}</strong>.<a href={telegramUrl} target="_blank" rel="noreferrer">Connect Telegram -&gt;</a></div>}</form></section>
    <section className="how" id="how-it-works"><div><p className="step">02 - THE SIMPLE BIT</p><h2>Your future self<br />will thank you.</h2></div><ol><li><span>01</span><div><b>Pick your product</b><p>Start with the protein products everyone waits for.</p></div></li><li><span>02</span><div><b>Connect Telegram</b><p>One quick tap. We never ask for a password or payment.</p></div></li><li><span>03</span><div><b>Order when it matters</b><p>Get a direct link as soon as your product is available.</p></div></li></ol></section>
    <footer><a className="brand" href="#top"><span>in</span>stock</a><p>Independent availability alerts for everyday essentials.</p><p>Not affiliated with Amul.</p></footer>
  </main>;
}
