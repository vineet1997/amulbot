const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_ORIGINS = new Set(["https://amulbot.vercel.app", Deno.env.get("AMULBOT_APP_ORIGIN")?.replace(/\/$/, "")].filter((origin): origin is string => Boolean(origin)));
const baseCors = { "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET, OPTIONS", "Content-Type": "application/json", "Cache-Control": "public, max-age=60" };
function cors(origin: string | null) { return { ...baseCors, ...(origin && APP_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}) }; }
function dbHeaders() { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "Accept-Profile": "amulbot" }; }
async function jsonOrThrow(response: Response, label: string) { const text = await response.text(); if (!response.ok) throw new Error(`${label} failed (${response.status}): ${text}`); return text ? JSON.parse(text) : []; }

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors(origin) });
  const pincode = new URL(request.url).searchParams.get("pincode") ?? "";
  if (!/^[1-9]\d{5}$/.test(pincode)) return new Response(JSON.stringify({ error: "A valid Indian pincode is required." }), { status: 400, headers: cors(origin) });
  try {
    const [products, checks, observations, runs, catches] = await Promise.all([
      jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/products?active=is.true&order=sku&select=sku,name,package_label,product_url,price_inr`, { headers: dbHeaders() }), "Read products"),
      jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/availability_checks?pincode=eq.${pincode}&select=product_sku,is_available,checked_at,detail`, { headers: dbHeaders() }), "Read current checks"),
      jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/availability_observations?pincode=eq.${pincode}&order=checked_at.desc&limit=42&select=product_sku,status,checked_at`, { headers: dbHeaders() }), "Read observations"),
      jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/worker_runs?order=received_at.desc&limit=1&select=received_at,checks_total,unknown_total`, { headers: dbHeaders() }), "Read worker health"),
      jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/catch_feedback?outcome=eq.caught&order=created_at.desc&limit=5&select=product_sku,created_at,products(name)`, { headers: dbHeaders() }), "Read recent catches"),
    ]);
    const checkBySku = new Map(checks.map((check: { product_sku: string }) => [check.product_sku, check]));
    const historyBySku = new Map<string, Array<{ status: string; checked_at: string }>>();
    for (const observation of observations) historyBySku.set(observation.product_sku, [...(historyBySku.get(observation.product_sku) ?? []), observation]);
    const items = products.map((product: { sku: string }) => {
      const current = checkBySku.get(product.sku) as { is_available: boolean; checked_at: string } | undefined;
      const history = historyBySku.get(product.sku) ?? [];
      const latest = history[0];
      const status = latest && (!current || new Date(latest.checked_at) >= new Date(current.checked_at)) ? latest.status : current ? (current.is_available ? "available" : "unavailable") : "unknown";
      return { ...product, status, checked_at: latest?.checked_at ?? current?.checked_at ?? null, last_seen_in_stock: history.find((observation) => observation.status === "available")?.checked_at ?? null, history: history.slice(0, 7) };
    });
    const recent_catches = catches.map((catchEvent: { product_sku: string; created_at: string; products: { name: string } | { name: string }[] | null }) => ({
      product_name: Array.isArray(catchEvent.products) ? catchEvent.products[0]?.name ?? catchEvent.product_sku : catchEvent.products?.name ?? catchEvent.product_sku,
      created_at: catchEvent.created_at,
    }));
    return new Response(JSON.stringify({ pincode, items, worker: runs[0] ?? null, recent_catches }), { headers: cors(origin) });
  } catch (error) { console.error("amulbot-stockboard", error); return new Response(JSON.stringify({ error: "Stockboard is temporarily unavailable." }), { status: 500, headers: cors(origin) }); }
});
