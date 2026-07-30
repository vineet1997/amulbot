const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("AMULBOT_WORKER_SECRET")!;

function headers() { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "Accept-Profile": "amulbot" }; }
async function jsonOrThrow(response: Response, label: string) { const text = await response.text(); if (!response.ok) throw new Error(`${label} failed (${response.status}): ${text}`); return text ? JSON.parse(text) : []; }

Deno.serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("x-amulbot-worker-secret") !== WORKER_SECRET) return new Response("Unauthorized", { status: 401 });
  try {
    const alerts = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?status=in.(pending,active)&select=product_sku,pincode`, { headers: headers() }), "Read alert targets");
    const products = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/products?active=is.true&select=sku,name,product_url`, { headers: headers() }), "Read products");
    const productsBySku = new Map(products.map((product: { sku: string }) => [product.sku, product]));
    const targets = [...new Map(alerts.flatMap((alert: { product_sku: string; pincode: string }) => {
      const product = productsBySku.get(alert.product_sku);
      return product ? [[`${alert.pincode}:${alert.product_sku}`, { ...product, pincode: alert.pincode }]] : [];
    })).values()];
    return Response.json({ targets });
  } catch (error) { console.error("amulbot-worker-targets", error); return Response.json({ error: "Unable to load monitoring targets" }, { status: 500 }); }
});
