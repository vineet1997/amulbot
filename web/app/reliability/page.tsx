"use client";

import { useEffect, useState } from "react";

const STATUS_URL = "https://tiycurqyfqdcsfrycypm.supabase.co/functions/v1/amulbot-status";
type Status = { latest: { received_at: string; checks_total: number; unknown_total: number } | null; monitored_pincodes: number };
const minutesAgo = (value?: string) => value ? `${Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))} min ago` : "waiting for a run";

export default function ReliabilityPage() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => { fetch(STATUS_URL).then((response) => response.json()).then(setStatus).catch(() => undefined); }, []);
  return <main className="information-page"><nav className="nav"><a className="brand" href="/"><span>amul</span>bot</a><a className="quiet-link" href="/">Stockboard</a></nav><section className="information-hero"><p className="eyebrow">RELIABILITY, NOT MYSTERY</p><h1>We show<br /><em>what we saw.</em></h1><p>Amulbot is independent from Amul and on the shopper’s side against uncertainty. A sighting is not a promise: we show what our worker observed, when it checked, and when it could not confirm an answer.</p></section><section className="reliability-grid"><article><span className="status available">MONITORING</span><h2>{status?.latest ? "Active" : "Loading"}</h2><p>{status?.latest ? `Last worker signal ${minutesAgo(status.latest.received_at)}.` : "Checking worker health."}</p></article><article><span className="status unknown">LATEST RUN</span><h2>{status?.latest?.checks_total ?? "—"} checks</h2><p>{status?.latest ? `${status.latest.unknown_total} unconfirmed checks. Unknown is never labelled unavailable.` : "Waiting for status."}</p></article><article><span className="status unavailable">METHOD</span><h2>Observed</h2><p>We set a delivery pincode, inspect the product page, and send a signal only when availability is observed.</p></article></section><section className="plain-section"><h2>What we will never do</h2><p>We do not collect Amul passwords or payment details, reserve stock, auto-order, publish exact user pincodes, or turn a stale signal into a promise. Use <b>/alerts</b> in Telegram to see active signals and <b>/stop</b> to pause them.</p></section></main>;
}
